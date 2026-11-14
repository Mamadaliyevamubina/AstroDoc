// =========================================================================
// Astrodoc — COMPANION SECTIONS (modes.js, chat page)
// Every section talks to the same Astrodoc, but each one gets its own room:
// its own background, glow color and a line saying what happens here.
//   Chat · Briefing · Check-in · Crew · Breathe
// A section changes when you tap its tab, or when you ask for it in words
// ("give me a briefing", "do my check-in", "who needs the most help?", "calm me down").
// =========================================================================
(function () {
  const MODES = {
    chat:     { label: "Chat",     say: null,                       about: "Talk about anything: how you feel, a reading, a question." },
    briefing: { label: "Briefing", say: "Give me a briefing",       about: "Today in one minute: the mission, the crew and what to watch." },
    checkin:  { label: "Check-in", say: "Do my check-in",           about: "Three quick questions: sleep, mood and water. About a minute." },
    crew:     { label: "Crew",     say: "Who needs the most help?", about: "Your crewmates: who needs care first, and why." },
    breathe:  { label: "Breathe",  say: "Calm me down",             about: "Slow breathing together. Nothing to do but follow the words." }
  };
  const ICONS = {
    chat:     '<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/>',
    briefing: '<path d="M5 6h14M5 11h14M5 16h9"/>',
    checkin:  '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
    crew:     '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6.5a3 3 0 0 1 0 5.5M20.5 19a5.5 5.5 0 0 0-3.5-5.1"/>',
    breathe:  '<path d="M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h6"/>'
  };
  // Words that open a section
  const DETECT = [
    ["breathe",  /\b(calm me|breathe|breathing|relax|panic|anxious)\b/i],
    ["checkin",  /\bcheck[\s-]?in\b/i],
    ["briefing", /\b(brief|briefing|today'?s plan|plan for today)\b/i],
    ["crew",     /\b(who needs|most help|everyone|everybody|all (the )?crew|whole crew|the (pilot|commander|mission specialist)|crewmate)/i]
  ];

  const top = document.querySelector(".c-top");
  if (!top) return;
  const bar = document.createElement("nav");
  bar.className = "c-modes"; bar.setAttribute("aria-label", "Companion sections");
  bar.innerHTML = `
    <div class="c-mode-tabs">${Object.entries(MODES).map(([k, m]) => `
      <button type="button" class="c-mode" data-mode="${k}" aria-pressed="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>${m.label}</button>`).join("")}
    </div>
    <p class="c-mode-about" id="modeAbout" aria-live="polite"></p>`;
  top.appendChild(bar);

  function setMode(mode) {
    if (!MODES[mode]) mode = "chat";
    document.body.dataset.mode = mode;
    bar.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    $("modeAbout").innerHTML = `<b>${MODES[mode].label}</b> · ${MODES[mode].about}`;
    try { sessionStorage.setItem("astrodoc-mode", mode); } catch { }
  }

  // Asking for a section in words also opens it
  const baseRespond = window.respond;
  if (typeof baseRespond === "function") {
    window.respond = function (raw, opts) {
      const hit = DETECT.find(([, re]) => re.test(String(raw)));
      if (hit) setMode(hit[0]);
      return baseRespond.call(this, raw, opts);
    };
  }

  // Tabs: open the section and let Astrodoc start it
  bar.addEventListener("click", e => {
    const b = e.target.closest("[data-mode]"); if (!b) return;
    const m = b.dataset.mode;
    if (document.body.dataset.mode === m && m !== "chat") return;
    setMode(m);
    if (MODES[m].say && typeof window.respond === "function") window.respond(MODES[m].say);
  });

  // Start: chat.html#mode=briefing opens a section; otherwise keep the last one this visit
  const fromHash = (location.hash.match(/#mode=(\w+)/) || [])[1];
  let saved = null; try { saved = sessionStorage.getItem("astrodoc-mode"); } catch { }
  setMode(fromHash || saved || "chat");
  if (fromHash && MODES[fromHash].say) { history.replaceState(null, "", location.pathname); setTimeout(() => window.respond(MODES[fromHash].say), 500); }
})();
