// =========================================================================
// Astrodoc — Crew dashboard (NASA Space Apps 2026)
// File layout:
//   1. MOCK          all fake data (replace with real data later)
//   2. THRESHOLDS    turns numbers into normal / watch / act
//   3. CHECK         looks at one crew member and builds the warning list
//   4. SHOW          draws the one page (status, 4 readings)
//   5. INPUT         today's input, clot checklist, report, emergency
//   6. DEMO + SENSOR solar storm, location, Arduino hooks
// =========================================================================


// =========================================================================
// 1. MOCK — all fake data lives here. Replace with real data later.
// =========================================================================
const MOCK = {
  mission: {
    day: 214,
    lengthDays: 1000,          // a ~3-year Mars mission
    phase: "Mars transit",
    signalDelayMin: 18,        // one way. Round trip = 2x
    location: "spacecraft"     // key of MOCK.locations
  },
  radiation: {
    issRatePerDay: 0.6,        // mSv/day, simulated ISS-like rate
    careerLimit: 600,          // NASA-STD-3001 Vol. 1 Rev. B
    solarActivity: 10,         // 0-100, the "knob". 70+ = solar storm
    stormMultiplier: 5         // simulated: dose rate during a solar storm
  },
  // Dose rate vs the ISS (team research)
  locations: {
    spacecraft: { label: "Spacecraft (deep space)", multiplier: 2.5 },
    station:    { label: "Space station",           multiplier: 1 },
    moon:       { label: "Moon base",               multiplier: 1.5 },
    mars:       { label: "Mars base",               multiplier: 1 }
  },
  earthLog: [],                // reports sent to Earth (filled while the app runs)

  crew: {
    // CDR = demo story: short sleep + slow reactions + high heart rate
    CDR: {
      role: "Commander",
      points: 120,
      sleep: { nights: [7.0, 5.5, 5.8, 5.2, 5.6, 5.9, 5.4], hoursAwake: 9 },
      vitals: { hr: 112, temp: 36.9, bpSys: 124, bpDia: 79, source: "simulated" },
      checkin: { self: { energy: 4, focus: 4, mood: 4 }, mate: { energy: 2, focus: 3, mood: 3 } },
      reaction: { baselineMs: 280, lastMs: 325 },
      radiation: { careerDoseMSv: 310, accrued: 0 },
      exercise: 6, water: { glasses: 5, goal: 8 }, vitD: 48,
      labs: [
        { day: 150, ddimer: 0.30, platelets: 240, fibrinogen: 300, inr: 1.00, pt: 1.0, aptt: 30.0 },
        { day: 190, ddimer: 0.35, platelets: 230, fibrinogen: 290, inr: 1.02, pt: 1.2, aptt: 31.0 },
        { day: 212, ddimer: 0.32, platelets: 235, fibrinogen: 310, inr: 1.01, pt: 1.1, aptt: 30.5 }
      ]
    },
    // PLT = blood clot story: each value only amber, together red
    PLT: {
      role: "Pilot",
      points: 95,
      sleep: { nights: [7.4, 7.1, 7.6, 7.0, 7.3, 7.5, 7.2], hoursAwake: 6 },
      vitals: { hr: 78, temp: 36.7, bpSys: 116, bpDia: 76, source: "simulated" },
      checkin: { self: { energy: 4, focus: 4, mood: 4 }, mate: { energy: 4, focus: 4, mood: 4 } },
      reaction: { baselineMs: 265, lastMs: 270 },
      radiation: { careerDoseMSv: 250, accrued: 0 },
      exercise: 4, water: { glasses: 6, goal: 8 }, vitD: 52,
      labs: [
        { day: 150, ddimer: 0.40, platelets: 210, fibrinogen: 280, inr: 1.00, pt: 1.0, aptt: 30.0 },
        { day: 190, ddimer: 0.90, platelets: 160, fibrinogen: 230, inr: 1.05, pt: 1.6, aptt: 33.0 },
        { day: 212, ddimer: 1.80, platelets: 120, fibrinogen: 180, inr: 1.08, pt: 2.2, aptt: 35.0 }
      ]
    },
    // MS1 = healthy, small things to watch
    MS1: {
      role: "Mission Specialist",
      points: 140,
      sleep: { nights: [7.8, 7.5, 8.1, 7.2, 7.9, 7.6, 7.4], hoursAwake: 4 },
      vitals: { hr: 66, temp: 36.6, bpSys: 112, bpDia: 72, source: "simulated" },
      checkin: { self: { energy: 3, focus: 4, mood: 4 }, mate: { energy: 3, focus: 4, mood: 4 } },
      reaction: { baselineMs: 290, lastMs: 288 },
      radiation: { careerDoseMSv: 180, accrued: 0 },
      exercise: 7, water: { glasses: 3, goal: 8 }, vitD: 31,
      labs: [
        { day: 150, ddimer: 0.25, platelets: 260, fibrinogen: 320, inr: 0.98, pt: 0.8, aptt: 29.0 },
        { day: 212, ddimer: 0.28, platelets: 255, fibrinogen: 315, inr: 0.99, pt: 0.9, aptt: 29.5 }
      ]
    }
  }
};
// ============================== end MOCK ==============================

