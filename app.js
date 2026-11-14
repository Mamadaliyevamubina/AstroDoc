// =========================================================================
// PROJECT NAME — Crew Health Monitor (NASA Space Apps 2026)
// File layout:
//   1. MOCK          all fake data (replace with real data later)
//   2. THRESHOLDS    the app's brain: turns numbers into normal / watch / act
//   3. COMBINED      rules that look at several readings together
//   4. TEXT          region descriptions, threshold table, sources
//   5. RENDER        draws each part of the page
//   6. ACTIONS       buttons, forms, reaction test, dosimeter
//   7. SENSOR HOOKS  call these from Arduino code later
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

  // Dose rate multipliers vs the ISS (team research). Base rate is simulated.
  radiation: {
    issRatePerDay: 0.6,        // mSv/day, simulated ISS-like rate
    careerLimit: 600,          // NASA-STD-3001 Vol. 1 Rev. B
    solarActivity: 10,         // 0-100, the "knob". 70+ = solar particle event
    stormMultiplier: 5         // simulated: dose rate during a solar event
  },
  locations: {
    spacecraft: { label: "Spacecraft (deep space)", multiplier: 2.5 },
    station:    { label: "Space station (ISS-like)", multiplier: 1 },
    moon:       { label: "Moon base",               multiplier: 1.5 },
    mars:       { label: "Mars base",               multiplier: 1 }
  },

  careTasks: [
    { id: "plants",   label: "Tend the plants (Veggie)",           points: 10 },
    { id: "learn",    label: "15 min learning: language or medical skill", points: 10 },
    { id: "vr",       label: "Virtual reality relaxation",          points: 5 },
    { id: "call",     label: "Record a message for family",         points: 5 }
  ],

  // Reports sent to Earth (filled while the app runs)
  earthLog: [],

  crew: {
    // CDR = the demo story: sleep debt + slow reactions + high heart rate
    CDR: {
      role: "Commander",
      points: 120,
      sleep: { nights: [7.0, 5.5, 5.8, 5.2, 5.6, 5.9, 5.4], hoursAwake: 9, sleepTime: "23:00", wakeTime: "07:00" },
      vitals: { hr: 112, temp: 36.9, bpSys: 124, bpDia: 79, source: "simulated" },
      history: { hr: [72, 75, 80, 88, 95, 104, 112], temp: [36.7, 36.8, 36.8, 36.9, 36.8, 36.9, 36.9], bpSys: [118, 117, 120, 121, 122, 123, 124], mood: [4, 4, 4, 4, 3, 3, 3] },
      checkin: { self: { energy: 4, focus: 4, mood: 4 }, mate: { energy: 2, focus: 3, mood: 3 } },
      reaction: { baselineMs: 280, lastMs: 325, lapses: 2 },
      radiation: { careerDoseMSv: 310, accrued: 0 },
      exercise: { last7: 6, avgPerWeek: 6 },
      water: { glasses: 5, goal: 8 },
      markers: { vitD: 48, calcium: 9.6 },
      labs: [
        { day: 150, ddimer: 0.30, platelets: 240, fibrinogen: 300, inr: 1.00, pt: 1.0, aptt: 30.0 },
        { day: 190, ddimer: 0.35, platelets: 230, fibrinogen: 290, inr: 1.02, pt: 1.2, aptt: 31.0 },
        { day: 212, ddimer: 0.32, platelets: 235, fibrinogen: 310, inr: 1.01, pt: 1.1, aptt: 30.5 }
      ]
    },
    // PLT = the blood-clot story: each value only amber, but the pattern is red
    PLT: {
      role: "Pilot",
      points: 95,
      sleep: { nights: [7.4, 7.1, 7.6, 7.0, 7.3, 7.5, 7.2], hoursAwake: 6, sleepTime: "22:30", wakeTime: "06:30" },
      vitals: { hr: 78, temp: 36.7, bpSys: 116, bpDia: 76, source: "simulated" },
      history: { hr: [74, 76, 75, 77, 79, 78, 78], temp: [36.6, 36.7, 36.6, 36.7, 36.7, 36.8, 36.7], bpSys: [114, 115, 117, 116, 115, 116, 116], mood: [4, 4, 5, 4, 4, 4, 4] },
      checkin: { self: { energy: 4, focus: 4, mood: 4 }, mate: { energy: 4, focus: 4, mood: 4 } },
      reaction: { baselineMs: 265, lastMs: 270, lapses: 0 },
      radiation: { careerDoseMSv: 250, accrued: 0 },
      exercise: { last7: 4, avgPerWeek: 5 },
      water: { glasses: 6, goal: 8 },
      markers: { vitD: 52, calcium: 9.9 },
      labs: [
        { day: 150, ddimer: 0.40, platelets: 210, fibrinogen: 280, inr: 1.00, pt: 1.0, aptt: 30.0 },
        { day: 190, ddimer: 0.90, platelets: 160, fibrinogen: 230, inr: 1.05, pt: 1.6, aptt: 33.0 },
        { day: 212, ddimer: 1.80, platelets: 120, fibrinogen: 180, inr: 1.08, pt: 2.2, aptt: 35.0 }
      ]
    },
    // MS1 = mostly healthy, small things to watch
    MS1: {
      role: "Mission Specialist 1",
      points: 140,
      sleep: { nights: [7.8, 7.5, 8.1, 7.2, 7.9, 7.6, 7.4], hoursAwake: 4, sleepTime: "23:30", wakeTime: "07:30" },
      vitals: { hr: 66, temp: 36.6, bpSys: 112, bpDia: 72, source: "simulated" },
      history: { hr: [64, 65, 67, 66, 65, 66, 66], temp: [36.5, 36.6, 36.6, 36.5, 36.6, 36.6, 36.6], bpSys: [110, 112, 111, 113, 112, 112, 112], mood: [4, 5, 4, 4, 5, 4, 4] },
      checkin: { self: { energy: 3, focus: 4, mood: 4 }, mate: { energy: 3, focus: 4, mood: 4 } },
      reaction: { baselineMs: 290, lastMs: 288, lapses: 0 },
      radiation: { careerDoseMSv: 180, accrued: 0 },
      exercise: { last7: 7, avgPerWeek: 6.5 },
      water: { glasses: 3, goal: 8 },
      markers: { vitD: 31, calcium: 9.4 },
      labs: [
        { day: 150, ddimer: 0.25, platelets: 260, fibrinogen: 320, inr: 0.98, pt: 0.8, aptt: 29.0 },
        { day: 212, ddimer: 0.28, platelets: 255, fibrinogen: 315, inr: 0.99, pt: 0.9, aptt: 29.5 }
      ]
    }
  }
};
// ============================== end MOCK ==============================

// Things that only exist while the app is open (not mock data)
let currentCrew = "CDR";
const emergency = { active: false, signs: {} };   // per session, for the selected crew
const autoReported = {};                           // so automatic reports are sent once
const checklistDone = {};                          // clot checklist ticks per crew
const tasksDone = {};                              // care tasks done per crew


// =========================================================================
// 2. THRESHOLDS — the app's brain.
// Each function returns "normal" (green), "watch" (amber) or "act" (red).
// Values come from the team's research table. "Proposal" = team idea,
// medical team must confirm.
// =========================================================================
const T = {
  // Sleep: 7-9 h normal, 6 to under 7 watch, under 6 (or awake 17+ h) act
  sleepNight(hours, hoursAwake) {
    if (hours < 6 || hoursAwake >= 17) return "act";
    if (hours < 7) return "watch";
    return "normal";
  },
  // Sleep debt = hours below 8 over the last 7 nights. PROPOSAL
  sleepDebt(hours) {
    if (hours >= 10) return "act";
    if (hours >= 4) return "watch";
    return "normal";
  },
  // Mood 1-5: 4-5 normal, 3 watch, 1-2 act. 1-5 mapping is a PROPOSAL
  mood(v) {
    if (v <= 2) return "act";
    if (v === 3) return "watch";
    return "normal";
  },
  // Gap between self and crewmate rating. PROPOSAL
  gap(g) {
    if (g >= 3) return "act";
    if (g === 2) return "watch";
    return "normal";
  },
  // Reaction test: % slower than personal baseline. PROPOSAL
  reaction(pctSlower) {
    if (pctSlower > 20) return "act";
    if (pctSlower >= 10) return "watch";
    return "normal";
  },
  // Career radiation dose (mSv). 50% and 80% of the 600 mSv limit. PROPOSAL levels
  radiation(dose, solarEvent) {
    if (solarEvent || dose > 480) return "act";
    if (dose >= 300) return "watch";
    return "normal";
  },
  // Resting heart rate (bpm). General adult range, Abdullah to confirm
  heartRate(v) {
    if (v < 50 || v > 120) return "act";
    if (v < 60 || v > 100) return "watch";
    return "normal";
  },
  // Body temperature (°C). General adult range. 35.0-36.0 = watch is a PROPOSAL (fills a gap)
  temperature(v) {
    if (v >= 38 || v < 35) return "act";
    if (v >= 37.3 || v < 36.1) return "watch";
    return "normal";
  },
  // Blood pressure (mmHg). General adult categories
  bloodPressure(sys, dia) {
    if (sys >= 140 || dia >= 90) return "act";
    if (sys >= 120 || dia >= 80) return "watch";
    return "normal";
  },
  // Resistance sessions in the last 7 days (target 6-7). PROPOSAL
  exercise(n) {
    if (n >= 6) return "normal";
    if (n >= 4) return "watch";
    return "act";
  },
  // Estimated bone density vs pre-mission (%): 95+ normal, below 95 watch
  boneDensity(pct) {
    return pct >= 95 ? "normal" : "watch";
  },
  // Water today vs goal. PROPOSAL
  water(glasses, goal) {
    return glasses >= goal * 0.6 ? "normal" : "watch";
  },
  // Vitamin D target 35-90 ng/mL (bone research)
  vitaminD(v) {
    return v >= 35 && v <= 90 ? "normal" : "watch";
  }
};

