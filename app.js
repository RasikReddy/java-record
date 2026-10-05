// =========================================================
// Java Record Work — Workbench UI (C. Rasik Reddy)
// Program data lives in data.js and is shared, unchanged,
// with the other record sites.
// =========================================================

const STUDENT = {
  name: "C. Rasik Reddy",
  roll: "25EU02073",
  initials: "CR",
  year: "II Year",
  branch: "AI & ML",
  section: "B",
  record: "Java Programming"
};

const THEME_KEY = "rasik-java-theme";

const editor = document.getElementById("editor");
const tree = document.getElementById("tree");
const explorer = document.getElementById("explorer");
const scrim = document.getElementById("scrim");

const pad = n => String(n).padStart(2, "0");

function esc(text) {
  return String(text).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

const totalPrograms = () => weeks.reduce((s, w) => s + w.programs.length, 0);
const isViva = w => w.programs.length === 0;
const weekName = w => `Week ${pad(w.id)}`;

// ---------------------------------------------------------
// File names — taken from the class that holds main()
// ---------------------------------------------------------

function fileNameFor(program) {
  const code = program.code || "";
  const mainAt = code.search(/static\s+void\s+main/);
  const classRe = /\b(?:class|interface)\s+([A-Za-z_]\w*)/g;
  let m, found = null;
  while ((m = classRe.exec(code)) !== null) {
    if (mainAt === -1 || m.index < mainAt) found = m[1];
    if (mainAt !== -1 && m.index > mainAt) break;
  }
  if (!found && (m = /\b(?:class|interface)\s+([A-Za-z_]\w*)/.exec(code))) found = m[1];
  if (!found) return "notes.txt";
  return found + ".java";
}

// ---------------------------------------------------------
// Java syntax highlighting (display only — copy uses raw code)
// ---------------------------------------------------------

const KEYWORDS = new Set((
  "abstract assert boolean break byte case catch char class const continue default do double else enum " +
  "extends final finally float for goto if implements import instanceof int interface long native new " +
  "package private protected public return short static strictfp super switch synchronized this throw " +
  "throws transient try void volatile while true false null var"
).split(" "));

const isJava = code => /\b(class|interface|import|package)\b/.test(code);

function wrap(cls, text) {
  return text.split("\n").map(p => p ? `<span class="${cls}">${esc(p)}</span>` : "").join("\n");
}

function highlight(code) {
  const re = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(@[A-Za-z_]\w*)|\b(\d+(?:\.\d+)?[fFdDlL]?)\b|\b([A-Za-z_]\w*)\b/g;
  let out = "", last = 0, m;
  while ((m = re.exec(code)) !== null) {
    out += esc(code.slice(last, m.index));
    last = re.lastIndex;
    if (m[1]) out += wrap("t-com", m[1]);
    else if (m[2]) out += wrap("t-str", m[2]);
    else if (m[3]) out += wrap("t-ann", m[3]);
    else if (m[4]) out += wrap("t-num", m[4]);
    else {
      const w = m[5];
      const next = code.slice(last).match(/^\s*\(/);
      if (KEYWORDS.has(w)) out += `<span class="t-kw">${w}</span>`;
      else if (next) out += `<span class="t-fn">${w}</span>`;
      else if (/^[A-Z]/.test(w)) out += `<span class="t-type">${w}</span>`;
      else out += w;
    }
  }
  return out + esc(code.slice(last));
}

// ---------------------------------------------------------
// Routing — #/home  #/profile  #/week/6  #/week/6/3
// ---------------------------------------------------------

function parseRoute() {
  const parts = (location.hash || "#/home").replace(/^#\/?/, "").split("/");
  if (parts[0] === "profile") return { type: "profile", key: "profile" };
  if (parts[0] === "week") {
    const week = weeks.find(w => w.id === Number(parts[1]));
    if (week && parts[2] !== undefined && week.programs[Number(parts[2])]) {
      return { type: "program", week, index: Number(parts[2]), key: `week/${week.id}/${Number(parts[2])}` };
    }
    if (week) return { type: "week", week, key: `week/${week.id}` };
  }
  return { type: "home", key: "home" };
}

// ---------------------------------------------------------
// Explorer tree
// ---------------------------------------------------------

const expanded = new Set();

function renderTree(route) {
  if (route.week) expanded.add(route.week.id);

  const row = (href, icon, iconCls, name, count, active, title) => `
    <a class="tree-row${active ? " active" : ""}" href="${href}" ${title ? `title="${esc(title)}"` : ""}>
      <span class="ico ${iconCls}">${icon}</span>
      <span class="name">${esc(name)}</span>
      ${count !== null ? `<span class="count">${count}</span>` : ""}
    </a>`;

  let html = row("#/home", "MD", "md", "README.md", null, route.type === "home");
  html += row("#/profile", "{ }", "json", "profile.json", null, route.type === "profile");
  html += `<div class="tree-label">Weeks</div>`;

  html += weeks.map(w => {
    const open = expanded.has(w.id);
    const folderActive = route.week === w && route.type === "week";
    const kids = open && !isViva(w)
      ? `<div class="tree-children">${w.programs.map((p, i) =>
          row(`#/week/${w.id}/${i}`, "J", "j", `${pad(i + 1)}  ${p.title}`, null,
              route.type === "program" && route.week === w && route.index === i, p.title)
        ).join("")}</div>`
      : "";
    return `
      <div class="folder">
        <button class="chev${open ? " open" : ""}" data-toggle="${w.id}" aria-label="Toggle ${weekName(w)}" aria-expanded="${open}">›</button>
        <a class="tree-row${folderActive ? " active" : ""}" href="#/week/${w.id}">
          <span class="name">${weekName(w)}</span>
          <span class="count">${isViva(w) ? "viva" : w.programs.length}</span>
        </a>
      </div>${kids}`;
  }).join("");

  tree.innerHTML = html;
  const active = tree.querySelector(".tree-row.active");
  if (active) active.scrollIntoView({ block: "nearest" });
}

tree.addEventListener("click", e => {
  const t = e.target.closest("[data-toggle]");
  if (!t) return;
  const id = Number(t.dataset.toggle);
  expanded.has(id) ? expanded.delete(id) : expanded.add(id);
  renderTree(parseRoute());
});

// ---------------------------------------------------------
// Views
// ---------------------------------------------------------

function avatar(cls = "") {
  return `<div class="avatar ${cls}"><span>${STUDENT.initials}</span><img src="assets/profile.jpg" alt="${esc(STUDENT.name)}" onerror="this.remove()"></div>`;
}

function viewHome() {
  return `
  <div class="view">
    <section class="readme-hero">
      <div>
        <p class="hero-meta">B.Tech • II Year • AI &amp; ML — B</p>
        <h1 class="hero-title"><span class="hash">#</span>Welcome to my Java record work.</h1>
        <p class="hero-copy">A collection of my Java programming lab work, arranged week by week with descriptions, source code and outputs.</p>
        <a class="btn" href="#weeks">Explore my record</a>
      </div>
      <div class="avatar-wrap">
        ${avatar()}
        <p class="hero-id">${esc(STUDENT.name)}</p>
      </div>
    </section>

    <div class="stat-row">
      <div class="stat"><b>${weeks.length}</b><span>Weeks in record</span></div>
      <div class="stat"><b>${totalPrograms()}</b><span>Programs added</span></div>
      <div class="stat"><b>02</b><span>Current year</span></div>
    </div>

    <section id="weeks">
      <h2 class="section-title">Weekly Record</h2>
      <p class="section-note">Choose a week to view its programs.</p>
      <div class="week-grid">
        ${weeks.map(w => `
          <a class="week-tile" href="#/week/${w.id}">
            <div class="path">weeks/${weekName(w).replace(" ", "")}</div>
            <h3>${weekName(w)}</h3>
            <p>${isViva(w) ? "Viva Exam" : `${w.programs.length} program${w.programs.length === 1 ? "" : "s"} added`}</p>
            <span class="go">open</span>
          </a>`).join("")}
      </div>
    </section>
  </div>`;
}

function viewProfile() {
  const props = [
    ["name", STUDENT.name], ["rollNumber", STUDENT.roll], ["year", STUDENT.year],
    ["branch", STUDENT.branch], ["section", STUDENT.section], ["record", STUDENT.record]
  ];
  const lines = ["{", ...props.map(([k, v], i) =>
    `  <span class="k">"${k}"</span>: <span class="v">"${esc(v)}"</span>${i < props.length - 1 ? "," : ""}`), "}"];

  return `
  <div class="view">
    <div class="crumbs"><a href="#/home">Home</a><span class="sep">/</span><span>My Profile</span></div>
    <h1 class="page-title">My Profile</h1>
    <p class="page-sub">Student details and academic information.</p>
    <div class="profile-grid">
      <div class="profile-side">
        ${avatar("sm")}
        <h2>${esc(STUDENT.name)}</h2>
        <p>CSE — Artificial Intelligence &amp; Machine Learning</p>
      </div>
      <div>
        <div class="json">
          <div class="json-head">Student Details</div>
          <pre>${lines.map((l, i) => `<span class="ln"><i>${i + 1}</i><span>${l}</span></span>`).join("")}</pre>
        </div>
        <div class="about">
          <h3>About Me</h3>
          <p>I am a second-year B.Tech student specializing in Artificial Intelligence &amp; Machine Learning. This website keeps my Java record work organized in one place.</p>
        </div>
      </div>
    </div>
  </div>`;
}

function viewWeek(week) {
  const body = isViva(week) && (week.id === 4 || week.id === 5)
    ? `<div class="empty"><h3>Viva Examination</h3><p>No programming task was assigned for this week.</p></div>`
    : isViva(week)
    ? `<div class="empty"><h3>No programs yet</h3><p>Programs for this week have not been added.</p></div>`
    : `<div class="file-list">${week.programs.map((p, i) => `
        <a class="file-row" href="#/week/${week.id}/${i}">
          <span class="no">${pad(i + 1)}</span>
          <div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p></div>
          <span class="fname">${esc(fileNameFor(p))}</span>
        </a>`).join("")}</div>`;

  return `
  <div class="view">
    <div class="crumbs"><a href="#/home">Home</a><span class="sep">/</span><span>${weekName(week)}</span></div>
    <h1 class="page-title">${weekName(week)}</h1>
    <p class="page-sub">${esc(week.subtitle)}</p>
    ${body}
  </div>`;
}

function outputBlock(weekId, index) {
  if (weekId === 1 && index === 0) {
    const c = comparisonOutput;
    return `
      <div class="run-table-wrap">
        <div class="run-cmd">${esc(c.command)}</div>
        <table class="cmp">
          <thead><tr>${c.head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead>
          <tbody>${c.rows.map(r => `<tr><th>${esc(r[0])}</th>${r.slice(1).map(d => `<td>${esc(d)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
        <p class="run-conclusion"><b>Conclusion:</b> ${esc(c.conclusion)}</p>
      </div>`;
  }
  return `<pre class="run-body">${esc(getGeneratedOutput(weekId, index))}</pre>`;
}

function viewProgram(week, index) {
  const p = week.programs[index];
  const code = p.code || "// Java code will be added here.";
  const lineCount = code.split("\n").length;
  const prev = week.programs[index - 1];
  const next = week.programs[index + 1];

  return `
  <div class="view">
    <div class="crumbs">
      <a href="#/home">Home</a><span class="sep">/</span>
      <a href="#/week/${week.id}">${weekName(week)}</a><span class="sep">/</span>
      <span>${esc(p.title)}</span>
    </div>
    <h1 class="page-title">${esc(p.title)}</h1>
    <p class="page-sub">${esc(p.description)}</p>

    <section class="panel">
      <div class="panel-head">
        <div class="left"><span>SOURCE CODE</span><span class="file">${esc(fileNameFor(p))}</span></div>
        <button class="copy-btn" id="copyBtn" type="button">Copy code</button>
      </div>
      <div class="code-scroll">
        <div class="gutter" aria-hidden="true">${Array.from({ length: lineCount }, (_, i) => i + 1).join("\n")}</div>
        <div class="code">${isJava(code) ? highlight(code) : esc(code)}</div>
      </div>
    </section>

    <section class="panel run-panel">
      <div class="panel-head run-head"><div class="left"><span class="run-dot">▶</span><span>OUTPUT</span></div></div>
      ${outputBlock(week.id, index)}
    </section>

    <div class="pager">
      <a class="btn ghost" href="#/week/${week.id}">← Back to ${weekName(week)}</a>
      <span style="display:flex;gap:10px;flex-wrap:wrap">
        ${prev ? `<a class="btn ghost" href="#/week/${week.id}/${index - 1}">Previous program</a>` : ""}
        ${next ? `<a class="btn ghost" href="#/week/${week.id}/${index + 1}">Next program</a>` : ""}
      </span>
    </div>
  </div>`;
}

// ---------------------------------------------------------
// Render
// ---------------------------------------------------------

function renderAll() {
  const route = parseRoute();
  let html, status;
  switch (route.type) {
    case "profile": html = viewProfile(); status = "profile.json"; break;
    case "week": html = viewWeek(route.week); status = `weeks / ${weekName(route.week)}`; break;
    case "program": {
      const p = route.week.programs[route.index];
      html = viewProgram(route.week, route.index);
      status = `weeks / ${weekName(route.week)} / ${fileNameFor(p)}`;
      break;
    }
    default: html = viewHome(); status = "README.md";
  }
  editor.innerHTML = html;
  editor.scrollTop = 0;

  document.getElementById("statusPath").textContent = status;
  document.getElementById("statusWho").textContent = `${STUDENT.name} — ${STUDENT.roll}`;
  document.querySelectorAll("[data-quick]").forEach(a =>
    a.classList.toggle("on", a.dataset.quick === route.type));
  document.title = `Java Record Work | ${STUDENT.name}`;

  renderTree(route);
  closeDrawer();

  const copy = document.getElementById("copyBtn");
  if (copy) {
    const raw = route.week.programs[route.index].code || "// Java code will be added here.";
    copy.addEventListener("click", () => {
      const done = () => {
        copy.textContent = "Copied ✓";
        copy.classList.add("done");
        setTimeout(() => { copy.textContent = "Copy code"; copy.classList.remove("done"); }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(raw).then(done, done);
      } else {
        const ta = document.createElement("textarea");
        ta.value = raw; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        ta.remove(); done();
      }
    });
  }
}

// "Explore my record" scrolls to the week grid without breaking hash routing
document.addEventListener("click", e => {
  const a = e.target.closest('a[href="#weeks"]');
  if (!a) return;
  e.preventDefault();
  const el = document.getElementById("weeks");
  if (el) el.scrollIntoView({ behavior: "smooth" });
});

window.addEventListener("hashchange", renderAll);

// ---------------------------------------------------------
// Drawer + theme
// ---------------------------------------------------------

function closeDrawer() { explorer.classList.remove("open"); scrim.classList.remove("show"); }

document.getElementById("menuBtn").addEventListener("click", () => {
  const open = explorer.classList.toggle("open");
  scrim.classList.toggle("show", open);
});
scrim.addEventListener("click", closeDrawer);

document.getElementById("themeBtn").addEventListener("click", () => {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  syncThemeIcon();
});

function syncThemeIcon() {
  document.getElementById("themeBtn").textContent =
    document.documentElement.getAttribute("data-theme") === "dark" ? "☀" : "☾";
}
syncThemeIcon();

renderAll();