let currentCrew = "CDR";
const emergency = { active: false, signs: {} };   // for the selected crew member
const autoReported = {};                           // automatic reports are sent once
const checklistDone = {};


// =========================================================================
// 2. THRESHOLDS — "normal" (green), "watch" (amber), "act" (red).
// From the team's research table. "Proposal" = medical team must confirm.
// =========================================================================
const T = {
  sleepNight: (h, awake) => (h < 6 || awake >= 17) ? "act" : h < 7 ? "watch" : "normal",
  sleepDebt:  h => h >= 10 ? "act" : h >= 4 ? "watch" : "normal",          // proposal
  mood:       v => v <= 2 ? "act" : v === 3 ? "watch" : "normal",
  gap:        g => g >= 3 ? "act" : g === 2 ? "watch" : "normal",          // proposal
  reaction:   pct => pct > 20 ? "act" : pct >= 10 ? "watch" : "normal",    // proposal
  radiation:  (dose, storm) => (storm || dose > 480) ? "act" : dose >= 300 ? "watch" : "normal",
  heartRate:  v => (v < 50 || v > 120) ? "act" : (v < 60 || v > 100) ? "watch" : "normal",
  temperature:v => (v >= 38 || v < 35) ? "act" : (v >= 37.3 || v < 36.1) ? "watch" : "normal",
  bloodPressure: (s, d) => (s >= 140 || d >= 90) ? "act" : (s >= 120 || d >= 80) ? "watch" : "normal",
  exercise:   n => n >= 6 ? "normal" : n >= 4 ? "watch" : "act",           // proposal
  water:      (g, goal) => g >= goal * 0.6 ? "normal" : "watch",           // proposal
  vitaminD:   v => (v >= 35 && v <= 90) ? "normal" : "watch"
};
const SOLAR_STORM_LEVEL = 70;

// Clotting tests. Gaps in the lab table are filled (proposal) so every value has one color.
const LABS = [
  { key: "ddimer",     name: "D-dimer",    unit: "mg/L FEU", classify: v => v > 4.0 ? "act" : v > 0.5 ? "watch" : "normal" },
  { key: "platelets",  name: "Platelets",  unit: "×10⁹/L",   classify: v => (v < 30 || v > 1000) ? "act" : (v < 150 || v > 400) ? "watch" : "normal" },
  { key: "fibrinogen", name: "Fibrinogen", unit: "mg/dL",    classify: v => v < 100 ? "act" : (v < 200 || v > 395) ? "watch" : "normal" },
  { key: "inr",        name: "INR",        unit: "",         classify: v => v > 1.6 ? "act" : (v < 0.8 || v > 1.10) ? "watch" : "normal" },
  { key: "pt",         name: "PT",         unit: "s above limit", classify: v => v > 6.0 ? "act" : v >= 3.0 ? "watch" : "normal" },
  { key: "aptt",       name: "aPTT",       unit: "s",        classify: v => v > 150 ? "act" : (v < 27.5 || v > 36.5) ? "watch" : "normal" }
];