// Solar particle event: knob at 70 or more
const SOLAR_EVENT_LEVEL = 70;

// Clotting lab tests. Gaps in the original table are filled so every value
// lands in exactly one color (filled gaps are PROPOSALS, see Science tab).
const LABS = [
  { key: "ddimer", name: "D-dimer", unit: "mg/L FEU",
    classify: v => v > 4.0 ? "act" : v > 0.5 ? "watch" : "normal" },
  { key: "platelets", name: "Platelets", unit: "×10⁹/L",
    classify: v => (v < 30 || v > 1000) ? "act" : (v < 150 || v > 400) ? "watch" : "normal" },
  { key: "fibrinogen", name: "Fibrinogen", unit: "mg/dL",
    classify: v => v < 100 ? "act" : (v < 200 || v > 395) ? "watch" : "normal" },
  { key: "inr", name: "INR", unit: "",
    classify: v => v > 1.6 ? "act" : (v < 0.8 || v > 1.10) ? "watch" : "normal" },
  { key: "pt", name: "PT (s above normal limit)", unit: "s",
    classify: v => v > 6.0 ? "act" : v >= 3.0 ? "watch" : "normal" },
  { key: "aptt", name: "aPTT", unit: "s",
    classify: v => v > 150 ? "act" : (v < 27.5 || v > 36.5) ? "watch" : "normal" }
];

// What the app tells the astronaut (from the research table)
const ADVICE = {
  sleep:    "Keep fixed sleep and wake times. Bright light after waking, dim light before sleep. Short nap for acute fatigue.",
  debt:     "Short nap if possible. Protect the next sleep period. Lighter workload today.",
  moodWatch:"Rest, do a meaningful activity, talk with the crew.",
  moodAct:  "Report to flight surgeon. Reduce workload.",
  gap:      "Your crewmate sees you differently. Talk together: people with sleep debt rarely notice their own impairment.",
  reaction: "Slower than your baseline: an objective sign of fatigue. Avoid critical tasks, nap if possible.",
  hr:       "Sit, rest 5 minutes, measure again. Red twice: report.",
  temp:     "Rest, drink water, measure again in 1 hour. Red: report.",
  bp:       "Rest, measure again. Red: report.",
  doseWatch:"Log the dose. Review the exposure plan with Earth.",
  doseAct:  "Report to flight surgeon. Limit time outside shielded areas.",
  solar:    "Go to the shielded area (water storage) now. Log the dose.",
  boneOk:   "Resistance exercise 6 to 7 times a week, vitamin D.",
  boneWatch:"Never skip sessions.",
  boneAct:  "Avoid heavy impacts. Ask Earth for a new plan.",
  water:    "Drink water. Severe side pain is an emergency sign.",
  vitD:     "Vitamin D outside 35–90 ng/mL. Discuss supplement with flight surgeon.",
  clotWatch:"Drink water, use lower-body negative pressure, repeat test within 24 hours.",
  clotAct:  "Stop work, stay still, start the clot checklist. Report at once."
};


// =========================================================================
// 3. COMBINED RULES — compute every status for one crew member
// =========================================================================
const RANK = { none: -1, normal: 0, watch: 1, act: 2 };
const worst = (...list) => list.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), "normal");
const cap = (status, max) => (RANK[status] > RANK[max] ? max : status);
const atLeastWatch = s => RANK[s] >= 1;

function doseRatePerDay() {
  const r = MOCK.radiation;
  let rate = r.issRatePerDay * MOCK.locations[MOCK.mission.location].multiplier;
  if (r.solarActivity >= SOLAR_EVENT_LEVEL) rate *= r.stormMultiplier;   // simulated storm
  return rate;
}

// Bone estimate. Without exercise: 1-1.5% loss per month (research).
// With exercise: loss shrinks with each weekly session (PROPOSAL model;
// ISS crews on ARED with good nutrition largely kept bone density).
function boneEstimate(day, sessionsPerWeek) {
  const months = day / 30.44;
  const protection = Math.min(sessionsPerWeek, 6.5) / 6.5;   // 0 = none, 1 = full
  return {
    noExerciseHigh: 100 - 1.0 * months,   // best case without exercise
    noExerciseLow:  100 - 1.5 * months,   // worst case without exercise
    withExercise:   100 - 1.25 * months * (1 - protection)
  };
}

function latestLab(c, key) {
  for (let i = c.labs.length - 1; i >= 0; i--) {
    if (c.labs[i][key] !== undefined && c.labs[i][key] !== null) return c.labs[i][key];
  }
  return null;
}
function labValues(c, key) {
  return c.labs.map(e => e[key]).filter(v => v !== undefined && v !== null);
}

function computeState(id) {
  const c = MOCK.crew[id];
  const S = { id };

  // --- Sleep ---
  S.lastNight = c.sleep.nights[c.sleep.nights.length - 1];
  S.sleepStatus = T.sleepNight(S.lastNight, c.sleep.hoursAwake);
  S.sleepDebt = c.sleep.nights.reduce((sum, h) => sum + Math.max(0, 8 - h), 0);
  S.sleepDebtStatus = T.sleepDebt(S.sleepDebt);

  // --- Mood and cross-check (use the LOWER rating: self-reports alone are not trusted) ---
  S.moodValue = Math.min(c.checkin.self.mood, c.checkin.mate.mood);
  S.moodStatus = T.mood(S.moodValue);
  S.gaps = ["energy", "focus", "mood"].map(m => {
    const gap = Math.abs(c.checkin.self[m] - c.checkin.mate[m]);
    return { metric: m, self: c.checkin.self[m], mate: c.checkin.mate[m], gap, status: T.gap(gap) };
  });
  S.gapStatus = worst(...S.gaps.map(g => g.status));

  // --- Reaction test ---
  if (c.reaction.lastMs) {
    S.reactionPct = Math.round((c.reaction.lastMs - c.reaction.baselineMs) / c.reaction.baselineMs * 100);
    S.reactionStatus = T.reaction(S.reactionPct);
  } else {
    S.reactionPct = null;
    S.reactionStatus = "none";
  }

  // --- Vitals ---
  S.hrStatus = T.heartRate(c.vitals.hr);
  S.tempStatus = T.temperature(c.vitals.temp);
  S.bpStatus = T.bloodPressure(c.vitals.bpSys, c.vitals.bpDia);

  // --- Radiation ---
  S.solarEvent = MOCK.radiation.solarActivity >= SOLAR_EVENT_LEVEL;
  S.dose = c.radiation.careerDoseMSv + c.radiation.accrued;
  S.doseStatus = T.radiation(S.dose, S.solarEvent);

  // --- Bones, muscles, kidneys ---
  S.exerciseStatus = T.exercise(c.exercise.last7);
  S.bone = boneEstimate(MOCK.mission.day, c.exercise.avgPerWeek);
  S.boneDensityStatus = T.boneDensity(S.bone.withExercise);
  S.waterStatus = T.water(c.water.glasses, c.water.goal);
  S.vitDStatus = c.markers.vitD ? T.vitaminD(c.markers.vitD) : "none";

  // --- Clotting labs ---
  S.labs = {};
  S.trendTriggers = [];
  LABS.forEach(L => {
    const values = labValues(c, L.key);
    const latest = values.length ? values[values.length - 1] : null;
    const status = latest === null ? "none" : L.classify(latest);
    // Trend rule: two amber-or-worse results in a row, or D-dimer rising 3 times in a row
    const last2 = values.slice(-2).map(L.classify);
    const twoInRow = last2.length === 2 && last2.every(atLeastWatch);
    const v3 = values.slice(-3);
    const rising = L.key === "ddimer" && v3.length === 3 && v3[0] < v3[1] && v3[1] < v3[2];
    if (twoInRow || rising) S.trendTriggers.push({ name: L.name, why: twoInRow ? "two amber results in a row" : "rising three times in a row" });
    S.labs[L.key] = { latest, status, values };
  });
  // Pattern alarm: high D-dimer + low platelets + low fibrinogen = red,
  // even when each value alone is only amber
  const dd = latestLab(c, "ddimer"), pl = latestLab(c, "platelets"), fi = latestLab(c, "fibrinogen");
  S.clotPattern = dd !== null && pl !== null && fi !== null && dd > 0.5 && pl < 150 && fi < 200;
  S.clotStatus = worst(...LABS.map(L => S.labs[L.key].status).filter(s => s !== "none"),
                       S.clotPattern ? "act" : "normal");

  // --- Emergency signs (only for the selected crew member) ---
  const em = (id === currentCrew && emergency.active) ? emergency.signs : {};

  // --- Body regions (combined rules) ---
  const immuneCount = [S.doseStatus, S.sleepDebtStatus, S.moodStatus].filter(atLeastWatch).length;
  S.regions = {
    brain: worst(S.moodStatus, cap(S.reactionStatus === "none" ? "normal" : S.reactionStatus, "act"),
                 cap(S.sleepDebtStatus, "watch"), (em.weak || em.speech) ? "act" : "normal"),
    heart: worst(S.hrStatus, S.bpStatus, S.clotStatus, em.chest ? "act" : "normal"),
    lungs: em.breath ? "act" : "normal",
    immune: immuneCount >= 2 ? "watch" : "normal",
    kidneys: worst(S.waterStatus, em.side ? "act" : "normal"),
    bones: worst(S.exerciseStatus, S.boneDensityStatus),
    muscles: S.exerciseStatus
  };
  S.immuneCount = immuneCount;

  // Combined fatigue alert: sleep debt + slow reactions + high heart rate
  S.fatigueCombined = atLeastWatch(S.sleepDebtStatus) && atLeastWatch(S.reactionStatus) && atLeastWatch(S.hrStatus);

  S.alerts = buildAlerts(c, S, em);
  return S;
}

