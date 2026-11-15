// =========================================================================
// Astrodoc — SIDEBAR (shared by the dashboard and the companion)
// Left side on wide screens, a slide-out drawer on phones. Kept short:
//   - Pages: Dashboard, Check how I feel, Talk to Astrodoc, The science
//   - Crew: you first, then your crewmates, each with a status icon and the reason
// Each page can plug in:
//   sideCurrent()   → who is shown now
//   sideView(id)    → show someone else
// Needs core.js. Pages call renderSide() whenever their data changes.
// =========================================================================

const ON_CHAT = document.body.classList.contains("chat-page");
const ON_SCIENCE = document.body.classList.contains("science-page");

const SIDE_ICON = {
  intro: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/></svg>`,
  dash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="8" rx="2"/><rect x="13.5" y="3.5" width="7" height="5" rx="2"/><rect x="13.5" y="11.5" width="7" height="9" rx="2"/><rect x="3.5" y="14.5" width="7" height="6" rx="2"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/><path d="M9 11h.01M15 11h.01M9.5 14.5a3.5 3.5 0 0 0 5 0"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>`,
  science: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 3.5h5M10.5 3.5v5.2L5.2 18a1.6 1.6 0 0 0 1.4 2.5h10.8a1.6 1.6 0 0 0 1.4-2.5l-5.3-9.3V3.5"/><path d="M7.5 14.5h9"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>`
};

// Each crew member is an embroidered mission patch: twill fill in their own
// colour, a navy overlock edge, a running stitch inside, their code in satin.
// (Not a health colour: status always rides beside it as icon + word.)
const PATCH = { CDR: "#2f4fa8", PLT: "#5b4bb5", MS1: "#1d7fb3" };
function patchBadge(id, cls = "") {
  const fill = PATCH[id] || "#2f4fa8";
  return `<svg class="patch ${cls}" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="31" fill="#1b2550"/>
    <circle cx="32" cy="32" r="28.6" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="2.6" stroke-dasharray=".9 1.5"/>
    <circle cx="32" cy="32" r="25.5" fill="${fill}"/>
    <path d="M9 37 Q32 25 55 32" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="44" cy="17.5" r="2.2" fill="#fff" fill-opacity=".85"/>
    <circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.1" stroke-dasharray="2.2 2.3"/>
    <text x="32" y="${id === "MS1" ? 37 : 37}" text-anchor="middle" class="patch-code">${id}</text>
  </svg>`;
}

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
      <span class="side-crew-patch">${patchBadge(id)}<span class="side-crew-icon ${lvl}">${ICON[lvl]}</span></span>
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
      <a class="side-link" href="index.html" ${ON_CHAT || ON_SCIENCE ? "" : 'aria-current="page"'}>${SIDE_ICON.dash}<span>Dashboard</span></a>
      <a class="side-link" href="check.html">${SIDE_ICON.check}<span>Check how I feel</span></a>
      <a class="side-link" href="chat.html" ${ON_CHAT ? 'aria-current="page"' : ""}>${SIDE_ICON.chat}<span>Talk to Astrodoc</span></a>
      <a class="side-link" href="science.html" ${ON_SCIENCE ? 'aria-current="page"' : ""}>${SIDE_ICON.science}<span>The science</span></a>
      <a class="side-link" href="landing.html">${SIDE_ICON.intro}<span>About Astrodoc</span></a>
    </nav>

    <section class="side-group side-crew-group" aria-labelledby="sideCrewTitle">
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
