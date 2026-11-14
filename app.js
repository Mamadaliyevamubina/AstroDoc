// =========================================================================
// Astrodoc — Crew dashboard (NASA Space Apps 2026)
// File layout:
//   1. MOCK          all fake data (replace with real data later)
//   2. THRESHOLDS    turns numbers into normal / watch / act
//   3. CHECK         looks at one crew member and builds the warning list
//   4. SHOW          draws the page
//   5. FORMS         check-in, reaction test, blood test, exercise, report
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
// 4. SHOW — draw the page
// =========================================================================
const $ = id => document.getElementById(id);
const LABEL = { normal: "Normal", watch: "Watch", act: "Act now" };
const ICON = {
  normal: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M4.5 8.2 7 10.5l4.5-5" stroke="#0c1438" stroke-width="2" fill="none"/></svg>',
  watch:  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1 15 14H1Z" fill="currentColor"/><rect x="7.2" y="5.5" width="1.6" height="4.5" fill="#0c1438"/><rect x="7.2" y="11" width="1.6" height="1.6" fill="#0c1438"/></svg>',
  act:    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 1h6l4 4v6l-4 4H5l-4-4V5Z" fill="currentColor"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#0c1438" stroke-width="2"/></svg>'
};
const badge = (status, text) => `<span class="status ${status}">${ICON[status]}${text || LABEL[status]}</span>`;
const time = (d = new Date()) => d.toTimeString().slice(0, 5);
const addMin = (d, m) => new Date(d.getTime() + m * 60000);

