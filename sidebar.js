// =========================================================================
// Astrodoc — SIDEBAR (shared by the dashboard and the companion)
// Left side on wide screens, a slide-out drawer on phones. Kept short:
//   - Pages: Dashboard, Companion, Check how I feel
//   - Crew: you first, then your crewmates, each with a status icon and the reason
// Each page can plug in:
//   sideCurrent()   → who is shown now
//   sideView(id)    → show someone else
// Needs core.js. Pages call renderSide() whenever their data changes.
// =========================================================================

const ON_CHAT = document.body.classList.contains("chat-page");

const SIDE_ICON = {
  dash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="8" rx="2"/><rect x="13.5" y="3.5" width="7" height="5" rx="2"/><rect x="13.5" y="11.5" width="7" height="9" rx="2"/><rect x="3.5" y="14.5" width="7" height="6" rx="2"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/><path d="M9 11h.01M15 11h.01M9.5 14.5a3.5 3.5 0 0 0 5 0"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>`
};

function renderSide() {
  const el = $("side");
  if (!el) return;
  const cur = typeof sideCurrent === "function" ? sideCurrent() : currentCrew;
  const others = Object.keys(MOCK.crew).filter(id => id !== me).sort(bySeverity);
  const ids = me && MOCK.crew[me] ? [me, ...others] : others;

  // Each row: status icon (shape + color), name, and the reason in a few words
  const crew = ids.map(id => {
    const lvl = check(id).overall;
    return `
    <button type="button" class="side-crew" data-side-crew="${id}" aria-current="${id === cur ? "true" : "false"}">
      <span class="side-crew-icon ${lvl}">${ICON[lvl]}</span>
      <span class="side-crew-text">
        <span class="side-crew-name">${id === me ? `You <small>${MOCK.crew[id].role}</small>` : MOCK.crew[id].role}</span>
        <span class="side-crew-why"><span class="sr-only">${LABEL[lvl]}: </span>${reasonFor(id)}</span>
      </span>
    </button>`;
  }).join("");

  el.innerHTML = `
    <a class="brand side-brand" href="index.html">
      <span class="brand-mark"><img src="assets/astrodoc-logo-mark.png" alt=""></span>
      <span class="brand-name">Astrodoc</span>
    </a>

    <nav class="side-group" aria-label="Pages">
      <a class="side-link" href="index.html" ${ON_CHAT ? "" : 'aria-current="page"'}>${SIDE_ICON.dash}<span>Dashboard</span></a>
      <a class="side-link" href="chat.html" ${ON_CHAT ? 'aria-current="page"' : ""}>${SIDE_ICON.chat}<span>Companion</span></a>
      <a class="side-link" href="check.html">${SIDE_ICON.check}<span>Check how I feel</span></a>
    </nav>

    <section class="side-group" aria-labelledby="sideCrewTitle">
      <h2 class="side-title" id="sideCrewTitle">${ON_CHAT ? "Talk about" : "Crew"}</h2>
      ${crew}
    </section>`;
}

// Clicks: crew rows switch who is shown; links and chips close the drawer on phones
document.addEventListener("click", e => {
  const crewBtn = e.target.closest("[data-side-crew]");
  if (crewBtn) {
    const id = crewBtn.dataset.sideCrew;
    if (typeof sideView === "function") sideView(id);
    else { mutate(() => { currentCrew = id; }); location.href = "index.html"; }
    closeSide();
    return;
  }
  if (e.target.closest(".side a")) closeSide();
  if (e.target.closest(".side-scrim")) closeSide();
  if (e.target.closest(".side-toggle")) toggleSide();
});

// Phone drawer
function toggleSide(open = !document.body.classList.contains("side-open")) {
  document.body.classList.toggle("side-open", open);
  document.querySelectorAll(".side-toggle").forEach(b => b.setAttribute("aria-expanded", String(open)));
  if (open) { const first = $("side").querySelector("a, button"); if (first) first.focus({ preventScroll: true }); }
}
function closeSide() { if (document.body.classList.contains("side-open")) toggleSide(false); }
document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("side-open")) { closeSide(); e.stopImmediatePropagation(); } }, true);

// Build once: the menu button goes first in the page header, plus a dimmed backdrop
(() => {
  if (!$("side")) return;
  document.body.classList.add("has-side");
  const header = document.querySelector(".top, .c-top");
  if (header) header.insertAdjacentHTML("afterbegin",
    `<button type="button" class="side-toggle" aria-controls="side" aria-expanded="false" aria-label="Menu">${SIDE_ICON.menu}</button>`);
  $("side").insertAdjacentHTML("afterend", `<div class="side-scrim" aria-hidden="true"></div>`);
})();
