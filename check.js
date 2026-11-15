// =========================================================================
// Astrodoc — "Check how I feel" (check.html). A guided check, one step at a time:
//   1. WHERE     tap where you feel something on the body
//   2. SAFETY    emergency signs first
//   3. QUESTIONS one at a time, only for the places you chose
//   4. MEASURE   heart rate and temperature (Arduino sensor or typed)
//   5. MOOD      how is your inner orbit today? (mood.js)
//   6. RESULT    what it could be, why, what to do now, and your mood
// The rules below are TEAM PROPOSALS from NASA HRP research.
// The medical team must confirm them. A first indication, not a diagnosis.
// =========================================================================

if (!me) location.replace("index.html");          // the check is always about you
const C = MOCK.crew[me || "CDR"];


// =========================================================================
// RULES — places, emergency signs, questions, possible causes
// =========================================================================
const PLACES = {
  head:   "Head",       eyes: "Eyes or vision", neck: "Neck",  chest: "Chest",
  belly:  "Belly or side", back: "Back",         arms: "Arms",  legs: "Legs",
  skin:   "Skin",       general: "Whole body: tired, low or unwell"
};

// Emergency signs, asked first, ONLY for the places you chose (choose the head: only head signs).
// Any one = possible emergency.
const RED_FLAGS = [
  { t: "A sudden, very bad headache, the worst you've ever had",                 places: ["head"] },
  { t: "Weakness or numbness on one side of the face or body",                   places: ["head", "arms", "legs"] },
  { t: "Sudden trouble speaking or understanding",                               places: ["head"] },
  { t: "Confused, or very hard to stay awake",                                   places: ["head", "general"] },
  { t: "Fainted, or nearly fainted",                                             places: ["head", "chest", "general"] },
  { t: "Sudden loss of sight, or a dark curtain over part of what you see",      places: ["eyes"] },
  { t: "Sudden double vision",                                                   places: ["eyes"] },
  { t: "Hard to breathe",                                                        places: ["neck", "chest", "general"] },
  { t: "Neck swelling that makes it hard to swallow",                            places: ["neck"] },
  { t: "Stiff neck together with fever and a strong headache",                   places: ["neck"] },
  { t: "Chest pain or pressure, maybe spreading to the arm, jaw or back",        places: ["chest", "arms"] },
  { t: "Coughing up blood",                                                      places: ["chest"] },
  { t: "Heart pounding or racing, with dizziness",                               places: ["chest"] },
  { t: "Very bad pain in the side, belly or back, coming in waves",              places: ["belly", "back"] },
  { t: "Vomiting blood, or black stools",                                        places: ["belly"] },
  { t: "Vomiting again and again within hours of a solar storm",                 places: ["belly", "general"] },
  { t: "Belly hard and swollen, very painful to touch",                          places: ["belly"] },
  { t: "Numbness between the legs, or can't control bladder or bowels",          places: ["back"] },
  { t: "An arm or leg suddenly cold, pale or blue",                              places: ["arms", "legs"] },
  { t: "One leg suddenly swollen, and you're also short of breath",              places: ["legs"] },
  { t: "A large blistering burn, or a burn on the face or hands",                places: ["skin"] },
  { t: "Swollen lips, tongue or face, with a rash",                              places: ["skin"] },
  { t: "Bleeding that won't stop with firm pressure",                            places: ["skin", "arms", "legs"] },
  { t: "Very high fever, 39 °C or more, with shivering",                         places: ["general"] }
];
const flagsFor = places => RED_FLAGS.map((f, i) => ({ ...f, i })).filter(f => f.places.some(p => places.has(p)));