// Every alert = what is wrong + what to do now (Earth-delay mode)
function buildAlerts(c, S, em) {
  const A = [];
  const add = (status, what, todo) => { if (atLeastWatch(status)) A.push({ status, what, todo }); };

  if (em && Object.keys(em).some(k => em[k])) A.push({ status: "act", what: "Medical emergency declared", todo: "Oxygen mask, keep the person still. Report sent at top priority." });
  add(S.solarEvent ? "act" : "normal", "Solar particle event", ADVICE.solar);
  if (S.clotPattern) A.push({ status: "act", what: "Dangerous clotting pattern (D-dimer high, platelets and fibrinogen low)", todo: ADVICE.clotAct });
  S.trendTriggers.forEach(t => A.push({ status: "act", what: `${t.name}: ${t.why}`, todo: "Trend rule: report sent to flight surgeon at once." }));
  LABS.forEach(L => add(S.labs[L.key].status, `${L.name} ${S.labs[L.key].latest} ${L.unit}`, S.labs[L.key].status === "act" ? ADVICE.clotAct : ADVICE.clotWatch));
  add(S.hrStatus, `Resting heart rate ${c.vitals.hr} bpm`, ADVICE.hr);
  add(S.tempStatus, `Body temperature ${c.vitals.temp} °C`, ADVICE.temp);
  add(S.bpStatus, `Blood pressure ${c.vitals.bpSys}/${c.vitals.bpDia} mmHg`, ADVICE.bp);
  add(S.sleepStatus, `Sleep last night ${S.lastNight} h` + (c.sleep.hoursAwake >= 17 ? `, awake ${c.sleep.hoursAwake} h` : ""), ADVICE.sleep);
  add(S.sleepDebtStatus, `Sleep debt ${S.sleepDebt.toFixed(1)} h over 7 nights`, ADVICE.debt);
  add(S.reactionStatus === "none" ? "normal" : S.reactionStatus, `Reaction time ${S.reactionPct}% slower than baseline`, ADVICE.reaction);
  add(S.moodStatus, `Mood ${S.moodValue} of 5`, S.moodStatus === "act" ? ADVICE.moodAct : ADVICE.moodWatch);
  S.gaps.forEach(g => add(g.status, `Cross-check gap in ${g.metric}: self ${g.self}, crewmate ${g.mate}`, ADVICE.gap));
  if (!S.solarEvent) add(S.doseStatus, `Career dose ${S.dose.toFixed(0)} of 600 mSv`, S.doseStatus === "act" ? ADVICE.doseAct : ADVICE.doseWatch);
  add(S.exerciseStatus, `${c.exercise.last7} exercise sessions in the last 7 days`, S.exerciseStatus === "act" ? ADVICE.boneAct : ADVICE.boneWatch);
  add(S.boneDensityStatus, `Estimated bone density ${S.bone.withExercise.toFixed(1)}%`, ADVICE.boneWatch);
  add(S.waterStatus, `Water ${c.water.glasses} of ${c.water.goal} glasses today`, ADVICE.water);
  add(S.vitDStatus === "none" ? "normal" : S.vitDStatus, `Vitamin D ${c.markers.vitD} ng/mL`, ADVICE.vitD);
  add(S.regions.immune, "Immune system: two stress factors at once", "Protect sleep, keep exercise, report any infection signs.");

  return A.sort((a, b) => RANK[b.status] - RANK[a.status]);
}


// =========================================================================
// 4. TEXT — region descriptions, threshold table, combined rules, sources
// =========================================================================
const REGIONS = {
  brain:   { name: "Head / brain",
             about: "Sleep loss, isolation, stress and radiation (central nervous system effects) all affect the brain. On Mars the crew must solve problems without mission control.",
             advice: () => ADVICE.sleep },
  heart:   { name: "Heart and blood vessels",
             about: "Fluids shift toward the head in weightlessness. In an ISS study, 6 of 11 crew had stagnant or reversed blood flow in the neck vein; one had a clot.",
             advice: s => s.clotPattern ? ADVICE.clotAct : ADVICE.hr },
  lungs:   { name: "Lungs",
             about: "No lung sensor in this prototype. Hard to breathe is an emergency sign: press MEDICAL EMERGENCY.",
             advice: () => "Hard to breathe: oxygen mask, keep still, press MEDICAL EMERGENCY." },
  immune:  { name: "Immune system",
             about: "Radiation, sleep loss and stress all weaken immunity. The common thread is chronic inflammation.",
             advice: () => "Protect sleep, keep exercising, report any infection signs." },
  kidneys: { name: "Kidneys",
             about: "Calcium released from bone, plus dehydration, raises kidney stone risk.",
             advice: () => ADVICE.water },
  bones:   { name: "Bones",
             about: "Spine and hips lose about 1 to 1.5% density per month without countermeasures. Spongy bone may not fully recover. Bone scans (DXA) are Earth-only, so the app uses the exercise log and an estimate.",
             advice: s => s.regions.bones === "normal" ? ADVICE.boneOk : s.regions.bones === "watch" ? ADVICE.boneWatch : ADVICE.boneAct },
  muscles: { name: "Muscles",
             about: "Resistance exercise on ARED (up to 600 lbf), 6 to 7 sessions a week, protects muscle and bone.",
             advice: () => ADVICE.boneOk }
};

// What drives each region's color (shown in the side panel)
function regionDrivers(key, c, S) {
  const em = emergency.active && currentCrew === S.id ? emergency.signs : {};
  switch (key) {
    case "brain": return [
      ["Mood (lower of self and crewmate)", `${S.moodValue} / 5`, S.moodStatus],
      ["Reaction test vs baseline", S.reactionPct === null ? "not done" : `${S.reactionPct > 0 ? "+" : ""}${S.reactionPct}%`, S.reactionStatus],
      ["Sleep debt (counts as watch at most)", `${S.sleepDebt.toFixed(1)} h`, cap(S.sleepDebtStatus, "watch")],
      ...(em.weak || em.speech ? [["Emergency sign", "weakness or speech problem", "act"]] : [])];
    case "heart": return [
      ["Resting heart rate", `${c.vitals.hr} bpm`, S.hrStatus],
      ["Blood pressure", `${c.vitals.bpSys}/${c.vitals.bpDia}`, S.bpStatus],
      ["Clotting labs" + (S.clotPattern ? " (pattern alarm)" : ""), "see Blood tab", S.clotStatus],
      ...(em.chest ? [["Emergency sign", "chest pain", "act"]] : [])];
    case "lungs": return [["Emergency sign: hard to breathe", em.breath ? "yes" : "no", em.breath ? "act" : "normal"]];
    case "immune": return [
      ["Radiation", `${S.dose.toFixed(0)} mSv`, S.doseStatus],
      ["Sleep debt", `${S.sleepDebt.toFixed(1)} h`, S.sleepDebtStatus],
      ["Stress / mood", `${S.moodValue} / 5`, S.moodStatus],
      ["Rule: 2 or more at watch = immune watch (proposal)", `${S.immuneCount} of 3`, S.regions.immune]];
    case "kidneys": return [
      ["Water today", `${c.water.glasses} of ${c.water.goal} glasses`, S.waterStatus],
      ...(em.side ? [["Emergency sign", "severe side pain", "act"]] : [])];
    case "bones": return [
      ["Sessions in last 7 days", `${c.exercise.last7}`, S.exerciseStatus],
      ["Estimated density vs pre-mission", `${S.bone.withExercise.toFixed(1)}%`, S.boneDensityStatus]];
    case "muscles": return [["Sessions in last 7 days", `${c.exercise.last7}`, S.exerciseStatus]];
  }
  return [];
}

