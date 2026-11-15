// =========================================================================
// Astrodoc — CORE (shared by the dashboard and the companion chat)
// File layout:
//   1. MOCK          the crew's readings (simulated) + the mission's radiation (real NASA measurements)
//   2. THRESHOLDS    turns numbers into normal / watch / act
//   3. CHECK         looks at one crew member and builds the warning list
//   4. SHARED        labels, icons, level help, reports, clot checklist
//   5. SAVED STATE   both pages share data through localStorage
//   6. DOSIMETER     radiation clock (real dose rates, 1 second on screen = 1 hour)
// =========================================================================


// =========================================================================
// 1. MOCK — the crew's readings are simulated for the demo.
//    The mission's radiation is REAL: the dose rates Curiosity's RAD
//    instrument measured on the way to Mars and on the surface.
//    Sources: science.html ("Where the numbers come from").
// =========================================================================
const MOCK = {
  mission: {
    day: 214,
    phase: "Mars transit",
    signalDelayMin: 18,        // one way (Mars is 3 to 22 light-minutes away). Round trip = 2x
    location: "spacecraft",    // key of MOCK.locations
    lengthDays: 1006,          // 253 + 500 + 253 days (the phases below)
    earthLink: true,           // false = solar conjunction: the Sun blocks Mars–Earth radio for about two weeks
    // The mission's shape: Curiosity's own cruise took 253 days; NASA's reference plan stays about 500 days on Mars
    phases: [
      { name: "To Mars",       days: 253, where: "spacecraft" },
      { name: "On Mars",       days: 500, where: "mars" },
      { name: "Back to Earth", days: 253, where: "spacecraft" }
    ]
  },
  radiation: {
    careerLimit: 600,          // mSv, NASA-STD-3001 Vol. 1 Rev. B (V1 4030), same for every age and sex
    stormEventLimit: 250,      // mSv per solar particle event, NASA-STD-3001 (V1 4031)
    solarActivity: 10,         // 0-100, the "knob". 70+ = solar storm (simulated)
    stormMultiplier: 5         // simulated: dose rate during a solar storm
  },
  // Measured dose rates (mSv per day, dose equivalent)
  locations: {
    spacecraft: { label: "Spacecraft (deep space)", ratePerDay: 1.8,
                  source: "Curiosity RAD inside its spacecraft, cruise to Mars 2011–12 (Zeitlin et al., Science 2013)" },
    mars:       { label: "Mars surface",            ratePerDay: 0.67,
                  source: "Curiosity RAD at Gale Crater, 2012–13 (Hassler et al., Science 2014)" }
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
      radiation: { priorMSv: 60, accrued: 0 },     // prior = earlier missions (simulated)
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
      radiation: { priorMSv: 30, accrued: 0 },
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
      radiation: { priorMSv: 0, accrued: 0 },      // first flight
      exercise: 6, water: { glasses: 3, goal: 8 }, vitD: 31,
      labs: [
        { day: 150, ddimer: 0.25, platelets: 260, fibrinogen: 320, inr: 0.98, pt: 0.8, aptt: 29.0 },
        { day: 212, ddimer: 0.28, platelets: 255, fibrinogen: 315, inr: 0.99, pt: 0.9, aptt: 29.5 }
      ]
    }
  }
};
// ============================== end MOCK ==============================

const DEFAULT_MOCK = JSON.stringify(MOCK);       // for "Reset demo data"
let currentCrew = "CDR";
let me = null;                                     // who is using this app (chosen once)
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
  let rate = (MOCK.locations[MOCK.mission.location] || MOCK.locations.spacecraft).ratePerDay;
  if (r.solarActivity >= SOLAR_STORM_LEVEL) rate *= r.stormMultiplier;
  return rate;
}
// Mission length and the dose the mission itself adds up to a given day, at the measured rates
const missionLength = () => MOCK.mission.phases.reduce((n, p) => n + p.days, 0);
function missionDoseUntil(day) {
  let left = day, dose = 0;
  for (const p of MOCK.mission.phases) {
    const d = Math.max(0, Math.min(left, p.days));
    dose += d * MOCK.locations[p.where].ratePerDay;
    left -= d;
  }
  return dose;
}
// The phase a day falls in
function phaseAt(day) {
  let start = 0;
  for (const p of MOCK.mission.phases) { if (day < start + p.days) return { ...p, start }; start += p.days; }
  const last = MOCK.mission.phases[MOCK.mission.phases.length - 1];
  return { ...last, start: start - last.days };
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
  S.prior = c.radiation.priorMSv || 0;
  S.dose = S.prior + missionDoseUntil(MOCK.mission.day) + c.radiation.accrued;
  S.radiation = T.radiation(S.dose, S.storm);
  // Forecast to the end of the mission at the measured rates, and the day the career limit is passed
  S.doseAtEnd = S.prior + missionDoseUntil(missionLength()) + c.radiation.accrued;
  S.limitDay = null;
  for (let d = 0; d <= missionLength(); d++) if (S.prior + missionDoseUntil(d) + c.radiation.accrued >= MOCK.radiation.careerLimit) { S.limitDay = d; break; }

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
  add("bp", S.bp, `Blood pressure ${S.bp === "act" ? "high" : "slightly high"}: ${c.vitals.bpSys}/${c.vitals.bpDia}`, ADVICE.bp);
  add("mood", S.mood, `Low mood: ${S.moodValue} of 5`, S.mood === "act" ? ADVICE.moodAct : ADVICE.moodWatch);
  const g = S.biggestGap;
  add("gap", g.status, `Crewmate sees you differently (${g.m}: you ${g.self}, crewmate ${g.mate})`, ADVICE.gap);
  if (!S.storm) add("dose", S.radiation, S.radiation === "act" ? `Radiation dose high: ${S.dose.toFixed(0)} of 600 mSv` : `Radiation: over half the career limit (${S.dose.toFixed(0)} of 600 mSv)`, ADVICE.dose);
  add("exercise", S.exercise, `Too little exercise: ${c.exercise} of 6 sessions this week`, ADVICE.exercise);
  add("water", S.water, `Drink more water: ${c.water.glasses} of ${c.water.goal} glasses`, ADVICE.water);
  add("vitd", S.vitD, `Vitamin D out of range: ${c.vitD} ng/mL`, ADVICE.vitD);

  return W.sort(byUrgency);
}