// Questions, ONLY for the places you tapped, in the order you chose them.
// "adds" = points per possible cause. Radiation is asked wherever it can show.
const QUESTIONS = [
  // Whole body
  { place: "general", q: "Do you feel more tired than usual, or find it hard to focus?", adds: { fatigue: 3 }, said: "You feel more tired than usual" },
  { place: "general", q: "Have you slept badly for several nights in a row?",             adds: { fatigue: 2 }, said: "You've slept badly for several nights" },
  { place: "general", q: "Have you felt low, lonely or irritable for a few days?",       adds: { mood: 3 },    said: "You've felt low or lonely for days" },
  { place: "general", q: "Do you feel hot, shivery or generally unwell?",                 adds: { fever: 3 },   said: "You feel hot or unwell" },
  { place: "general", q: "Did you feel sick and very tired within a day of a solar storm?", adds: { radiation: 3 }, said: "Sick and tired after a solar storm" },
  { place: "general", q: "Were you outside the shielded area during a recent solar storm?", adds: { radiation: 2 }, said: "Outside the shield during a solar storm" },
  // Head
  { place: "head",    q: "Do you have a headache?",                                       adds: { fatigue: 1, sans: 1, fever: 1 }, said: "You have a headache" },
  { place: "head",    q: "Is it a pressure feeling behind the eyes, or worse when lying down?", adds: { sans: 2 }, said: "Pressure behind the eyes" },
  { place: "head",    q: "Is it worse after short sleep or a long work shift?",           adds: { fatigue: 2 }, said: "Worse after short sleep or a long shift" },
  { place: "head",    q: "Did the headache start within hours of a solar storm?",         adds: { radiation: 2 }, said: "Headache started after a solar storm" },
  { place: "head",    q: "Do you also have a sore throat, or feel hot?",                  adds: { fever: 2 },   said: "Sore throat or feeling hot" },
  // Eyes
  { place: "eyes",    q: "Has your near vision become blurry over the last days or weeks?", adds: { sans: 3 }, said: "Near vision is blurrier" },
  { place: "eyes",    q: "Do straight lines look bent, or do you see a shadow or blind spot?", adds: { sans: 2 }, said: "Lines look bent, or a shadow in your vision" },
  { place: "eyes",    q: "Do you see brief flashes of light, even with your eyes closed?", adds: { radiation: 1 }, said: "Light flashes: cosmic rays passing through the eye" },
  { place: "eyes",    q: "Are your eyes tired and dry after a long day of screen work?",  adds: { fatigue: 1 }, said: "Eyes tired after screen work" },
  // Neck
  { place: "neck",    q: "Is one side of your neck swollen, tender or painful?",          adds: { clot: 3 },    said: "One side of your neck hurts" },
  { place: "neck",    q: "Did it start on its own, without a strain or awkward sleep?",   adds: { clot: 1 },    said: "It started without a strain" },
  { place: "neck",    q: "Is your neck stiff after sleeping strapped in, or after a workout?", adds: { strain: 3 }, said: "Stiff after sleeping or a workout" },
  { place: "neck",    q: "Is your throat sore, or are the glands under your jaw swollen?", adds: { fever: 3 }, said: "Sore throat or swollen glands" },
  // Chest
  { place: "chest",   q: "Do you get out of breath more easily than usual?",              adds: { clot: 2, fatigue: 1 }, said: "You get out of breath easily" },
  { place: "chest",   q: "Is the pain sharp, and worse when you breathe in?",             adds: { clot: 2 },    said: "Sharp pain when breathing in" },
  { place: "chest",   q: "Does your heart race even when you rest?",                       adds: { fatigue: 1, fever: 1 }, said: "Your heart races at rest" },
  { place: "chest",   q: "Do you have a cough, or feel feverish?",                         adds: { fever: 3 },   said: "A cough or fever" },
  // Belly or side
  { place: "belly",   q: "Is the pain on one side, and does it come in waves?",            adds: { kidney: 3 },  said: "Pain on one side, in waves" },
  { place: "belly",   q: "Is your urine darker than usual, or pink or red?",               adds: { kidney: 3 },  said: "Dark or reddish urine" },
  { place: "belly",   q: "Have you drunk less water than usual today?",                    adds: { kidney: 2 },  said: "You drank less water" },
  { place: "belly",   q: "Do you feel sick, or have you vomited?",                         adds: { radiation: 1, fever: 1, kidney: 1 }, said: "You feel sick" },
  { place: "belly",   q: "Did the sickness start within a few hours of a solar storm?",    adds: { radiation: 3 }, said: "Sickness started hours after a solar storm" },
  // Back
  { place: "back",    q: "Is it a dull ache in the lower back?",                           adds: { strain: 3 },  said: "Dull ache in the lower back" },
  { place: "back",    q: "Is it worse when you bend or twist?",                            adds: { strain: 2 },  said: "Worse when bending or twisting" },
  { place: "back",    q: "Did it start after exercise, lifting, or many hours strapped in?", adds: { strain: 2 }, said: "Started after exercise or long hours strapped in" },
  { place: "back",    q: "Does the pain spread toward your side or groin?",                adds: { kidney: 3 },  said: "Pain spreads to the side or groin" },
  // Arms
  { place: "arms",    q: "Do your arm muscles or joints ache, especially after exercise?", adds: { strain: 3 },  said: "Arm muscles or joints ache" },
  { place: "arms",    q: "Is one arm swollen, warm or red?",                               adds: { clot: 3 },    said: "One arm is swollen, warm or red" },
  { place: "arms",    q: "Do you have tingling or pins and needles in your hands?",        adds: { strain: 1 },  said: "Tingling in your hands" },
  // Legs
  { place: "legs",    q: "Is one leg swollen, warm or painful, especially the calf?",      adds: { clot: 3 },    said: "One leg is swollen or painful" },
  { place: "legs",    q: "Have your legs stayed still for many hours, strapped in or at a workstation?", adds: { clot: 1 }, said: "Legs still for many hours" },
  { place: "legs",    q: "Do your leg muscles or joints ache after exercise?",             adds: { strain: 2 },  said: "Leg muscles or joints ache" },
  { place: "legs",    q: "Do you get cramps, especially at night?",                        adds: { strain: 1, kidney: 1 }, said: "Leg cramps at night" },
  // Skin
  { place: "skin",    q: "Is your skin red or burning, like sunburn?",                     adds: { radiation: 3 }, said: "Skin red or burning" },
  { place: "skin",    q: "Were you outside the shielded area during recent solar activity?", adds: { radiation: 2 }, said: "Outside the shield during solar activity" },
  { place: "skin",    q: "Is your hair coming out more than usual?",                       adds: { radiation: 2 }, said: "Hair coming out more than usual" },
  { place: "skin",    q: "Is there a rash, together with fever or feeling unwell?",        adds: { fever: 3 },   said: "A rash with fever" },
  { place: "skin",    q: "Is a cut or scrape healing slowly, or getting red and warm?",    adds: { fever: 2 },   said: "A wound healing slowly or getting red" }
];

