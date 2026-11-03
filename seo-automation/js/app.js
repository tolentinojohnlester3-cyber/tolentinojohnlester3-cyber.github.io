(function () {
  const STORE_KEY = "seo-automation-free-v1";

  const NAV = [
    { href: "overview.html", label: "Overview", countKey: "review", tone: "red" },
    { href: "topical-map.html", label: "Topical map" },
    { href: "content-calendar.html", label: "Content calendar" },
    { href: "keyword-research.html", label: "Keyword research" },
    { href: "research-sources.html", label: "Research and sources" },
    { href: "topic-ideas.html", label: "Topic ideas", countKey: "topics", tone: "amber" },
    { href: "review-approve.html", label: "Review and approve", countKey: "review", tone: "red" },
    { href: "scheduled-published.html", label: "Scheduled and published" },
    { href: "off-page-seo.html", label: "Off-Page SEO", countKey: "offpage", tone: "amber" },
    { href: "technical-seo.html", label: "Technical SEO" },
    { href: "search-console.html", label: "Search Console data" },
    { href: "monthly-report.html", label: "Monthly report" },
    { href: "tasks.html", label: "Tasks" },
    { href: "project-settings.html", label: "Project settings" },
    { href: "backup.html", label: "Backup and move" }
  ];

  function uid() {
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function defaultState() {
    return {
      version: 1,
      project: {
        name: "My website",
        url: "https://example.com",
        days: "Tuesday, Thursday",
        time: "09:00",
        timezone: "Asia/Manila",
        mode: "free-local"
      },
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
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return seedIfEmpty(defaultState());
      return seedIfEmpty(Object.assign(defaultState(), JSON.parse(raw)));
    } catch (e) {
      return seedIfEmpty(defaultState());
    }
  }

  function save(state) {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  function seedIfEmpty(state) {
    if (state.topics.length || state.drafts.length || state.keywords.length) return state;
    state.keywords = [
      { id: uid(), phrase: "John Lester Tolentino (JLT)ilippines", volume: "720", kd: "28", type: "Primary" },
      { id: uid(), phrase: "local seo manila", volume: "210", kd: "18", type: "Supporting" },
      { id: uid(), phrase: "wordpress seo checklist", volume: "390", kd: "22", type: "Supporting" }
    ];
    state.topics = [
      { id: uid(), title: "How to choose a local SEO keyword", score: 86, demand: "High", competition: "Med", cluster: "Local", status: "open" },
      { id: uid(), title: "WordPress speed checklist for service sites", score: 81, demand: "Med", competition: "Low", cluster: "Technical", status: "open" },
      { id: uid(), title: "Google Business Profile photo tips", score: 78, demand: "Med", competition: "Low", cluster: "Local", status: "open" }
    ];
    state.mapSuggestions = state.topics.map(function (t) {
      return { id: t.id, title: t.title, score: t.score, cluster: t.cluster, status: t.status };
    });
    state.sources = [
      { id: uid(), title: "Your keyword list", note: "Loaded in Keyword research", usedIn: "Topic scoring" },
      { id: uid(), title: "Site structure notes", note: "From project URL", usedIn: "Topical map" }
    ];
    state.tasks = [
      { id: uid(), text: "Approve open topic ideas", priority: "High", status: "Waiting" },
      { id: uid(), text: "Upload a keyword CSV if you have Ahrefs/Semrush", priority: "Normal", status: "Queued" }
    ];
    state.techPages = [
      {
        id: uid(),
        path: "/",
        mobile: 70,
        desktop: 90,
        lcp: "2.9s",
        cls: "0.08",
        fixes: [
          { id: uid(), label: "Compress hero image", checked: true },
          { id: uid(), label: "Defer non-critical scripts", checked: false }
        ]
      }
    ];
    save(state);
    return state;
  }

  let state = load();

  function counts() {
    return {
      review: state.drafts.filter(function (d) { return d.status === "draft" || d.status === "changes"; }).length,
      topics: state.topics.filter(function (t) { return t.status === "open"; }).length,
      offpage: state.offpage.filter(function (o) { return o.status !== "posted"; }).length,
      scheduled: state.articles.filter(function (a) { return a.status === "scheduled"; }).length
    };
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
    showToast._t = setTimeout(function () {
      toast.classList.remove("show");
    }, 2800);
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function scoreTopic(title, keywords) {
    var base = 62 + Math.min(20, title.length % 21);
    var hit = keywords.some(function (k) {
      return title.toLowerCase().indexOf(String(k.phrase || "").toLowerCase().split(" ")[0]) !== -1;
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
      "Website owners who want a clear next article that matches search intent and their service pages.",
      "",
      "## What to cover",
      "1. Define the problem in plain language.",
      "2. Give a step-by-step answer a beginner can follow.",
      "3. Link to one service or pillar page on " + state.project.url + ".",
      "4. Add a short FAQ with two real questions customers ask.",
      "",
      "## Draft notes",
      "This free tool builds a starter outline in your browser. Edit the facts, add your examples, then approve before you publish anywhere.",
      "",
      "## Sources to check",
      "- Your keyword list",
      "- Your live page: " + state.project.url,
      "- Google Search Console queries for related phrases"
    ].join("\n");
    return {
      id: uid(),
      topicId: topic.id,
      title: topic.title,
      body: body,
      sources: ["Keyword list", state.project.url, "Manual fact check required"],
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
      var exists = state.drafts.some(function (d) { return d.topicId === topic.id; });
      if (!exists) {
        state.drafts.unshift(buildDraft(topic));
        state.sources.unshift({
          id: uid(),
          title: "Research brief · " + topic.title,
          note: "Auto-built starter outline",
          usedIn: topic.title
        });
        made += 1;
      }
    });

    state.drafts.filter(function (d) { return d.status === "approved"; }).forEach(function (draft) {
      var exists = state.articles.some(function (a) { return a.draftId === draft.id; });
      if (!exists) {
        var when = nextPublishDate();
        state.articles.unshift({
          id: uid(),
          draftId: draft.id,
          title: draft.title,
          date: when,
          status: "scheduled",
          liveCheck: ""
        });
        made += 1;
      }
    });

    state.articles.forEach(function (article) {
      if (article.status === "scheduled" && article.date <= todayISO()) {
        article.status = "published";
        article.liveCheck = "Local checklist: title set, URL noted, publish on your CMS yourself";
        var hasOff = state.offpage.some(function (o) { return o.articleId === article.id; });
        if (!hasOff) {
          state.offpage.unshift({
            id: uid(),
            articleId: article.id,
            platform: "LinkedIn",
            copy: "New guide: " + article.title + " — written for people searching related services. Read it on " + state.project.url,
            status: "ready",
            link: ""
          });
          state.offpage.unshift({
            id: uid(),
            articleId: article.id,
            platform: "Facebook",
            copy: article.title + " — a practical checklist you can use this week. " + state.project.url,
            status: "ready",
            link: ""
          });
        }
        made += 1;
      }
    });

    save(state);
    showToast(made ? ("Run finished · " + made + " update(s). Data stays in this browser.") : "Nothing waiting. Approve topics or drafts first.");
    renderAll();
  }

  function downloadBackup() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "seo-automation-free-backup-" + todayISO() + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Backup downloaded");
  }

  function importBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        state = Object.assign(defaultState(), data);
        save(state);
        showToast("Backup restored");
        renderAll();
      } catch (e) {
        showToast("Could not read that backup file");
      }
    };
    reader.readAsText(file);
  }

  function parseKeywordCsv(text) {
    var lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    var rows = lines.slice(1).length ? lines.slice(1) : lines;
    return rows.map(function (line) {
      var parts = line.split(/,|\t/).map(function (p) { return p.trim().replace(/^"|"$/g, ""); });
      if (!parts[0]) return null;
      return {
        id: uid(),
        phrase: parts[0],
        volume: parts[1] || "—",
        kd: parts[2] || "—",
        type: parts[3] || "Supporting"
      };
    }).filter(Boolean);
  }

  function parseGscCsv(text) {
    var lines = text.split(/\r?\n/).filter(Boolean).slice(1);
    return lines.map(function (line) {
      var parts = line.split(/,|\t/).map(function (p) { return p.trim().replace(/^"|"$/g, ""); });
      if (!parts[0]) return null;
      return {
        id: uid(),
        query: parts[0],
        clicks: parts[1] || "0",
        impressions: parts[2] || "0",
        ctr: parts[3] || "—",
        position: parts[4] || "—"
      };
    }).filter(Boolean).slice(0, 50);
  }

  function mountShell() {
    var page = (document.body.getAttribute("data-page") || "").trim();
    var mount = document.querySelector("[data-app-shell]");
    if (!mount) return;
    var c = counts();
    var navHtml = NAV.map(function (item) {
      var active = item.href === page ? " active" : "";
      var n = item.countKey ? c[item.countKey] : 0;
      var count = n ? '<span class="count count-' + item.tone + '">' + n + "</span>" : "";
      return '<a class="' + active.trim() + '" href="' + item.href + '"><span>' + item.label + "</span>" + count + "</a>";
    }).join("");

    mount.innerHTML =
      '<aside class="app-sidebar" id="app-sidebar" aria-label="App menu">' +
        '<a class="app-brand" href="../index.html">' +
          "<strong>SEO Automation Tool</strong>" +
          "<span>Free · saved in this browser</span>" +
        "</a>" +
        '<nav class="app-nav">' + navHtml + "</nav>" +
        '<div class="side-foot">' +
          "<div>Free tool · Version 3.0</div>" +
          '<a href="../guide.html">How to use</a> · ' +
          '<a href="../../index.html">Portfolio home</a>' +
        "</div>" +
      "</aside>" +
      '<div class="side-backdrop" data-close-side></div>';

    var title = document.body.getAttribute("data-title") || "SEO Automation";
    var top = document.querySelector("[data-app-top]");
    if (top) {
      top.innerHTML =
        '<button class="app-menu-btn" type="button" data-open-side aria-label="Open menu">☰</button>' +
        "<h1>" + escapeHtml(title) + "</h1>" +
        '<button class="run-btn" type="button" data-run>▶ Run free automation</button>';
    }
  }

  function renderOverview(root) {
    var c = counts();
    var reviews = state.drafts.filter(function (d) { return d.status === "draft" || d.status === "changes"; });
    var next = state.articles.filter(function (a) { return a.status === "scheduled"; })[0];
    var after = state.offpage.filter(function (o) { return o.status !== "posted"; });
    root.innerHTML =
      '<div class="stat-row">' +
        '<div class="stat alert"><b>' + c.review + "</b><span>Waiting for review</span></div>" +
        '<div class="stat warn"><b>' + c.topics + "</b><span>Topic ideas open</span></div>" +
        '<div class="stat ok"><b>' + c.scheduled + "</b><span>Scheduled</span></div>" +
        '<div class="stat"><b>Free</b><span>Local browser mode</span></div>' +
      "</div>" +
      '<section class="panel"><div class="panel-head"><h2>Waiting for your review</h2><a class="btn btn-line btn-sm" href="review-approve.html">Open review</a></div>' +
      (reviews.length ? reviews.map(function (d) {
        return '<div class="list-row"><div><strong>' + escapeHtml(d.title) + '</strong><div class="muted">Draft in this browser · edit then approve</div></div><span class="badge badge-wait">Review</span></div>';
      }).join("") : '<p class="muted">No drafts waiting. Approve a topic, then click Run.</p>') +
      "</section>" +
      '<section class="panel"><div class="panel-head"><h2>Goes live next</h2></div>' +
      (next
        ? '<div class="list-row"><div><strong>' + escapeHtml(next.title) + '</strong><div class="muted">' + escapeHtml(next.date) + " · publish on your site when ready</div></div><span class=\"badge badge-live\">Scheduled</span></div>"
        : '<p class="muted">Nothing scheduled yet.</p>') +
      "</section>" +
      '<section class="panel"><div class="panel-head"><h2>After publishing</h2><a class="btn btn-line btn-sm" href="off-page-seo.html">Off-Page SEO</a></div>' +
      (after.length
        ? '<div class="list-row"><div><strong>' + after.length + " social post(s) ready</strong><div class=\"muted\">Copy, post yourself, mark posted</div></div><span class=\"badge badge-draft\">Action</span></div>"
        : '<p class="muted">No off-page actions waiting.</p>') +
      "</section>";
  }

  function renderTopics(root) {
    root.innerHTML =
      '<section class="panel"><div class="panel-head"><h2>Add a topic idea</h2></div>' +
      '<div class="form-grid">' +
      '<label for="new-topic">Article title</label><input id="new-topic" placeholder="e.g. How to write service page titles">' +
      '<label for="new-cluster">Cluster</label><input id="new-cluster" placeholder="Local, Technical, Content…">' +
      '<button class="btn btn-blue btn-sm" type="button" id="add-topic" style="justify-self:start">Add topic</button>' +
      "</div></section>" +
      '<section class="panel"><div class="panel-head"><h2>Suggested articles</h2><span class="badge badge-wait">' + counts().topics + " open</span></div>" +
      state.topics.map(function (t) {
        return '<div class="list-row"><div><strong>' + escapeHtml(t.title) + "</strong>" +
          '<div class="scorecard"><div><b>' + t.score + "</b>Overall</div><div><b>" + escapeHtml(t.demand || "—") + "</b>Demand</div><div><b>" + escapeHtml(t.competition || "—") + "</b>Competition</div><div><b>" + escapeHtml(t.cluster || "—") + "</b>Cluster</div></div>" +
          '<div class="muted">Status: ' + escapeHtml(t.status) + "</div></div>" +
          (t.status === "open"
            ? '<div class="row-actions"><button class="btn btn-green btn-sm" data-approve-topic="' + t.id + '">Approve</button><button class="btn btn-line btn-sm" data-reject-topic="' + t.id + '">Reject</button></div>'
            : '<span class="badge badge-done">' + escapeHtml(t.status) + "</span>") +
          "</div>";
      }).join("") +
      "</section>";

    root.querySelector("#add-topic").onclick = function () {
      var title = (root.querySelector("#new-topic").value || "").trim();
      var cluster = (root.querySelector("#new-cluster").value || "General").trim();
      if (!title) return showToast("Enter a title");
      var topic = {
        id: uid(),
        title: title,
        score: scoreTopic(title, state.keywords),
        demand: "Med",
        competition: "Med",
        cluster: cluster,
        status: "open"
      };
      state.topics.unshift(topic);
      state.mapSuggestions.unshift({ id: topic.id, title: topic.title, score: topic.score, cluster: topic.cluster, status: "open" });
      save(state);
      showToast("Topic added");
      renderAll();
    };
  }

  function renderReview(root) {
    var drafts = state.drafts;
    root.innerHTML =
      '<section class="panel"><div class="panel-head"><h2>Draft queue</h2><span class="badge badge-wait">' + counts().review + " waiting</span></div>" +
      (drafts.length ? drafts.map(function (d) {
        return '<article class="draft-box" data-draft="' + d.id + '">' +
          "<h3>" + escapeHtml(d.title) + "</h3>" +
          '<p class="muted">Status: ' + escapeHtml(d.status) + "</p>" +
          '<label class="sr-only" for="body-' + d.id + '">Draft body</label>' +
          '<textarea id="body-' + d.id + '" rows="12" style="width:100%;border:1px solid #d5e1f2;border-radius:12px;padding:12px;background:#f8fbff">' + escapeHtml(d.body) + "</textarea>" +
          '<div class="row-actions" style="margin-top:12px">' +
          '<button class="btn btn-line btn-sm" data-save-draft="' + d.id + '">Save edits</button>' +
          '<button class="btn btn-green btn-sm" data-approve-draft="' + d.id + '">Approve</button>' +
          '<button class="btn btn-line btn-sm" data-changes-draft="' + d.id + '">Ask for changes</button>' +
          "</div></article>";
      }).join("") : '<p class="muted">No drafts yet. Approve topics on Topic ideas, then click ▶ Run free automation.</p>') +
      "</section>";
  }

  function renderKeywords(root) {
    root.innerHTML =
      '<section class="panel"><div class="panel-head"><h2>Upload keyword file</h2></div>' +
      '<p class="muted">Free local CSV/TSV parse. Columns: phrase, volume, kd, type. Nothing is uploaded to a server.</p>' +
      '<div class="upload-box"><input type="file" id="kw-file" accept=".csv,.txt,.tsv"><div class="row-actions" style="justify-content:center;margin-top:10px"><button class="btn btn-blue btn-sm" type="button" id="kw-import">Import file</button></div></div>' +
      '<div class="form-grid" style="margin-top:16px"><label for="kw-one">Or add one keyword</label><input id="kw-one" placeholder="keyword phrase"><button class="btn btn-line btn-sm" type="button" id="kw-add" style="justify-self:start">Add keyword</button></div></section>' +
      '<section class="panel"><div class="panel-head"><h2>Loaded keywords</h2></div>' +
      (state.keywords.length ? state.keywords.map(function (k) {
        return '<div class="list-row"><div><strong>' + escapeHtml(k.phrase) + '</strong><div class="muted">Vol ' + escapeHtml(k.volume) + " · KD " + escapeHtml(k.kd) + "</div></div>" +
          '<div class="row-actions"><span class="badge badge-draft">' + escapeHtml(k.type) + '</span><button class="btn btn-line btn-sm" data-del-kw="' + k.id + '">Remove</button></div></div>';
      }).join("") : '<p class="muted">No keywords yet.</p>') +
      "</section>";

    root.querySelector("#kw-import").onclick = function () {
      var file = root.querySelector("#kw-file").files[0];
      if (!file) return showToast("Choose a file first");
      var reader = new FileReader();
      reader.onload = function () {
        var rows = parseKeywordCsv(reader.result);
        if (!rows.length) return showToast("No rows found");
        state.keywords = rows.concat(state.keywords);
        save(state);
        showToast(rows.length + " keywords imported");
        renderAll();
      };
      reader.readAsText(file);
    };
    root.querySelector("#kw-add").onclick = function () {
      var phrase = (root.querySelector("#kw-one").value || "").trim();
      if (!phrase) return showToast("Enter a keyword");
      state.keywords.unshift({ id: uid(), phrase: phrase, volume: "—", kd: "—", type: "Supporting" });
      save(state);
      renderAll();
    };
  }

  function renderMap(root) {
    root.innerHTML =
      '<section class="panel"><div class="panel-head"><h2>Website structure</h2><button class="btn btn-blue btn-sm" type="button" id="refresh-map">Refresh from topics</button></div>' +
      '<p class="muted">Free map built from your project URL and topic list in this browser.</p>' +
      '<div class="map-tree">' +
      '<div class="map-node"><strong>Home · ' + escapeHtml(state.project.url) + '</strong><div class="meta">' + escapeHtml(state.project.name) + "</div></div>" +
      state.topics.map(function (t) {
        return '<div class="map-node child"><strong>' + escapeHtml(t.title) + '</strong><div class="meta">Score ' + t.score + " · " + escapeHtml(t.cluster) + " · " + escapeHtml(t.status) + "</div>" +
          (t.status === "open"
            ? '<div class="row-actions" style="margin-top:8px"><button class="btn btn-green btn-sm" data-approve-topic="' + t.id + '">Approve</button><button class="btn btn-line btn-sm" data-reject-topic="' + t.id + '">Reject</button></div>'
            : "") +
          "</div>";
      }).join("") +
      "</div></section>";
    root.querySelector("#refresh-map").onclick = function () {
      showToast("Map refreshed from current topics");
      renderAll();
    };
  }

  function renderCalendar(root) {
    var items = state.articles.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
    root.innerHTML =
      '<section class="panel"><div class="panel-head"><h2>Publishing plan</h2><span class="badge badge-done">' + escapeHtml(state.project.days) + "</span></div>" +
      (items.length ? items.map(function (a) {
        return '<div class="list-row"><div><strong>' + escapeHtml(a.title) + '</strong><div class="muted">' + escapeHtml(a.date) + " · " + escapeHtml(a.status) + "</div></div>" +
          '<span class="badge ' + (a.status === "published" ? "badge-done" : "badge-live") + '">' + escapeHtml(a.status) + "</span></div>";
      }).join("") : '<p class="muted">Approve a draft, then Run, to schedule an article.</p>') +
      "</section>";
  }

  function renderSources(root) {
    root.innerHTML =
      '<section class="panel"><div class="panel-head"><h2>Research and sources</h2><button class="btn btn-blue btn-sm" type="button" id="add-source">Add source</button></div>' +
      '<div class="form-grid" style="margin-bottom:14px"><label for="src-title">Source title / URL</label><input id="src-title"><label for="src-note">Note</label><input id="src-note" placeholder="Why it matters"></div>' +
      (state.sources.length ? state.sources.map(function (s) {
        return '<div class="list-row"><div><strong>' + escapeHtml(s.title) + '</strong><div class="muted">' + escapeHtml(s.note || "") + (s.usedIn ? " · used in " + escapeHtml(s.usedIn) : "") + "</div></div><span class=\"badge badge-done\">Saved</span></div>";
      }).join("") : '<p class="muted">No sources yet.</p>') +
      "</section>";
    root.querySelector("#add-source").onclick = function () {
      var title = (root.querySelector("#src-title").value || "").trim();
      var note = (root.querySelector("#src-note").value || "").trim();
      if (!title) return showToast("Add a source title");
      state.sources.unshift({ id: uid(), title: title, note: note, usedIn: "Manual" });
      save(state);
      renderAll();
    };
  }

  function renderScheduled(root) {
    root.innerHTML =
      '<section class="panel"><div class="panel-head"><h2>Scheduled and published</h2></div>' +
      (state.articles.length ? state.articles.map(function (a) {
        return '<div class="list-row"><div><strong>' + escapeHtml(a.title) + '</strong><div class="muted">' + escapeHtml(a.date) + (a.liveCheck ? " · " + escapeHtml(a.liveCheck) : "") + '</div></div><span class="badge badge-done">' + escapeHtml(a.status) + "</span></div>";
      }).join("") : '<p class="muted">Empty for now.</p>') +
      '</section><div class="callout"><strong>Free tool note.</strong> This planner does not push to WordPress. Copy approved drafts into your CMS when you publish.</div>';
  }

  function renderOffpage(root) {
    root.innerHTML =
      '<section class="panel"><div class="panel-head"><h2>Prepared posts</h2></div>' +
      (state.offpage.length ? state.offpage.map(function (o) {
        return '<div class="list-row"><div><strong>' + escapeHtml(o.platform) + '</strong><div class="draft-box" style="margin-top:8px"><p>' + escapeHtml(o.copy) + "</p></div>" +
          '<label>Post link</label><input data-off-link="' + o.id + '" value="' + escapeHtml(o.link || "") + '" placeholder="https://…"></div>' +
          '<div class="row-actions"><button class="btn btn-line btn-sm" data-copy-off="' + o.id + '">Copy post</button>' +
          (o.status !== "posted" ? '<button class="btn btn-green btn-sm" data-mark-off="' + o.id + '">Mark posted</button>' : '<span class="badge badge-done">Posted</span>') +
          "</div></div>";
      }).join("") : '<p class="muted">Off-page posts appear after a scheduled article’s date passes and you Run automation.</p>') +
      "</section>" +
      '<section class="panel"><div class="panel-head"><h2>Profile links</h2></div><div class="form-grid">' +
      '<label for="li">LinkedIn URL</label><input id="li" value="' + escapeHtml(state.social.linkedin || "") + '">' +
      '<label for="fb">Facebook URL</label><input id="fb" value="' + escapeHtml(state.social.facebook || "") + '">' +
      '<button class="btn btn-blue btn-sm" type="button" id="save-social" style="justify-self:start">Save</button></div></section>';

    var saveSocial = root.querySelector("#save-social");
    if (saveSocial) {
      saveSocial.onclick = function () {
        state.social.linkedin = root.querySelector("#li").value.trim();
        state.social.facebook = root.querySelector("#fb").value.trim();
        save(state);
        showToast("Profile links saved");
      };
    }
  }

  function renderTech(root) {
    root.innerHTML =
      '<section class="panel"><div class="panel-head"><h2>Technical checklist</h2><button class="btn btn-blue btn-sm" type="button" id="add-tech">Add page</button></div>' +
      '<p class="muted">Free local checklist. Paste PageSpeed scores manually (no API key required).</p>' +
      state.techPages.map(function (p) {
        return '<div class="tech-card"><strong>' + escapeHtml(p.path) + "</strong>" +
          '<div class="scorecard" style="margin-top:10px"><div><b>' + p.mobile + "</b>Mobile</div><div><b>" + p.desktop + "</b>Desktop</div><div><b>" + escapeHtml(p.lcp) + "</b>LCP</div><div><b>" + escapeHtml(p.cls) + "</b>CLS</div></div>" +
          '<ul class="fix-list">' + p.fixes.map(function (f) {
            return '<li><input type="checkbox" data-fix="' + p.id + ":" + f.id + '" ' + (f.checked ? "checked" : "") + "> <span>" + escapeHtml(f.label) + "</span></li>";
          }).join("") + "</ul>" +
          '<div class="row-actions" style="margin-top:12px"><button class="btn btn-blue btn-sm" data-apply-tech="' + p.id + '">Save checked fixes</button></div></div>';
      }).join("") +
      "</section>";

    root.querySelector("#add-tech").onclick = function () {
      var path = prompt("Page path", "/blog/example");
      if (!path) return;
      state.techPages.unshift({
        id: uid(),
        path: path,
        mobile: 65,
        desktop: 85,
        lcp: "3.0s",
        cls: "0.10",
        fixes: [
          { id: uid(), label: "Compress images", checked: false },
          { id: uid(), label: "Cache HTML for anonymous users", checked: false }
        ]
      });
      save(state);
      renderAll();
    };
  }

  function renderGsc(root) {
    root.innerHTML =
      '<section class="panel"><div class="panel-head"><h2>Upload Search Console export</h2></div>' +
      '<p class="muted">CSV with query, clicks, impressions, CTR, position. Parsed only in your browser.</p>' +
      '<div class="upload-box"><input type="file" id="gsc-file" accept=".csv,.txt,.tsv"><div class="row-actions" style="justify-content:center;margin-top:10px"><button class="btn btn-blue btn-sm" type="button" id="gsc-import">Import export</button></div></div></section>' +
      '<section class="panel"><div class="panel-head"><h2>Imported rows</h2></div>' +
      (state.gscRows.length ? state.gscRows.slice(0, 20).map(function (r) {
        return '<div class="list-row"><div><strong>' + escapeHtml(r.query) + '</strong><div class="muted">Clicks ' + escapeHtml(r.clicks) + " · Imp " + escapeHtml(r.impressions) + " · CTR " + escapeHtml(r.ctr) + " · Pos " + escapeHtml(r.position) + "</div></div></div>";
      }).join("") : '<p class="muted">No GSC data yet.</p>') +
      "</section>";
    root.querySelector("#gsc-import").onclick = function () {
      var file = root.querySelector("#gsc-file").files[0];
      if (!file) return showToast("Choose a file first");
      var reader = new FileReader();
      reader.onload = function () {
        state.gscRows = parseGscCsv(reader.result);
        state.gscMeta.latestLabel = file.name;
        save(state);
        showToast(state.gscRows.length + " queries imported");
        renderAll();
      };
      reader.readAsText(file);
    };
  }

  function renderReport(root) {
    var published = state.articles.filter(function (a) { return a.status === "published"; }).length;
    var scheduled = state.articles.filter(function (a) { return a.status === "scheduled"; }).length;
    root.innerHTML =
      '<section class="panel"><div class="panel-head"><h2>Free monthly snapshot</h2></div>' +
      '<div class="stat-row"><div class="stat"><b>' + published + "</b><span>Published</span></div><div class=\"stat\"><b>" + scheduled + "</b><span>Scheduled</span></div><div class=\"stat\"><b>" + state.topics.length + "</b><span>Topics tracked</span></div><div class=\"stat\"><b>" + state.gscRows.length + "</b><span>GSC queries</span></div></div>" +
      '<div class="row-actions"><button class="btn btn-blue btn-sm" type="button" id="dl-report">Download report JSON</button><button class="btn btn-line btn-sm" type="button" id="print-report">Print / Save PDF</button></div></section>' +
      '<section class="panel"><div class="panel-head"><h2>What to include for clients</h2></div>' +
      "<p class=\"muted\">1. Traffic notes from your GSC upload<br>2. Articles approved and published this month<br>3. Off-page posts marked posted<br>4. Technical fixes checked<br>5. Next topics still open</p></section>";
    root.querySelector("#dl-report").onclick = function () {
      var report = {
        project: state.project,
        generatedAt: new Date().toISOString(),
        published: state.articles.filter(function (a) { return a.status === "published"; }),
        scheduled: state.articles.filter(function (a) { return a.status === "scheduled"; }),
        topicsOpen: state.topics.filter(function (t) { return t.status === "open"; }),
        gscSample: state.gscRows.slice(0, 25),
        offpage: state.offpage
      };
      var blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "seo-monthly-report-" + todayISO() + ".json";
      a.click();
      showToast("Report downloaded");
    };
    root.querySelector("#print-report").onclick = function () { window.print(); };
  }

  function renderTasks(root) {
    root.innerHTML =
      '<section class="panel"><div class="panel-head"><h2>Add a task</h2></div><div class="form-grid">' +
      '<label for="task">Task</label><textarea id="task" rows="3"></textarea>' +
      '<label for="priority">Priority</label><select id="priority"><option>Normal</option><option>High</option><option>Low</option></select>' +
      '<button class="btn btn-blue btn-sm" type="button" id="add-task" style="justify-self:start">Add task</button></div></section>' +
      '<section class="panel"><div class="panel-head"><h2>Task status</h2></div>' +
      state.tasks.map(function (t) {
        return '<div class="list-row"><div><strong>' + escapeHtml(t.text) + '</strong><div class="muted">' + escapeHtml(t.priority) + "</div></div>" +
          '<div class="row-actions"><span class="badge badge-draft">' + escapeHtml(t.status) + '</span><button class="btn btn-line btn-sm" data-done-task="' + t.id + '">Done</button></div></div>';
      }).join("") +
      "</section>";
    root.querySelector("#add-task").onclick = function () {
      var text = (root.querySelector("#task").value || "").trim();
      if (!text) return showToast("Write a task");
      state.tasks.unshift({ id: uid(), text: text, priority: root.querySelector("#priority").value, status: "Queued" });
      save(state);
      renderAll();
    };
  }

  function renderSettings(root) {
    root.innerHTML =
      '<section class="panel"><div class="panel-head"><h2>Website project</h2><span class="badge badge-live">Free local</span></div><div class="form-grid">' +
      '<label for="name">Project name</label><input id="name" value="' + escapeHtml(state.project.name) + '">' +
      '<label for="url">Website address</label><input id="url" value="' + escapeHtml(state.project.url) + '">' +
      '<label for="days">Publishing days</label><input id="days" value="' + escapeHtml(state.project.days) + '">' +
      '<label for="time">Publish time</label><input id="time" value="' + escapeHtml(state.project.time) + '">' +
      '<button class="btn btn-blue btn-sm" type="button" id="save-project" style="justify-self:start">Save settings</button></div>' +
      '<div class="callout" style="margin-top:16px"><strong>Free tool.</strong> Data stays in this browser only. Use Backup to download a copy. This version does not connect to WordPress or Claude.</div></section>';
    root.querySelector("#save-project").onclick = function () {
      state.project.name = root.querySelector("#name").value.trim() || state.project.name;
      state.project.url = root.querySelector("#url").value.trim() || state.project.url;
      state.project.days = root.querySelector("#days").value.trim();
      state.project.time = root.querySelector("#time").value.trim();
      save(state);
      showToast("Settings saved");
      mountShell();
    };
  }

  function renderBackup(root) {
    root.innerHTML =
      '<section class="panel"><div class="panel-head"><h2>Backup your free workspace</h2></div>' +
      '<p class="muted">Download JSON anytime. Restore it on this or another browser.</p>' +
      '<div class="upload-box"><div class="row-actions" style="justify-content:center"><button class="btn btn-blue btn-sm" type="button" id="dl-backup">Download my backup</button></div>' +
      '<p style="margin-top:16px">Restore from file</p><input type="file" id="restore-file" accept=".json"><div class="row-actions" style="justify-content:center;margin-top:10px"><button class="btn btn-line btn-sm" type="button" id="restore-backup">Restore backup</button></div></div></section>' +
      '<section class="panel"><div class="panel-head"><h2>Reset sample data</h2></div><button class="btn btn-line btn-sm" type="button" id="reset-data">Clear and reload starter topics</button></section>';
    root.querySelector("#dl-backup").onclick = downloadBackup;
    root.querySelector("#restore-backup").onclick = function () {
      var file = root.querySelector("#restore-file").files[0];
      if (!file) return showToast("Choose a backup JSON file");
      importBackup(file);
    };
    root.querySelector("#reset-data").onclick = function () {
      if (!confirm("Clear this browser workspace and load starter topics?")) return;
      localStorage.removeItem(STORE_KEY);
      state = seedIfEmpty(defaultState());
      showToast("Workspace reset");
      renderAll();
    };
  }

  function renderAll() {
    mountShell();
    var root = document.querySelector("[data-view]");
    if (!root) return;
    var page = document.body.getAttribute("data-page") || "";
    var map = {
      "overview.html": renderOverview,
      "topic-ideas.html": renderTopics,
      "review-approve.html": renderReview,
      "keyword-research.html": renderKeywords,
      "topical-map.html": renderMap,
      "content-calendar.html": renderCalendar,
      "research-sources.html": renderSources,
      "scheduled-published.html": renderScheduled,
      "off-page-seo.html": renderOffpage,
      "technical-seo.html": renderTech,
      "search-console.html": renderGsc,
      "monthly-report.html": renderReport,
      "tasks.html": renderTasks,
      "project-settings.html": renderSettings,
      "backup.html": renderBackup
    };
    if (map[page]) map[page](root);
  }

  document.addEventListener("click", function (event) {
    var t = event.target;
    if (t.closest("[data-open-side]")) document.body.classList.add("side-open");
    if (t.closest("[data-close-side]")) document.body.classList.remove("side-open");
    if (t.closest("[data-run]")) runAutomation();

    var approveTopic = t.closest("[data-approve-topic]");
    if (approveTopic) {
      var id = approveTopic.getAttribute("data-approve-topic");
      state.topics.forEach(function (topic) { if (topic.id === id) topic.status = "approved"; });
      save(state);
      showToast("Topic approved · click Run to draft");
      renderAll();
    }
    var rejectTopic = t.closest("[data-reject-topic]");
    if (rejectTopic) {
      var rid = rejectTopic.getAttribute("data-reject-topic");
      state.topics.forEach(function (topic) { if (topic.id === rid) topic.status = "rejected"; });
      save(state);
      showToast("Topic rejected");
      renderAll();
    }
    var saveDraft = t.closest("[data-save-draft]");
    if (saveDraft) {
      var sid = saveDraft.getAttribute("data-save-draft");
      var area = document.querySelector("#body-" + sid);
      state.drafts.forEach(function (d) {
        if (d.id === sid) {
          d.body = area ? area.value : d.body;
          d.updatedAt = new Date().toISOString();
        }
      });
      save(state);
      showToast("Draft saved");
    }
    var approveDraft = t.closest("[data-approve-draft]");
    if (approveDraft) {
      var ad = approveDraft.getAttribute("data-approve-draft");
      var bodyEl = document.querySelector("#body-" + ad);
      state.drafts.forEach(function (d) {
        if (d.id === ad) {
          if (bodyEl) d.body = bodyEl.value;
          d.status = "approved";
        }
      });
      save(state);
      showToast("Draft approved · click Run to schedule");
      renderAll();
    }
    var changesDraft = t.closest("[data-changes-draft]");
    if (changesDraft) {
      var cd = changesDraft.getAttribute("data-changes-draft");
      state.drafts.forEach(function (d) { if (d.id === cd) d.status = "changes"; });
      save(state);
      showToast("Marked for changes");
      renderAll();
    }
    var delKw = t.closest("[data-del-kw]");
    if (delKw) {
      var kid = delKw.getAttribute("data-del-kw");
      state.keywords = state.keywords.filter(function (k) { return k.id !== kid; });
      save(state);
      renderAll();
    }
    var copyOff = t.closest("[data-copy-off]");
    if (copyOff) {
      var oid = copyOff.getAttribute("data-copy-off");
      var item = state.offpage.filter(function (o) { return o.id === oid; })[0];
      if (item && navigator.clipboard) {
        navigator.clipboard.writeText(item.copy).then(function () { showToast("Post copied"); });
      } else showToast(item ? item.copy : "Nothing to copy");
    }
    var markOff = t.closest("[data-mark-off]");
    if (markOff) {
      var mid = markOff.getAttribute("data-mark-off");
      var linkInput = document.querySelector('[data-off-link="' + mid + '"]');
      state.offpage.forEach(function (o) {
        if (o.id === mid) {
          o.status = "posted";
          o.link = linkInput ? linkInput.value.trim() : o.link;
        }
      });
      save(state);
      showToast("Marked posted");
      renderAll();
    }
    var applyTech = t.closest("[data-apply-tech]");
    if (applyTech) {
      var tid = applyTech.getAttribute("data-apply-tech");
      var pageTech = state.techPages.filter(function (p) { return p.id === tid; })[0];
      if (pageTech) {
        pageTech.fixes.forEach(function (f) {
          var box = document.querySelector('[data-fix="' + tid + ":" + f.id + '"]');
          if (box) f.checked = box.checked;
        });
        save(state);
        showToast("Fixes saved locally");
      }
    }
    var doneTask = t.closest("[data-done-task]");
    if (doneTask) {
      var taskId = doneTask.getAttribute("data-done-task");
      state.tasks.forEach(function (task) { if (task.id === taskId) task.status = "Done"; });
      save(state);
      renderAll();
    }
  });

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  renderAll();
})();