// Inside the same color, some problems are more urgent than others.
// A possible blood clot must never sit below "short on sleep".
const PRIORITY = { emergency: 0, storm: 1, clot: 2, labs: 3, trend: 4, tired: 5, hr: 6, temp: 7, mood: 8, sleep: 9,
  reaction: 10, bp: 11, gap: 12, dose: 13, exercise: 14, water: 15, vitd: 16 };
const byUrgency = (a, b) => (RANK[b.status] - RANK[a.status]) || ((PRIORITY[a.key] ?? 99) - (PRIORITY[b.key] ?? 99));

// The few words that say WHY someone has their color
const REASON = { emergency: "Medical emergency", storm: "Solar storm", clot: "Possible blood clot", labs: "Blood test outside normal",
  trend: "Blood test getting worse", tired: "Very tired", sleep: "Short on sleep", reaction: "Slow reactions", hr: "Heart rate",
  temp: "Temperature", bp: "Blood pressure", mood: "Low mood", gap: "Crewmate sees a difference", dose: "Radiation dose",
  exercise: "Missed exercise", water: "Drink more water", vitd: "Vitamin D" };
function reasonFor(id) {
  const S = check(id);
  return S.warnings.length ? REASON[S.warnings[0].key] || S.warnings[0].title : "All good";
}
// Most urgent crew member first
function bySeverity(a, b) {
  const A = check(a), B = check(b);
  return (RANK[B.overall] - RANK[A.overall]) ||
    ((A.warnings[0] ? PRIORITY[A.warnings[0].key] ?? 99 : 99) - (B.warnings[0] ? PRIORITY[B.warnings[0].key] ?? 99 : 99));
}


// =========================================================================
// 4. SHARED — labels, icons, what each level means
// =========================================================================
const $ = id => document.getElementById(id);
// The three levels, in plain words. "act" used to say "Act now", which didn't say what to act on.
const LABEL = { normal: "All good", watch: "Watch", act: "Needs care now" };
const LEVEL_HELP = {
  normal: "Every reading is in the healthy range. Keep your routine.",
  watch:  "Something is drifting out of the healthy range. Do the suggested step and check again later. No rush.",
  act:    "A reading is in the danger range, or several signs together point to a real risk. Do the “Do now” step right away and send a report to Earth. Don't wait for the reply: it takes over half an hour."
};
const ICON = {
  normal: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M4.5 8.2 7 10.5l4.5-5" stroke="#fff" stroke-width="2" fill="none"/></svg>',
  watch:  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1 15 14H1Z" fill="currentColor"/><rect x="7.2" y="5.5" width="1.6" height="4.5" fill="#fff"/><rect x="7.2" y="11" width="1.6" height="1.6" fill="#fff"/></svg>',
  act:    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 1h6l4 4v6l-4 4H5l-4-4V5Z" fill="currentColor"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" stroke-width="2"/></svg>'
};
const badge = (status, text) => `<span class="status ${status}">${ICON[status]}${text || LABEL[status]}</span>`;
const time = (d = new Date()) => d.toTimeString().slice(0, 5);
const addMin = (d, m) => new Date(d.getTime() + m * 60000);
const escapeHtml = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