// Possible causes, in plain words, each with what to do now (team research)
const CAUSES = {
  clot: { name: "Possible blood clot", level: "act",
    why: "Without gravity, blood moves differently. On the ISS, 6 of 11 crew members had slow or reversed flow in a neck vein, and one had a clot.",
    todo: ["Stop work and stay still.", "Follow the blood clot checklist on the dashboard.", "Send a report to the flight surgeon now."],
    todoWatch: ["Check the neck or leg veins with the ultrasound today, with a crewmate.", "Drink water and move your legs.", "Send a report to the flight surgeon."] },
  fatigue: { name: "Tiredness from sleep loss", level: "watch",
    why: "Sleep debt builds up night after night, and tired people rarely notice how impaired they are.",
    todo: ["Take a short nap now.", "Ask for a lighter workload today.", "Bright light after waking, dim light before sleep."] },
  mood: { name: "Low mood from isolation and confinement", level: "watch",
    why: "Small spaces, little contact with home and long missions raise the risk of low mood. It is common, and it helps to act early.",
    todo: ["Talk with a crewmate today.", "Do something meaningful, like caring for the plants.", "Talk to Astrodoc any time."] },
  kidney: { name: "Possible kidney stone", level: "watch",
    why: "In space, bones release calcium. With too little water, it can form stones in the kidneys.",
    todo: ["Drink a glass of water now, and keep drinking.", "If the pain becomes very bad, press Emergency."] },
  strain: { name: "Back, muscle or joint strain", level: "watch",
    why: "Without gravity the spine stretches and back muscles weaken, so back pain is common in space. Exercise protects bones and muscles.",
    todo: ["Gentle stretching: pull your knees to your chest.", "Keep your resistance exercise sessions.", "Check again tomorrow."] },
  radiation: { name: "Radiation effects", level: "watch",
    why: "Space radiation adds up over the whole mission, and a solar storm can add a large dose in hours. A big dose shows as nausea, tiredness, skin burns or hair loss; over years it raises cancer risk. NASA's career limit is 600 mSv.",
    todo: ["Go to the shielded area by the water storage, and stay until the all-clear.", "Read your dosimeter and log the dose.", "Send a report to the flight surgeon."],
    todoWatch: ["Read your dosimeter and log the dose.", "Spend sleep and rest time in the best-shielded area.", "Review your exposure plan with the flight surgeon."] },
  fever: { name: "Infection or fever", level: "watch",
    why: "The immune system changes in space, so infections can start more easily.",
    todo: ["Rest and drink water.", "Measure your temperature again in 1 hour.", "38 °C or more: send a report."] },
  sans: { name: "Eye and vision changes (SANS)", level: "watch",
    why: "In space, fluid moves toward the head. On long missions this can press on the eyes and change vision.",
    todo: ["Note when the change started.", "Do an eye check with the onboard kit.", "Send a report to the flight surgeon."] }
};


