// =========================================================================
// Astrodoc — SIDEBAR (shared by the dashboard and the companion)
// Left side on wide screens, a slide-out drawer on phones.
//   - Pages: Dashboard, Companion
//   - Crew: you first, then the most urgent; each shows its color and why
//   - Ask Astrodoc: one-tap questions (they open the companion)
//   - Reminders (companion), mission facts
// Each page can plug in:
//   sideCurrent()   → who is shown now
//   sideView(id)    → show someone else
//   sideExtras()    → extra HTML (e.g. reminders)
// Needs core.js. Pages call renderSide() whenever their data changes.
// =========================================================================

const ON_CHAT = document.body.classList.contains("chat-page");

const SIDE_ICON = {
  dash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="8" rx="2"/><rect x="13.5" y="3.5" width="7" height="5" rx="2"/><rect x="13.5" y="11.5" width="7" height="9" rx="2"/><rect x="3.5" y="14.5" width="7" height="6" rx="2"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/><path d="M9 11h.01M15 11h.01M9.5 14.5a3.5 3.5 0 0 0 5 0"/></svg>`,
  brief: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 6h14M5 11h14M5 16h9"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>`,
  who: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6.5a3 3 0 0 1 0 5.5M20.5 19a5.5 5.5 0 0 0-3.5-5.1"/></svg>`,
  breathe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h6"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>`
};

// One tap → the companion answers. On the companion page it is a chip ("data-say");
// elsewhere it opens the companion with the question ready.
const SIDE_ASKS = [
  ["brief",   "Briefing",            "Give me a briefing"],
  ["check",   "Daily check-in",      "Do my check-in"],
  ["who",     "Who needs help most", "Who needs the most help?"],
  ["breathe", "Breathe with me",     "Calm me down"]
];

function renderSide() {
  const el = $("side");
  if (!el) return;
  const cur = typeof sideCurrent === "function" ? sideCurrent() : currentCrew;
  const others = Object.keys(MOCK.crew).filter(id => id !== me).sort(bySeverity);
  const ids = me && MOCK.crew[me] ? [me, ...others] : others;
  const m = MOCK.mission, storm = MOCK.radiation.solarActivity >= SOLAR_STORM_LEVEL;

  const crew = ids.map(id => {
    const S = check(id), mine = id === me;
    return `<button type="button" class="side-crew ${S.overall}" data-side-crew="${id}" aria-current="${id === cur ? "true" : "false"}">
      <span class="side-crew-icon">${ICON[S.overall]}</span>
      <span class="side-crew-text">
        <span class="side-crew-name">${mine ? "You" : MOCK.crew[id].role}${mine ? `<small>${MOCK.crew[id].role}</small>` : ""}</span>
        <span class="side-crew-why"><span class="sr-only">${LABEL[S.overall]}: </span>${escapeHtml(reasonFor(id))}</span>
      </span></button>`;
  }).join("");

  const asks = SIDE_ASKS.map(([icon, label, say]) => ON_CHAT
    ? `<button type="button" class="side-link" data-say="${escapeHtml(say)}">${SIDE_ICON[icon]}<span>${label}</span></button>`
    : `<a class="side-link" href="chat.html#ask=${encodeURIComponent(say)}">${SIDE_ICON[icon]}<span>${label}</span></a>`).join("");

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
    </section>

    <section class="side-group" aria-labelledby="sideAskTitle">
      <h2 class="side-title" id="sideAskTitle">Ask Astrodoc</h2>
      ${asks}
    </section>

    ${typeof sideExtras === "function" ? sideExtras() : ""}

    <div class="side-foot">
      <span>Day ${m.day} of ${m.lengthDays} · ${m.phase}</span>
      <span>Earth delay ${m.signalDelayMin} min each way</span>
      <span class="${storm ? "side-storm" : ""}">${storm ? `${ICON.act} Solar storm now` : `Space weather quiet · ${MOCK.radiation.solarActivity}/100`}</span>
    </div>`;
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
  if (e.target.closest(".side a, .side [data-say]")) closeSide();
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