// Report to Earth (the crew never waits for the reply).
// With the Earth link down (solar conjunction) reports wait on board and go out by themselves when it returns.
function sendToEarth(title) {
  const sent = new Date(), d = MOCK.mission.signalDelayMin;
  if (MOCK.mission.earthLink === false) { MOCK.earthLog.push({ title, sent, queued: true }); return; }
  MOCK.earthLog.push({ title, sent, arrive: addMin(sent, d), reply: addMin(sent, d * 2) });
}
function setEarthLink(on) {
  MOCK.mission.earthLink = on;
  if (!on) return;
  const now = new Date(), d = MOCK.mission.signalDelayMin;
  MOCK.earthLog.forEach(e => { if (e.queued) { e.queued = false; e.sent = now; e.arrive = addMin(now, d); e.reply = addMin(now, d * 2); } });
}
const queuedCount = () => MOCK.earthLog.filter(e => e.queued).length;
// "earliest reply ~09:12", or what happens while the link is down
const replyNote = e => e.queued ? "it waits on board and goes out by itself when the Earth link returns" : `earliest reply ~${time(e.reply)}`;
// Automatic reports for the dangerous patterns, once each
function autoReport(id = currentCrew) {
  const S = check(id);
  const triggers = [...S.labTrend.map(t => "Blood test trend: " + t), ...(S.clotPattern ? ["Clot pattern"] : []), ...(S.storm ? ["Solar storm"] : [])];
  let sent = false;
  triggers.forEach(t => { const k = id + t; if (!autoReported[k]) { autoReported[k] = true; sendToEarth(`${id}: ${t} (automatic)`); sent = true; } });
  return sent;
}
function autoReportAll() { return Object.keys(MOCK.crew).map(id => autoReport(id)).some(Boolean); }
// The newest report about one crew member (automatic or not)
function lastReport(id, { automatic = false } = {}) {
  return [...MOCK.earthLog].reverse().find(e => e.title.startsWith(id + ":") && (!automatic || /\(automatic\)/.test(e.title)));
}

const CLOT_STEPS = [
  "Stop work. Sit or lie still.",
  "Check for emergency signs: hard to breathe, chest pain, one-sided weakness, speech problem. If yes: press Emergency.",
  "Note the time any symptom started.",
  "Drink water.",
  "Send the report to the flight surgeon now. Don't wait for a reply.",
  "Prepare the ultrasound for a neck-vein check.",
  "Repeat D-dimer, platelets and fibrinogen within 24 hours."
];


// =========================================================================
// 5. SAVED STATE — the dashboard and the chat are separate pages,
//    so they share everything through localStorage.
//    Rule: load fresh state, change it, save it (see mutate()).
// =========================================================================
const STORE = "astrodoc-state-v2";   // v2: real radiation model
function saveState() {
  try {
    localStorage.setItem(STORE, JSON.stringify({
      crew: MOCK.crew, location: MOCK.mission.location, solar: MOCK.radiation.solarActivity,
      earthLog: MOCK.earthLog, earthLink: MOCK.mission.earthLink, currentCrew, me, emergency, autoReported, checklistDone
    }));
  } catch { /* storage full or blocked: the page still works, just not shared */ }
}
function loadState() {
  let s;
  try { s = JSON.parse(localStorage.getItem(STORE)); } catch { return; }
  if (!s) return;
  if (s.crew) Object.keys(MOCK.crew).forEach(id => { if (s.crew[id]) MOCK.crew[id] = s.crew[id]; });
  if (s.location && MOCK.locations[s.location]) MOCK.mission.location = s.location;
  if (typeof s.solar === "number") MOCK.radiation.solarActivity = s.solar;
  if (Array.isArray(s.earthLog)) MOCK.earthLog.splice(0, MOCK.earthLog.length,
    ...s.earthLog.map(e => ({ ...e, sent: new Date(e.sent), arrive: e.arrive ? new Date(e.arrive) : undefined, reply: e.reply ? new Date(e.reply) : undefined })));
  if (typeof s.earthLink === "boolean") MOCK.mission.earthLink = s.earthLink;
  if (s.currentCrew && MOCK.crew[s.currentCrew]) currentCrew = s.currentCrew;
  if (s.me && MOCK.crew[s.me]) me = s.me;
  if (s.emergency) Object.assign(emergency, s.emergency);
  Object.assign(autoReported, s.autoReported || {});
  Object.assign(checklistDone, s.checklistDone || {});
}
// Change shared data safely: load the latest, apply, save
function mutate(fn) { loadState(); const r = fn(); saveState(); return r; }
function resetDemo() { localStorage.removeItem(STORE); sessionStorage.clear(); location.reload(); }
// When the other page changes something, call the page's onSharedChange()
window.addEventListener("storage", e => {
  if (e.key !== STORE) return;
  loadState();
  if (typeof onSharedChange === "function") onSharedChange();
});
loadState();


// =========================================================================
// 6. DOSIMETER — 1 second on screen = 1 hour of mission.
//    Only the visible page ticks, so two open pages never count twice.
// =========================================================================
function startDosimeter(onTick) {
  setInterval(() => {
    if (document.hidden) return;
    let before, after;
    mutate(() => {
      before = check(currentCrew).radiation;
      Object.values(MOCK.crew).forEach(c => c.radiation.accrued += doseRatePerDay() / 24);
      after = check(currentCrew).radiation;
    });
    onTick(after !== before);
  }, 1000);
}