// Threshold table shown on the Science tab
const THRESHOLD_TABLE = [
  ["Sleep (hours per night)", "7 to 9", "6 to under 7", "Under 6, or awake 17+ hours", ADVICE.sleep, "NASA HRP", false],
  ["Sleep debt (hours below 8, last 7 nights)", "Under 4", "4 to under 10", "10 or more", ADVICE.debt, "Team proposal", true],
  ["Mood (1 to 5, lower of self and crewmate)", "4 to 5: calm, engaged", "3: irritable, low motivation, withdrawn", "1 to 2: persistent anxiety, apathy, conflict", "Amber: " + ADVICE.moodWatch + " Red: " + ADVICE.moodAct, "NASA HRP. 1–5 mapping is a proposal", true],
  ["Cross-check gap (self vs crewmate)", "0 to 1", "2", "3 or more", ADVICE.gap, "Team proposal", true],
  ["Reaction test (slower than own baseline)", "Under 10%", "10 to 20%", "Over 20%", ADVICE.reaction, "Team proposal, modeled on NASA vigilance self-test", true],
  ["Radiation (career dose, mSv)", "Under 300", "300 to 480", "Over 480, or solar particle event", ADVICE.solar, "NASA career limit 600 mSv (NASA-STD-3001 Vol. 1 Rev. B). Levels are a proposal (50% and 80%)", true],
  ["Bone (density vs pre-mission)", "95% or more (femoral neck 90%+). T-score −1.0 or higher", "Below 95% (femoral neck below 90%), or T-score −1.0 to −2.0", "T-score below −2.0, or fracture risk above referral limits", "Green: " + ADVICE.boneOk + " Amber: " + ADVICE.boneWatch + " Red: " + ADVICE.boneAct, "NASA OCHMO bone brief", false],
  ["Resistance exercise (sessions in last 7 days)", "6 to 7", "4 to 5", "3 or fewer", ADVICE.boneWatch, "Team proposal from 6–7/week target", true],
  ["Vitamin D (ng/mL)", "35 to 90", "Outside 35 to 90", "—", ADVICE.vitD, "Bone research (target range)", false],
  ["Water (glasses today vs goal)", "60% of goal or more", "Under 60% of goal", "Severe side pain = emergency", ADVICE.water, "Team proposal", true],
  ["D-dimer (mg/L FEU)", "0.50 or less", "Over 0.5 to 4.0", "Over 4.0", "Amber: " + ADVICE.clotWatch + " Red: " + ADVICE.clotAct, "Clotting file, lab references", false],
  ["Platelets (×10⁹/L)", "150 to 400", "30 to under 150, or over 400 to 1,000", "Under 30, or over 1,000", "Same as D-dimer", "Lab references. 30–50 and 400–450 filled in (proposal)", true],
  ["Fibrinogen (mg/dL)", "200 to 395", "100 to under 200, or over 395", "Under 100", "Same as D-dimer", "Lab references. Over 395 filled in (proposal)", true],
  ["INR (not on blood thinners)", "0.80 to 1.10", "Over 1.10 to 1.6, or under 0.80", "Over 1.6", "Same as D-dimer", "Lab references. 1.11–1.29 and under 0.8 filled in (proposal)", true],
  ["PT (seconds above normal limit)", "Under 3.0", "3.0 to 6.0", "Over 6.0", "Same as D-dimer", "Lab references", false],
  ["aPTT (seconds)", "27.5 to 36.5", "Over 36.5 to 150, or under 27.5", "Over 150", "Same as D-dimer", "Lab references. Under 27.5 filled in (proposal)", true],
  ["Resting heart rate (bpm)", "60 to 100", "50 to 59, or 101 to 120", "Under 50, or over 120 at rest", ADVICE.hr, "General adult range. Abdullah to confirm", true],
  ["Body temperature (°C)", "36.1 to 37.2", "37.3 to 37.9, or 35.0 to 36.0", "38.0 or more, or under 35.0", ADVICE.temp, "General adult range. Abdullah to confirm", true],
  ["Blood pressure (mmHg)", "Under 120/80", "120 to 139, or 80 to 89", "140/90 or more", ADVICE.bp, "General adult categories. Abdullah to confirm", true],
  ["Emergency signs", "—", "—", "Hard to breathe, chest pain, one-sided weakness, speech problem, severe side pain", "Oxygen mask, keep the person still, press MEDICAL EMERGENCY. Report at top priority.", "Clotting file (project proposal); bone file (kidney stone)", true]
];

const COMBINED_RULES = [
  "<strong>Pattern alarm.</strong> High D-dimer + low platelets + low fibrinogen turns red, even if each value alone is only amber.",
  "<strong>Trend rule.</strong> Two amber results in a row, or D-dimer rising three times in a row, sends a report at once.",
  "<strong>Immune rule (proposal).</strong> When two of radiation, sleep debt and mood are at watch or worse, the immune region turns amber.",
  "<strong>Fatigue alert.</strong> Sleep debt + slower reaction time + high heart rate together give a combined plan: nap now, lighter workload today, bright light schedule tomorrow.",
  "<strong>Don't trust self-reports alone.</strong> Mood uses the lower of the self-rating and the crewmate's rating.",
  "<strong>Earth-delay mode.</strong> Every alert has an action for now. Reports are sent and the crew does not wait for the reply.",
  "<strong>Third quarter.</strong> In the third quarter of the mission, mood check-ins go from once to twice a day."
];

const SOURCES = [
  "NASA Space Apps Challenge 2026: Create Health Monitoring Software for Astronauts on Space Missions (challenge resources tab)",
  "NASA Human Research Program (HRP): Hazard of space radiation",
  "NASA: Space radiation (Human Health and Performance)",
  "Houston We Have a Podcast: Hazard 1, Radiation",
  "NASA OCHMO radiation protection technical brief; NASA-STD-3001 Vol. 1 Rev. B (600 mSv career limit)",
  "NASA: Risk of spaceflight-induced bone changes",
  "NASA OCHMO bone loss technical brief",
  "NASA Human Research Roadmap: Risk of bone fracture",
  "Smith SM, et al. Benefits for bone from resistance exercise and nutrition in long-duration spaceflight. J Bone Miner Res, 2012 (to verify before citing)",
  "Marshall-Goebel K, et al. Jugular venous blood flow stasis and thrombosis during spaceflight. JAMA Network Open, 2019. doi:10.1001/jamanetworkopen.2019.15011",
  "Knowledge gaps in venous thrombosis during spaceflight",
  "Lab reference ranges for clotting tests (six references in the clotting file)",
  "NASA HRP: Isolation and confinement (exact link to add)"
];

const CLOT_CHECKLIST = [
  "Stop work. Sit or lie still.",
  "Check emergency signs: hard to breathe, chest pain, one-sided weakness, speech problem. Any yes: press MEDICAL EMERGENCY.",
  "Note the time any symptom started.",
  "Drink water.",
  "Send the report to the flight surgeon now. Do not wait for a reply.",
  "Prepare the ultrasound for a neck-vein check (ISS case: guided live from Earth).",
  "Repeat D-dimer, platelets and fibrinogen within 24 hours."
];

const EMERGENCY_SIGNS = [
  { key: "breath", label: "Hard to breathe" },
  { key: "chest",  label: "Chest pain" },
  { key: "weak",   label: "One-sided weakness" },
  { key: "speech", label: "Speech problem" },
  { key: "side",   label: "Severe side pain (possible kidney stone)" }
];


// =========================================================================
// 5. RENDER — helpers
// =========================================================================
const $ = id => document.getElementById(id);
const STATUS_LABELS = { normal: "Normal", watch: "Watch", act: "Act now", none: "No data" };
const STATUS_ICONS = {
  normal: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M4.5 8.2 7 10.5l4.5-5" stroke="#fff" stroke-width="2" fill="none"/></svg>',
  watch:  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1 15 14H1Z" fill="currentColor"/><rect x="7.2" y="5.5" width="1.6" height="4.5" fill="#fff"/><rect x="7.2" y="11" width="1.6" height="1.6" fill="#fff"/></svg>',
  act:    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 1h6l4 4v6l-4 4H5l-4-4V5Z" fill="currentColor"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" stroke-width="2"/></svg>',
  none:   '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
};
function badge(status, label) {
  return `<span class="status ${status}">${STATUS_ICONS[status]}${label || STATUS_LABELS[status]}</span>`;
}
function shipTime(date = new Date()) {
  return date.toTimeString().slice(0, 5);
}
function addMinutes(date, min) { return new Date(date.getTime() + min * 60000); }

