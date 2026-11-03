(function (root) {
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeUrl(raw) {
    var value = String(raw || "").trim();
    if (!value) return "";
    if (!/^https?:\/\//i.test(value)) value = "https://" + value;
    return value;
  }

  function looksLikeHtml(text) {
    if (!text || text.length < 40) return false;
    var sample = text.slice(0, 2500).toLowerCase();
    return sample.indexOf("<html") !== -1 ||
      sample.indexOf("<!doctype html") !== -1 ||
      sample.indexOf("<title") !== -1 ||
      sample.indexOf("<head") !== -1 ||
      sample.indexOf("<meta") !== -1 ||
      sample.indexOf("<body") !== -1;
  }

  function looksLikeUrlOnly(text) {
    var t = String(text || "").trim();
    return /^https?:\/\/\S+$/i.test(t) && t.indexOf("<") === -1;
  }

  function absUrl(href, base) {
    try { return new URL(href, base).href; } catch (e) { return null; }
  }

  function sameHost(a, b) {
    try {
      return new URL(a).hostname.replace(/^www\./, "") === new URL(b).hostname.replace(/^www\./, "");
    } catch (e) { return false; }
  }

  function markdownToHtml(md, pageUrl) {
    var titleMatch = md.match(/^Title:\s*(.+)$/m);
    var urlMatch = md.match(/^URL Source:\s*(.+)$/m);
    var title = titleMatch ? titleMatch[1].trim() : "";
    var sourceUrl = urlMatch ? urlMatch[1].trim() : pageUrl;
    var h1Match = md.match(/^#\s+(.+)$/m);
    var h1 = h1Match ? h1Match[1].trim() : title;
    var descMatch = md.match(/^Description:\s*(.+)$/m) || md.match(/meta description[:\s]+(.+)/i);
    var desc = descMatch ? descMatch[1].trim() : "";

    var parts = [];
    parts.push("<!doctype html><html><head>");
    if (title) parts.push("<title>" + escapeHtml(title) + "</title>");
    if (desc) parts.push('<meta name="description" content="' + escapeHtml(desc) + '">');
    if (sourceUrl) parts.push('<link rel="canonical" href="' + escapeHtml(sourceUrl) + '">');
    parts.push("</head><body>");
    if (h1) parts.push("<h1>" + escapeHtml(h1) + "</h1>");

    var imgRe = /!\[([^\]]*)\]\((https?:[^)\s]+)\)/g;
    var m;
    while ((m = imgRe.exec(md))) {
      parts.push('<img alt="' + escapeHtml(m[1]) + '" src="' + escapeHtml(m[2]) + '">');
    }
    var linkRe = /\[([^\]]*)\]\((https?:[^)\s]+)\)/g;
    while ((m = linkRe.exec(md))) {
      parts.push('<a href="' + escapeHtml(m[2]) + '">' + escapeHtml(m[1] || m[2]) + "</a>");
    }
    // bare urls
    var bareRe = /(https?:\/\/[^\s)<>"]+)/g;
    var seen = {};
    while ((m = bareRe.exec(md))) {
      if (seen[m[1]]) continue;
      seen[m[1]] = true;
      parts.push('<a href="' + escapeHtml(m[1]) + '">' + escapeHtml(m[1]) + "</a>");
    }
    parts.push("</body></html>");
    return parts.join("");
  }

  function analyze(html, pageUrl) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var title = ((doc.querySelector("title") || {}).textContent || "").trim();
    var metaDesc = "";
    var md = doc.querySelector('meta[name="description"]');
    if (md) metaDesc = (md.getAttribute("content") || "").trim();
    var canonical = "";
    var can = doc.querySelector('link[rel="canonical"]');
    if (can) canonical = (can.getAttribute("href") || "").trim();
    var robots = "";
    var rb = doc.querySelector('meta[name="robots"]');
    if (rb) robots = (rb.getAttribute("content") || "").trim().toLowerCase();
    var h1s = Array.prototype.map.call(doc.querySelectorAll("h1"), function (el) {
      return (el.textContent || "").trim();
    }).filter(Boolean);
    var images = Array.prototype.slice.call(doc.querySelectorAll("img"));
    var missingAlt = images.filter(function (img) { return !img.hasAttribute("alt"); }).length;

    var anchors = Array.prototype.slice.call(doc.querySelectorAll("a[href]"));
    var internal = [];
    var external = [];
    var nofollow = 0;
    var dofollowExt = 0;
    var suspicious = [];

    anchors.forEach(function (a) {
      var href = (a.getAttribute("href") || "").trim();
      if (!href || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return;
      if (href === "#" || href.indexOf("javascript:") === 0) {
        suspicious.push({ href: href, text: (a.textContent || "").trim().slice(0, 80), reason: "Empty or script link" });
        return;
      }
      var full = absUrl(href, pageUrl);
      if (!full) return;
      var rel = (a.getAttribute("rel") || "").toLowerCase();
      var isNf = /\bnofollow\b/.test(rel) || /\bugc\b/.test(rel) || /\bsponsored\b/.test(rel);
      var item = {
        href: full,
        text: (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 90) || "(no anchor text)",
        nofollow: isNf
      };
      if (sameHost(full, pageUrl)) internal.push(item);
      else {
        external.push(item);
        if (isNf) nofollow += 1;
        else dofollowExt += 1;
        var host = "";
        try { host = new URL(full).hostname; } catch (e) {}
        if (/\d{4,}/.test(host) || host.split(".").length > 4) {
          suspicious.push({ href: full, text: item.text, reason: "Unusual outbound host pattern" });
        }
      }
    });

    var domains = {};
    external.forEach(function (e) {
      try {
        var h = new URL(e.href).hostname.replace(/^www\./, "");
        domains[h] = (domains[h] || 0) + 1;
      } catch (err) {}
    });
    var domainList = Object.keys(domains).map(function (d) {
      return { domain: d, count: domains[d] };
    }).sort(function (a, b) { return b.count - a.count; });

    var checks = [];
    function addCheck(ok, warn, checkTitle, detail) {
      checks.push({
        status: ok ? "pass" : (warn ? "warn" : "fail"),
        title: checkTitle,
        detail: detail
      });
    }

    addCheck(title.length > 0 && title.length <= 65, title.length > 65, "Title tag",
      title ? ("\"" + title + "\" (" + title.length + " chars)") : "Missing title tag");
    addCheck(metaDesc.length >= 50 && metaDesc.length <= 165, metaDesc.length > 0 && (metaDesc.length < 50 || metaDesc.length > 165),
      "Meta description",
      metaDesc ? (metaDesc.length + " characters") : "Missing meta description");
    addCheck(h1s.length === 1, h1s.length > 1, "H1 heading",
      h1s.length ? (h1s.length + " H1 found: " + h1s[0].slice(0, 80)) : "No H1 found");
    addCheck(!!canonical, false, "Canonical tag",
      canonical ? canonical : "No canonical link tag");
    addCheck(!/noindex/.test(robots), false, "Indexability",
      robots ? ("robots meta: " + robots) : "No restrictive robots meta found");
    addCheck(missingAlt === 0, missingAlt > 0 && missingAlt < 5, "Image alt text",
      missingAlt === 0 ? "All images have alt attributes" : (missingAlt + " image(s) missing alt"));
    addCheck(internal.length >= 1, internal.length === 0, "Internal links",
      internal.length + " internal links on this page");
    addCheck(external.length <= 100, external.length > 100, "Outbound / external links",
      external.length + " external links (" + dofollowExt + " dofollow, " + nofollow + " nofollow/ugc/sponsored)");
    addCheck(suspicious.length === 0, suspicious.length > 0 && suspicious.length < 5, "Suspicious link patterns",
      suspicious.length === 0 ? "No obvious suspicious link patterns" : (suspicious.length + " flagged link(s)"));

    var score = 0;
    checks.forEach(function (c) {
      if (c.status === "pass") score += 1;
      else if (c.status === "warn") score += 0.5;
    });
    var gradePct = Math.round((score / checks.length) * 100);
    var grade = gradePct >= 90 ? "A" : gradePct >= 80 ? "B" : gradePct >= 70 ? "C" : gradePct >= 55 ? "D" : "F";

    return {
      pageUrl: pageUrl,
      title: title,
      metaDesc: metaDesc,
      canonical: canonical,
      robots: robots,
      h1s: h1s,
      images: images.length,
      missingAlt: missingAlt,
      internal: internal,
      external: external,
      nofollow: nofollow,
      dofollowExt: dofollowExt,
      domainList: domainList,
      suspicious: suspicious,
      checks: checks,
      grade: grade,
      gradePct: gradePct
    };
  }

  root.JltSeoCore = {
    escapeHtml: escapeHtml,
    normalizeUrl: normalizeUrl,
    looksLikeHtml: looksLikeHtml,
    looksLikeUrlOnly: looksLikeUrlOnly,
    absUrl: absUrl,
    sameHost: sameHost,
    markdownToHtml: markdownToHtml,
    analyze: analyze
  };
})(typeof window !== "undefined" ? window : globalThis);
