/* Evidence console: sql.js (SQLite compiled to WebAssembly) over evidence/ciphertech.db */
(function () {
  "use strict";

  var DB_URL = "evidence/ciphertech.db";
  var MAX_ROWS = 2000;
  var KEY_SQL = "ghost.console.sql";
  var KEY_HIST = "ghost.console.history";
  var KEY_NOTES = "ghost.console.notes";

  var $ = function (s) { return document.querySelector(s); };
  var editor = $("#sql");
  var results = $("#results");
  var statusEl = $("#status");
  var runBtn = $("#run");
  var exportBtn = $("#export");

  var SQL = null;
  var db = null;
  var pristine = null;
  var lastResult = null;

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };

  var EXAMPLES = [
    ["Where does each table come from?", "SELECT * FROM log_sources;"],
    ["Columns per table", "SELECT name,\n  (SELECT count(*) FROM pragma_table_info(name)) AS columns\nFROM sqlite_master WHERE type = 'table' ORDER BY name;"],
    ["IDS alerts, newest first", "SELECT * FROM ids_alerts ORDER BY alert_time DESC;"],
    ["Join: badges to people", "SELECT c.card_number, e.username, e.department\nFROM access_cards c JOIN employees e ON e.id = c.employee_id\nLIMIT 20;"],
    ["Date maths in SQLite", "-- Timestamps are stored as text; datetime() can shift them.\nSELECT datetime('2023-01-01 12:00:00', '+90 minutes') AS shifted,\n       strftime('%H:%M', '2023-01-01 12:00:00')       AS hh_mm;"],
    ["Time window filter", "SELECT * FROM door_logs\nWHERE event_time BETWEEN '2023-11-13 12:00:00' AND '2023-11-13 12:30:00'\nORDER BY event_time;"],
    ["Search text in a column", "SELECT * FROM chat_logs WHERE message LIKE '%printer%';"],
    ["Hex decode in SQL", "SELECT CAST(unhex('67686f7374') AS TEXT) AS decoded;"]
  ];

  // ---------- helpers ----------
  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status mono" + (cls ? " " + cls : "");
  }
  var toastTimer = null;
  function toast(text) {
    var t = $("#toast");
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1400);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function quoteIdent(n) { return '"' + String(n).replace(/"/g, '""') + '"'; }
  function quoteLit(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }
  function insertAtCursor(text) {
    var s = editor.selectionStart, e = editor.selectionEnd;
    editor.value = editor.value.slice(0, s) + text + editor.value.slice(e);
    editor.selectionStart = editor.selectionEnd = s + text.length;
    editor.focus();
    store.set(KEY_SQL, editor.value);
  }

  // ---------- rendering ----------
  function renderMessage(text, cls) {
    results.appendChild(el("div", "msg " + (cls || "info"), text));
  }

  function renderResultSet(rs, idx, total) {
    var wrap = el("div", "rs");
    var shown = Math.min(rs.values.length, MAX_ROWS);
    var head = el("div", "rs-head");
    head.appendChild(el("span", null, (total > 1 ? "result " + (idx + 1) + " · " : "") + rs.values.length + " row" + (rs.values.length === 1 ? "" : "s") +
      (shown < rs.values.length ? " (showing first " + shown + ")" : "")));
    head.appendChild(el("span", null, rs.columns.length + " col" + (rs.columns.length === 1 ? "" : "s") + " · click a cell to copy"));
    wrap.appendChild(head);

    var gw = el("div", "grid-wrap");
    var table = el("table", "rows");
    var thead = el("thead");
    var hr = el("tr");
    hr.appendChild(el("th", null, "#"));
    rs.columns.forEach(function (c) { hr.appendChild(el("th", null, c)); });
    thead.appendChild(hr);
    table.appendChild(thead);

    var tbody = el("tbody");
    for (var r = 0; r < shown; r++) {
      var tr = el("tr");
      tr.appendChild(el("td", "rn", String(r + 1)));
      var row = rs.values[r];
      for (var c = 0; c < row.length; c++) {
        var v = row[c];
        var td;
        if (v === null) td = el("td", "null", "NULL");
        else if (typeof v === "number") td = el("td", "num", String(v));
        else if (v instanceof Uint8Array) td = el("td", "null", "<blob " + v.length + " bytes>");
        else td = el("td", null, String(v));
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    gw.appendChild(table);
    wrap.appendChild(gw);
    results.appendChild(wrap);
  }

  results.addEventListener("click", function (e) {
    var td = e.target.closest("td");
    if (!td || td.classList.contains("rn")) return;
    var text = td.classList.contains("null") ? "" : td.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast("copied: " + (text.length > 40 ? text.slice(0, 40) + "…" : text));
      }, function () { /* clipboard blocked */ });
    }
  });

  // ---------- dot commands ----------
  function listTables() {
    var r = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    return r.length ? r[0].values.map(function (v) { return v[0]; }) : [];
  }

  function dotCommand(line) {
    var parts = line.trim().split(/\s+/);
    var cmd = parts[0].toLowerCase();
    switch (cmd) {
      case ".help":
        renderMessage(
          ".tables            list tables\n" +
          ".schema [table]    show CREATE statements\n" +
          ".count             row count of every table\n" +
          ".reset             reload the sealed evidence (undo any INSERT/UPDATE/DELETE)\n" +
          ".clear             clear the results pane\n\n" +
          "Anything else is sent to SQLite. Multiple statements are fine; every result set is shown.");
        return;
      case ".tables":
        renderMessage(listTables().join("   "));
        return;
      case ".schema":
        var q = "SELECT sql FROM sqlite_master WHERE type IN ('table','index') AND sql IS NOT NULL" +
          (parts[1] ? " AND tbl_name = " + quoteLit(parts[1]) : "") + " ORDER BY tbl_name";
        var r = db.exec(q);
        renderMessage(r.length ? r[0].values.map(function (v) { return v[0] + ";"; }).join("\n\n") : "no such table");
        return;
      case ".count":
        var rows = listTables().map(function (t) {
          return [t, db.exec("SELECT count(*) FROM " + quoteIdent(t))[0].values[0][0]];
        });
        lastResult = { columns: ["table", "rows"], values: rows };
        renderResultSet(lastResult, 0, 1);
        return;
      case ".reset":
        db.close();
        db = new SQL.Database(pristine);
        buildSchema();
        renderMessage("Evidence reloaded from the sealed snapshot.");
        return;
      case ".clear":
        results.innerHTML = "";
        return;
      default:
        renderMessage("unknown command " + cmd + " (try .help)", "err");
    }
  }

  // ---------- run ----------
  function run() {
    if (!db) return;
    var hasSel = editor.selectionEnd > editor.selectionStart;
    var src = hasSel ? editor.value.slice(editor.selectionStart, editor.selectionEnd) : editor.value;
    if (!src.trim()) return;

    results.innerHTML = "";
    lastResult = null;
    var t0 = performance.now();
    var lines = src.split("\n");
    var sqlBuf = [];
    var failed = false;

    function flushSql() {
      var sql = sqlBuf.join("\n");
      sqlBuf = [];
      if (!sql.replace(/--.*$/gm, "").trim()) return;
      try {
        var res = db.exec(sql);
        res.forEach(function (rs, i) { renderResultSet(rs, i, res.length); });
        if (res.length) lastResult = res[res.length - 1];
        else {
          var ch = db.getRowsModified();
          renderMessage("OK" + (ch ? " · " + ch + " row(s) changed (in memory only; .reset to undo)" : " · no rows returned"));
        }
      } catch (err) {
        failed = true;
        renderMessage(String(err.message || err), "err");
      }
    }

    for (var i = 0; i < lines.length; i++) {
      if (/^\s*\./.test(lines[i])) { flushSql(); dotCommand(lines[i]); }
      else sqlBuf.push(lines[i]);
    }
    flushSql();

    var ms = (performance.now() - t0).toFixed(1);
    if (failed) setStatus("error · " + ms + " ms", "err");
    else setStatus((lastResult ? lastResult.values.length + " rows · " : "") + ms + " ms", "ok");
    exportBtn.disabled = !lastResult;
    pushHistory(src.trim());
  }

  // ---------- history ----------
  function getHistory() {
    try { return JSON.parse(store.get(KEY_HIST, "[]")) || []; } catch (e) { return []; }
  }
  function renderHistory() {
    var sel = $("#history");
    sel.innerHTML = "";
    sel.appendChild(new Option("History…", ""));
    getHistory().forEach(function (q, i) {
      var label = q.replace(/\s+/g, " ");
      sel.appendChild(new Option(label.length > 60 ? label.slice(0, 60) + "…" : label, String(i)));
    });
  }
  function pushHistory(q) {
    var h = getHistory().filter(function (x) { return x !== q; });
    h.unshift(q);
    store.set(KEY_HIST, JSON.stringify(h.slice(0, 40)));
    renderHistory();
  }
  $("#history").addEventListener("change", function () {
    var i = this.value;
    if (i === "") return;
    editor.value = getHistory()[+i] || "";
    store.set(KEY_SQL, editor.value);
    this.value = "";
    editor.focus();
  });

  // ---------- examples ----------
  var exSel = $("#examples");
  EXAMPLES.forEach(function (ex, i) { exSel.appendChild(new Option(ex[0], String(i))); });
  exSel.addEventListener("change", function () {
    if (this.value === "") return;
    editor.value = EXAMPLES[+this.value][1];
    store.set(KEY_SQL, editor.value);
    this.value = "";
    editor.focus();
  });

  // ---------- schema sidebar ----------
  function buildSchema() {
    var ul = $("#schema");
    ul.innerHTML = "";
    var tables = listTables();
    var totalRows = 0;
    tables.forEach(function (t) {
      var count = db.exec("SELECT count(*) FROM " + quoteIdent(t))[0].values[0][0];
      totalRows += count;
      var cols = db.exec("SELECT name, type FROM pragma_table_info(" + quoteLit(t) + ")");
      var colRows = cols.length ? cols[0].values : [];
      var li = el("li");
      li.dataset.search = (t + " " + colRows.map(function (c) { return c[0]; }).join(" ")).toLowerCase();
      var row = el("div", "t");
      row.appendChild(el("span", "caret", "›"));
      row.appendChild(el("span", "name", t));
      row.appendChild(el("span", "count", count.toLocaleString()));
      var peek = el("button", "peek", "▶");
      peek.title = "Preview " + t;
      peek.setAttribute("aria-label", "Preview " + t);
      peek.addEventListener("click", function (e) {
        e.stopPropagation();
        editor.value = "SELECT * FROM " + t + " LIMIT 100;";
        store.set(KEY_SQL, editor.value);
        run();
      });
      row.appendChild(peek);
      row.addEventListener("click", function () { li.classList.toggle("open"); });
      li.appendChild(row);

      var cul = el("ul", "cols");
      colRows.forEach(function (c) {
        var cli = el("li");
        cli.appendChild(el("span", null, c[0]));
        cli.appendChild(el("span", "ty", (c[1] || "").toLowerCase()));
        cli.title = "Insert " + c[0];
        cli.addEventListener("click", function () { insertAtCursor(c[0]); });
        cul.appendChild(cli);
      });
      li.appendChild(cul);
      ul.appendChild(li);
    });
    $("#db-meta").textContent = "· " + tables.length + " tables · " + totalRows.toLocaleString() + " rows";
  }
  $("#schema-filter").addEventListener("input", function () {
    var q = this.value.trim().toLowerCase();
    Array.prototype.forEach.call(document.querySelectorAll("#schema > li"), function (li) {
      li.style.display = !q || (li.dataset.search || "").indexOf(q) !== -1 ? "" : "none";
    });
  });

  // ---------- sidebar tabs ----------
  var tabs = document.querySelectorAll(".tab");
  var panes = document.querySelectorAll(".pane");
  Array.prototype.forEach.call(tabs, function (tab) {
    tab.addEventListener("click", function () {
      Array.prototype.forEach.call(tabs, function (t) { t.classList.toggle("active", t === tab); });
      Array.prototype.forEach.call(panes, function (p) { p.classList.toggle("active", p.id === "pane-" + tab.dataset.tab); });
    });
  });

  // ---------- notes ----------
  var notes = $("#notes");
  notes.value = store.get(KEY_NOTES, "");
  notes.addEventListener("input", function () { store.set(KEY_NOTES, notes.value); });

  // ---------- decoder ----------
  function utf8(bytes) { return new TextDecoder("utf-8").decode(bytes); }
  var decoders = {
    b64d: function (s) {
      var bin = atob(s.replace(/\s+/g, ""));
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return utf8(bytes);
    },
    hexd: function (s) {
      var h = s.replace(/0x/gi, "").replace(/[^0-9a-f]/gi, "");
      if (h.length % 2) throw new Error("odd number of hex digits");
      var bytes = new Uint8Array(h.length / 2);
      for (var i = 0; i < bytes.length; i++) bytes[i] = parseInt(h.substr(i * 2, 2), 16);
      return utf8(bytes);
    },
    b64e: function (s) {
      var bytes = new TextEncoder().encode(s);
      var bin = "";
      for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    },
    rot13: function (s) {
      return s.replace(/[a-z]/gi, function (c) {
        var b = c <= "Z" ? 65 : 97;
        return String.fromCharCode((c.charCodeAt(0) - b + 13) % 26 + b);
      });
    }
  };
  Array.prototype.forEach.call(document.querySelectorAll("[data-dec]"), function (b) {
    b.addEventListener("click", function () {
      var out = $("#dec-out");
      try { out.value = decoders[b.dataset.dec]($("#dec-in").value); }
      catch (e) { out.value = "error: " + (e.message || e); }
    });
  });

  // ---------- CSV export ----------
  exportBtn.addEventListener("click", function () {
    if (!lastResult) return;
    function cell(v) {
      if (v === null) return "";
      var s = String(v);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    var lines = [lastResult.columns.map(cell).join(",")];
    lastResult.values.forEach(function (r) { lines.push(r.map(cell).join(",")); });
    var blob = new Blob([lines.join("\r\n")], { type: "text/csv" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ghost-query.csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  });

  // ---------- editor keys ----------
  editor.value = store.get(KEY_SQL, editor.value);
  editor.addEventListener("input", function () { store.set(KEY_SQL, editor.value); });
  editor.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); return; }
    if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); insertAtCursor("  "); }
  });
  runBtn.addEventListener("click", run);
  $("#clear").addEventListener("click", function () {
    results.innerHTML = "";
    lastResult = null;
    exportBtn.disabled = true;
    setStatus("ready");
  });

  // ---------- boot ----------
  renderHistory();
  if (typeof initSqlJs !== "function") {
    setStatus("failed to load sql-wasm.js", "err");
    return;
  }
  initSqlJs({ locateFile: function (f) { return "assets/vendor/" + f; } })
    .then(function (S) {
      SQL = S;
      setStatus("loading evidence…");
      return fetch(DB_URL).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status + " fetching " + DB_URL);
        return r.arrayBuffer();
      });
    })
    .then(function (buf) {
      pristine = new Uint8Array(buf);
      db = new SQL.Database(pristine);
      buildSchema();
      var v = db.exec("SELECT sqlite_version()")[0].values[0][0];
      runBtn.disabled = false;
      setStatus("ready · SQLite " + v, "ok");
      editor.focus();
    })
    .catch(function (err) {
      setStatus("load failed", "err");
      results.innerHTML = "";
      renderMessage("Could not start the console: " + (err.message || err) +
        "\n\nIf you opened the file straight from disk (file://), serve the folder instead:\n" +
        "  python3 -m http.server 8000 --directory site\nthen open http://localhost:8000/console.html", "err");
    });
})();