// What the app tells the astronaut (from the research table)
const ADVICE = {
  sleep:     "Keep fixed sleep and wake times. Bright light after waking, dim light before sleep. Short nap if very tired.",
  tired:     "Nap now, lighter workload today, bright light schedule tomorrow.",
  moodWatch: "Rest, do something meaningful, talk with the crew.",
  moodAct:   "Report to the flight surgeon. Reduce workload.",
  gap:       "Talk together. People who are tired rarely notice it themselves.",
  reaction:  "Avoid critical tasks. Nap if possible.",
  hr:        "Sit, rest 5 minutes, measure again. Red twice: report.",
  temp:      "Rest, drink water, measure again in 1 hour. Red: report.",
  bp:        "Rest, measure again. Red: report.",
  dose:      "Log the dose. Review the exposure plan with Earth.",
  solar:     "Go to the shielded area (water storage) now. Take your dosimeter. Stay until the all-clear.",
  exercise:  "Don't skip sessions. Resistance exercise protects bones and muscles.",
  water:     "Drink water. Severe side pain is an emergency.",
  vitD:      "Vitamin D outside 35–90. Ask the flight surgeon about a supplement.",
  clotWatch: "Drink water, use lower-body negative pressure, repeat the test within 24 hours.",
  clotAct:   "Stop work, stay still, follow the clot checklist. Report at once."
};


// =========================================================================
// 3. CHECK — compute every status for one crew member
// =========================================================================
const RANK = { none: -1, normal: 0, watch: 1, act: 2 };
const worst = (...list) => list.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), "normal");
const bad = s => RANK[s] >= 1;    // watch or act

function doseRatePerDay() {
  const r = MOCK.radiation;
  let rate = r.issRatePerDay * MOCK.locations[MOCK.mission.location].multiplier;
  if (r.solarActivity >= SOLAR_STORM_LEVEL) rate *= r.stormMultiplier;
  return rate;
}

function check(id) {
  const c = MOCK.crew[id];
  const S = {};

  // Sleep
  S.lastNight = c.sleep.nights[c.sleep.nights.length - 1];
  S.debt = c.sleep.nights.reduce((sum, h) => sum + Math.max(0, 8 - h), 0);   // hours below 8, last 7 nights
  S.sleep = worst(T.sleepNight(S.lastNight, c.sleep.hoursAwake), T.sleepDebt(S.debt));

  // Mood: use the LOWER of self and crewmate rating
  S.moodValue = Math.min(c.checkin.self.mood, c.checkin.mate.mood);
  S.mood = T.mood(S.moodValue);
  S.gaps = ["energy", "focus", "mood"].map(m => ({ m, self: c.checkin.self[m], mate: c.checkin.mate[m],
    status: T.gap(Math.abs(c.checkin.self[m] - c.checkin.mate[m])) }));
  S.biggestGap = S.gaps.reduce((a, b) => (RANK[b.status] > RANK[a.status] ? b : a));

  // Reaction test vs personal baseline
  S.reactionPct = c.reaction.lastMs ? Math.round((c.reaction.lastMs - c.reaction.baselineMs) / c.reaction.baselineMs * 100) : null;
  S.reaction = S.reactionPct === null ? "normal" : T.reaction(S.reactionPct);

  // Vitals
  S.hr = T.heartRate(c.vitals.hr);
  S.temp = T.temperature(c.vitals.temp);
  S.bp = T.bloodPressure(c.vitals.bpSys, c.vitals.bpDia);

  // Radiation
  S.storm = MOCK.radiation.solarActivity >= SOLAR_STORM_LEVEL;
  S.dose = c.radiation.careerDoseMSv + c.radiation.accrued;
  S.radiation = T.radiation(S.dose, S.storm);

  // Exercise, water, vitamin D
  S.exercise = T.exercise(c.exercise);
  S.water = T.water(c.water.glasses, c.water.goal);
  S.vitD = c.vitD ? T.vitaminD(c.vitD) : "normal";

  // Blood tests: latest value of each, plus pattern and trend rules
  S.labOut = [];        // tests outside normal
  S.labTrend = [];      // tests getting worse
  LABS.forEach(L => {
    const values = c.labs.map(e => e[L.key]).filter(v => v != null);
    if (!values.length) return;
    const latest = values[values.length - 1];
    const status = L.classify(latest);
    if (bad(status)) S.labOut.push({ name: L.name, value: latest, status });
    const last2 = values.slice(-2).map(L.classify);
    const v3 = values.slice(-3);
    if ((last2.length === 2 && last2.every(bad)) ||
        (L.key === "ddimer" && v3.length === 3 && v3[0] < v3[1] && v3[1] < v3[2])) S.labTrend.push(L.name);
  });
  const last = key => { const v = c.labs.map(e => e[key]).filter(x => x != null); return v.length ? v[v.length - 1] : null; };
  // Dangerous pattern: high D-dimer + low platelets + low fibrinogen = red
  S.clotPattern = last("ddimer") > 0.5 && last("platelets") < 150 && last("fibrinogen") < 200;
  S.blood = S.clotPattern ? "act" : worst(...S.labOut.map(l => l.status));

  // Tired = short sleep + slow reactions + high heart rate together
  S.tired = bad(S.sleep) && bad(S.reaction) && bad(S.hr);

  S.warnings = buildWarnings(id, c, S);
  S.overall = worst(...S.warnings.map(w => w.status));
  return S;
}