// =========================================================================
// STATE
// =========================================================================
const st = {
  step: "where",            // where → safety → questions → measure → mood → result (or emergency)
  places: new Set(),
  flags: new Set(),
  qs: [], qi: 0, answers: {},   // answers[index in QUESTIONS] = "yes" | "no" | "unsure"
  hr: C.vitals.hr, temp: C.vitals.temp
};
const STEPS = ["where", "safety", "questions", "measure", "mood", "result"];
function go(step) {
  st.step = step;
  draw();
  $("stage").focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
function progress() {
  const i = Math.max(0, STEPS.indexOf(st.step === "emergency" ? "safety" : st.step));   // emergency keeps the bar where it was
  let frac = i / (STEPS.length - 1);
  if (st.step === "questions" && st.qs.length) frac = (2 + st.qi / st.qs.length) / (STEPS.length - 1);
  $("progressBar").style.width = `${Math.round(frac * 100)}%`;
  document.body.classList.toggle("k-is-emergency", st.step === "emergency");
  $("stepLabel").textContent = st.step === "emergency" ? "Possible emergency"
    : st.step === "questions" ? `Step 3 of ${STEPS.length} · Question ${st.qi + 1} of ${st.qs.length}`
    : `Step ${i + 1} of ${STEPS.length}`;
}
function draw() {
  progress();
  ({ where: drawWhere, safety: drawSafety, questions: drawQuestion, measure: drawMeasure, mood: drawMood, result: drawResult, emergency: drawEmergency })[st.step]();
}


// =========================================================================
// 1. WHERE — the body figure (front). Tap to light a place up.
// =========================================================================
const BODY = `
<svg class="body" viewBox="0 0 220 420" role="group" aria-label="Body. Tap where you feel something.">
  <g class="region" data-place="head" tabindex="0" role="checkbox" aria-label="Head"><ellipse cx="110" cy="44" rx="30" ry="34"/></g>
  <g class="region" data-place="neck" tabindex="0" role="checkbox" aria-label="Neck"><rect x="97" y="76" width="26" height="20" rx="8"/></g>
  <g class="region" data-place="chest" tabindex="0" role="checkbox" aria-label="Chest"><path d="M64 104 Q110 90 156 104 L152 178 Q110 186 68 178 Z"/></g>
  <g class="region" data-place="belly" tabindex="0" role="checkbox" aria-label="Belly or side"><path d="M68 184 Q110 192 152 184 L150 246 Q110 258 70 246 Z"/></g>
  <g class="region" data-place="arms" tabindex="0" role="checkbox" aria-label="Arms">
    <path d="M58 106 Q40 112 36 140 L26 232 Q24 246 34 248 Q44 249 46 236 L58 156 Z"/>
    <path d="M162 106 Q180 112 184 140 L194 232 Q196 246 186 248 Q176 249 174 236 L162 156 Z"/></g>
  <g class="region" data-place="legs" tabindex="0" role="checkbox" aria-label="Legs">
    <path d="M72 254 Q90 262 106 260 L102 392 Q100 406 88 406 Q76 406 76 392 Z"/>
    <path d="M148 254 Q130 262 114 260 L118 392 Q120 406 132 406 Q144 406 144 392 Z"/></g>
</svg>`;
const EXTRA = ["eyes", "back", "skin", "general"];
// With the 3D astronaut, every place is also a button (keyboard, screen readers, gloves)
const ALL_PLACES = ["head", "eyes", "neck", "chest", "belly", "back", "arms", "legs", "skin", "general"];

// 3D astronaut (assets/js/body3d.js + assets/models/astronaut.glb). Made once, reused.
// If WebGL or the model can't load (for example when the page is opened as a file),
// the flat body figure is used instead.
let body3d = null, body3dHost = null, body3dFailed = !window.Body3D;
function getBody3d() {
  if (body3dFailed) return null;
  if (body3d) return body3d;
  try {
    body3dHost = document.createElement("div");
    body3dHost.className = "b3d";
    body3dHost.innerHTML = `<span class="b3d-loading">Loading the astronaut…</span>`;
    body3d = window.Body3D.mount(body3dHost, {
      url: "assets/models/astronaut.glb",
      label: p => PLACES[p],
      onToggle: (p, on) => { on ? st.places.add(p) : st.places.delete(p); syncWhere(); }
    });
    body3d.ready.then(() => { body3dHost.classList.add("loaded"); st.places.forEach(p => body3d.set(p, true)); })
      .catch(() => { body3dFailed = true; body3d = null; if (st.step === "where") drawWhere(); });
    return body3d;
  } catch { body3dFailed = true; return null; }
}

function drawWhere() {
  const b3 = getBody3d();
  const chips = b3 ? ALL_PLACES : EXTRA;
  $("stage").innerHTML = `
    <h1>Where do you feel something?</h1>
    <p class="k-lead">${b3 ? "Tap the astronaut where you feel something, or choose from the list. Drag to turn them around." : "Tap one or more places. They light up."} Nothing hurts but you don't feel right? Choose “Whole body”.</p>
    <div class="k-where ${b3 ? "has-3d" : ""}">
      ${b3 ? `<div class="b3d-slot" id="b3dSlot"><button type="button" class="b3d-turn" id="turnBtn">Turn around</button></div>` : BODY}
      <div class="k-side">
        <div class="k-chips ${b3 ? "grid" : ""}" role="group" aria-label="${b3 ? "Places" : "More places"}">
          ${chips.map(p => `<button type="button" class="k-chip" data-place="${p}" aria-pressed="false">${PLACES[p]}</button>`).join("")}
        </div>
        <p class="k-picked" id="picked" aria-live="polite"></p>
      </div>
    </div>
    <div class="k-actions"><span></span><button class="primary-btn" id="nextBtn" disabled>Next</button></div>`;
  if (b3) { $("b3dSlot").prepend(body3dHost); $("turnBtn").onclick = () => body3d.turn(); }
  const toggle = p => {
    const on = !st.places.has(p);
    on ? st.places.add(p) : st.places.delete(p);
    if (body3d) body3d.set(p, on);
    syncWhere();
  };
  document.querySelectorAll("[data-place]").forEach(el => {
    el.addEventListener("click", () => toggle(el.dataset.place));
    el.addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && el.tagName !== "BUTTON") { e.preventDefault(); toggle(el.dataset.place); } });
  });
  $("nextBtn").onclick = () => go("safety");
  syncWhere();
}
function syncWhere() {
  if (!$("picked")) return;
  document.querySelectorAll("[data-place]").forEach(el => {
    const on = st.places.has(el.dataset.place);
    el.classList.toggle("on", on);
    el.setAttribute(el.tagName === "BUTTON" ? "aria-pressed" : "aria-checked", String(on));
  });
  $("picked").textContent = st.places.size ? "Chosen: " + [...st.places].map(p => PLACES[p]).join(", ") : "Nothing chosen yet.";
  $("nextBtn").disabled = !st.places.size;
}


