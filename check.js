// =========================================================================
// Astrodoc — "Check how I feel" (check.html). A guided check, one step at a time:
//   1. WHERE     tap where you feel something on the body
//   2. SAFETY    emergency signs first
//   3. QUESTIONS one at a time, only for the places you chose
//   4. MEASURE   heart rate and temperature (Arduino sensor or typed)
//   5. RESULT    what it could be, why, and what to do now
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

// Any one of these = possible emergency. Checked before anything else.
const RED_FLAGS = [
  "Hard to breathe",
  "Chest pain or pressure",
  "Weakness or numbness on one side of the body",
  "Sudden trouble speaking or seeing",
  "Fainted, or nearly fainted",
  "Very bad pain in the side or back, coming in waves",
  "Coughing up blood"
];

// Questions, asked only for the places you tapped. "adds" = points per possible cause.
const QUESTIONS = [
  { place: "general", q: "Do you feel more tired than usual, or find it hard to focus?", adds: { fatigue: 3 }, said: "You feel more tired than usual" },
  { place: "general", q: "Have you felt low, lonely or irritable for a few days?",       adds: { mood: 3 },    said: "You've felt low or lonely for days" },
  { place: "general", q: "Do you feel hot, shivery or generally unwell?",                 adds: { fever: 3 },   said: "You feel hot or unwell" },
  { place: "head",    q: "Do you have a headache?",                                       adds: { fatigue: 1, sans: 1, fever: 1 }, said: "You have a headache" },
  { place: "head",    q: "Is it a pressure feeling behind the eyes, or worse when lying down?", adds: { sans: 2 }, said: "Pressure behind the eyes" },
  { place: "eyes",    q: "Has your near vision become blurry over the last days or weeks?", adds: { sans: 3 }, said: "Near vision is blurrier" },
  { place: "neck",    q: "Is one side of your neck swollen, tender or painful?",          adds: { clot: 3 },    said: "One side of your neck hurts" },
  { place: "chest",   q: "Do you get out of breath more easily than usual?",              adds: { clot: 2, fatigue: 1 }, said: "You get out of breath easily" },
  { place: "chest",   q: "Does your heart race even when you rest?",                       adds: { fatigue: 1, fever: 1 }, said: "Your heart races at rest" },
  { place: "belly",   q: "Is the pain on one side, and does it come in waves?",            adds: { kidney: 3 },  said: "Pain on one side, in waves" },
  { place: "belly",   q: "Do you feel sick, or have you vomited?",                         adds: { radiation: 1, fever: 1, kidney: 1 }, said: "You feel sick" },
  { place: "belly",   q: "Have you drunk less water than usual today?",                    adds: { kidney: 2 },  said: "You drank less water" },
  { place: "back",    q: "Is it a dull ache in the lower back?",                           adds: { strain: 3 },  said: "Dull ache in the lower back" },
  { place: "back",    q: "Does the pain spread toward your side or groin?",                adds: { kidney: 3 },  said: "Pain spreads to the side or groin" },
  { place: "arms",    q: "Do your arm muscles or joints ache, especially after exercise?", adds: { strain: 2 },  said: "Arm muscles or joints ache" },
  { place: "legs",    q: "Is one leg swollen, warm or painful, especially the calf?",      adds: { clot: 3 },    said: "One leg is swollen or painful" },
  { place: "legs",    q: "Do your leg muscles or joints ache after exercise?",             adds: { strain: 2 },  said: "Leg muscles or joints ache" },
  { place: "skin",    q: "Is your skin red or burning, like sunburn?",                     adds: { radiation: 3 }, said: "Skin red or burning" }
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
    why: "Solar storms can cause skin burns and nausea. They are fairly easy to shield against.",
    todo: ["Go to the shielded area by the water storage.", "Take your dosimeter.", "Send a report to the flight surgeon."] },
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
  step: "where",            // where → safety → questions → measure → result (or emergency)
  places: new Set(),
  flags: new Set(),
  qs: [], qi: 0, answers: {},   // answers[index in QUESTIONS] = "yes" | "no" | "unsure"
  hr: C.vitals.hr, temp: C.vitals.temp
};
const STEPS = ["where", "safety", "questions", "measure", "result"];
function go(step) {
  st.step = step;
  draw();
  $("stage").focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
function progress() {
  const i = Math.max(0, STEPS.indexOf(st.step));
  let frac = i / (STEPS.length - 1);
  if (st.step === "questions" && st.qs.length) frac = (2 + st.qi / st.qs.length) / (STEPS.length - 1);
  $("progressBar").style.width = `${Math.round(frac * 100)}%`;
  $("stepLabel").textContent = st.step === "emergency" ? "Possible emergency"
    : st.step === "questions" ? `Step 3 of 5 · Question ${st.qi + 1} of ${st.qs.length}`
    : `Step ${i + 1} of 5`;
}
function draw() {
  progress();
  ({ where: drawWhere, safety: drawSafety, questions: drawQuestion, measure: drawMeasure, result: drawResult, emergency: drawEmergency })[st.step]();
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
  $("stage").innerHTML = `
    <h1>First, any of these right now?</h1>
    <p class="k-lead">These can be an emergency. Tick every one you have.</p>
    <ul class="k-flags">${RED_FLAGS.map((f, i) => `
      <li><label><input type="checkbox" data-flag="${i}" ${st.flags.has(i) ? "checked" : ""}><span>${f}</span></label></li>`).join("")}</ul>
    <div class="k-actions">
      <button class="soft-btn" id="backBtn">Back</button>
      <button class="primary-btn" id="nextBtn"></button>
    </div>`;
  const sync = () => { $("nextBtn").textContent = st.flags.size ? "I have this: get help" : "None of these: continue"; $("nextBtn").className = st.flags.size ? "danger-btn" : "primary-btn"; };
  document.querySelectorAll("[data-flag]").forEach(cb => cb.onchange = () => { cb.checked ? st.flags.add(+cb.dataset.flag) : st.flags.delete(+cb.dataset.flag); sync(); });
  $("backBtn").onclick = () => go("where");
  $("nextBtn").onclick = () => {
    if (st.flags.size) return go("emergency");
    st.qs = QUESTIONS.map((q, i) => ({ ...q, i })).filter(q => st.places.has(q.place));
    st.qi = 0;
    go(st.qs.length ? "questions" : "measure");
  };
  sync();
}

function drawEmergency() {
  const flags = [...st.flags].map(i => RED_FLAGS[i]);
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
    $("emNote").innerHTML = `Declared. Report sent ${time(last.sent)}, reply ~${time(last.reply)}. Keep following the steps. <a href="index.html">Open the dashboard</a>`;
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
    go("result");
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
  if (bad(S.mood)) add("mood", 2, `Mood ${S.moodValue} of 5`);
  if (S.biggestGap.status !== "normal") add("mood", 1, "Your crewmate sees you differently");
  if (bad(S.water)) add("kidney", 1, `Only ${C.water.glasses} of ${C.water.goal} glasses of water`);
  if (S.storm) add("radiation", 3, "Solar storm right now");
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
      const C0 = CAUSES[key];
      return { ...C0, todo: level === "watch" && C0.todoWatch ? C0.todoWatch : C0.todo, key, level, evidence: ev[key] };
    })
    .sort((a, b) => (RANK[b.level] - RANK[a.level]) || ((PRIORITY[a.key] ?? 99) - (PRIORITY[b.key] ?? 99)))
    .slice(0, 3);
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
    ${list.map((c, n) => `
      <article class="k-cause ${c.level}">
        <header><span class="k-rank">${n === 0 ? "Most likely" : "Also possible"}</span>${badge(c.level)}</header>
        <h2>${c.name}</h2>
        <p class="k-why">${c.why}</p>
        <div class="k-cols">
          <div><h3>Do now</h3><ol class="k-do">${c.todo.map(t => `<li>${t}</li>`).join("")}</ol></div>
          <div><h3>Because</h3><ul class="k-ev">${c.evidence.map(e => `<li>${e}</li>`).join("")}</ul></div>
        </div>
      </article>`).join("")}
    <div class="k-final">
      <button class="${overall === "act" ? "primary-btn" : "soft-btn"}" id="reportBtn">Send this to the flight surgeon</button>
      <a class="soft-btn" href="chat.html">Talk to Astrodoc</a>
      <a class="soft-btn" href="index.html">Back to my dashboard</a>
      <button class="text-btn" id="againBtn">Start again</button>
    </div>
    <p class="k-note" id="reportNote" aria-live="polite"></p>`;
  $("reportBtn").onclick = () => {
    const summary = list.length ? list.map(c => c.name).join("; ") : "nothing worrying";
    const last = mutate(() => { sendToEarth(`${me}: self-check: ${summary} (places: ${[...st.places].map(p => PLACES[p]).join(", ")})`); return MOCK.earthLog[MOCK.earthLog.length - 1]; });
    $("reportBtn").disabled = true;
    $("reportNote").textContent = `Sent ${time(last.sent)}. Earliest reply ~${time(last.reply)}. Don't wait for it: follow the steps above.`;
  };
  $("againBtn").onclick = () => { if (body3d) st.places.forEach(p => body3d.set(p, false)); st.places.clear(); st.flags.clear(); st.answers = {}; st.qs = []; st.qi = 0; go("where"); };
}


// START
if (me) draw();