// Tiny line chart (sparkline) as inline SVG
function sparkline(values) {
  if (!values || values.length < 2) return "";
  const w = 200, h = 34, pad = 4;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => [
    pad + i * (w - 2 * pad) / (values.length - 1),
    h - pad - (v - min) / range * (h - 2 * pad)
  ]);
  const last = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="3" fill="currentColor"/></svg>`;
}

// Horizontal meter with marks, e.g. career dose 0..600
function meter(value, max, status, marks) {
  const pct = Math.min(100, value / max * 100);
  return `<div class="meter"><div class="meter-fill ${status}" style="width:${pct}%"></div>
    ${marks.map(m => `<div class="meter-mark" style="left:${m / max * 100}%"></div>`).join("")}</div>
    <div class="meter-legend">${marks.map(m => `<span style="left:${m / max * 100}%">${m}</span>`).join("")}</div>`;
}


// =========================================================================
// 5. RENDER — top nav, mission strip, banners
// =========================================================================
function renderTop(S) {
  const m = MOCK.mission;
  $("missionDay").textContent = `Mission day ${m.day} - ${m.phase}`;
  $("signalDelay").textContent = `Signal delay to Earth: ${m.signalDelayMin} min`;
  $("missionLocation").textContent = `Location: ${MOCK.locations[m.location].label}`;
  $("missionPhase").textContent = `Quarter ${missionQuarter()} of 4`;
  $("crewPoints").textContent = `${currentCrew} points: ${MOCK.crew[currentCrew].points}`;

  const sel = $("crewSelector");
  sel.innerHTML = "";
  Object.keys(MOCK.crew).forEach(id => {
    const worstRegion = worst(...Object.values(computeState(id).regions));
    const b = document.createElement("button");
    b.className = "crew-btn" + (id === currentCrew ? " active" : "");
    b.textContent = id;
    b.title = `${MOCK.crew[id].role}: ${STATUS_LABELS[worstRegion]}`;
    b.onclick = () => { currentCrew = id; emergency.active = false; emergency.signs = {}; renderForms(); renderAll(); };
    sel.appendChild(b);
  });
}

function renderBanners(S) {
  const out = [];
  if (emergency.active) {
    const signs = EMERGENCY_SIGNS.filter(s => emergency.signs[s.key]).map(s => s.label).join(", ") || "no sign ticked";
    out.push(`<div class="banner act">${STATUS_ICONS.act}<div><strong>MEDICAL EMERGENCY — ${currentCrew} (${signs})</strong>
      Oxygen mask, keep the person still. Report sent to Earth at top priority. Act now, do not wait for a reply.</div></div>`);
  }
  if (S.solarEvent) {
    out.push(`<div class="banner act">${STATUS_ICONS.act}<div><strong>Solar particle event: go to the shielded area now</strong>
      <ol><li>Move to the shielded area (water storage) now.</li><li>Take your dosimeter.</li><li>Stay until the all-clear.</li><li>Log the dose.</li></ol></div></div>`);
  }
  if (S.clotPattern) {
    out.push(`<div class="banner act">${STATUS_ICONS.act}<div><strong>Pattern alarm: dangerous clotting pattern (${currentCrew})</strong>
      D-dimer high, platelets low and fibrinogen low together. ${ADVICE.clotAct}
      <button class="ghost-btn" data-goto="blood" style="margin-left:8px">Open clot checklist</button></div></div>`);
  }
  if (S.fatigueCombined) {
    out.push(`<div class="banner watch">${STATUS_ICONS.watch}<div><strong>Combined fatigue alert (${currentCrew})</strong>
      Sleep debt, slower reactions and high heart rate together. Plan: nap now, lighter workload today, bright light schedule tomorrow.</div></div>`);
  }
  $("banners").innerHTML = out.join("");
}


// =========================================================================
// 5. RENDER — Overview tab
// =========================================================================
function renderBody(S) {
  document.querySelectorAll(".region").forEach(el => {
    const key = el.dataset.region;
    const st = S.regions[key];
    el.classList.remove("normal", "watch", "act");
    el.classList.add(st);
    el.setAttribute("aria-label", `${REGIONS[key].name}: ${STATUS_LABELS[st]}`);
  });
  const list = $("regionList");
  list.innerHTML = "";
  Object.keys(REGIONS).forEach(key => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${REGIONS[key].name}</span>${badge(S.regions[key])}`;
    li.onclick = () => openSidePanel(key);
    list.appendChild(li);
  });
}

function renderAlerts(S) {
  const list = $("alertList");
  if (!S.alerts.length) {
    list.innerHTML = `<li><span>${badge("normal")}</span><span class="ok">All readings normal. Keep the routine.</span></li>`;
    return;
  }
  const shown = S.alerts.slice(0, 4);
  list.innerHTML = shown.map(a => `<li><span>${badge(a.status)}</span>
    <span><span class="what">${a.what}</span><br><span class="do">Do now: ${a.todo}</span></span></li>`).join("")
    + (S.alerts.length > 4 ? `<li><span></span><span class="muted small">+ ${S.alerts.length - 4} more. Open the tabs above for details.</span></li>` : "");
}

function renderVitals(c, S) {
  const src = c.vitals.source === "live" ? "Live sensor" : "Simulated";
  const cards = [
    { label: "Heart rate",       value: c.vitals.hr, unit: "bpm", status: S.hrStatus, spark: c.history.hr, source: src },
    { label: "Body temperature", value: c.vitals.temp.toFixed(1), unit: "°C", status: S.tempStatus, spark: c.history.temp, source: src },
    { label: "Blood pressure",   value: `${c.vitals.bpSys}/${c.vitals.bpDia}`, unit: "mmHg", status: S.bpStatus, spark: c.history.bpSys, source: "Simulated" },
    { label: "Sleep last night", value: S.lastNight, unit: "hours", status: S.sleepStatus, spark: c.sleep.nights, source: `Debt: ${S.sleepDebt.toFixed(1)} h (${STATUS_LABELS[S.sleepDebtStatus]})` },
    { label: "Mood",             value: S.moodValue, unit: "/ 5", status: S.moodStatus, spark: c.history.mood, source: "Lower of self and crewmate" },
    { label: "Radiation dose",   value: S.dose.toFixed(1), unit: "mSv (simulated)", status: S.doseStatus,
      extra: meter(S.dose, 600, S.doseStatus, [300, 480, 600]), source: "Career total, limit 600" }
  ];
  $("vitalsGrid").innerHTML = cards.map(v => `
    <div class="vital-card">
      <div class="card-head"><span class="label">${v.label}</span>${badge(v.status)}</div>
      <div class="value">${v.value}<span class="unit">${v.unit}</span></div>
      ${v.extra || sparkline(v.spark)}
      <span class="source">${v.source}</span>
    </div>`).join("");
}

function renderCrossCheck(S) {
  $("crossCheckList").innerHTML = S.gaps.map(g => `
    <div class="cross-row">
      <div class="row-head"><span class="metric">${g.metric[0].toUpperCase() + g.metric.slice(1)}</span>
        <span class="small muted">Gap ${g.gap}</span>${badge(g.status)}</div>
      <div class="bar-line"><span>Self</span><div class="bar-track"><div class="bar-fill self" style="width:${g.self * 20}%"></div></div><strong>${g.self}</strong></div>
      <div class="bar-line"><span>Crewmate</span><div class="bar-track"><div class="bar-fill mate" style="width:${g.mate * 20}%"></div></div><strong>${g.mate}</strong></div>
    </div>`).join("");
}

function renderEarthQueue() {
  const last = MOCK.earthLog[MOCK.earthLog.length - 1];
  $("earthQueue").textContent = last
    ? `Last report: "${last.title}" sent ${shipTime(last.sent)} · arrives ~${shipTime(last.arrive)} · earliest reply ~${shipTime(last.reply)}. The crew does not wait.`
    : `No report sent yet. Earth round trip: ${MOCK.mission.signalDelayMin * 2} min.`;
}

// Side panel for a body region
let openRegion = null;
function openSidePanel(key) {
  openRegion = key;
  renderSidePanel();
  $("sidePanel").classList.add("open");
  $("sidePanel").setAttribute("aria-hidden", "false");
  document.querySelectorAll(".region").forEach(el => el.classList.toggle("selected", el.dataset.region === key));
}
function renderSidePanel() {
  if (!openRegion) return;
  const c = MOCK.crew[currentCrew], S = computeState(currentCrew), R = REGIONS[openRegion];
  $("sidePanelTitle").textContent = `${R.name} · ${currentCrew}`;
  $("sidePanelBody").innerHTML = `
    ${badge(S.regions[openRegion])}
    <h4>About</h4><p>${R.about}</p>
    <h4>What sets the color</h4>
    <table>${regionDrivers(openRegion, c, S).map(d => `<tr><td>${d[0]}</td><td><strong>${d[1]}</strong></td><td>${badge(d[2])}</td></tr>`).join("")}</table>
    <h4>What to do</h4><p>${R.advice(S)}</p>`;
}
function closeSidePanel() {
  openRegion = null;
  $("sidePanel").classList.remove("open");
  $("sidePanel").setAttribute("aria-hidden", "true");
  document.querySelectorAll(".region").forEach(el => el.classList.remove("selected"));
}


// =========================================================================
// 5. RENDER — Sleep & mind tab
// =========================================================================
function missionQuarter() {
  return Math.min(4, Math.floor(MOCK.mission.day / MOCK.mission.lengthDays * 4) + 1);
}

function renderSleep(c, S) {
  $("sleepSummary").innerHTML = `
    <div class="stat-row">
      <div><span class="k">Last night</span><span class="v">${S.lastNight} h</span>${badge(S.sleepStatus)}</div>
      <div><span class="k">Sleep debt (7 nights)</span><span class="v">${S.sleepDebt.toFixed(1)} h</span>${badge(S.sleepDebtStatus)}</div>
    </div>
    ${meter(Math.min(S.sleepDebt, 20), 20, S.sleepDebtStatus, [4, 10, 20])}
    <p class="muted small">Debt adds up hours below 8 each night. People with sleep debt rarely notice how impaired they are. Astronauts get 8.5 h scheduled but average 6–6.5 h.</p>`;
}

