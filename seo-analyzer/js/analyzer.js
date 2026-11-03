(function () {
  var core = window.JltSeoCore;
  var form = document.querySelector("#analyze-form");
  var urlInput = document.querySelector("#site-url");
  var statusEl = document.querySelector("#status");
  var results = document.querySelector("#results");
  var backlinkFile = document.querySelector("#backlink-file");
  var importBtn = document.querySelector("#import-backlinks");

  function showStatus(type, message) {
    statusEl.className = type;
    statusEl.hidden = false;
    statusEl.textContent = message;
  }
  function hideStatus() {
    statusEl.hidden = true;
    statusEl.textContent = "";
  }

  async function fetchHtml(targetUrl) {
    var enc = encodeURIComponent(targetUrl);
    var lastError = null;

    // IMPORTANT: do not send custom headers (they trigger CORS preflight and break browser fetch)
    var attempts = [
      {
        name: "jina",
        run: async function () {
          var res = await fetch("https://r.jina.ai/" + targetUrl, { method: "GET" });
          if (!res.ok) throw new Error("Jina HTTP " + res.status);
          var text = await res.text();
          if (core.looksLikeHtml(text)) return text;
          // Jina often returns markdown in browsers; convert it
          if (/^Title:\s*/m.test(text) || text.indexOf("URL Source:") !== -1 || text.indexOf("Markdown") !== -1) {
            return core.markdownToHtml(text, targetUrl);
          }
          throw new Error("Jina returned unusable content");
        }
      },
      {
        name: "allorigins-json",
        run: async function () {
          var res = await fetch("https://api.allorigins.win/get?url=" + enc);
          if (!res.ok) throw new Error("allorigins HTTP " + res.status);
          var data = await res.json();
          var text = (data && (data.contents || data.content)) || "";
          if (!core.looksLikeHtml(text)) throw new Error("allorigins non-HTML");
          return text;
        }
      },
      {
        name: "allorigins-raw",
        run: async function () {
          var res = await fetch("https://api.allorigins.win/raw?url=" + enc);
          if (!res.ok) throw new Error("allorigins raw HTTP " + res.status);
          var text = await res.text();
          if (!core.looksLikeHtml(text)) throw new Error("allorigins raw non-HTML");
          return text;
        }
      },
      {
        name: "corsproxy",
        run: async function () {
          var res = await fetch("https://corsproxy.io/?" + enc);
          if (!res.ok) throw new Error("corsproxy HTTP " + res.status);
          var text = await res.text();
          if (!core.looksLikeHtml(text)) throw new Error("corsproxy non-HTML");
          return text;
        }
      },
      {
        name: "codetabs",
        run: async function () {
          var res = await fetch("https://api.codetabs.com/v1/proxy?quest=" + enc);
          if (!res.ok) throw new Error("codetabs HTTP " + res.status);
          var text = await res.text();
          if (!core.looksLikeHtml(text)) throw new Error("codetabs non-HTML");
          return text;
        }
      },
      {
        name: "isomorphic-git-cors",
        run: async function () {
          var res = await fetch("https://cors.isomorphic-git.org/" + targetUrl);
          if (!res.ok) throw new Error("isomorphic-git cors HTTP " + res.status);
          var text = await res.text();
          if (!core.looksLikeHtml(text)) throw new Error("isomorphic-git cors non-HTML");
          return text;
        }
      }
    ];

    for (var i = 0; i < attempts.length; i++) {
      try {
        return await attempts[i].run();
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("Could not fetch page");
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

    document.querySelector("#seo-checks").innerHTML = data.checks.map(function (c) {
      return '<div class="check ' + c.status + '"><div><span class="badge ' + c.status + '">' + c.status.toUpperCase() +
        "</span></div><strong>" + core.escapeHtml(c.title) + "</strong><p>" + core.escapeHtml(c.detail) + "</p></div>";
    }).join("");

    document.querySelector("#external-domains").innerHTML = data.domainList.length
      ? data.domainList.slice(0, 40).map(function (d) {
          return "<tr><td>" + core.escapeHtml(d.domain) + "</td><td>" + d.count + "</td></tr>";
        }).join("")
      : "<tr><td colspan='2'>No external domains found on this page.</td></tr>";

    document.querySelector("#external-links").innerHTML = data.external.length
      ? data.external.slice(0, 60).map(function (l) {
          return "<tr><td>" + core.escapeHtml(l.text) + "</td><td><a href=\"" + core.escapeHtml(l.href) +
            "\" target=\"_blank\" rel=\"noopener noreferrer\">" + core.escapeHtml(l.href) +
            "</a></td><td>" + (l.nofollow ? "nofollow" : "dofollow") + "</td></tr>";
        }).join("")
      : "<tr><td colspan='3'>No external links on this page.</td></tr>";

    document.querySelector("#suspicious-links").innerHTML = data.suspicious.length
      ? data.suspicious.slice(0, 40).map(function (l) {
          return "<tr><td>" + core.escapeHtml(l.reason) + "</td><td>" + core.escapeHtml(l.text) +
            "</td><td>" + core.escapeHtml(l.href) + "</td></tr>";
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

  function runAnalysis(html, target, sourceLabel) {
    var report = core.analyze(html, target);
    hideStatus();
    showStatus("loading", "Analyzed via " + sourceLabel + ". Scroll down for the full report.");
    setTimeout(hideStatus, 2200);
    renderReport(report);
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var target = core.normalizeUrl(urlInput.value);
    var pasted = ((document.querySelector("#paste-html") || {}).value || "").trim();

    // If user pasted a URL into the HTML box by mistake, treat it as the site URL
    if (core.looksLikeUrlOnly(pasted)) {
      target = core.normalizeUrl(pasted);
      pasted = "";
      urlInput.value = target;
    }

    if (!target && !pasted) {
      showStatus("error", "Enter a website URL first.");
      return;
    }
    if (target) {
      try { new URL(target); } catch (e) {
        showStatus("error", "That URL looks invalid.");
        return;
      }
    } else {
      target = "https://pasted-html.local/";
    }

    results.hidden = true;
    var btn = form.querySelector("button[type='submit']");
    btn.disabled = true;

    if (pasted) {
      if (!core.looksLikeHtml(pasted)) {
        showStatus("error", "Paste the full page HTML (View Page Source), not just the URL. Or use the Chrome extension to analyze the open tab.");
        btn.disabled = false;
        return;
      }
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
      var details = document.querySelector("#paste-details");
      if (details) details.open = true;
      showStatus(
        "error",
        "This website blocks browser website tools (CORS/protection). Easiest fix: install the free JLT Chrome extension and click Analyze on the open tab — same method SEO extensions use. Or paste View Page Source HTML below."
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
      var lines = String(reader.result || "").split(/\r?\n/).filter(Boolean);
      var rows = lines.slice(1).map(function (line) {
        var parts = line.split(/,|\t/).map(function (p) { return p.trim().replace(/^"|"$/g, ""); });
        if (!parts[0]) return null;
        return { source: parts[0], metric1: parts[1] || "—", metric2: parts[2] || "—", metric3: parts[3] || "—" };
      }).filter(Boolean).slice(0, 200);
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
        return "<tr><td>" + core.escapeHtml(r.source) + "</td><td>" + core.escapeHtml(r.metric1) +
          "</td><td>" + core.escapeHtml(r.metric2) + "</td><td>" + core.escapeHtml(r.metric3) + "</td></tr>";
      }).join("");
      box.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    reader.readAsText(file);
  });
})();