// One plain-language warning per problem, each with what to do now
function buildWarnings(id, c, S) {
  // Each warning has a "key" so the voice assistant can say it in natural words
  const W = [];
  const add = (key, status, title, todo, extra) => { if (bad(status)) W.push({ key, status, title, todo, extra }); };

  if (id === currentCrew && emergency.active) add("emergency", "act", "Medical emergency declared", "Oxygen mask, keep the person still. Report sent to Earth at top priority.");
  if (S.storm) add("storm", "act", "Solar storm: radiation danger", ADVICE.solar);
  if (S.clotPattern) {
    add("clot", "act", "Possible blood clot (dangerous pattern in blood test)", ADVICE.clotAct, "clot");
  } else if (S.labOut.length) {
    add("labs", S.blood, `Blood test outside normal: ${S.labOut.map(l => l.name).join(", ")}`, S.blood === "act" ? ADVICE.clotAct : ADVICE.clotWatch, S.blood === "act" ? "clot" : null);
  }
  if (S.labTrend.length) add("trend", "act", `Blood test getting worse: ${S.labTrend.join(", ")}`, "Report sent to the flight surgeon automatically. Repeat the test within 24 hours.");

  if (S.tired) {
    add("tired", worst(S.sleep, S.reaction, S.hr), `Tired: short sleep, slow reactions and high heart rate (${c.vitals.hr} bpm)`, ADVICE.tired);
  } else {
    const shortNight = bad(T.sleepNight(S.lastNight, c.sleep.hoursAwake));
    add("sleep", S.sleep, shortNight
      ? `Not enough sleep: ${S.lastNight} h last night, ${S.debt.toFixed(1)} h short this week`
      : `Sleep debt: ${S.debt.toFixed(1)} h short this week`, ADVICE.sleep);
    add("reaction", S.reaction, `Reactions ${S.reactionPct}% slower than usual`, ADVICE.reaction);
    add("hr", S.hr, `Heart rate ${c.vitals.hr > 100 ? "high" : "low"}: ${c.vitals.hr} bpm`, ADVICE.hr);
  }
  add("temp", S.temp, `Temperature ${c.vitals.temp >= 37.3 ? "high" : "low"}: ${c.vitals.temp} °C`, ADVICE.temp);
  add("bp", S.bp, `Blood pressure high: ${c.vitals.bpSys}/${c.vitals.bpDia}`, ADVICE.bp);
  add("mood", S.mood, `Low mood: ${S.moodValue} of 5`, S.mood === "act" ? ADVICE.moodAct : ADVICE.moodWatch);
  const g = S.biggestGap;
  add("gap", g.status, `Crewmate sees you differently (${g.m}: you ${g.self}, crewmate ${g.mate})`, ADVICE.gap);
  if (!S.storm) add("dose", S.radiation, `Radiation dose high: ${S.dose.toFixed(0)} of 600 mSv`, ADVICE.dose);
  add("exercise", S.exercise, `Too little exercise: ${c.exercise} of 6 sessions this week`, ADVICE.exercise);
  add("water", S.water, `Drink more water: ${c.water.glasses} of ${c.water.goal} glasses`, ADVICE.water);
  add("vitd", S.vitD, `Vitamin D out of range: ${c.vitD} ng/mL`, ADVICE.vitD);

  return W.sort((a, b) => RANK[b.status] - RANK[a.status]);
}