function renderCoach(c, S) {
  const now = new Date();
  const toMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const sinceWake = (nowMin - toMin(c.sleep.wakeTime) + 1440) % 1440;
  const untilSleep = (toMin(c.sleep.sleepTime) - nowMin + 1440) % 1440;

  let nowTip;
  if (sinceWake <= 90) nowTip = ["Bright light now", "You woke up recently. Bright light helps set your body clock."];
  else if (untilSleep <= 120) nowTip = ["Dim the lights", `Sleep at ${c.sleep.sleepTime}. Dim light before sleep.`];
  else nowTip = ["Keep your routine", `Dim lights from ${shipTime(new Date(0, 0, 0, 0, toMin(c.sleep.sleepTime) - 120))}. Sleep at ${c.sleep.sleepTime}.`];

  const napNeeded = atLeastWatch(S.sleepDebtStatus) || c.sleep.hoursAwake >= 17 || atLeastWatch(S.reactionStatus === "none" ? "normal" : S.reactionStatus);
  $("coach").innerHTML = `
    <p class="muted small">Ship time ${shipTime(now)}</p>
    <div class="notice"><strong>${nowTip[0]}.</strong> ${nowTip[1]}</div>
    ${napNeeded ? `<div class="notice"><strong>Short nap recommended.</strong> Signs of acute fatigue (sleep debt or slow reactions).</div>` : ""}
    <ul class="fact-list">
      <li>Fixed times: sleep ${c.sleep.sleepTime}, wake ${c.sleep.wakeTime}.</li>
      <li>Bright light after waking, dim light before sleep.</li>
      <li>ISS crews see about 16 sunrises a day, so lighting sets the body clock. A Mars day is about 40 minutes longer.</li>
    </ul>`;
}

function renderPhase() {
  const m = MOCK.mission, q = missionQuarter();
  const pct = Math.min(100, m.day / m.lengthDays * 100);
  $("phaseCard").innerHTML = `
    <div class="big-number">Day ${m.day} <span class="muted small">of ~${m.lengthDays}</span></div>
    <div class="meter"><div class="meter-fill ${q === 3 ? "watch" : "normal"}" style="width:${pct}%;background:var(--brand-primary)"></div>
      ${[250, 500, 750].map(d => `<div class="meter-mark" style="left:${d / m.lengthDays * 100}%"></div>`).join("")}</div>
    <p>Quarter <strong>${q}</strong> of 4. Mood check-ins: <strong>${q === 3 ? "twice a day" : "once a day"}</strong>.</p>
    <p class="muted small">The "third-quarter phenomenon" is a dip in mood in the later part of a long mission. In quarter 3 the app asks more often.</p>
    <p class="muted small">Signal delay ${m.signalDelayMin} min one way (up to 20 min at Mars). The crew must solve problems without mission control.</p>`;
}

function renderReactionResult(c, S) {
  if (!c.reaction.lastMs) { $("reactionResult").innerHTML = `<p class="muted small">No test yet.</p>`; return; }
  $("reactionResult").innerHTML = `
    <div class="stat-row">
      <div><span class="k">Last average</span><span class="v">${c.reaction.lastMs} ms</span></div>
      <div><span class="k">Baseline</span><span class="v">${c.reaction.baselineMs} ms</span></div>
      <div><span class="k">Lapses (&gt;500 ms)</span><span class="v">${c.reaction.lapses}</span></div>
    </div>
    ${badge(S.reactionStatus, `${STATUS_LABELS[S.reactionStatus]}: ${S.reactionPct > 0 ? "+" : ""}${S.reactionPct}% vs baseline`)}`;
}

function renderTasks(c) {
  const done = tasksDone[currentCrew] || {};
  $("taskList").innerHTML = MOCK.careTasks.map(t => `
    <li><span>${t.label}</span>
      ${done[t.id] ? badge("normal", "Done") : `<button class="ghost-btn" data-task="${t.id}">Done (+${t.points})</button>`}</li>`).join("")
    + `<li><strong>Total points</strong><span class="pts">${c.points}</span></li>`;
  document.querySelectorAll("[data-task]").forEach(b => b.onclick = () => {
    const t = MOCK.careTasks.find(x => x.id === b.dataset.task);
    tasksDone[currentCrew] = tasksDone[currentCrew] || {};
    tasksDone[currentCrew][t.id] = true;
    c.points += t.points;
    renderAll();
  });
}


// =========================================================================
// 5. RENDER — Radiation tab
// =========================================================================
function renderRadiation(c, S) {
  const m = MOCK.mission, r = MOCK.radiation;
  const rate = doseRatePerDay();
  const daysLeft = m.lengthDays - m.day;
  const projected = S.dose + r.issRatePerDay * MOCK.locations[m.location].multiplier * daysLeft;
  $("doseCard").innerHTML = `
    <div class="stat-row">
      <div><span class="k">Career dose (${currentCrew})</span><span class="v"><span id="doseLive">${S.dose.toFixed(2)}</span> mSv</span>${badge(S.doseStatus)}</div>
      <div><span class="k">Dose rate now</span><span class="v">${rate.toFixed(2)} mSv/day</span></div>
      <div><span class="k">Projected at mission end</span><span class="v">${projected.toFixed(0)} mSv</span>${badge(T.radiation(projected, false))}</div>
      <div><span class="k">Limit left</span><span class="v">${Math.max(0, r.careerLimit - S.dose).toFixed(0)} mSv</span></div>
    </div>
    ${meter(S.dose, r.careerLimit, S.doseStatus, [300, 480, 600])}
    <p class="muted small">Projection assumes the rest of the mission is spent at this location's rate. Simulated dosimeter: 1 second on screen = 1 hour of mission. Green under 300, amber 300–480, red over 480 (50% and 80% of the 600 mSv limit, proposal).</p>`;

  $("locationButtons").innerHTML = Object.entries(MOCK.locations).map(([k, L]) =>
    `<button class="pill ${k === m.location ? "active" : ""}" data-loc="${k}">${L.label}</button>`).join("");
  document.querySelectorAll("[data-loc]").forEach(b => b.onclick = () => { m.location = b.dataset.loc; renderAll(); });
  $("locationInfo").innerHTML = `<p><strong>${MOCK.locations[m.location].multiplier}×</strong> the ISS dose rate.</p>
    <p class="muted small">Moon ~1.5×, deep space 2–3×, Mars surface about the same as ISS. Planet ground blocks part of the radiation.</p>`;

  $("solarStatus").innerHTML = `<p>Knob level: <strong>${r.solarActivity}</strong> / 100 (alarm at ${SOLAR_EVENT_LEVEL})</p>
    ${S.solarEvent ? badge("act", "Act now: solar particle event") : badge("normal", "Normal: no solar event")}
    <p class="muted small">Solar particle events cause acute radiation sickness (skin burns, nausea) but are fairly easy to shield against with water and polyethylene.</p>`;
}


// =========================================================================
// 5. RENDER — Bones & muscles tab
// =========================================================================
function renderBones(c, S) {
  const dots = Array.from({ length: 7 }, (_, i) =>
    `<span style="display:inline-block;width:26px;height:26px;border-radius:50%;margin-right:4px;background:${i < c.exercise.last7 ? "var(--brand-primary)" : "var(--bg)"};border:1px solid var(--border)"></span>`).join("");
  $("exerciseCard").innerHTML = `<div style="margin:6px 0">${dots}</div>
    <p><strong>${c.exercise.last7}</strong> sessions in the last 7 days ${badge(S.exerciseStatus)}</p>
    <p class="muted small">Sets the color of bones and muscles on the body figure. ${S.exerciseStatus === "normal" ? ADVICE.boneOk : ADVICE.boneWatch}</p>`;

  const day = Number($("boneDay").value), sess = Number($("boneSess").value);
  $("boneDayLabel").textContent = day;
  $("boneSessLabel").textContent = sess;
  const e = boneEstimate(day, sess);
  $("boneEstimate").innerHTML = `
    <div class="stat-row">
      <div><span class="k">No exercise</span><span class="v">${e.noExerciseLow.toFixed(1)}–${e.noExerciseHigh.toFixed(1)}%</span>${badge(T.boneDensity(e.noExerciseHigh))}</div>
      <div><span class="k">With ${sess} sessions/week</span><span class="v">${e.withExercise.toFixed(1)}%</span>${badge(T.boneDensity(e.withExercise))}</div>
    </div>
    <p class="muted small">Hip and spine density vs pre-mission. 95% or more = normal. The with-exercise line is a team proposal: loss shrinks with each weekly session (ISS crews on ARED with good nutrition largely kept bone density). Not a diagnosis.</p>`;

  $("waterCard").innerHTML = `<div class="big-number">${c.water.glasses} <span class="muted small">of ${c.water.goal} glasses</span></div>
    ${badge(S.waterStatus)}
    <p class="muted small">Severe side pain is an emergency sign.</p>`;

  $("markerStatus").innerHTML = `<p>Vitamin D: ${c.markers.vitD ?? "—"} ng/mL ${badge(S.vitDStatus)} <span class="muted small">target 35–90</span></p>
    <p>Calcium: ${c.markers.calcium ?? "—"} mg/dL ${badge("none", "Logged")} <span class="muted small">no threshold in our research yet</span></p>`;
}