// =========================================================================
// 2. SAFETY — emergency signs before anything else
// =========================================================================
function drawSafety() {
  const shown = flagsFor(st.places);
  [...st.flags].forEach(i => { if (!shown.some(f => f.i === i)) st.flags.delete(i); });   // signs for places no longer chosen
  const names = [...st.places].map(p => PLACES[p].split(/:| or /)[0].toLowerCase()).join(", ").replace(/, ([^,]*)$/, " and $1");
  $("stage").innerHTML = `
    <h1>First, any of these right now?</h1>
    <p class="k-lead">For your ${names}, these can be an emergency. Tick every one you have.</p>
    <ul class="k-flags">${shown.map(f => `
      <li><label><input type="checkbox" data-flag="${f.i}" ${st.flags.has(f.i) ? "checked" : ""}><span>${f.t}</span></label></li>`).join("")}</ul>
    <div class="k-actions">
      <button class="soft-btn" id="backBtn">Back</button>
      <button class="primary-btn" id="nextBtn"></button>
    </div>`;
  const sync = () => { $("nextBtn").textContent = st.flags.size ? "I have this: get help" : "None of these: continue"; $("nextBtn").className = st.flags.size ? "danger-btn" : "primary-btn"; };
  document.querySelectorAll("[data-flag]").forEach(cb => cb.onchange = () => { cb.checked ? st.flags.add(+cb.dataset.flag) : st.flags.delete(+cb.dataset.flag); sync(); });
  $("backBtn").onclick = () => go("where");
  $("nextBtn").onclick = () => {
    if (st.flags.size) return go("emergency");
    const order = [...st.places];                                            // the places in the order you chose them
    st.qs = QUESTIONS.map((q, i) => ({ ...q, i })).filter(q => st.places.has(q.place))
      .sort((a, b) => order.indexOf(a.place) - order.indexOf(b.place) || a.i - b.i);
    st.qi = 0;
    go(st.qs.length ? "questions" : "measure");
  };
  sync();
}

