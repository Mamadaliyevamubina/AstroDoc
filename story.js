// =========================================================================
// Astrodoc — STORY MODE: the 60-second guided demo
// Eight short scenes across the dashboard and the check, each with one
// caption, played by the app itself. Space pauses, arrows step, Esc closes.
// The crew's saved data is copied before the story and put back after it,
// so the story never changes what you were doing. Works offline.
// Loaded on index.html and check.html (after their own scripts).
// =========================================================================
(function () {
  const KEY = "astrodoc-story", BACKUP = "astrodoc-story-backup", MS = 7500;
  const page = document.body.classList.contains("check-page") ? "check" : "index";
  const $$ = s => document.querySelector(s);
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const show = (sel, block = "center") => { const el = typeof sel === "string" ? $$(sel) : sel; if (!el) return; el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block }); focusRing(el); };
  function focusRing(el) {
    document.querySelectorAll(".story-focus").forEach(x => x.classList.remove("story-focus"));
    if (el) el.classList.add("story-focus");
  }
  const crewTo = id => { if (typeof view === "function" && currentCrew !== id) view(id); };
  const linkDown = on => { mutate(() => setEarthLink(!on)); if (typeof showAll === "function") showAll(); const c = $("linkDown"); if (c) c.checked = on; };

  const SCENES = [
    { page: "index", text: "Day 214, on the way to Mars. Earth is 18 minutes away, so no doctor can answer quickly. Astrodoc tells the commander what matters now.",
      run() { linkDown(false); crewTo("CDR"); window.scrollTo(0, 0); focusRing($$(".status-card")); } },
    { page: "index", text: "The pilot feels fine. But her blood tests show the pattern of a clot: D-dimer rising while platelets fall. Astrodoc caught it and sent the report to Earth by itself.",
      run() { crewTo("PLT"); show(".status-card", "start"); } },
    { page: "index", text: "Six months of her data, compared week by week with what NASA measured in real astronauts: sleep, mood, bone and body mass.",
      run() { show("#historyCard", "start"); } },
    { page: "check", text: "Feel something? Tap the 3D astronaut where it hurts. Here, the legs.",
      run() { st.places.add("legs"); if (typeof syncWhere === "function") syncWhere(); if (typeof body3d !== "undefined" && body3d) try { body3d.set("legs", true); } catch { } window.scrollTo(0, 0); } },
    { page: "check", text: "Emergency signs always come first. One sign, and Astrodoc says exactly what to do now and reports at top priority.",
      run() { st.flags = new Set([0]); go("emergency"); } },
    { page: "index", text: "About every 26 months the Sun blocks the radio between Earth and Mars for two weeks. Astrodoc keeps working, and reports wait on board.",
      run() { crewTo("CDR"); linkDown(true); window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" }); focusRing($$("#missionHero")); } },
    { page: "index", text: () => `Radiation, from the doses NASA's Curiosity rover measured: the commander passes NASA's 600 mSv career limit on day ${check("CDR").limitDay}, while on Mars.`,
      run() { linkDown(false); show("#doseCard", "start"); } },
    { page: "index", end: true, text: "Astrodoc: what to do now, when Earth is too far away to ask.",
      run() { window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" }); focusRing(null); } }
  ];

  let i = 0, timer = null, paused = false, started = 0, left = MS, bar = null;

  function save() { sessionStorage.setItem(KEY, JSON.stringify({ i })); }
  function start() {
    try { sessionStorage.setItem(BACKUP, localStorage.getItem(STORE) || ""); } catch { }
    mutate(() => { if (!me) me = "CDR"; currentCrew = me; });
    if (document.body.classList.contains("choosing")) { document.body.classList.remove("choosing"); if (typeof showAll === "function") showAll(); }
    i = 0; save(); go2(0);
  }
  function end() {
    clearTimeout(timer);
    sessionStorage.removeItem(KEY);
    const b = sessionStorage.getItem(BACKUP); sessionStorage.removeItem(BACKUP);
    try { if (b) localStorage.setItem(STORE, b); } catch { }
    focusRing(null);
    if (bar) bar.remove(); bar = null;
    document.body.classList.remove("story-on");
    if (page !== "index") location.href = "index.html"; else location.reload();
  }
  function go2(n) {
    clearTimeout(timer);
    if (n < 0) n = 0;
    if (n >= SCENES.length) return end();
    i = n; save();
    const s = SCENES[i];
    if (s.page !== page) { location.href = s.page === "check" ? "check.html" : "index.html"; return; }
    draw();
    try { s.run(); } catch (e) { /* a scene that can't run is skipped quietly */ }
    left = MS; paused = false; tick();
  }
  function tick() {
    clearTimeout(timer);
    started = Date.now();
    if (bar) { const f = bar.querySelector(".story-fill"); f.style.transition = "none"; f.style.width = `${(1 - left / MS) * 100}%`; f.offsetWidth; f.style.transition = `width ${left}ms linear`; f.style.width = "100%"; }
    if (!SCENES[i].end) timer = setTimeout(() => go2(i + 1), left);
  }
  function pause() {
    if (SCENES[i].end) return;
    paused = !paused;
    if (paused) { clearTimeout(timer); left -= Date.now() - started; const f = bar.querySelector(".story-fill"); f.style.width = getComputedStyle(f).width; f.style.transition = "none"; }
    else tick();
    bar.querySelector("[data-s=pause]").innerHTML = paused ? ICONS.play + "<span>Play</span>" : ICONS.pause + "<span>Pause</span>";
  }

  const ICONS = {
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor"/><rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor"/></svg>',
    back: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  function draw() {
    document.body.classList.add("story-on");
    if (!bar) {
      bar = document.createElement("section");
      bar.className = "story-bar"; bar.setAttribute("aria-label", "Astrodoc story");
      document.body.appendChild(bar);
      bar.addEventListener("click", e => {
        const b = e.target.closest("[data-s]"); if (!b) return;
        ({ back: () => go2(i - 1), next: () => go2(i + 1), pause, close: end, again: () => go2(0) })[b.dataset.s]();
      });
    }
    const s = SCENES[i];
    bar.innerHTML = `
      <div class="story-steps" aria-hidden="true">${SCENES.map((_, k) => `<span class="${k < i ? "done" : k === i ? "now" : ""}">${k === i ? '<span class="story-fill"></span>' : ""}</span>`).join("")}</div>
      <p class="story-text" aria-live="polite">${typeof s.text === "function" ? s.text() : s.text}</p>
      <div class="story-ctl">
        <span class="story-count">${i + 1} of ${SCENES.length}</span>
        ${s.end
          ? `<button type="button" class="story-btn" data-s="again">${ICONS.play}<span>Watch again</span></button>
             <button type="button" class="story-btn main" data-s="close"><span>Explore Astrodoc</span></button>`
          : `<button type="button" class="story-btn icon" data-s="back" aria-label="Back" ${i === 0 ? "disabled" : ""}>${ICONS.back}</button>
             <button type="button" class="story-btn" data-s="pause">${ICONS.pause}<span>Pause</span></button>
             <button type="button" class="story-btn icon" data-s="next" aria-label="Next">${ICONS.next}</button>
             <button type="button" class="story-btn icon" data-s="close" aria-label="Close the story">${ICONS.close}</button>`}
      </div>`;
    const main = bar.querySelector(s.end ? "[data-s=close]" : "[data-s=pause]"); if (main) main.focus({ preventScroll: true });
  }
  document.addEventListener("keydown", e => {
    if (!bar) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); end(); }
    else if (e.key === " " && !e.target.closest("button, input, textarea")) { e.preventDefault(); pause(); }
    else if (e.key === "ArrowRight") go2(i + 1);
    else if (e.key === "ArrowLeft") go2(i - 1);
  }, true);

  // Start buttons anywhere on the page: [data-story]
  document.addEventListener("click", e => { if (e.target.closest("[data-story]")) { e.preventDefault(); start(); } });

  // Resume after moving between pages
  let saved = null; try { saved = JSON.parse(sessionStorage.getItem(KEY)); } catch { }
  if (saved && SCENES[saved.i] && SCENES[saved.i].page === page) setTimeout(() => go2(saved.i), page === "check" ? 900 : 400);
  window.startStory = start;
})();