// =========================================================================
// 5. RENDER — Blood & clots tab
// =========================================================================
function renderBlood(c, S) {
  const days = c.labs.map(e => e.day);
  $("labTable").innerHTML = `<div class="table-wrap"><table>
    <tr><th>Test</th>${days.map(d => `<th>Day ${d}</th>`).join("")}<th>Status</th><th>Trend rule</th></tr>
    ${LABS.map(L => {
      const trig = S.trendTriggers.find(t => t.name === L.name);
      return `<tr><td><strong>${L.name}</strong><br><span class="muted small">${L.unit}</span></td>
        ${c.labs.map(e => e[L.key] == null ? "<td>—</td>" : `<td class="c-${L.classify(e[L.key])}">${e[L.key]}</td>`).join("")}
        <td>${badge(S.labs[L.key].status)}</td>
        <td class="trend">${trig ? badge("act", "Report sent") + "<br>" + trig.why : "—"}</td></tr>`;
    }).join("")}
  </table></div>`;

  $("patternCard").innerHTML = S.clotPattern
    ? `${badge("act", "Act now: pattern found")}<p>D-dimer ${S.labs.ddimer.latest} (high) + platelets ${S.labs.platelets.latest} (low) + fibrinogen ${S.labs.fibrinogen.latest} (low).</p><p><strong>${ADVICE.clotAct}</strong></p>`
    : `${badge("normal", "No dangerous pattern")}<p class="muted small">Watches for high D-dimer + low platelets + low fibrinogen together. That combination turns red even if each value is only amber.</p>`;
}


// =========================================================================
// 5. RENDER — Science tab (static, drawn once)
// =========================================================================
function renderScience() {
  $("thresholdTable").innerHTML = `<table>
    <tr><th>Indicator</th><th>Green: normal</th><th>Amber: watch</th><th>Red: act now</th><th>What the app tells the astronaut</th><th>Source</th></tr>
    ${THRESHOLD_TABLE.map(r => `<tr><td><strong>${r[0]}</strong>${r[6] ? ' <span class="tag">proposal</span>' : ""}</td>
      <td class="c-normal">${r[1]}</td><td class="c-watch">${r[2]}</td><td class="c-act">${r[3]}</td><td>${r[4]}</td><td class="muted small">${r[5]}</td></tr>`).join("")}
  </table>`;
  $("combinedRules").innerHTML = COMBINED_RULES.map(r => `<li>${r}</li>`).join("");
  $("sourceList").innerHTML = SOURCES.map(s => `<li>${s}</li>`).join("");
}


// =========================================================================
// 5. RENDER — forms (only when crew changes, so typing isn't interrupted)
// =========================================================================
function renderForms() {
  const c = MOCK.crew[currentCrew];

  // Sleep inputs
  $("sleepInputs").innerHTML = c.sleep.nights.map((h, i) =>
    `<input type="number" min="0" max="14" step="0.1" value="${h}" data-night="${i}" class="${i === 6 ? "last" : ""}" aria-label="Night ${i + 1}">`).join("");
  document.querySelectorAll("[data-night]").forEach(inp => inp.oninput = () => {
    const v = parseFloat(inp.value);
    if (!isNaN(v)) { c.sleep.nights[Number(inp.dataset.night)] = v; renderAll(); }
  });
  $("hoursAwake").value = c.sleep.hoursAwake;

  // Check-in selects
  const opts = sel => [1, 2, 3, 4, 5].map(n => `<option ${n === sel ? "selected" : ""}>${n}</option>`).join("");
  $("checkinForm").innerHTML = `<div class="checkin-grid">
    <span class="head">Rating</span><span class="head">Self</span><span class="head">Crewmate</span>
    ${["energy", "focus", "mood"].map(m => `<span>${m[0].toUpperCase() + m.slice(1)}</span>
      <select id="self-${m}">${opts(c.checkin.self[m])}</select>
      <select id="mate-${m}">${opts(c.checkin.mate[m])}</select>`).join("")}
  </div>`;

  // Lab form
  $("labDayLabel").textContent = MOCK.mission.day;
  $("labForm").innerHTML = LABS.map(L =>
    `<label class="field">${L.name} ${L.unit ? `(${L.unit})` : ""}<input type="number" step="any" id="lab-${L.key}"></label>`).join("");

  // Markers
  $("vitD").value = c.markers.vitD ?? "";
  $("calcium").value = c.markers.calcium ?? "";

  // Sliders
  $("boneDay").value = MOCK.mission.day;
  $("boneSess").value = c.exercise.avgPerWeek;
  $("solarSlider").value = MOCK.radiation.solarActivity;

  // Clot checklist
  const done = checklistDone[currentCrew] = checklistDone[currentCrew] || {};
  $("clotChecklist").innerHTML = CLOT_CHECKLIST.map((step, i) =>
    `<li class="${done[i] ? "done" : ""}"><label><input type="checkbox" data-step="${i}" ${done[i] ? "checked" : ""}><span>${i + 1}. ${step}</span></label></li>`).join("");
  document.querySelectorAll("[data-step]").forEach(cb => cb.onchange = () => {
    done[cb.dataset.step] = cb.checked;
    cb.closest("li").classList.toggle("done", cb.checked);
  });

  // Emergency signs
  $("emergencySigns").innerHTML = EMERGENCY_SIGNS.map(s =>
    `<label class="sign-option"><input type="checkbox" data-sign="${s.key}" ${emergency.signs[s.key] ? "checked" : ""}>${s.label}</label>`).join("");

  // Reaction result reset
  $("reactionBox").textContent = "Press Start";
}


// =========================================================================
// 5. RENDER — draw everything that depends on state
// =========================================================================
function renderAll() {
  const c = MOCK.crew[currentCrew];
  const S = computeState(currentCrew);
  renderTop(S);
  renderBanners(S);
  renderBody(S);
  renderAlerts(S);
  renderVitals(c, S);
  renderCrossCheck(S);
  renderEarthQueue();
  renderSidePanel();
  renderSleep(c, S);
  renderCoach(c, S);
  renderPhase();
  renderReactionResult(c, S);
  renderTasks(c);
  renderRadiation(c, S);
  renderBones(c, S);
  renderBlood(c, S);
  autoReport(S);
  wireGotoButtons();
}


// =========================================================================
// 6. ACTIONS — tabs
// =========================================================================
function showTab(name) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".tab-page").forEach(p => p.classList.toggle("active", p.id === "tab-" + name));
  if (location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
  window.scrollTo(0, 0);
}
document.querySelectorAll(".tab").forEach(t => t.onclick = () => showTab(t.dataset.tab));
function wireGotoButtons() {
  document.querySelectorAll("[data-goto]").forEach(b => b.onclick = () => showTab(b.dataset.goto));
}


// =========================================================================
// 6. ACTIONS — reports to Earth (Earth-delay mode)
// =========================================================================
function sendToEarth(title) {
  const sent = new Date(), d = MOCK.mission.signalDelayMin;
  MOCK.earthLog.push({ title, crew: currentCrew, sent, arrive: addMinutes(sent, d), reply: addMinutes(sent, d * 2) });
}

// Automatic reports for the trend rule, pattern alarm and emergency (sent once)
function autoReport(S) {
  const triggers = [
    ...S.trendTriggers.map(t => `Trend rule: ${t.name}`),
    ...(S.clotPattern ? ["Pattern alarm: clotting"] : []),
    ...(S.solarEvent ? ["Solar particle event"] : [])
  ];
  let sentNew = false;
  triggers.forEach(t => {
    const key = currentCrew + "|" + t;
    if (!autoReported[key]) { autoReported[key] = true; sendToEarth(`${currentCrew}: ${t} (automatic)`); sentNew = true; }
  });
  if (sentNew) renderEarthQueue();
}

function buildReport() {
  const c = MOCK.crew[currentCrew], S = computeState(currentCrew), m = MOCK.mission;
  const act = S.alerts.filter(a => a.status === "act"), watch = S.alerts.filter(a => a.status === "watch");
  const li = a => `<li><strong>${a.what}.</strong> Crew action: ${a.todo}</li>`;
  return `
    <p class="muted">${currentCrew} (${c.role}) · Mission day ${m.day}, ${m.phase} · ${MOCK.locations[m.location].label} · Ship time ${shipTime()}</p>
    <h4>Needs action</h4>${act.length ? `<ul>${act.map(li).join("")}</ul>` : "<p>None.</p>"}
    <h4>Watch</h4>${watch.length ? `<ul>${watch.map(li).join("")}</ul>` : "<p>None.</p>"}
    <h4>Key numbers</h4>
    <table>
      <tr><td>Heart rate</td><td>${c.vitals.hr} bpm (${c.vitals.source})</td><td>Temperature</td><td>${c.vitals.temp} °C</td></tr>
      <tr><td>Blood pressure</td><td>${c.vitals.bpSys}/${c.vitals.bpDia} mmHg</td><td>Sleep debt</td><td>${S.sleepDebt.toFixed(1)} h / 7 nights</td></tr>
      <tr><td>Reaction vs baseline</td><td>${S.reactionPct === null ? "—" : S.reactionPct + "%"}</td><td>Career dose</td><td>${S.dose.toFixed(1)} of 600 mSv</td></tr>
      <tr><td>Exercise (7 days)</td><td>${c.exercise.last7} sessions</td><td>Mood (self / crewmate)</td><td>${c.checkin.self.mood} / ${c.checkin.mate.mood}</td></tr>
    </table>
    <p class="muted small">Signal delay ${m.signalDelayMin} min. The crew has started the actions above and is not waiting for a reply. Prototype. Not a medical device. Simulated data.</p>
    <div id="reportSent"></div>`;
}