function drawEmergency() {
  const flags = [...st.flags].map(i => RED_FLAGS[i].t);
  $("stage").innerHTML = `
    <div class="k-emergency">
      <h1>This may be an emergency</h1>
      <p class="k-lead">You said: ${flags.map(f => f.toLowerCase()).join(", ")}.</p>
      <ol class="k-do">
        <li>Stop what you are doing. Sit or lie still.</li>
        <li>Call a crewmate to you now.</li>
        <li>Hard to breathe: put on the oxygen mask.</li>
      </ol>
      <div class="k-actions">
        <button class="soft-btn" id="backBtn">Back</button>
        <button class="danger-btn" id="declareBtn">Declare emergency and report</button>
      </div>
      <p class="k-note" id="emNote" aria-live="polite"></p>
    </div>`;
  $("backBtn").onclick = () => go("safety");
  $("declareBtn").onclick = () => {
    const last = mutate(() => {
      currentCrew = me; emergency.active = true;
      sendToEarth(`${me}: MEDICAL EMERGENCY (top priority): ${flags.join(", ")}`);
      return MOCK.earthLog[MOCK.earthLog.length - 1];
    });
    $("declareBtn").disabled = true;
    $("emNote").innerHTML = last.queued
      ? `Declared. The Earth link is down, so the report goes out the moment it returns. Your crew is your help now: keep following the steps. <a href="index.html">Open the dashboard</a>`
      : `Declared. Report sent ${time(last.sent)}, reply ~${time(last.reply)}. Keep following the steps. <a href="index.html">Open the dashboard</a>`;
  };
}


// =========================================================================
// 3. QUESTIONS — one at a time. Y / N / U keys work too.
// =========================================================================
function drawQuestion() {
  const q = st.qs[st.qi], a = st.answers[q.i];
  $("stage").innerHTML = `
    <p class="k-place">${PLACES[q.place]}</p>
    <h1>${q.q}</h1>
    <div class="k-answers" role="group" aria-label="Answer">
      ${[["yes", "Yes", "Y"], ["no", "No", "N"], ["unsure", "Not sure", "U"]].map(([v, t, k]) =>
        `<button type="button" class="k-answer ${a === v ? "on" : ""}" data-a="${v}" aria-pressed="${a === v}"><kbd>${k}</kbd>${t}</button>`).join("")}
    </div>
    <div class="k-actions"><button class="soft-btn" id="backBtn">Back</button><span class="k-hint">Keys: Y, N, U</span></div>`;
  document.querySelectorAll("[data-a]").forEach(b => b.onclick = () => answer(b.dataset.a));
  $("backBtn").onclick = () => { if (st.qi > 0) { st.qi--; draw(); $("stage").focus(); } else go("safety"); };
}
function answer(v) {
  st.answers[st.qs[st.qi].i] = v;
  if (st.qi < st.qs.length - 1) { st.qi++; draw(); $("stage").focus(); } else go("measure");
}
document.addEventListener("keydown", e => {
  if (st.step !== "questions" || e.target.tagName === "INPUT" || e.metaKey || e.ctrlKey) return;
  const v = { y: "yes", n: "no", u: "unsure" }[e.key.toLowerCase()];
  if (v) { e.preventDefault(); answer(v); }
});


// =========================================================================
// 4. MEASURE — the Arduino sensor (or type the numbers)
// =========================================================================
function drawMeasure() {
  const live = C.vitals.source === "live";
  $("stage").innerHTML = `
    <h1>Quick measurement</h1>
    <p class="k-lead">Put your finger on the sensor for 30 seconds. ${live ? "The sensor reading is filled in." : "No live sensor right now: type the numbers, or keep the last reading."}</p>
    <div class="k-measure">
      <label class="field"><span>Heart rate at rest</span>
        <span class="input-unit"><input type="number" id="mHr" min="30" max="220" inputmode="numeric" value="${st.hr}"><em>bpm</em></span></label>
      <label class="field"><span>Temperature</span>
        <span class="input-unit"><input type="number" id="mTemp" min="34" max="42" step="0.1" inputmode="decimal" value="${st.temp}"><em>°C</em></span></label>
    </div>
    ${radiationPanel(false)}
    <div class="k-actions">
      <button class="soft-btn" id="backBtn">Back</button>
      <button class="primary-btn" id="nextBtn">See my result</button>
    </div>`;
  $("backBtn").onclick = () => { if (st.qs.length) { st.qi = st.qs.length - 1; go("questions"); } else go("safety"); };
  $("nextBtn").onclick = () => {
    const hr = parseFloat($("mHr").value), temp = parseFloat($("mTemp").value);
    if (hr >= 30 && hr <= 220) st.hr = Math.round(hr);
    if (temp >= 34 && temp <= 42) st.temp = temp;
    mutate(() => { const c = MOCK.crew[me]; c.vitals.hr = st.hr; c.vitals.temp = st.temp; autoReport(me); });
    go("mood");
  };
}
// The Arduino code can call this while the check is open
function applySensorReading({ heartRate, temperature }) {
  if (!isNaN(heartRate)) st.hr = Math.round(heartRate);
  if (!isNaN(temperature)) st.temp = temperature;
  if (st.step === "measure") { $("mHr").value = st.hr; $("mTemp").value = st.temp; }
}


