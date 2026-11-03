(function () {
  const urlEl = document.getElementById("page-url");
  const btn = document.getElementById("analyze-btn");
  const status = document.getElementById("status");
  const report = document.getElementById("report");
  let tabId = null;
  let pageUrl = "";

  function setStatus(msg, isError) {
    status.hidden = !msg;
    status.textContent = msg || "";
    status.classList.toggle("error", !!isError);
  }

  function esc(s) {
    return window.JltSeoCore.escapeHtml(s);
  }

  function render(result) {
    const checks = (result.checks || [])
      .map(function (c) {
        return (
          '<div class="check"><span class="badge ' +
          esc(c.status) +
          '">' +
          esc(c.status) +
          "</span><div><strong>" +
          esc(c.title) +
          "</strong><br>" +
          esc(c.detail) +
          "</div></div>"
        );
      })
      .join("");
    report.hidden = false;
    report.innerHTML =
      '<div class="grade"><div>SEO grade</div><b>' +
      esc(result.grade) +
      '</b><div style="color:#5b6472;font-size:12px;margin-top:4px">' +
      esc(result.gradePct) +
      "% · " +
      esc(result.title || "No title") +
      '</div></div><div class="stats"><div><strong>' +
      esc((result.h1s && result.h1s.length) || 0) +
      "</strong>H1 tags</div><div><strong>" +
      esc(result.missingAlt) +
      "</strong>Images no alt</div><div><strong>" +
      esc((result.internal && result.internal.length) || 0) +
      "</strong>Internal links</div><div><strong>" +
      esc((result.external && result.external.length) || 0) +
      "</strong>External links</div></div><div class=\"checks\">" +
      checks +
      "</div>";
  }

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var tab = tabs && tabs[0];
    if (!tab || !tab.id) {
      urlEl.textContent = "No active tab";
      btn.disabled = true;
      return;
    }
    tabId = tab.id;
    pageUrl = tab.url || "";
    urlEl.textContent = pageUrl || "(no URL)";
    if (!/^https?:/i.test(pageUrl)) {
      btn.disabled = true;
      setStatus("Open a normal http(s) page first (not chrome:// or the Web Store).", true);
    }
  });

  btn.addEventListener("click", function () {
    if (!tabId) return;
    btn.disabled = true;
    setStatus("Reading page HTML from this tab…");
    report.hidden = true;
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        func: function () {
          return document.documentElement.outerHTML;
        },
      },
      function (injection) {
        try {
          if (chrome.runtime.lastError) throw new Error(chrome.runtime.lastError.message);
          var html = injection && injection[0] && injection[0].result;
          if (!html || html.length < 40) throw new Error("Could not read page HTML.");
          var result = window.JltSeoCore.analyze(html, pageUrl);
          setStatus("Done — analyzed from the open tab (no CORS).");
          render(result);
        } catch (err) {
          setStatus((err && err.message) || "Analyze failed. Refresh the page and try again.", true);
        } finally {
          btn.disabled = false;
        }
      }
    );
  });
})();