// =========================================================================
// 4. SHOW — draw the one page
// =========================================================================
const $ = id => document.getElementById(id);
const LABEL = { normal: "Normal", watch: "Watch", act: "Act now" };
const ICON = {
  normal: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M4.5 8.2 7 10.5l4.5-5" stroke="#fff" stroke-width="2" fill="none"/></svg>',
  watch:  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1 15 14H1Z" fill="currentColor"/><rect x="7.2" y="5.5" width="1.6" height="4.5" fill="#fff"/><rect x="7.2" y="11" width="1.6" height="1.6" fill="#fff"/></svg>',
  act:    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 1h6l4 4v6l-4 4H5l-4-4V5Z" fill="currentColor"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" stroke-width="2"/></svg>'
};
const badge = (status, text) => `<span class="status ${status}">${ICON[status]}${text || LABEL[status]}</span>`;
const time = (d = new Date()) => d.toTimeString().slice(0, 5);
const addMin = (d, m) => new Date(d.getTime() + m * 60000);

// Welcome screen: choose who to check on (each choice shows their status).
// Header shows the chosen person; "Change" goes back to the choice.
const ROLE_NOTE = { CDR: "Leads the mission", PLT: "Flies the spacecraft", MS1: "Runs the science" };
function showCrew() {
  $("crewSelector").innerHTML = Object.keys(MOCK.crew).map(id => {
    const S = check(id);
    return `<button class="choice ${S.overall}" data-crew="${id}">
      <span class="choice-name">${MOCK.crew[id].role}</span>
      <span class="choice-note">${ROLE_NOTE[id] || id}</span>
      ${badge(S.overall)}</button>`;
  }).join("");
  document.querySelectorAll("[data-crew]").forEach(b => b.onclick = () => chooseCrew(b.dataset.crew));
  const S = check(currentCrew);
  $("switchCrew").innerHTML = `<span class="crew-dot ${S.overall}">${ICON[S.overall]}</span>${MOCK.crew[currentCrew].role}
    <span class="sr-only">, ${LABEL[S.overall]}.</span><span class="change">Change</span>`;
}
function chooseCrew(id) {
  if (id !== currentCrew) { emergency.active = false; emergency.signs = {}; emergencyAsk = false; }
  currentCrew = id;
  document.body.classList.remove("choosing");
  showAll();
  window.scrollTo(0, 0);
  $("switchCrew").focus({ preventScroll: true });
}
$("switchCrew").onclick = () => {
  document.body.classList.add("choosing");
  showCrew();
  window.scrollTo(0, 0);
  const current = document.querySelector(`[data-crew="${currentCrew}"]`);
  if (current) current.focus();
};

function showMission() {
  const m = MOCK.mission, last = MOCK.earthLog[MOCK.earthLog.length - 1];
  $("missionStrip").innerHTML = `<span>Day ${m.day} · ${m.phase}</span><span>Earth delay ${m.signalDelayMin} min</span>` +
    (last ? `<span>Last report ${time(last.sent)}, reply ~${time(last.reply)}</span>` : "");
}

// Status: the most urgent thing and what to do now. Other things as short lines.
function showStatus(S) {
  const c = MOCK.crew[currentCrew];
  const sorted = [...S.warnings].sort((a, b) => RANK[b.status] - RANK[a.status]);
  const [first, ...rest] = sorted;
  $("statusCard").innerHTML = `
    <div class="st-top"><span class="who">${currentCrew} · ${c.role}</span>${badge(S.overall)}</div>
    ${first ? `
      <h1 class="st-title">${first.title}</h1>
      <p class="st-do"><span class="do-label">Do now</span>${first.todo}</p>
      ${first.extra === "clot" || rest.some(w => w.extra === "clot") ? clotSteps() : ""}
      ${rest.length ? `<ul class="st-more">${rest.map(w => `
        <li class="${w.status}" title="Do now: ${w.todo}">${ICON[w.status]}<span class="sr-only">${LABEL[w.status]}:</span><span>${w.title}</span></li>`).join("")}</ul>` : ""}`
    : `<h1 class="st-title">All good</h1><p class="st-do">Every reading is in the normal range. Keep the routine.</p>`}`;
  document.querySelectorAll("[data-step]").forEach(cb => cb.onchange = () => {
    checklistDone[currentCrew][cb.dataset.step] = cb.checked; cb.closest("li").classList.toggle("done", cb.checked);
  });
}

