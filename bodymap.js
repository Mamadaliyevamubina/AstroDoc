// =========================================================================
// Astrodoc — 3D BODY MAP on the dashboard (index.html)
// Tap the astronaut (or a button) to see what that part of the body says:
// its readings, its color, and what to do. Places with a problem get a
// marker in their status color. Uses core.js, app.js and assets/js/body3d.js.
// =========================================================================
(function () {
  const host = $("bodyMap");
  if (!host) return;

  // Each place: a name, the readings that belong to it, and the warning keys it owns
  const v = (name, value, status) => ({ name, value, status });
  const REGIONS = {
    head:  { name: "Brain, sleep and mood", keys: ["tired", "sleep", "reaction", "mood", "gap"],
             items: (c, S) => [v("Sleep last night", `${S.lastNight} h`, S.sleep), v("Mood", `${S.moodValue} of 5`, S.mood),
                               v("Reactions", S.reactionPct === null ? "No test yet" : `${S.reactionPct > 0 ? S.reactionPct + "% slower" : "As usual"}`, S.reaction)] },
    neck:  { name: "Blood flow and clots", keys: ["clot", "labs", "trend"],
             items: (c, S) => { const d = c.labs.map(e => e.ddimer).filter(x => x != null);
                               return [v("D-dimer (latest blood test)", d.length ? `${d[d.length - 1].toFixed(2)} mg/L` : "No test", S.blood || "normal")]; } },
    chest: { name: "Heart and lungs", keys: ["hr", "bp", "temp"],
             items: (c, S) => [v("Heart rate at rest", `${c.vitals.hr} bpm`, S.hr), v("Blood pressure", `${c.vitals.bpSys}/${c.vitals.bpDia}`, S.bp),
                               v("Temperature", `${c.vitals.temp} °C`, S.temp)] },
    belly: { name: "Kidneys and water", keys: ["water"],
             items: (c, S) => [v("Water today", `${c.water.glasses} of ${c.water.goal} glasses`, S.water)] },
    back:  { name: "Spine and bones", keys: ["exercise", "vitd"],
             items: (c, S) => [v("Exercise this week", `${c.exercise} of 6 sessions`, S.exercise), v("Vitamin D", c.vitD ? `${c.vitD} ng/mL` : "No test", S.vitD)] },
    arms:  { name: "Muscles", keys: ["exercise"],
             items: (c, S) => [v("Exercise this week", `${c.exercise} of 6 sessions`, S.exercise)] },
    legs:  { name: "Bones and muscles", keys: ["exercise", "vitd"],
             items: (c, S) => [v("Exercise this week", `${c.exercise} of 6 sessions`, S.exercise), v("Vitamin D", c.vitD ? `${c.vitD} ng/mL` : "No test", S.vitD)] },
    whole: { name: "Whole body: radiation", keys: ["storm", "dose", "emergency"],
             items: (c, S) => [v("Career dose", `${S.dose.toFixed(0)} of 600 mSv`, S.radiation)] }
  };
  const ORDER = ["head", "neck", "chest", "belly", "back", "arms", "legs", "whole"];
  const SHORT = { head: "Brain", neck: "Neck", chest: "Heart", belly: "Kidneys", back: "Spine", arms: "Arms", legs: "Legs", whole: "Radiation" };

  function regionState(id, place) {
    const c = MOCK.crew[id], S = check(id), R = REGIONS[place];
    const items = R.items(c, S);
    const warns = S.warnings.filter(w => R.keys.includes(w.key));
    const status = worst(...items.map(i => i.status), ...warns.map(w => w.status));
    return { items, warns, status };
  }
  // Start on the most urgent place (same order as the status card)
  function mostUrgent(id) {
    const S = check(id);
    for (const w of S.warnings) { const p = ORDER.find(k => REGIONS[k].keys.includes(w.key)); if (p) return p; }
    return "chest";
  }

  host.innerHTML = `
    <div class="bm-head">
      <h2 id="bmTitle">Body map</h2>
      <p class="muted">Tap the astronaut, or a part below. Colored dots show where something needs attention.</p>
    </div>
    <div class="bm-grid">
      <div class="bm-3d" id="bm3d">
        <span class="b3d-loading">Loading the astronaut…</span>
        <button type="button" class="b3d-turn" id="bmTurn">Turn around</button>
      </div>
      <div class="bm-info">
        <div class="bm-parts" id="bmParts" role="group" aria-label="Parts of the body"></div>
        <div class="bm-panel" id="bmPanel" aria-live="polite"></div>
      </div>
    </div>`;

  let selected = null, shownFor = null, body = null;
  const COLOR = s => getComputedStyle(document.documentElement).getPropertyValue(s === "act" ? "--act" : s === "watch" ? "--watch" : "--mint-soft").trim() || "#2fbfa6";

  function render() {
    if (!me || !MOCK.crew[currentCrew]) return;
    if (shownFor !== currentCrew) { selected = mostUrgent(currentCrew); shownFor = currentCrew; }
    const id = currentCrew;
    const states = Object.fromEntries(ORDER.map(p => [p, regionState(id, p)]));

    $("bmParts").innerHTML = ORDER.map(p => `
      <button type="button" class="bm-part ${states[p].status}" data-part="${p}" aria-pressed="${p === selected}">
        <span class="bm-icon">${ICON[states[p].status]}</span><span>${SHORT[p]}</span>
        <span class="sr-only">: ${LABEL[states[p].status]}</span></button>`).join("");
    document.querySelectorAll("[data-part]").forEach(b => b.onclick = () => { selected = b.dataset.part; render(); b.focus && document.querySelector(`[data-part="${selected}"]`).focus(); });

    const st = states[selected], R = REGIONS[selected];
    $("bmPanel").innerHTML = `
      <div class="bm-panel-top"><h3>${R.name}</h3>${badge(st.status)}</div>
      <ul class="bm-items">${st.items.map(i => `<li><span>${i.name}</span><b>${i.value}</b>${badge(i.status)}</li>`).join("")}</ul>
      ${st.warns.length ? `<div class="bm-do">${st.warns.map(w => `<p><span class="do-label">Do now</span>${w.todo}</p>`).join("")}</div>`
                        : `<p class="bm-ok">Nothing to do here right now.</p>`}`;

    // markers: every place with a problem, plus the chosen place
    if (body) {
      body.clear();
      ORDER.forEach(p => { if (p !== "whole" && (states[p].status !== "normal" || p === selected)) body.set(p, true, null, COLOR(states[p].status)); });
      body.select(selected);
    }
  }

  // Load the 3D astronaut when the card scrolls into view (keeps the dashboard fast)
  function load3d() {
    if (!window.Body3D) return fail();
    try {
      body = window.Body3D.mount($("bm3d"), {
        url: "assets/models/astronaut.glb",
        label: p => SHORT[p] || p,
        onPick: p => { selected = p; render(); }
      });
      body.ready.then(() => { $("bm3d").classList.add("loaded"); render(); }).catch(fail);
      $("bmTurn").onclick = () => body.turn();
    } catch { fail(); }
  }
  function fail() { body = null; host.classList.add("no-3d"); }
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); load3d(); } }, { rootMargin: "200px" });
    io.observe(host);
  } else load3d();

  // Redraw whenever the dashboard redraws (new readings, another crew member)
  const base = window.showAll;
  if (typeof base === "function") window.showAll = function () { const r = base.apply(this, arguments); render(); return r; };
  render();
})();
