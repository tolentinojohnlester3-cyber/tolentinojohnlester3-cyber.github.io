(function () {
  var STORE_KEY = "seo-automation-free-v1";

  function uid() {
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }
  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function showToast(message) {
    var toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove("show"); }, 2600);
  }

  function defaultState() {
    return {
      version: 1,
      project: { name: "", url: "", days: "Tuesday, Thursday", time: "09:00", timezone: "Asia/Manila", mode: "free-local" },
      keywords: [],
      topics: [],
      drafts: [],
      articles: [],
      offpage: [],
      techPages: [],
      gscRows: [],
      gscMeta: { baselineLabel: "", latestLabel: "" },
      tasks: [],
      sources: [],
      mapSuggestions: [],
      social: { linkedin: "", facebook: "" },
      psiKeyNote: ""
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultState();
      return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) {
      return defaultState();
    }
  }

  function save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  var state = load();
  // fix old bad seed phrase if present
  state.keywords.forEach(function (k) {
    if (/JLT\)ilippines/i.test(k.phrase || "")) k.phrase = "seo specialist philippines";
  });

  var step = 1;
  var STEPS = [
    { id: 1, title: "1. Setup", desc: "Website + keywords" },
    { id: 2, title: "2. Topics", desc: "Approve ideas" },
    { id: 3, title: "3. Drafts", desc: "Edit & approve" },
    { id: 4, title: "4. Publish", desc: "Schedule & extras" }
  ];

  function scoreTopic(title) {
    var base = 62 + Math.min(20, title.length % 21);
    var hit = state.keywords.some(function (k) {
      var first = String(k.phrase || "").toLowerCase().split(" ")[0];
      return first && title.toLowerCase().indexOf(first) !== -1;
    });
    if (hit) base += 12;
    return Math.min(95, base);
  }

  function buildDraft(topic) {
    var primary = (state.keywords[0] && state.keywords[0].phrase) || "your main keyword";
    var body = [
      "# " + topic.title,
      "",
      "Primary focus: " + primary + ".",
      "",
      "## Who this is for",
      "People searching for help related to this topic on " + (state.project.url || "your website") + ".",
      "",
      "## What to cover",
      "1. Explain the problem in plain language.",
      "2. Give clear steps a beginner can follow.",
      "3. Link to one important page on your site.",
      "4. Add a short FAQ with 2 real questions.",
      "",
      "## Before you publish",
      "Edit facts, add your examples, then approve this draft."
    ].join("\n");
    return {
      id: uid(),
      topicId: topic.id,
      title: topic.title,
      body: body,
      sources: ["Keyword list", state.project.url || "Site URL"],
      status: "draft",
      updatedAt: new Date().toISOString()
    };
  }

  function nextPublishDate() {
    var d = new Date();
    d.setDate(d.getDate() + ((2 + 7 - d.getDay()) % 7 || 7));
    return d.toISOString().slice(0, 10);
  }

  function runAutomation() {
    var made = 0;
    state.topics.filter(function (t) { return t.status === "approved"; }).forEach(function (topic) {
      if (!state.drafts.some(function (d) { return d.topicId === topic.id; })) {
        state.drafts.unshift(buildDraft(topic));
        made += 1;
      }
    });
    state.drafts.filter(function (d) { return d.status === "approved"; }).forEach(function (draft) {
      if (!state.articles.some(function (a) { return a.draftId === draft.id; })) {
        state.articles.unshift({
          id: uid(), draftId: draft.id, title: draft.title,
          date: nextPublishDate(), status: "scheduled", liveCheck: ""
        });
        made += 1;
      }
    });
    state.articles.forEach(function (article) {
      if (article.status === "scheduled" && article.date <= todayISO()) {
        article.status = "published";
        article.liveCheck = "Copy this draft into your CMS to publish live";
        if (!state.offpage.some(function (o) { return o.articleId === article.id; })) {
          state.offpage.unshift({
            id: uid(), articleId: article.id, platform: "LinkedIn",
            copy: "New guide: " + article.title + " — " + (state.project.url || ""),
            status: "ready", link: ""
          });
          state.offpage.unshift({
            id: uid(), articleId: article.id, platform: "Facebook",
            copy: article.title + " — practical tips for this week. " + (state.project.url || ""),
            status: "ready", link: ""
          });
        }
        made += 1;
      }
    });
    save();
    showToast(made ? ("Done · " + made + " update(s)") : "Nothing waiting — approve a topic or draft first");
    if (made && step < 4) {
      // nudge user forward
      if (state.drafts.some(function (d) { return d.status === "draft"; })) goStep(3);
      else goStep(4);
    } else {
      render();
    }
  }

  function parseKeywordCsv(text) {
    var lines = text.split(/\r?\n/).filter(Boolean);
    var rows = lines.slice(1).length ? lines.slice(1) : lines;
    return rows.map(function (line) {
      var parts = line.split(/,|\t/).map(function (p) { return p.trim().replace(/^"|"$/g, ""); });
      if (!parts[0]) return null;
      return { id: uid(), phrase: parts[0], volume: parts[1] || "—", kd: parts[2] || "—", type: parts[3] || "Supporting" };
    }).filter(Boolean);
  }

  function goStep(n) {
    step = Math.max(1, Math.min(4, n));
    location.hash = "step-" + step;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function counts() {
    return {
      openTopics: state.topics.filter(function (t) { return t.status === "open"; }).length,
      drafts: state.drafts.filter(function (d) { return d.status === "draft" || d.status === "changes"; }).length,
      scheduled: state.articles.filter(function (a) { return a.status === "scheduled"; }).length,
      offpage: state.offpage.filter(function (o) { return o.status !== "posted"; }).length
    };
  }

  function renderSteps() {
    var c = counts();
    document.querySelector("#step-nav").innerHTML = STEPS.map(function (s) {
      var active = s.id === step ? " active" : "";
      var done = s.id < step ? " done" : "";
      var badge = "";
      if (s.id === 2 && c.openTopics) badge = '<em>' + c.openTopics + "</em>";
      if (s.id === 3 && c.drafts) badge = '<em>' + c.drafts + "</em>";
      if (s.id === 4 && (c.scheduled || c.offpage)) badge = '<em>' + (c.scheduled + c.offpage) + "</em>";
      return '<button type="button" class="step-pill' + active + done + '" data-go-step="' + s.id + '">' +
        "<strong>" + s.title + "</strong><span>" + s.desc + "</span>" + badge + "</button>";
    }).join("");
  }

  function renderStep1() {
    return (
      '<section class="panel easy-panel">' +
        "<h2>Website setup</h2>" +
        '<p class="muted">Fill this once. Everything else uses these details.</p>' +
        '<div class="form-grid">' +
          '<label for="p-name">Project / brand name</label>' +
          '<input id="p-name" value="' + escapeHtml(state.project.name) + '" placeholder="e.g. AMSI Doctors">' +
          '<label for="p-url">Website URL</label>' +
          '<input id="p-url" value="' + escapeHtml(state.project.url) + '" placeholder="https://example.com">' +
          '<label for="p-days">Publishing days</label>' +
          '<input id="p-days" value="' + escapeHtml(state.project.days) + '" placeholder="Tuesday, Thursday">' +
        "</div>" +
        '<div class="row-actions" style="margin-top:14px">' +
          '<button class="btn btn-blue" type="button" id="save-setup">Save setup</button>' +
        "</div>" +
      "</section>" +
      '<section class="panel easy-panel">' +
        "<h2>Keywords</h2>" +
        '<p class="muted">Add a few focus phrases, or import a CSV (phrase, volume, kd).</p>' +
        '<div class="easy-inline">' +
          '<input id="kw-one" placeholder="Add one keyword, e.g. local seo manila">' +
          '<button class="btn btn-line btn-sm" type="button" id="kw-add">Add</button>' +
        "</div>" +
        '<div class="easy-inline" style="margin-top:10px">' +
          '<input type="file" id="kw-file" accept=".csv,.txt,.tsv">' +
          '<button class="btn btn-line btn-sm" type="button" id="kw-import">Import CSV</button>' +
        "</div>" +
        '<div class="chip-list" id="kw-list"></div>' +
      "</section>" +
      '<div class="easy-nav">' +
        '<span class="muted">Next: choose article topics</span>' +
        '<button class="btn btn-orange" type="button" data-go-step="2">Continue to Topics →</button>' +
      "</div>"
    );
  }

  function renderStep2() {
    var open = state.topics.filter(function (t) { return t.status === "open"; });
    var approved = state.topics.filter(function (t) { return t.status === "approved"; });
    return (
      '<section class="panel easy-panel">' +
        "<h2>Add or approve topics</h2>" +
        '<p class="muted">Approve topics you want written. Then click Run to create drafts.</p>' +
        '<div class="easy-inline">' +
          '<input id="new-topic" placeholder="Article title idea">' +
          '<button class="btn btn-blue btn-sm" type="button" id="add-topic">Add topic</button>' +
        "</div>" +
        (open.length ? open.map(function (t) {
          return '<div class="list-row"><div><strong>' + escapeHtml(t.title) + '</strong>' +
            '<div class="muted">Score ' + t.score + " · " + escapeHtml(t.cluster || "General") + "</div></div>" +
            '<div class="row-actions">' +
            '<button class="btn btn-green btn-sm" data-approve-topic="' + t.id + '">Approve</button>' +
            '<button class="btn btn-line btn-sm" data-reject-topic="' + t.id + '">Reject</button>' +
            "</div></div>";
        }).join("") : '<p class="muted" style="margin-top:12px">No open topics. Add one above.</p>') +
      "</section>" +
      '<section class="panel easy-panel">' +
        "<h2>Approved · ready to draft (" + approved.length + ")</h2>" +
        (approved.length ? approved.map(function (t) {
          return '<div class="list-row"><div><strong>' + escapeHtml(t.title) + "</strong></div><span class=\"badge badge-live\">Approved</span></div>";
        }).join("") : '<p class="muted">Approve at least one topic, then Run.</p>') +
        '<div class="row-actions" style="margin-top:12px">' +
          '<button class="btn btn-orange" type="button" id="run-now">▶ Run · create drafts</button>' +
        "</div>" +
      "</section>" +
      '<div class="easy-nav">' +
        '<button class="btn btn-line" type="button" data-go-step="1">← Back</button>' +
        '<button class="btn btn-orange" type="button" data-go-step="3">Continue to Drafts →</button>' +
      "</div>"
    );
  }

  function renderStep3() {
    var drafts = state.drafts;
    return (
      '<section class="panel easy-panel">' +
        "<h2>Review drafts</h2>" +
        '<p class="muted">Edit the outline, then approve. Approved drafts get scheduled on the next step.</p>' +
        (drafts.length ? drafts.map(function (d) {
          return '<article class="draft-box" style="margin-top:12px">' +
            "<h3>" + escapeHtml(d.title) + '</h3>' +
            '<p class="muted">Status: ' + escapeHtml(d.status) + "</p>" +
            '<textarea data-draft-body="' + d.id + '" rows="10">' + escapeHtml(d.body) + "</textarea>" +
            '<div class="row-actions" style="margin-top:10px">' +
            '<button class="btn btn-line btn-sm" data-save-draft="' + d.id + '">Save</button>' +
            '<button class="btn btn-green btn-sm" data-approve-draft="' + d.id + '">Approve</button>' +
            '<button class="btn btn-line btn-sm" data-changes-draft="' + d.id + '">Needs changes</button>' +
            "</div></article>";
        }).join("") : '<p class="muted">No drafts yet. Go to Topics, approve ideas, then click Run.</p>') +
      "</section>" +
      '<div class="easy-nav">' +
        '<button class="btn btn-line" type="button" data-go-step="2">← Back</button>' +
        '<div class="row-actions">' +
          '<button class="btn btn-line" type="button" id="run-now">▶ Run · schedule approved</button>' +
          '<button class="btn btn-orange" type="button" data-go-step="4">Continue to Publish →</button>' +
        "</div>" +
      "</div>"
    );
  }

  function renderStep4() {
    var articles = state.articles;
    var off = state.offpage.filter(function (o) { return o.status !== "posted"; });
    return (
      '<section class="panel easy-panel">' +
        "<h2>Schedule &amp; published</h2>" +
        (articles.length ? articles.map(function (a) {
          return '<div class="list-row"><div><strong>' + escapeHtml(a.title) + '</strong><div class="muted">' +
            escapeHtml(a.date) + (a.liveCheck ? " · " + escapeHtml(a.liveCheck) : "") +
            "</div></div><span class=\"badge badge-done\">" + escapeHtml(a.status) + "</span></div>";
        }).join("") : '<p class="muted">Nothing scheduled yet. Approve a draft, then Run.</p>') +
        '<p class="muted" style="margin-top:10px">Free tool tip: copy an approved draft into WordPress when you publish live.</p>' +
      "</section>" +
      '<section class="panel easy-panel">' +
        "<h2>Off-page posts to publish yourself</h2>" +
        (off.length ? off.map(function (o) {
          return '<div class="list-row"><div><strong>' + escapeHtml(o.platform) + '</strong>' +
            '<div class="draft-box" style="margin-top:8px"><p>' + escapeHtml(o.copy) + "</p></div></div>" +
            '<div class="row-actions">' +
            '<button class="btn btn-line btn-sm" data-copy-off="' + o.id + '">Copy</button>' +
            '<button class="btn btn-green btn-sm" data-mark-off="' + o.id + '">Mark posted</button>' +
            "</div></div>";
        }).join("") : '<p class="muted">Social posts appear after a scheduled date passes and you Run.</p>') +
      "</section>" +
      '<section class="panel easy-panel">' +
        "<h2>Extras (optional)</h2>" +
        '<details class="easy-details"><summary>Search Console CSV</summary>' +
          '<div class="easy-inline" style="margin-top:10px"><input type="file" id="gsc-file" accept=".csv,.txt,.tsv">' +
          '<button class="btn btn-line btn-sm" type="button" id="gsc-import">Import</button></div>' +
          '<p class="muted">' + state.gscRows.length + " queries loaded</p></details>" +
        '<details class="easy-details"><summary>Backup / restore</summary>' +
          '<div class="row-actions" style="margin-top:10px">' +
          '<button class="btn btn-blue btn-sm" type="button" id="dl-backup">Download backup</button>' +
          '<input type="file" id="restore-file" accept=".json">' +
          '<button class="btn btn-line btn-sm" type="button" id="restore-backup">Restore</button>' +
          "</div></details>" +
        '<details class="easy-details"><summary>Quick task</summary>' +
          '<div class="easy-inline" style="margin-top:10px"><input id="task-one" placeholder="Add a reminder task">' +
          '<button class="btn btn-line btn-sm" type="button" id="add-task">Add</button></div>' +
          (state.tasks.slice(0, 5).map(function (t) {
            return '<div class="list-row"><div>' + escapeHtml(t.text) + '</div><span class="badge badge-draft">' + escapeHtml(t.status) + "</span></div>";
          }).join("") || "") +
        "</details>" +
      "</section>" +
      '<aside class="hire-cta-panel">' +
        "<h3>Want deeper SEO to increase your site’s value?</h3>" +
        "<p>Hire me as your SEO expert for audits, content strategy, and growth work.</p>" +
        '<a class="btn btn-orange" href="mailto:tolentinojohnlester3@gmail.com?subject=Hire%20SEO%20expert%20-%20John%20Lester%20Tolentino">Hire me as SEO expert</a>' +
      "</aside>" +
      '<div class="easy-nav">' +
        '<button class="btn btn-line" type="button" data-go-step="3">← Back</button>' +
        '<button class="btn btn-orange" type="button" id="run-now">▶ Run automation</button>' +
      "</div>"
    );
  }

  function renderKeywords() {
    var box = document.querySelector("#kw-list");
    if (!box) return;
    box.innerHTML = state.keywords.length
      ? state.keywords.map(function (k) {
          return '<span class="chip">' + escapeHtml(k.phrase) +
            ' <button type="button" data-del-kw="' + k.id + '" aria-label="Remove">×</button></span>';
        }).join("")
      : '<p class="muted">No keywords yet.</p>';
  }

  function render() {
    renderSteps();
    var c = counts();
    document.querySelector("#easy-stats").innerHTML =
      '<div class="stat"><b>' + (state.project.url ? "✓" : "—") + "</b><span>Setup</span></div>" +
      '<div class="stat warn"><b>' + c.openTopics + "</b><span>Open topics</span></div>" +
      '<div class="stat alert"><b>' + c.drafts + "</b><span>Drafts to review</span></div>" +
      '<div class="stat ok"><b>' + c.scheduled + "</b><span>Scheduled</span></div>";

    var root = document.querySelector("#easy-view");
    if (step === 1) root.innerHTML = renderStep1();
    if (step === 2) root.innerHTML = renderStep2();
    if (step === 3) root.innerHTML = renderStep3();
    if (step === 4) root.innerHTML = renderStep4();
    if (step === 1) renderKeywords();
    document.querySelector("#step-label").textContent = STEPS[step - 1].title;
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    var go = t.closest("[data-go-step]");
    if (go) goStep(Number(go.getAttribute("data-go-step")));

    if (t.closest("#save-setup")) {
      state.project.name = document.querySelector("#p-name").value.trim();
      state.project.url = document.querySelector("#p-url").value.trim();
      state.project.days = document.querySelector("#p-days").value.trim() || state.project.days;
      save();
      showToast("Setup saved");
      render();
    }
    if (t.closest("#kw-add")) {
      var phrase = (document.querySelector("#kw-one").value || "").trim();
      if (!phrase) return showToast("Enter a keyword");
      state.keywords.unshift({ id: uid(), phrase: phrase, volume: "—", kd: "—", type: "Supporting" });
      save();
      render();
    }
    if (t.closest("#kw-import")) {
      var file = document.querySelector("#kw-file").files[0];
      if (!file) return showToast("Choose a CSV file");
      var reader = new FileReader();
      reader.onload = function () {
        var rows = parseKeywordCsv(reader.result);
        if (!rows.length) return showToast("No rows found");
        state.keywords = rows.concat(state.keywords);
        save();
        showToast(rows.length + " keywords imported");
        render();
      };
      reader.readAsText(file);
    }
    var delKw = t.closest("[data-del-kw]");
    if (delKw) {
      var kid = delKw.getAttribute("data-del-kw");
      state.keywords = state.keywords.filter(function (k) { return k.id !== kid; });
      save();
      render();
    }
    if (t.closest("#add-topic")) {
      var title = (document.querySelector("#new-topic").value || "").trim();
      if (!title) return showToast("Enter a topic title");
      state.topics.unshift({
        id: uid(), title: title, score: scoreTopic(title),
        demand: "Med", competition: "Med", cluster: "General", status: "open"
      });
      save();
      render();
    }
    var ap = t.closest("[data-approve-topic]");
    if (ap) {
      var aid = ap.getAttribute("data-approve-topic");
      state.topics.forEach(function (topic) { if (topic.id === aid) topic.status = "approved"; });
      save();
      showToast("Approved — click Run to draft");
      render();
    }
    var rj = t.closest("[data-reject-topic]");
    if (rj) {
      var rid = rj.getAttribute("data-reject-topic");
      state.topics.forEach(function (topic) { if (topic.id === rid) topic.status = "rejected"; });
      save();
      render();
    }
    if (t.closest("#run-now") || t.closest("[data-run]")) runAutomation();

    var sd = t.closest("[data-save-draft]");
    if (sd) {
      var sid = sd.getAttribute("data-save-draft");
      var area = document.querySelector('[data-draft-body="' + sid + '"]');
      state.drafts.forEach(function (d) {
        if (d.id === sid && area) d.body = area.value;
      });
      save();
      showToast("Draft saved");
    }
    var ad = t.closest("[data-approve-draft]");
    if (ad) {
      var did = ad.getAttribute("data-approve-draft");
      var bodyEl = document.querySelector('[data-draft-body="' + did + '"]');
      state.drafts.forEach(function (d) {
        if (d.id === did) {
          if (bodyEl) d.body = bodyEl.value;
          d.status = "approved";
        }
      });
      save();
      showToast("Draft approved — Run to schedule");
      render();
    }
    var cd = t.closest("[data-changes-draft]");
    if (cd) {
      var cid = cd.getAttribute("data-changes-draft");
      state.drafts.forEach(function (d) { if (d.id === cid) d.status = "changes"; });
      save();
      render();
    }
    var copyOff = t.closest("[data-copy-off]");
    if (copyOff) {
      var oid = copyOff.getAttribute("data-copy-off");
      var item = state.offpage.filter(function (o) { return o.id === oid; })[0];
      if (item && navigator.clipboard) navigator.clipboard.writeText(item.copy).then(function () { showToast("Copied"); });
    }
    var markOff = t.closest("[data-mark-off]");
    if (markOff) {
      var mid = markOff.getAttribute("data-mark-off");
      state.offpage.forEach(function (o) { if (o.id === mid) o.status = "posted"; });
      save();
      render();
    }
    if (t.closest("#gsc-import")) {
      var gfile = document.querySelector("#gsc-file").files[0];
      if (!gfile) return showToast("Choose a file");
      var gr = new FileReader();
      gr.onload = function () {
        var lines = String(gr.result || "").split(/\r?\n/).filter(Boolean).slice(1);
        state.gscRows = lines.map(function (line) {
          var p = line.split(/,|\t/).map(function (x) { return x.trim().replace(/^"|"$/g, ""); });
          if (!p[0]) return null;
          return { id: uid(), query: p[0], clicks: p[1] || "0", impressions: p[2] || "0", ctr: p[3] || "—", position: p[4] || "—" };
        }).filter(Boolean).slice(0, 100);
        save();
        showToast(state.gscRows.length + " queries imported");
        render();
      };
      gr.readAsText(gfile);
    }
    if (t.closest("#dl-backup")) {
      var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "seo-automation-backup-" + todayISO() + ".json";
      a.click();
      showToast("Backup downloaded");
    }
    if (t.closest("#restore-backup")) {
      var rfile = document.querySelector("#restore-file").files[0];
      if (!rfile) return showToast("Choose a backup JSON");
      var rr = new FileReader();
      rr.onload = function () {
        try {
          state = Object.assign(defaultState(), JSON.parse(rr.result));
          save();
          showToast("Backup restored");
          render();
        } catch (err) {
          showToast("Invalid backup file");
        }
      };
      rr.readAsText(rfile);
    }
    if (t.closest("#add-task")) {
      var text = (document.querySelector("#task-one").value || "").trim();
      if (!text) return showToast("Write a task");
      state.tasks.unshift({ id: uid(), text: text, priority: "Normal", status: "Queued" });
      save();
      render();
    }
  });

  // hash deep-link support from old pages
  var hash = (location.hash || "").replace("#", "");
  if (hash.indexOf("step-") === 0) step = Number(hash.replace("step-", "")) || 1;
  else if (/topic|map|keyword/i.test(hash)) step = 2;
  else if (/review|draft/i.test(hash)) step = 3;
  else if (/schedule|off-page|backup|report|tech|console|task/i.test(hash)) step = 4;

  render();
})();