// Small line icons used on buttons (data-icon="...")
const LINE_ICONS = {
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h4"/>',
  zap:       '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  flask:     '<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3"/><path d="M7.5 14h9"/>',
  dumbbell:  '<path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12"/>',
  send:      '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>'
};
document.querySelectorAll("[data-icon]").forEach(el => {
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LINE_ICONS[el.dataset.icon] || ""}</svg>`;
});

// Crew buttons, each with a warning sign
function showCrew() {
  $("crewSelector").innerHTML = Object.keys(MOCK.crew).map(id => {
    const S = check(id);
    return `<button class="crew-btn ${id === currentCrew ? "active" : ""} ${S.overall}" data-crew="${id}" title="${MOCK.crew[id].role}: ${LABEL[S.overall]}">
      <span class="crew-dot">${ICON[S.overall]}</span>${id}</button>`;
  }).join("");
  document.querySelectorAll("[data-crew]").forEach(b => b.onclick = () => {
    currentCrew = b.dataset.crew; emergency.active = false; emergency.signs = {}; showAll();
  });
}

function showMission() {
  const m = MOCK.mission, last = MOCK.earthLog[MOCK.earthLog.length - 1];
  const sensorLive = MOCK.crew[currentCrew].vitals.source === "live";
  $("missionStrip").innerHTML = `
    <span><strong>Day ${m.day}</strong> · ${m.phase}</span>
    <span>${MOCK.locations[m.location].label}</span>
    <span>Earth delay ${m.signalDelayMin} min</span>
    ${last ? `<span>Last report sent ${time(last.sent)}, reply ~${time(last.reply)}</span>` : ""}
    <span class="sensor ${sensorLive ? "on" : ""}"><span class="dot"></span>Sensor ${sensorLive ? "connected" : "not connected"}</span>`;
}

// Big status + warning list
function showStatus(S) {
  const c = MOCK.crew[currentCrew];
  const acts = S.warnings.filter(w => w.status === "act").length;
  const watches = S.warnings.length - acts;
  const headline = { normal: "All good", watch: "Keep watching", act: "Act now" }[S.overall];
  const sub = S.warnings.length
    ? [acts ? `${acts} urgent` : "", watches ? `${watches} to watch` : ""].filter(Boolean).join(" · ")
    : "Every reading is in the normal range. Keep the routine.";

  $("statusCard").className = "status-card " + S.overall;
  $("statusCard").innerHTML = `
    <div class="status-main">
      <div class="big-icon">${ICON[S.overall]}</div>
      <div>
        <div class="who">${currentCrew} · ${c.role}</div>
        <div class="headline">${headline}</div>
        <div class="sub">${sub}</div>
        <div class="points">${c.points} points</div>
      </div>
    </div>
    <div class="warnings">
      ${S.warnings.length ? showWarnings(S.warnings)
      : `<div class="all-good">${ICON.normal} No warnings. Nothing to do right now.</div>`}
    </div>`;
  wireOpeners();
}

// Most urgent warning big, the others as one-line rows ("act" before "watch")
function showWarnings(list) {
  const sorted = [...list].sort((a, b) => RANK[b.status] - RANK[a.status]);
  const clotBtn = w => w.extra === "clot" ? `<button class="ghost-btn small-btn" data-open="clotModal">Open clot checklist</button>` : "";
  const [first, ...rest] = sorted;
  return `
    <div class="warning primary ${first.status}">
      <span class="w-icon">${ICON[first.status]}</span><span class="sr-only">${LABEL[first.status]}:</span>
      <div><div class="w-title">${first.title}</div><div class="w-do"><strong>Do now:</strong> ${first.todo}</div>${clotBtn(first)}</div>
    </div>
    ${rest.length ? `<ul class="w-rows">${rest.map(w => `
      <li class="warning row ${w.status}" title="${w.title}. Do now: ${w.todo}">
        <span class="w-icon">${ICON[w.status]}</span><span class="sr-only">${LABEL[w.status]}:</span>
        <span class="w-title">${w.title}</span>
        <span class="w-do">${w.todo}</span>
        ${clotBtn(w)}
      </li>`).join("")}</ul>` : ""}`;
}

// 8 simple tiles
function showTiles(S) {
  const c = MOCK.crew[currentCrew];
  const src = c.vitals.source === "live" ? "Live sensor" : "Simulated";
  const tiles = [
    { name: "Heart rate",     value: c.vitals.hr, unit: "bpm", status: S.hr, note: "Normal 60–100 at rest · " + src },
    { name: "Temperature",    value: c.vitals.temp.toFixed(1), unit: "°C", status: S.temp, note: "Normal 36.1–37.2 · " + src },
    { name: "Blood pressure", value: `${c.vitals.bpSys}/${c.vitals.bpDia}`, unit: "", status: S.bp, note: "Normal under 120/80" },
    { name: "Sleep",          value: S.lastNight, unit: "h", status: S.sleep, note: `Last night · ${S.debt.toFixed(1)} h short this week` },
    { name: "Mood",           value: S.moodValue, unit: "/ 5", status: worst(S.mood, S.biggestGap.status), note: `You ${c.checkin.self.mood} · crewmate ${c.checkin.mate.mood}` },
    { name: "Radiation",      value: `<span id="doseValue">${S.dose.toFixed(1)}</span>`, unit: "mSv", status: S.radiation, note: "Career total · limit 600", bar: Math.min(100, S.dose / 6) },
    { name: "Exercise",       value: c.exercise, unit: "/ 7 days", status: S.exercise, note: "Target 6–7 sessions a week" },
    { name: "Blood tests",    value: S.clotPattern ? "Danger" : S.labOut.length ? `${S.labOut.length} off` : "OK", unit: "", status: S.blood, note: `Last test day ${c.labs[c.labs.length - 1].day}` }
  ];
  $("tiles").innerHTML = tiles.map(t => `
    <div class="tile ${t.status}">
      <div class="tile-head"><span>${t.name}</span>${badge(t.status)}</div>
      <div class="tile-value">${t.value}<span class="unit">${t.unit}</span></div>
      ${t.bar !== undefined ? `<div class="mini-bar"><div style="width:${t.bar}%"></div></div>` : ""}
      <div class="tile-note">${t.note}</div>
    </div>`).join("");
}

function showAll() {
  const S = check(currentCrew);
  showCrew();
  showMission();
  showStatus(S);
  showTiles(S);
  autoReport(S);
  // Warning count in the browser tab, e.g. "(2) Astrodoc"
  document.title = (S.warnings.length ? `(${S.warnings.length}) ` : "") + "Astrodoc – Crew dashboard";
}


// =========================================================================
// 5. FORMS — modals
// =========================================================================
function wireOpeners() {
  document.querySelectorAll("[data-open]").forEach(b => b.onclick = () => openModal(b.dataset.open));
}
document.querySelectorAll("dialog [data-close]").forEach(b => b.onclick = () => b.closest("dialog").close());

function openModal(id) {
  const c = MOCK.crew[currentCrew];
  if (id === "checkinModal") fillCheckin(c);
  if (id === "labModal") fillLabs(c);
  if (id === "activityModal") fillActivity(c);
  if (id === "clotModal") fillChecklist();
  if (id === "limitsModal") fillLimits();
  $(id).showModal();
}

// --- Daily check-in ---
function fillCheckin(c) {
  const q = Math.min(4, Math.floor(MOCK.mission.day / MOCK.mission.lengthDays * 4) + 1);
  $("checkinNote").textContent = `${currentCrew}. Mission quarter ${q} of 4: check in ${q === 3 ? "twice a day (third-quarter mood dip)" : "once a day"}.`;
  $("ciSleep").value = c.sleep.nights[c.sleep.nights.length - 1];
  $("ciAwake").value = c.sleep.hoursAwake;
  const opts = v => [1, 2, 3, 4, 5].map(n => `<option ${n === v ? "selected" : ""}>${n}</option>`).join("");
  $("checkinGrid").innerHTML = `<span></span><span class="head">You</span><span class="head">Crewmate</span>` +
    ["energy", "focus", "mood"].map(m => `<span>${m[0].toUpperCase() + m.slice(1)}</span>
      <select id="self-${m}">${opts(c.checkin.self[m])}</select><select id="mate-${m}">${opts(c.checkin.mate[m])}</select>`).join("");
}
$("checkinSave").onclick = () => {
  const c = MOCK.crew[currentCrew];
  const sleep = parseFloat($("ciSleep").value), awake = parseFloat($("ciAwake").value);
  if (!isNaN(sleep)) c.sleep.nights[c.sleep.nights.length - 1] = sleep;
  if (!isNaN(awake)) c.sleep.hoursAwake = awake;
  ["energy", "focus", "mood"].forEach(m => {
    c.checkin.self[m] = Number($("self-" + m).value);
    c.checkin.mate[m] = Number($("mate-" + m).value);
  });
  c.points += 10;
  $("checkinModal").close();
  showAll();
};

// --- Reaction test: 1 minute, tap when the box turns mint ---
const rt = { running: false, shownAt: null, times: [], timer: null, endTimer: null };
function rtNext() {
  rt.timer = setTimeout(() => {
    rt.shownAt = performance.now();
    $("reactionBox").className = "reaction-box go"; $("reactionBox").textContent = "NOW!";
    rt.timer = setTimeout(() => { if (rt.shownAt) { rt.times.push(2000); rtWait(); rtNext(); } }, 2000);  // no answer = slow
  }, 1000 + Math.random() * 3000);
}
function rtWait() { rt.shownAt = null; $("reactionBox").className = "reaction-box running"; $("reactionBox").textContent = "Wait…"; }
function rtTap() {
  if (!rt.running) return;
  if (!rt.shownAt) { $("reactionBox").textContent = "Too early. Wait…"; return; }
  rt.times.push(performance.now() - rt.shownAt);
  clearTimeout(rt.timer); rtWait(); rtNext();
}
function rtStart() {
  if (rt.running) return;
  Object.assign(rt, { running: true, times: [] });
  $("reactionResult").innerHTML = "";
  rtWait(); rtNext();
  rt.endTimer = setTimeout(rtFinish, 60000);
}
function rtFinish() {
  if (!rt.running) return;
  clearTimeout(rt.timer); clearTimeout(rt.endTimer);
  rt.running = false;
  $("reactionBox").className = "reaction-box";
  if (!rt.times.length) { $("reactionBox").textContent = "No answers. Try again."; return; }
  const c = MOCK.crew[currentCrew];
  const avg = Math.round(rt.times.reduce((a, b) => a + b, 0) / rt.times.length);
  c.reaction.lastMs = avg;
  c.points += 10;
  const S = check(currentCrew);
  $("reactionBox").textContent = `${avg} ms average`;
  $("reactionResult").innerHTML = `<p>${badge(S.reaction, `${LABEL[S.reaction]}: ${S.reactionPct > 0 ? "+" : ""}${S.reactionPct}% vs your usual ${c.reaction.baselineMs} ms`)}</p>`;
  showAll();
}
$("reactionStart").onclick = rtStart;
$("reactionStop").onclick = rtFinish;
$("reactionBox").addEventListener("pointerdown", rtTap);
document.addEventListener("keydown", e => { if (rt.running && e.code === "Space") { e.preventDefault(); rtTap(); } });
$("reactionModal").addEventListener("close", rtFinish);

// --- Blood test ---
function fillLabs(c) {
  $("labForm").innerHTML = LABS.map(L => `<label>${L.name}${L.unit ? ` <span class="muted">(${L.unit})</span>` : ""}<input type="number" step="any" id="lab-${L.key}"></label>`).join("");
  const recent = c.labs.slice(-3);
  $("labHistory").innerHTML = `<p class="small muted" style="margin-top:12px">Recent results</p><div class="table-wrap"><table>
    <tr><th>Test</th>${recent.map(e => `<th>Day ${e.day}</th>`).join("")}</tr>
    ${LABS.map(L => `<tr><td>${L.name}</td>${recent.map(e => e[L.key] == null ? "<td>—</td>" : `<td class="c-${L.classify(e[L.key])}">${e[L.key]}</td>`).join("")}</tr>`).join("")}
  </table></div>`;
}
$("labSave").onclick = () => {
  const c = MOCK.crew[currentCrew], entry = { day: MOCK.mission.day };
  let any = false;
  LABS.forEach(L => { const v = parseFloat($("lab-" + L.key).value); if (!isNaN(v)) { entry[L.key] = v; any = true; } });
  if (any) c.labs.push(entry);
  $("labModal").close();
  showAll();
};

// --- Exercise & water ---
function fillActivity(c) {
  $("exCount").textContent = c.exercise;
  $("waterCount").textContent = `${c.water.glasses} / ${c.water.goal}`;
  $("vitD").value = c.vitD ?? "";
}
function changeActivity(fn) { const c = MOCK.crew[currentCrew]; fn(c); fillActivity(c); showAll(); }
$("exPlus").onclick = () => changeActivity(c => { if (c.exercise < 7) { c.exercise++; c.points += 15; } });
$("exMinus").onclick = () => changeActivity(c => { if (c.exercise > 0) { c.exercise--; c.points = Math.max(0, c.points - 15); } });
$("waterPlus").onclick = () => changeActivity(c => { c.water.glasses++; c.points += 2; });
$("waterMinus").onclick = () => changeActivity(c => { if (c.water.glasses > 0) c.water.glasses--; });
$("vitD").oninput = () => { const v = parseFloat($("vitD").value); MOCK.crew[currentCrew].vitD = isNaN(v) ? null : v; showAll(); };

// --- Clot checklist ---
const CLOT_STEPS = [
  "Stop work. Sit or lie still.",
  "Check for emergency signs: hard to breathe, chest pain, one-sided weakness, speech problem. If yes: press MEDICAL EMERGENCY.",
  "Note the time any symptom started.",
  "Drink water.",
  "Send the report to the flight surgeon now. Don't wait for a reply.",
  "Prepare the ultrasound for a neck-vein check.",
  "Repeat D-dimer, platelets and fibrinogen within 24 hours."
];
function fillChecklist() {
  const done = checklistDone[currentCrew] = checklistDone[currentCrew] || {};
  $("clotChecklist").innerHTML = CLOT_STEPS.map((s, i) =>
    `<li class="${done[i] ? "done" : ""}"><label><input type="checkbox" data-step="${i}" ${done[i] ? "checked" : ""}><span>${i + 1}. ${s}</span></label></li>`).join("");
  document.querySelectorAll("[data-step]").forEach(cb => cb.onchange = () => {
    done[cb.dataset.step] = cb.checked; cb.closest("li").classList.toggle("done", cb.checked);
  });
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
  const c = MOCK.crew[currentCrew], S = check(currentCrew), m = MOCK.mission;
  $("reportBody").innerHTML = `
    <p class="muted small">${currentCrew} (${c.role}) · Day ${m.day}, ${m.phase} · Ship time ${time()}</p>
    <p><strong>Overall:</strong> ${badge(S.overall)}</p>
    ${S.warnings.length ? `<ul>${S.warnings.map(w => `<li><strong>${w.title}.</strong> Crew is doing: ${w.todo}</li>`).join("")}</ul>` : "<p>No warnings.</p>"}
    <p class="small">Heart rate ${c.vitals.hr} bpm · Temp ${c.vitals.temp} °C · BP ${c.vitals.bpSys}/${c.vitals.bpDia} · Sleep ${S.lastNight} h · Radiation ${S.dose.toFixed(0)} mSv</p>
    <p class="muted small">Signal delay ${m.signalDelayMin} min. The crew is already acting and is not waiting for a reply.</p>
    <div id="reportSent"></div>`;
  $("reportModal").showModal();
};
$("reportSend").onclick = () => {
  sendToEarth(`${currentCrew}: health report`);
  const last = MOCK.earthLog[MOCK.earthLog.length - 1];
  $("reportSent").innerHTML = `<div class="notice">Sent at ${time(last.sent)}. Arrives ~${time(last.arrive)}. Earliest reply ~${time(last.reply)}.</div>`;
  showMission();
};

// --- Emergency ---
const SIGNS = ["Hard to breathe", "Chest pain", "One-sided weakness", "Speech problem", "Severe side pain (kidney stone?)"];
$("emergencyBtn").onclick = () => {
  $("emergencySigns").innerHTML = SIGNS.map((s, i) => `<label class="sign-option"><input type="checkbox" data-sign="${i}" ${emergency.signs[i] ? "checked" : ""}>${s}</label>`).join("");
  $("emergencyStatus").innerHTML = emergency.active ? `<div class="notice">Emergency is active for ${currentCrew}.</div>` : "";
  $("emergencyModal").showModal();
};
$("emergencyDeclare").onclick = () => {
  emergency.signs = {};
  document.querySelectorAll("[data-sign]").forEach(cb => { if (cb.checked) emergency.signs[cb.dataset.sign] = true; });
  emergency.active = true;
  sendToEarth(`${currentCrew}: MEDICAL EMERGENCY (top priority)`);
  const last = MOCK.earthLog[MOCK.earthLog.length - 1];
  $("emergencyStatus").innerHTML = `<div class="notice">Reported at top priority at ${time(last.sent)}. Act now: oxygen mask, keep still.</div>`;
  showAll();
};
$("emergencyClear").onclick = () => { emergency.active = false; emergency.signs = {}; $("emergencyModal").close(); showAll(); };

// --- How colors are decided ---
const LIMITS = [
  ["Heart rate at rest (bpm)", "60–100", "50–59 or 101–120", "under 50 or over 120", true],
  ["Temperature (°C)", "36.1–37.2", "37.3–37.9 or 35.0–36.0", "38.0+ or under 35.0", true],
  ["Blood pressure (mmHg)", "under 120/80", "120–139 or 80–89", "140/90 or more", true],
  ["Sleep last night (h)", "7–9", "6 to under 7", "under 6, or awake 17+ h", false],
  ["Sleep short this week (h below 8)", "under 4", "4 to under 10", "10 or more", true],
  ["Mood (lower of you and crewmate)", "4–5", "3", "1–2", true],
  ["You vs crewmate gap", "0–1", "2", "3 or more", true],
  ["Reaction time vs usual", "under 10% slower", "10–20% slower", "over 20% slower", true],
  ["Radiation career dose (mSv)", "under 300", "300–480", "over 480, or solar storm", true],
  ["Exercise sessions per week", "6–7", "4–5", "3 or fewer", true],
  ["D-dimer (mg/L FEU)", "0.50 or less", "0.5–4.0", "over 4.0", false],
  ["Platelets (×10⁹/L)", "150–400", "30–150 or 400–1,000", "under 30 or over 1,000", true],
  ["Fibrinogen (mg/dL)", "200–395", "100–200 or over 395", "under 100", true],
  ["Clot pattern", "—", "—", "high D-dimer + low platelets + low fibrinogen", false],
  ["Vitamin D (ng/mL)", "35–90", "outside 35–90", "—", false]
];
function fillLimits() {
  $("limitsTable").innerHTML = `<table><tr><th>Reading</th><th>${badge("normal")}</th><th>${badge("watch")}</th><th>${badge("act")}</th></tr>
    ${LIMITS.map(r => `<tr><td>${r[0]}${r[4] ? ' <span class="tag">proposal</span>' : ""}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("")}</table>
    <p class="muted small" style="margin-top:10px">Sources: NASA Human Research Program, NASA OCHMO bone and radiation briefs (600 mSv career limit, NASA-STD-3001), Marshall-Goebel et al., JAMA Network Open 2019, lab reference ranges.</p>`;
}


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
  else if ($("doseValue")) $("doseValue").textContent = S.dose.toFixed(1);
}, 1000);


// START
showAll();
