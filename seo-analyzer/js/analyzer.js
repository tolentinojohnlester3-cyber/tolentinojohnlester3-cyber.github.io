(function () {
  const form = document.querySelector("#analyze-form");
  const urlInput = document.querySelector("#site-url");
  const statusEl = document.querySelector("#status");
  const results = document.querySelector("#results");
  const backlinkFile = document.querySelector("#backlink-file");
  const importBtn = document.querySelector("#import-backlinks");

  function showStatus(type, message) {
    statusEl.className = type;
    statusEl.hidden = false;
    statusEl.textContent = message;
  }

  function hideStatus() {
    statusEl.hidden = true;
    statusEl.textContent = "";
  }

  function normalizeUrl(raw) {
    var value = (raw || "").trim();
    if (!value) return "";
    if (!/^https?:\/\//i.test(value)) value = "https://" + value;
    return value;
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function looksLikeHtml(text) {
    if (!text || text.length < 40) return false;
    var sample = text.slice(0, 2000).toLowerCase();
    return sample.indexOf("<html") !== -1 ||
      sample.indexOf("<!doctype html") !== -1 ||
      sample.indexOf("<title") !== -1 ||
      sample.indexOf("<head") !== -1 ||
      sample.indexOf("<meta") !== -1 ||
      sample.indexOf("<body") !== -1;
  }

  async function fetchHtml(targetUrl) {
    var enc = encodeURIComponent(targetUrl);
    var lastError = null;

    // 1) Jina Reader — works for many sites that block generic CORS proxies
    try {
      var jinaRes = await fetch("https://r.jina.ai/" + targetUrl, {
        method: "GET",
        headers: {
          "Accept": "text/html",
          "X-Return-Format": "html"
        }
      });
      if (!jinaRes.ok) throw new Error("Jina HTTP " + jinaRes.status);
      var jinaText = await jinaRes.text();
      if (looksLikeHtml(jinaText)) return jinaText;
      throw new Error("Jina returned non-HTML");
    } catch (err) {
      lastError = err;
    }

    // 2) Fallback proxies
    var proxies = [
      { url: "https://api.allorigins.win/get?url=" + enc, json: true },
      { url: "https://api.allorigins.win/raw?url=" + enc, json: false },
      { url: "https://corsproxy.io/?" + enc, json: false },
      { url: "https://api.codetabs.com/v1/proxy?quest=" + enc, json: false }
    ];

    for (var i = 0; i < proxies.length; i++) {
      try {
        var res = await fetch(proxies[i].url, { method: "GET" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        var text = "";
        if (proxies[i].json) {
          var data = await res.json();
          text = data && (data.contents || data.content || "") || "";
        } else {
          text = await res.text();
        }
        if (!looksLikeHtml(text)) throw new Error("Empty or non-HTML response");
        return text;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("Could not fetch page");
  }

  function absUrl(href, base) {
    try { return new URL(href, base).href; } catch (e) { return null; }
  }

  function sameHost(a, b) {
    try {
      return new URL(a).hostname.replace(/^www\./, "") === new URL(b).hostname.replace(/^www\./, "");
    } catch (e) { return false; }
  }

  function analyze(html, pageUrl) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var title = (doc.querySelector("title") || {}).textContent || "";
    title = title.trim();
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
    var missingAlt = images.filter(function (img) {
      return !img.hasAttribute("alt");
    }).length;

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
      if (sameHost(full, pageUrl)) {
        internal.push(item);
      } else {
        external.push(item);
        if (isNf) nofollow += 1;
        else dofollowExt += 1;
        // rough spam signals
        var host = "";
        try { host = new URL(full).hostname; } catch (e) {}
        if (/\d{4,}/.test(host) || host.split(".").length > 4) {
          suspicious.push({ href: full, text: item.text, reason: "Unusual outbound host pattern" });
        }
      }
    });

    // unique external domains
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
    function addCheck(ok, warn, title, detail) {
      checks.push({
        status: ok ? "pass" : (warn ? "warn" : "fail"),
        title: title,
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

  function renderReport(data) {
    results.hidden = false;
    document.querySelector("#grade-letter").textContent = data.grade;
    document.querySelector("#grade-meta").textContent = data.gradePct + "% of checks passed · " + data.pageUrl;
    document.querySelector("#stat-internal").textContent = data.internal.length;
    document.querySelector("#stat-external").textContent = data.external.length;
    document.querySelector("#stat-dofollow").textContent = data.dofollowExt;
    document.querySelector("#stat-nofollow").textContent = data.nofollow;
    document.querySelector("#stat-domains").textContent = data.domainList.length;

    var checksHtml = data.checks.map(function (c) {
      return '<div class="check ' + c.status + '"><div><span class="badge ' + c.status + '">' + c.status.toUpperCase() +
        "</span></div><strong>" + escapeHtml(c.title) + "</strong><p>" + escapeHtml(c.detail) + "</p></div>";
    }).join("");
    document.querySelector("#seo-checks").innerHTML = checksHtml;

    document.querySelector("#external-domains").innerHTML = data.domainList.length
      ? data.domainList.slice(0, 40).map(function (d) {
          return "<tr><td>" + escapeHtml(d.domain) + "</td><td>" + d.count + "</td></tr>";
        }).join("")
      : "<tr><td colspan='2'>No external domains found on this page.</td></tr>";

    document.querySelector("#external-links").innerHTML = data.external.length
      ? data.external.slice(0, 60).map(function (l) {
          return "<tr><td>" + escapeHtml(l.text) + "</td><td><a href=\"" + escapeHtml(l.href) +
            "\" target=\"_blank\" rel=\"noopener noreferrer\">" + escapeHtml(l.href) +
            "</a></td><td>" + (l.nofollow ? "nofollow" : "dofollow") + "</td></tr>";
        }).join("")
      : "<tr><td colspan='3'>No external links on this page.</td></tr>";

    document.querySelector("#suspicious-links").innerHTML = data.suspicious.length
      ? data.suspicious.slice(0, 40).map(function (l) {
          return "<tr><td>" + escapeHtml(l.reason) + "</td><td>" + escapeHtml(l.text) +
            "</td><td>" + escapeHtml(l.href) + "</td></tr>";
        }).join("")
      : "<tr><td colspan='3'>None flagged.</td></tr>";

    var hireLink = document.querySelector("#hire-after-scan a.btn");
    if (hireLink) {
      hireLink.href =
        "mailto:tolentinojohnlester3@gmail.com?subject=" +
        encodeURIComponent("SEO expert inquiry - " + data.pageUrl) +
        "&body=" +
        encodeURIComponent(
          "Hi John,\n\nI ran your free SEO analyzer and want help improving my site and increasing its value.\n\nWebsite: " +
            data.pageUrl +
            "\nAnalyzer grade: " +
            data.grade +
            " (" +
            data.gradePct +
            "%)\n\nPlease tell me about your SEO services.\n"
        );
    }

    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function parseBacklinkCsv(text) {
    var lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    var header = lines[0].toLowerCase();
    var rows = lines.slice(1);
    return rows.map(function (line) {
      var parts = line.split(/,|\t/).map(function (p) { return p.trim().replace(/^"|"$/g, ""); });
      if (!parts[0]) return null;
      // try common export shapes: referring domain / url, domain rating, spam score, etc.
      return {
        source: parts[0],
        metric1: parts[1] || "—",
        metric2: parts[2] || "—",
        metric3: parts[3] || "—"
      };
    }).filter(Boolean).slice(0, 200);
  }

  function runAnalysis(html, target, sourceLabel) {
    var report = analyze(html, target);
    hideStatus();
    showStatus("loading", "Analyzed via " + sourceLabel + ". Scroll down for the full report.");
    setTimeout(hideStatus, 2200);
    renderReport(report);
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var target = normalizeUrl(urlInput.value);
    var pasted = (document.querySelector("#paste-html") || {}).value || "";
    pasted = pasted.trim();

    if (!target && !pasted) {
      showStatus("error", "Enter a website URL, or paste page HTML below.");
      return;
    }
    if (target) {
      try {
        new URL(target);
      } catch (e) {
        showStatus("error", "That URL looks invalid.");
        return;
      }
    } else {
      target = "https://pasted-html.local/";
    }

    results.hidden = true;
    var btn = form.querySelector("button[type='submit']");
    btn.disabled = true;

    // Prefer pasted HTML when provided (bypasses site blocks)
    if (pasted && looksLikeHtml(pasted)) {
      try {
        showStatus("loading", "Analyzing pasted HTML …");
        runAnalysis(pasted, target, "pasted HTML");
      } catch (err) {
        showStatus("error", "Could not parse the pasted HTML.");
      } finally {
        btn.disabled = false;
      }
      return;
    }

    showStatus("loading", "Fetching and analyzing " + target + " …");

    try {
      var html = await fetchHtml(target);
      runAnalysis(html, target, "live fetch");
    } catch (err) {
      var pasteBox = document.querySelector("#paste-html");
      if (pasteBox) {
        pasteBox.focus();
        var details = document.querySelector("#paste-details");
        if (details) details.open = true;
      }
      showStatus(
        "error",
        "Live fetch failed for that site. Open the page → right-click → View Page Source → copy all → paste in “Paste HTML” below, then click Run again."
      );
    } finally {
      btn.disabled = false;
    }
  });

  importBtn.addEventListener("click", function () {
    var file = backlinkFile.files && backlinkFile.files[0];
    if (!file) {
      showStatus("error", "Choose an Ahrefs, Semrush, or Moz backlink CSV first.");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var rows = parseBacklinkCsv(reader.result || "");
      if (!rows.length) {
        showStatus("error", "No rows found in that CSV.");
        return;
      }
      hideStatus();
      results.hidden = false;
      var box = document.querySelector("#backlink-import-results");
      box.hidden = false;
      document.querySelector("#backlink-count").textContent = rows.length;
      document.querySelector("#backlink-rows").innerHTML = rows.slice(0, 100).map(function (r) {
        return "<tr><td>" + escapeHtml(r.source) + "</td><td>" + escapeHtml(r.metric1) +
          "</td><td>" + escapeHtml(r.metric2) + "</td><td>" + escapeHtml(r.metric3) + "</td></tr>";
      }).join("");
      box.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    reader.readAsText(file);
  });
})();