// =========================================================================
// 5. RESULT — answers + your stored readings → likely causes
// =========================================================================
function assessCheck() {
  const score = {}, ev = {};
  const add = (cause, pts, why) => { score[cause] = (score[cause] || 0) + pts; (ev[cause] = ev[cause] || []).push(why); };
  // What you said
  Object.entries(st.answers).forEach(([i, a]) => {
    const q = QUESTIONS[i];
    const k = a === "yes" ? 1 : a === "unsure" ? 0.5 : 0;
    if (k) Object.entries(q.adds).forEach(([cause, pts]) => add(cause, pts * k, (a === "unsure" ? "Maybe: " : "") + q.said));
  });
  // What the readings already show
  const S = check(me);
  if (S.clotPattern) add("clot", 4, "Blood test: the clot pattern");
  else if (S.labTrend.includes("D-dimer")) add("clot", 2, "Blood test: D-dimer rising");
  if (S.tired) add("fatigue", 3, `Sleep ${S.lastNight} h, slower reactions, heart rate ${st.hr}`);
  else if (bad(S.sleep)) add("fatigue", 2, `Only ${S.lastNight} h of sleep last night`);
  if (st.hr > 100 && !S.tired) add("fatigue", 1, `Heart rate ${st.hr} at rest`);
  // The mood check-in (step 5) is saved as your mood, so it counts here
  const picked = typeof MOODS !== "undefined" && MOODS.find(m => m.v === mood.picked);
  if (bad(S.mood)) add("mood", S.mood === "act" ? 3 : 2, picked && picked.v === S.moodValue ? `You feel “${picked.name}” (${picked.v} of 5)` : `Mood ${S.moodValue} of 5`);
  if (S.biggestGap.status !== "normal") add("mood", 1, "Your crewmate sees you differently");
  if (bad(S.water)) add("kidney", 1, `Only ${C.water.glasses} of ${C.water.goal} glasses of water`);
  if (S.storm) add("radiation", 3, "Solar storm right now");
  // The dose so far counts too: from 300 mSv it is one to watch, from 480 it needs care
  if (S.dose >= 480) add("radiation", 2, `Career dose ${Math.round(S.dose)} of 600 mSv`);
  else if (S.dose >= 300) add("radiation", 1, `Career dose ${Math.round(S.dose)} of 600 mSv`);
  const tStatus = T.temperature(st.temp);
  if (bad(tStatus)) add("fever", tStatus === "act" ? 4 : 2, `Temperature ${st.temp} °C`);
  if (bad(S.exercise)) add("strain", 1, `${C.exercise} of 6 exercise sessions this week`);

  return Object.entries(score).filter(([, s]) => s >= 3).sort((a, b) => b[1] - a[1])
    .map(([key, s]) => {
      let level = CAUSES[key].level;
      if (key === "clot" && s < 5) level = "watch";                 // only an answer, no blood-test evidence
      if (key === "fatigue" && S.tired) level = "act";
      if (key === "fever" && tStatus === "act") level = "act";
      if (key === "radiation" && S.storm) level = "act";
      if (key === "mood" && S.mood === "act") level = "act";      // same as the dashboard: mood 1–2 needs care
      const C0 = CAUSES[key];
      return { ...C0, todo: level === "watch" && C0.todoWatch ? C0.todoWatch : C0.todo, key, level, evidence: ev[key] };
    })
    .sort((a, b) => (RANK[b.level] - RANK[a.level]) || ((CAUSE_ORDER[a.key] ?? 99) - (CAUSE_ORDER[b.key] ?? 99)))
    .slice(0, 3);
}

// Same level: the body comes first (a clot outranks low mood)
const CAUSE_ORDER = { clot: 0, radiation: 1, fever: 2, sans: 3, kidney: 4, fatigue: 5, strain: 6, mood: 7 };

function causeCard(c, n, open) {
  const inner = `
        <p class="k-why">${c.why}</p>
        <div class="k-cols">
          <div><h3>Do now</h3><ol class="k-do">${c.todo.map(t => `<li>${t}</li>`).join("")}</ol></div>
          <div><h3>Because</h3><ul class="k-ev">${c.evidence.map(e => `<li>${e}</li>`).join("")}</ul></div>
        </div>`;
  return open
    ? `<article class="k-cause ${c.level}">
        <header><span class="k-rank">Most likely</span>${badge(c.level)}</header>
        <h2>${c.name}</h2>${inner}
      </article>`
    : `<details class="k-cause k-more ${c.level}">
        <summary><span class="k-rank">Also possible</span><span class="k-more-name">${c.name}</span>${badge(c.level)}</summary>${inner}
      </details>`;
}