// Four readings only. Everything else is still checked and shows up above when it matters.
function showVitals(S) {
  const c = MOCK.crew[currentCrew];
  const items = [
    { name: "Heart rate", value: c.vitals.hr, unit: "bpm", status: S.hr },
    { name: "Sleep",      value: S.lastNight, unit: "h", status: S.sleep },
    { name: "Mood",       value: S.moodValue, unit: "/ 5", status: worst(S.mood, S.biggestGap.status) },
    { name: "Radiation",  value: `<span id="doseValue">${S.dose.toFixed(0)}</span>`, unit: "of 600 mSv", status: S.radiation }
  ];
  $("vitals").innerHTML = items.map(t => `
    <div class="vital ${t.status}">
      <span class="v-name">${t.name}</span>
      <span class="v-value">${t.value}<small>${t.unit}</small></span>
      ${badge(t.status)}
    </div>`).join("");
}

function showAll() {
  const S = check(currentCrew);
  showCrew();
  showMission();
  showStatus(S);
  showVitals(S);
  showEmergency();
  fillToday(MOCK.crew[currentCrew]);
  autoReport(S);
  if (typeof showVoiceCrew === "function") showVoiceCrew();
  document.title = (S.warnings.length ? `(${S.warnings.length}) ` : "") + "Astrodoc";
}


// =========================================================================
// 5. INPUT — everything saves at once, no forms to submit
// =========================================================================
function scaleButtons(el, value) {
  el.innerHTML = [1, 2, 3, 4, 5].map(n =>
    `<button type="button" data-v="${n}" aria-pressed="${n === value}" class="${n === value ? "on" : ""}">${n}</button>`).join("");
}
function fillToday(c) {
  if (document.activeElement !== $("ciSleep")) $("ciSleep").value = c.sleep.nights[c.sleep.nights.length - 1];
  scaleButtons($("moodSelf"), c.checkin.self.mood);
  scaleButtons($("moodMate"), c.checkin.mate.mood);
  $("waterCount").textContent = `${c.water.glasses} / ${c.water.goal}`;
  $("exCount").textContent = `${c.exercise} / 7`;
}
const update = fn => { fn(MOCK.crew[currentCrew]); showAll(); };

$("ciSleep").onchange = () => {
  const v = parseFloat($("ciSleep").value);
  if (!isNaN(v)) update(c => { c.sleep.nights[c.sleep.nights.length - 1] = v; });
};
$("moodSelf").onclick = e => { const b = e.target.closest("[data-v]"); if (b) update(c => { c.checkin.self.mood = Number(b.dataset.v); }); };
$("moodMate").onclick = e => { const b = e.target.closest("[data-v]"); if (b) update(c => { c.checkin.mate.mood = Number(b.dataset.v); }); };
$("waterPlus").onclick  = () => update(c => { c.water.glasses++; });
$("waterMinus").onclick = () => update(c => { if (c.water.glasses > 0) c.water.glasses--; });
$("exPlus").onclick  = () => update(c => { if (c.exercise < 7) c.exercise++; });
$("exMinus").onclick = () => update(c => { if (c.exercise > 0) c.exercise--; });

// --- Clot checklist (shown inside the status when the clot warning is on) ---
const CLOT_STEPS = [
  "Stop work. Sit or lie still.",
  "Check for emergency signs: hard to breathe, chest pain, one-sided weakness, speech problem. If yes: press Emergency.",
  "Note the time any symptom started.",
  "Drink water.",
  "Send the report to the flight surgeon now. Don't wait for a reply.",
  "Prepare the ultrasound for a neck-vein check.",
  "Repeat D-dimer, platelets and fibrinogen within 24 hours."
];
function clotSteps() {
  const done = checklistDone[currentCrew] = checklistDone[currentCrew] || {};
  return `<details class="clot" open><summary>Blood clot checklist</summary><ol class="checklist">${CLOT_STEPS.map((s, i) =>
    `<li class="${done[i] ? "done" : ""}"><label><input type="checkbox" data-step="${i}" ${done[i] ? "checked" : ""}><span>${s}</span></label></li>`).join("")}</ol></details>`;
}