$("reportBtn").onclick = () => { $("reportBody").innerHTML = buildReport(); $("reportModal").showModal(); };
$("reportClose").onclick = () => $("reportModal").close();
$("reportSend").onclick = () => {
  sendToEarth(`${currentCrew}: health report`);
  const last = MOCK.earthLog[MOCK.earthLog.length - 1];
  $("reportSent").innerHTML = `<div class="notice">Sent at ${shipTime(last.sent)}. Arrives about ${shipTime(last.arrive)}. Earliest reply about ${shipTime(last.reply)}. Keep following the actions now.</div>`;
  renderEarthQueue();
};


// =========================================================================
// 6. ACTIONS — emergency
// =========================================================================
$("emergencyBtn").onclick = () => {
  renderForms();
  $("emergencyStatus").innerHTML = emergency.active ? `<div class="notice">Emergency is active for ${currentCrew}.</div>` : "";
  $("emergencyModal").showModal();
};
$("emergencyDeclare").onclick = () => {
  emergency.signs = {};
  document.querySelectorAll("[data-sign]").forEach(cb => { if (cb.checked) emergency.signs[cb.dataset.sign] = true; });
  emergency.active = true;
  sendToEarth(`${currentCrew}: MEDICAL EMERGENCY (top priority)`);
  const last = MOCK.earthLog[MOCK.earthLog.length - 1];
  $("emergencyStatus").innerHTML = `<div class="notice">Reported at top priority, ${shipTime(last.sent)}. Arrives about ${shipTime(last.arrive)}. Act now: oxygen mask, keep the person still.</div>`;
  renderAll();
};
$("emergencyClear").onclick = () => { emergency.active = false; emergency.signs = {}; renderForms(); renderAll(); $("emergencyModal").close(); };
$("emergencyClose").onclick = () => $("emergencyModal").close();


// =========================================================================
// 6. ACTIONS — forms and buttons
// =========================================================================
$("sidePanelClose").onclick = closeSidePanel;
document.querySelectorAll(".region").forEach(el => {
  el.addEventListener("click", () => openSidePanel(el.dataset.region));
  el.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSidePanel(el.dataset.region); }
  });
});

$("hoursAwake").oninput = () => {
  const v = parseFloat($("hoursAwake").value);
  if (!isNaN(v)) { MOCK.crew[currentCrew].sleep.hoursAwake = v; renderAll(); }
};

$("checkinSave").onclick = () => {
  const c = MOCK.crew[currentCrew];
  ["energy", "focus", "mood"].forEach(m => {
    c.checkin.self[m] = Number($("self-" + m).value);
    c.checkin.mate[m] = Number($("mate-" + m).value);
  });
  c.history.mood.push(Math.min(c.checkin.self.mood, c.checkin.mate.mood));
  c.history.mood = c.history.mood.slice(-7);
  tasksDone[currentCrew] = tasksDone[currentCrew] || {};
  if (!tasksDone[currentCrew].checkin) { c.points += 10; tasksDone[currentCrew].checkin = true; }
  renderAll();
};

$("exerciseAdd").onclick = () => {
  const c = MOCK.crew[currentCrew];
  if (c.exercise.last7 < 7) { c.exercise.last7++; c.points += 15; renderAll(); }
};
$("exerciseUndo").onclick = () => {
  const c = MOCK.crew[currentCrew];
  if (c.exercise.last7 > 0) { c.exercise.last7--; c.points = Math.max(0, c.points - 15); renderAll(); }
};
$("waterAdd").onclick = () => { const c = MOCK.crew[currentCrew]; c.water.glasses++; c.points += 2; renderAll(); };

$("markerSave").onclick = () => {
  const c = MOCK.crew[currentCrew];
  const d = parseFloat($("vitD").value), ca = parseFloat($("calcium").value);
  c.markers.vitD = isNaN(d) ? null : d;
  c.markers.calcium = isNaN(ca) ? null : ca;
  renderAll();
};

$("labSave").onclick = () => {
  const c = MOCK.crew[currentCrew];
  const entry = { day: MOCK.mission.day };
  let any = false;
  LABS.forEach(L => {
    const v = parseFloat($("lab-" + L.key).value);
    if (!isNaN(v)) { entry[L.key] = v; any = true; }
    $("lab-" + L.key).value = "";
  });
  if (any) { c.labs.push(entry); renderAll(); }
};

$("boneDay").oninput = renderAll;
$("boneSess").oninput = renderAll;
$("solarSlider").oninput = () => setSolarActivity(Number($("solarSlider").value));


// =========================================================================
// 6. ACTIONS — reaction test (1 minute, tap when the box turns purple)
// =========================================================================
const rt = { running: false, shownAt: null, times: [], lapses: 0, early: 0, timer: null, endTimer: null };

function rtSchedule() {
  rt.timer = setTimeout(() => {
    rt.shownAt = performance.now();
    $("reactionBox").classList.add("go");
    $("reactionBox").textContent = "NOW!";
    // No answer in 2 s counts as a lapse
    rt.timer = setTimeout(() => { if (rt.shownAt) { rt.lapses++; rtHide(); rtSchedule(); } }, 2000);
  }, 1000 + Math.random() * 3000);
}
function rtHide() {
  rt.shownAt = null;
  $("reactionBox").classList.remove("go");
  $("reactionBox").textContent = "Wait…";
}
function rtRespond() {
  if (!rt.running) return;
  if (rt.shownAt) {
    const ms = performance.now() - rt.shownAt;
    rt.times.push(ms);
    if (ms > 500) rt.lapses++;
    clearTimeout(rt.timer);
    rtHide();
    rtSchedule();
  } else {
    rt.early++;
    $("reactionBox").textContent = "Too early. Wait…";
  }
}
function rtStart() {
  if (rt.running) return;
  Object.assign(rt, { running: true, shownAt: null, times: [], lapses: 0, early: 0 });
  $("reactionBox").classList.add("running");
  rtHide();
  rtSchedule();
  rt.endTimer = setTimeout(rtFinish, 60000);
}
function rtFinish() {
  if (!rt.running) return;
  clearTimeout(rt.timer); clearTimeout(rt.endTimer);
  rt.running = false;
  $("reactionBox").classList.remove("running", "go");
  if (!rt.times.length) { $("reactionBox").textContent = "No answers recorded. Try again."; return; }
  const c = MOCK.crew[currentCrew];
  const avg = Math.round(rt.times.reduce((a, b) => a + b, 0) / rt.times.length);
  if (!c.reaction.baselineMs) c.reaction.baselineMs = avg;      // first test = baseline
  c.reaction.lastMs = avg;
  c.reaction.lapses = rt.lapses;
  tasksDone[currentCrew] = tasksDone[currentCrew] || {};
  if (!tasksDone[currentCrew].reaction) { c.points += 10; tasksDone[currentCrew].reaction = true; }
  $("reactionBox").textContent = `Done: ${avg} ms average, ${rt.times.length} answers, ${rt.early} too early`;
  renderAll();
}
$("reactionStart").onclick = rtStart;
$("reactionStop").onclick = rtFinish;
$("reactionBox").addEventListener("pointerdown", rtRespond);
document.addEventListener("keydown", e => {
  if (rt.running && e.code === "Space") { e.preventDefault(); rtRespond(); }
});


// =========================================================================
// 6. ACTIONS — simulated dosimeter: 1 second on screen = 1 hour of mission
// =========================================================================
setInterval(() => {
  const perHour = doseRatePerDay() / 24;
  const before = computeState(currentCrew).doseStatus;
  Object.values(MOCK.crew).forEach(c => c.radiation.accrued += perHour);   // whole crew, same place
  const S = computeState(currentCrew);
  if (S.doseStatus !== before) { renderAll(); return; }                    // crossed a threshold
  // Otherwise just update the numbers (so clicks and typing aren't interrupted)
  if ($("doseLive")) $("doseLive").textContent = S.dose.toFixed(2);
}, 1000);


// =========================================================================
// 7. SENSOR HOOKS — call these from Arduino / Web Serial code later.
// Example in the browser console:  applySensorReading({ heartRate: 96, temperature: 36.8 })
// =========================================================================
function applySensorReading({ heartRate, temperature }) {
  const c = MOCK.crew[currentCrew];
  if (heartRate !== undefined) { c.vitals.hr = Math.round(heartRate); c.history.hr = [...c.history.hr, c.vitals.hr].slice(-7); }
  if (temperature !== undefined) { c.vitals.temp = temperature; c.history.temp = [...c.history.temp, temperature].slice(-7); }
  c.vitals.source = "live";
  $("sensorBadge").classList.add("connected");
  $("sensorBadge").lastChild.textContent = "Live sensor: connected";
  renderAll();
}
// Marjona's knob (potentiometer): 0-100. 70 or more = solar particle event
function setSolarActivity(value) {
  MOCK.radiation.solarActivity = Math.max(0, Math.min(100, value));
  $("solarSlider").value = MOCK.radiation.solarActivity;
  renderAll();
}


// =========================================================================
// START
// =========================================================================
renderScience();
renderForms();
renderAll();
const startTab = location.hash.slice(1);
showTab($("tab-" + startTab) ? startTab : "overview");