function drawResult() {
  const list = assessCheck();
  const top = list[0];
  const overall = list.length ? worst(...list.map(c => c.level)) : "normal";
  $("stage").innerHTML = `
    <h1>${list.length ? "What it could be" : "Nothing worrying found"}</h1>
    <p class="k-lead">${list.length
      ? `A first indication from your answers and your latest readings. ${overall === "act" ? "Do the first steps now." : "No rush, but act today."}`
      : "Your answers and readings look fine. If it doesn't get better, check again tomorrow or talk to Astrodoc."}</p>
    ${list.map((c, n) => causeCard(c, n, n === 0)).join("")}
    ${radiationPanel(true)}
    <div class="k-final">
      <button class="primary-btn" id="reportBtn">Send this to the flight surgeon</button>
      <a class="text-btn" href="index.html">Back to my dashboard</a>
      <button class="text-btn" id="againBtn">Start again</button>
    </div>
    <p class="k-note" id="reportNote" aria-live="polite"></p>
    ${moodResult()}
`;
  bindMoodResult();
  $("reportBtn").onclick = () => {
    const summary = (list.length ? list.map(c => c.name).join("; ") : "nothing worrying") + (mood.picked ? `; mood ${mood.picked} of 5` : "");
    const last = mutate(() => { sendToEarth(`${me}: self-check: ${summary} (places: ${[...st.places].map(p => PLACES[p]).join(", ")})`); return MOCK.earthLog[MOCK.earthLog.length - 1]; });
    $("reportBtn").disabled = true;
    $("reportNote").textContent = last.queued
      ? "Saved. The Earth link is down, so it goes out by itself when the link returns. Follow the steps above."
      : `Sent ${time(last.sent)}. Earliest reply ~${time(last.reply)}. Don't wait for it: follow the steps above.`;
  };
  $("againBtn").onclick = () => { if (body3d) st.places.forEach(p => body3d.set(p, false)); st.places.clear(); st.flags.clear(); st.answers = {}; st.qs = []; st.qi = 0; mood.picked = null; go("where"); };
}


// =========================================================================
// RADIATION: the dosimeter on the measure step, and "Your radiation" on every result
// =========================================================================
function radiationPanel(full) {
  const S = check(me), lim = MOCK.radiation.careerLimit, rate = doseRatePerDay();
  const pct = Math.min(100, S.dose / lim * 100), lvl = S.radiation;
  const where = (MOCK.locations[MOCK.mission.location] || {}).label || "the spacecraft";
  const line = S.storm ? "A solar storm is on right now: radiation is rising fast. Go to the shielded area and stay until the all-clear."
    : lvl === "act" ? "You are close to the career limit. Every extra day counts: the flight surgeon should review your exposure plan now."
    : lvl === "watch" ? "You are past half of the career limit. Rest and sleep in the best-shielded area, and keep logging your dosimeter."
    : "Well inside the limit. Keep your dosimeter on you.";
  return `
    <section class="k-rad ${full ? "full" : ""}" aria-labelledby="radTitle">
      <div class="k-rad-head">
        <h2 id="radTitle">${full ? "Your radiation" : "Dosimeter"}</h2>
        ${badge(lvl)}
      </div>
      <p class="k-rad-num"><b>${Math.round(S.dose)}</b> of ${lim} mSv career limit <span>· ${Math.round(pct)}%</span></p>
      <div class="k-rad-bar" role="img" aria-label="${Math.round(pct)} percent of the career limit"><span style="width:${pct.toFixed(1)}%"></span><i style="left:50%"></i><i style="left:80%"></i></div>
      <p class="k-rad-line">${line}</p>
      ${full ? `<dl class="k-rad-facts">
        <div><dt>Today, in ${where.toLowerCase()}</dt><dd>${rate.toFixed(1)} mSv a day${S.storm ? " (storm)" : ""}</dd></div>
        ${S.limitDay != null ? `<div><dt>At this rate you pass the limit</dt><dd>on day ${S.limitDay}</dd></div>` : ""}
        ${S.doseAtEnd != null ? `<div><dt>By the end of the mission</dt><dd>about ${Math.round(S.doseAtEnd)} mSv</dd></div>` : ""}
      </dl>
      <p class="k-rad-src">Rates from NASA's Curiosity rover; limit from NASA-STD-3001. <a href="index.html#doseCard">See the whole mission</a></p>` : ""}
    </section>`;
}


// START (check.html#place=neck: coming from the dashboard's body map)
const fromPlace = (location.hash.match(/place=(\w+)/) || [])[1];
if (fromPlace && PLACES[fromPlace]) st.places.add(fromPlace);
if (me) draw();