// --- Report to Earth (does not wait for a reply) ---
function sendToEarth(title) {
  const sent = new Date(), d = MOCK.mission.signalDelayMin;
  MOCK.earthLog.push({ title, sent, arrive: addMin(sent, d), reply: addMin(sent, d * 2) });
}
function autoReport(S) {
  const triggers = [...S.labTrend.map(t => "Blood test trend: " + t), ...(S.clotPattern ? ["Clot pattern"] : []), ...(S.storm ? ["Solar storm"] : [])];
  let sent = false;
  triggers.forEach(t => { const k = currentCrew + t; if (!autoReported[k]) { autoReported[k] = true; sendToEarth(`${currentCrew}: ${t} (automatic)`); sent = true; } });
  if (sent) showMission();
}
$("reportBtn").onclick = () => {
  sendToEarth(`${currentCrew}: health report`);
  const last = MOCK.earthLog[MOCK.earthLog.length - 1];
  $("reportNote").textContent = `Sent ${time(last.sent)}. Earliest reply ~${time(last.reply)}. Keep going meanwhile.`;
  showMission();
};

// --- Emergency: ask once, then show what to do ---
let emergencyAsk = false;
function showEmergency() {
  const box = $("emergencyBox");
  if (emergency.active) {
    const last = [...MOCK.earthLog].reverse().find(e => /EMERGENCY/.test(e.title));
    box.className = "emergency-box active";
    box.innerHTML = `<div><strong>Medical emergency · ${currentCrew}</strong>
      <p><b>Do now:</b> oxygen mask, keep the person still.${last ? ` Reported to Earth at ${time(last.sent)}.` : ""}</p></div>
      <button class="soft-btn" id="emergencyClear">Clear</button>`;
    $("emergencyClear").onclick = () => { emergency.active = false; emergency.signs = {}; showAll(); };
  } else if (emergencyAsk) {
    box.className = "emergency-box";
    box.innerHTML = `<div><strong>Declare a medical emergency for ${currentCrew}?</strong>
      <p>This sends a top-priority report to Earth.</p></div>
      <div class="row"><button class="soft-btn" id="emergencyCancel">Cancel</button><button class="danger-btn" id="emergencyDeclare">Declare and report</button></div>`;
    $("emergencyCancel").onclick = () => { emergencyAsk = false; showEmergency(); };
    $("emergencyDeclare").onclick = () => {
      emergencyAsk = false; emergency.active = true;
      sendToEarth(`${currentCrew}: MEDICAL EMERGENCY (top priority)`);
      showAll();
    };
  }
  box.hidden = !(emergency.active || emergencyAsk);
}
$("emergencyBtn").onclick = () => {
  if (!emergency.active) emergencyAsk = true;
  showEmergency();
  $("emergencyBox").scrollIntoView({ block: "nearest" });
  ($("emergencyDeclare") || $("emergencyClear")).focus();
};


// =========================================================================
// 6. DEMO CONTROLS + SENSOR HOOKS
// =========================================================================
$("solarSlider").value = MOCK.radiation.solarActivity;
$("solarSlider").oninput = () => setSolarActivity(Number($("solarSlider").value));
$("locationSelect").innerHTML = Object.entries(MOCK.locations).map(([k, L]) =>
  `<option value="${k}" ${k === MOCK.mission.location ? "selected" : ""}>${L.label} (${L.multiplier}× ISS)</option>`).join("");
$("locationSelect").onchange = () => { MOCK.mission.location = $("locationSelect").value; showAll(); };
$("simApply").onclick = () => applySensorReading({ heartRate: parseFloat($("simHr").value), temperature: parseFloat($("simTemp").value) });

// Call from Arduino / Web Serial code later, e.g. applySensorReading({ heartRate: 96, temperature: 36.8 })
function applySensorReading({ heartRate, temperature }) {
  const c = MOCK.crew[currentCrew];
  if (!isNaN(heartRate)) c.vitals.hr = Math.round(heartRate);
  if (!isNaN(temperature)) c.vitals.temp = temperature;
  c.vitals.source = "live";
  showAll();
}
// Marjona's knob (potentiometer): 0-100. 70 or more = solar storm
function setSolarActivity(value) {
  MOCK.radiation.solarActivity = Math.max(0, Math.min(100, value));
  $("solarSlider").value = MOCK.radiation.solarActivity;
  showAll();
}

// Simulated dosimeter: 1 second on screen = 1 hour of mission
setInterval(() => {
  const before = check(currentCrew).radiation;
  Object.values(MOCK.crew).forEach(c => c.radiation.accrued += doseRatePerDay() / 24);
  const S = check(currentCrew);
  if (S.radiation !== before) showAll();
  else if ($("doseValue")) $("doseValue").textContent = S.dose.toFixed(0);
}, 1000);


// START
showAll();
