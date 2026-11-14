// =========================================================================
// Astrodoc — Companion chat (chat.html). Health rules come from core.js,
// so the companion and the dashboard always agree.
//
//   1. WORDS        names, numbers, small helpers
//   2. VOICE        speaking (most natural voice, sentence by sentence)
//   3. UNDERSTAND   clean the text, fix typos, read numbers, find who
//   4. KNOWLEDGE    what to say about each problem, why, and what to do
//   5. INTENTS      one function per thing the user can ask or tell
//   6. CONVERSATION understand one message and pick the reply
//   7. LISTENING    speech recognition, push-to-talk
//   8. CALM MODE    guided breathing
//   9. FACE         blinks, eyes follow, expressions
//  10. PAGE         messages, chips, menu, mute, history, start
//
// Speech uses the browser (Chrome is best): recognition needs internet,
// the voice works offline. Typing and tapping always work.
// =========================================================================

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


// =========================================================================
// 1. WORDS
// =========================================================================
const ROLE = { CDR: "commander", PLT: "pilot", MS1: "mission specialist" };
const who = id => "the " + ROLE[id];
const Cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const Who = id => Cap(who(id));
const pick = list => list[Math.floor(Math.random() * list.length)];
const NUMW = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const num = n => NUMW[n] || String(n);
const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : many}`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const partOfDay = () => { const h = new Date().getHours(); return h < 5 ? "evening" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening"; };


// =========================================================================
// 2. VOICE — choose the most natural voice and speak in short sentences
// =========================================================================
let bestVoice = null;
let muted = localStorage.getItem("astrodoc-mute") === "1";

function chooseVoice() {
  if (!("speechSynthesis" in window)) return;
  const score = v => {
    const n = v.name;
    let s = 0;
    // JARVIS-style: a calm, polished British male voice
    if (/en[-_]GB/i.test(v.lang)) s += 120;
    if (/Daniel|Arthur|Oliver|Ryan|George|Thomas|Alfie|Elliot|Google UK English Male/i.test(n)) s += 100;
    if (/natural|neural/i.test(n)) s += 60;                  // e.g. Microsoft "Ryan Online (Natural)"
    if (/premium|enhanced/i.test(n)) s += 50;                // e.g. macOS "Daniel (Enhanced)"
    if (/female|Samantha|Ava|Allison|Susan|Zoe|Karen|Serena|Aria|Jenny|Kate|Stephanie|Sonia|Libby|Hazel|Moira|Tessa|Fiona/i.test(n)) s -= 80;
    // macOS novelty voices sound robotic: never use them
    if (/Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Ralph|Kathy|Grandpa|Grandma|Eddy|Flo|Reed|Rocko|Sandy|Shelley/i.test(n)) s -= 200;
    return s;
  };
  const english = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
  bestVoice = english.sort((a, b) => score(b) - score(a))[0] || null;
}
if ("speechSynthesis" in window) {
  chooseVoice();
  speechSynthesis.onvoiceschanged = chooseVoice;
}

// Numbers and units as words that sound right
function speakable(text) {
  return text
    .replace(/“|”|"/g, "")
    .replace(/(\d+)\/(\d+)/g, "$1 over $2")
    .replace(/°C/g, " degrees")
    .replace(/\bbpm\b/g, "beats per minute")
    .replace(/\bmSv\b/g, "millisieverts")
    .replace(/(\d+(\.\d+)?) h\b/g, "$1 hours")
    .replace(/\bCDR\b/g, "commander").replace(/\bPLT\b/g, "pilot").replace(/\bMS1\b/g, "mission specialist")
    .replace(/[()]/g, ", ");
}

let speakToken = 0;
function speak(text, { rate = 1.0, pitch = 0.9, onDone } = {}) {   // composed, slightly deep
  const token = ++speakToken;
  if (!text) { if (onDone) onDone(); return; }
  if (muted || !("speechSynthesis" in window)) {     // no sound: the mouth still moves a little
    faceMode("talking", true);
    setTimeout(() => { if (token === speakToken) { faceMode("talking", false); if (onDone) onDone(); } }, Math.min(2200, 400 + text.length * 18));
    return;
  }
  speechSynthesis.cancel();
  const parts = speakable(text).split(/(?<=[.!?])\s+/).filter(p => p.trim());
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    if (bestVoice) { u.voice = bestVoice; u.lang = bestVoice.lang; } else u.lang = "en-US";
    u.rate = rate;
    u.pitch = pitch;
    u.onstart = () => { if (token === speakToken) { faceMode("talking", true); setState(""); } };
    u.onend = u.onerror = () => {
      if (token !== speakToken) return;
      faceMode("talking", false);                     // the mouth rests between sentences
      if (i === parts.length - 1 && onDone) onDone();
    };
    speechSynthesis.speak(u);
  });
}
function stopSpeaking() {
  speakToken++;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  faceMode("talking", false);
}


// =========================================================================
// 3. UNDERSTAND — clean the text, fix typos, turn spoken numbers into digits
// =========================================================================
const CONTRACTIONS = [
  [/\bwhat's\b/g, "what is"], [/\bhow's\b/g, "how is"], [/\bwho's\b/g, "who is"], [/\bit's\b/g, "it is"],
  [/\bthat's\b/g, "that is"], [/\bthere's\b/g, "there is"], [/\bhe's\b/g, "he is"], [/\bshe's\b/g, "she is"],
  [/\blet's\b/g, "let us"], [/\bi'm\b/g, "i am"], [/\bi've\b/g, "i have"], [/\bi'd\b/g, "i would"], [/\bi'll\b/g, "i will"],
  [/\byou're\b/g, "you are"], [/\bthey're\b/g, "they are"], [/\bwe're\b/g, "we are"],
  [/\bcan't\b/g, "cannot"], [/\bwon't\b/g, "will not"], [/\bdon't\b/g, "do not"], [/\bdoesn't\b/g, "does not"],
  [/\bdidn't\b/g, "did not"], [/\bisn't\b/g, "is not"], [/\baren't\b/g, "are not"], [/\bhaven't\b/g, "have not"]
];

// Words that matter: small typos in these are fixed ("comander" → "commander")
const VOCAB = ["commander", "captain", "pilot", "specialist", "mission", "everyone", "everybody", "heart", "pulse",
  "temperature", "fever", "pressure", "blood", "sleep", "slept", "tired", "exhausted", "radiation", "solar", "storm",
  "exercise", "workout", "water", "drank", "mood", "report", "emergency", "breathe", "breathing", "calm", "anxious",
  "nervous", "stressed", "lonely", "homesick", "checklist", "vitamin", "reaction", "oxygen", "explain", "repeat",
  "thanks", "hello", "status", "crewmate", "glasses", "steps", "clot", "dashboard"];
const COMMON = new Set(("about after again also back been before being could does doing done during every feel feeling fine " +
  "from going good great have here into just know last like long make many more most much need next night only other " +
  "over please really right said should some still sure tell than thank that their them then there these they thing " +
  "think this those three today under until very want well were what when where which while will with would your " +
  "hours glass morning later").split(" "));

function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function fixTypos(t) {
  return t.split(" ").map(w => {
    if (w.length < 5 || COMMON.has(w) || VOCAB.includes(w) || /\d/.test(w)) return w;
    const max = w.length >= 7 ? 2 : 1;
    let best = null, bestD = max + 1;
    for (const v of VOCAB) {
      if (v[0] !== w[0] || Math.abs(v.length - w.length) > max) continue;
      const dist = editDistance(w, v);
      if (dist < bestD) { best = v; bestD = dist; }
    }
    return best || w;
  }).join(" ");
}

// "six and a half" → 6.5, "a hundred and ten" → 110, "thirty seven point five" → 37.5
const UNITS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
function wordsToNumbers(t) {
  const toks = t.replace(/\ba hundred\b/g, "one hundred").split(" "), out = [];
  let cur = null;
  const flush = () => { if (cur !== null) out.push(String(cur)); cur = null; };
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i], next = toks[i + 1];
    if (w in UNITS) {
      if (cur !== null && !(cur >= 20 && cur % 10 === 0)) flush();
      cur = (cur ?? 0) + UNITS[w];
    } else if (w in TENS) {
      if (cur !== null && !(cur >= 100 && cur % 100 === 0)) flush();
      cur = (cur ?? 0) + TENS[w];
    } else if (w === "hundred" && cur !== null && cur > 0 && cur < 10) {
      cur *= 100;
    } else if (w === "and" && cur !== null && cur >= 100 && cur % 100 === 0 && (next in UNITS || next in TENS)) {
      continue;
    } else if (w === "and" && cur !== null && next === "a" && toks[i + 2] === "half") {
      cur += 0.5; i += 2;
    } else if (w === "point" && cur !== null && (next in UNITS || /^\d$/.test(next || ""))) {
      cur = parseFloat(`${cur}.${next in UNITS ? UNITS[next] : next}`); i++;
    } else { flush(); out.push(w); }
  }
  flush();
  return out.join(" ").replace(/(\d+(?:\.\d+)?) and a half/g, (m, n) => String(parseFloat(n) + 0.5));
}

function normalize(raw) {
  let t = raw.toLowerCase().replace(/[’‘`]/g, "'");
  CONTRACTIONS.forEach(([re, to]) => { t = t.replace(re, to); });
  t = t.replace(/[^a-z0-9.\s'\/-]/g, " ").replace(/\.(?!\d)/g, " ").replace(/'/g, "").replace(/\s+/g, " ").trim();
  return wordsToNumbers(fixTypos(t));
}
const firstNumber = t => { const m = t.match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : null; };
const isQuestion = (t, raw) => /\?\s*$/.test(raw) || /^(what|how|is|are|was|were|does|do|did|why|when|which|who|can|could|should|tell me|any)\b/.test(t);

// Who is this about? "CDR" / "PLT" / "MS1", "ALL", or null
function findCrew(t) {
  if (/\b(everyone|everybody|all crew|whole crew|the crew|all of (us|them)|the team|crew status|all three|each of them)\b/.test(t)) return "ALL";
  if (/\b(commander|cdr|captain|skipper)\b/.test(t)) return "CDR";
  if (/\b(pilot|plt)\b/.test(t)) return "PLT";
  if (/\b(specialist|ms ?1|mission spec|scientist)\b/.test(t)) return "MS1";
  return null;
}


// =========================================================================
// 4. KNOWLEDGE — what is wrong, why, and what to do (in spoken words)
// =========================================================================
function spokenWarning(w, id) {
  const c = MOCK.crew[id], S = check(id);
  const n = who(id), ns = n + "'s";
  const phrases = {
    emergency: [`a medical emergency has been declared for ${n}`, "Keep the oxygen mask on and stay still. Earth has been told."],
    storm:     ["there's a solar storm right now", "Please go to the shielded area by the water storage, and take your dosimeter."],
    clot:      ["the blood test shows a pattern that can mean a blood clot", "Stop work, stay still, and follow the clot checklist. I can read it to you, step by step."],
    labs:      [`some blood test results are outside the normal range: ${S.labOut.map(l => l.name).join(" and ")}`,
                S.blood === "act" ? "Please stop work and follow the clot checklist." : "Drink some water, and repeat the test within a day."],
    trend:     [`the ${S.labTrend.join(" and ")} result keeps getting worse`, "I've already sent a report to the flight surgeon. Repeat the test within a day."],
    tired:     [`${n} is very tired: only ${S.lastNight} hours of sleep, slower reactions, and a heart rate of ${c.vitals.hr}`,
                "A short nap now would really help, with a lighter workload today."],
    sleep:     [bad(T.sleepNight(S.lastNight, c.sleep.hoursAwake)) ? `${n} only slept ${S.lastNight} hours last night` : `${n} is about ${Math.round(S.debt)} hours short on sleep this week`,
                "Keep fixed sleep times, with bright light after waking and dim light before bed."],
    reaction:  [`${ns} reactions are ${S.reactionPct} percent slower than usual`, "Better to avoid critical tasks for now, and rest if you can."],
    hr:        [`${ns} resting heart rate is ${c.vitals.hr > 100 ? "high" : "low"}, at ${c.vitals.hr}`, "Sit down, rest for five minutes, and measure again."],
    temp:      [`${ns} temperature is ${c.vitals.temp >= 37.3 ? "a bit high" : "low"}, at ${c.vitals.temp} degrees`, "Rest, drink some water, and check again in an hour."],
    bp:        [`${ns} blood pressure is a little high, ${c.vitals.bpSys} over ${c.vitals.bpDia}`, "Rest for a few minutes and measure again."],
    mood:      S.mood === "act"
                ? [`${ns} mood is very low`, "Please talk to the flight surgeon, and take some work off today's plan."]
                : [`${ns} mood is a bit low today`, "A short break, something enjoyable, and some time with the crew can help."],
    gap:       [`${n} and their crewmate see ${S.biggestGap.m} differently`, "Worth talking about together. Tired people often don't notice it themselves."],
    dose:      [`${ns} radiation dose is ${S.dose.toFixed(0)}, out of a career limit of 600`, "Log it, and review the exposure plan with Earth."],
    exercise:  [`${n} only did ${num(c.exercise)} exercise sessions this week`, "Try not to skip the next one. It protects bones and muscles."],
    water:     [`${n} has only had ${num(c.water.glasses)} glasses of water today`, "A glass of water now would be good."],
    vitd:      [`${ns} vitamin D is out of range`, "Ask the flight surgeon about a supplement."]
  };
  const [what, todo] = phrases[w.key] || [w.title, w.todo];
  return { what, todo };
}

// One clear step per problem
function stepFor(w, id) {
  const S = check(id);
  return ({
    emergency: "Keep the oxygen mask on and stay still.",
    storm:     "Go to the shielded area by the water storage, with your dosimeter.",
    clot:      "Stop work, stay still, and follow the clot checklist.",
    labs:      S.blood === "act" ? "Stop work and follow the clot checklist." : "Drink some water and repeat the blood test within a day.",
    trend:     "Repeat the blood test within a day. The flight surgeon already has the report.",
    tired:     "Take a short nap, about 20 minutes, and keep today's workload light.",
    sleep:     "Keep fixed sleep times tonight, with dim light before bed.",
    reaction:  "Avoid critical tasks for now.",
    hr:        "Sit, rest for five minutes, and measure the heart rate again.",
    temp:      "Drink some water and check the temperature again in an hour.",
    bp:        "Rest a few minutes, then measure the blood pressure again.",
    mood:      S.mood === "act" ? "Talk to the flight surgeon, and lighten today's plan." : "Take a short break and spend some time with the crew.",
    gap:       "Talk with your crewmate about how you're both seeing things.",
    dose:      "Log the radiation dose.",
    exercise:  "Don't skip the next exercise session.",
    water:     "Drink a glass of water.",
    vitd:      "Ask the flight surgeon about vitamin D."
  })[w.key] || w.todo;
}

// Why is something flagged? Plain reasons from the same limits the dashboard uses.
function whyText(key, id) {
  const c = MOCK.crew[id], S = check(id), n = who(id);
  const lvl = s => s === "normal" ? "so that's fine" : s === "watch" ? "so it's one to watch" : "so it needs care now";
  return ({
    hr:       `${Cap(n)}'s resting heart rate is ${c.vitals.hr}. Healthy is 60 to 100, and above 120 is urgent, ${lvl(S.hr)}.`,
    temp:     `The temperature is ${c.vitals.temp} degrees. Healthy is 36.1 to 37.2, and 38 or more is urgent, ${lvl(S.temp)}.`,
    bp:       `Blood pressure is ${c.vitals.bpSys} over ${c.vitals.bpDia}. Under 120 over 80 is healthy, and 140 over 90 or more is urgent, ${lvl(S.bp)}.`,
    sleep:    `Last night was ${S.lastNight} hours. Seven to nine is healthy, under six is urgent. Over the week, ${n} is about ${Math.round(S.debt)} hours short of eight a night.`,
    mood:     `I use the lower of two ratings: ${n}'s own, ${c.checkin.self.mood}, and their crewmate's, ${c.checkin.mate.mood}. Three is one to watch, two or less needs care.`,
    gap:      `${Cap(n)} rated their ${S.biggestGap.m} ${S.biggestGap.self}, but their crewmate said ${S.biggestGap.mate}. A gap of two or more often means tiredness the person doesn't notice.`,
    reaction: `Today's reaction test was ${S.reactionPct} percent slower than ${n}'s own usual. Ten percent slower is one to watch, over twenty needs care.`,
    tired:    `It's three signs together: short sleep, slower reactions, and a heart rate of ${c.vitals.hr}. Each alone is smaller, but together they mean real tiredness.`,
    dose:     `The career dose is ${S.dose.toFixed(0)} of NASA's 600 millisievert limit. From 300 we keep an eye on it, and above 480 it needs care.`,
    storm:    "Solar activity is in the storm range. Radiation can rise fast, so the shielded area is the safest place until the all-clear.",
    clot:     "Three blood values together: high D-dimer, low platelets and low fibrinogen. Each alone would only be one to watch, but this combination can mean a clot, so it needs care now.",
    labs:     S.labOut.length ? `${S.labOut.map(l => `${l.name} is ${l.value}`).join(", ")}, which is outside the lab's normal range.` : null,
    trend:    S.labTrend.length ? `${S.labTrend.join(" and ")} got worse on the last tests in a row. A steady trend matters even before a value is very high.` : null,
    exercise: `${Cap(n)} did ${num(c.exercise)} of the six to seven weekly sessions. In space, bones and muscles weaken fast without resistance exercise.`,
    water:    `${Cap(num(c.water.glasses))} of ${num(c.water.goal)} glasses today. Enough water helps prevent kidney stones, which are more common in space.`,
    vitd:     `Vitamin D is ${c.vitD}. The healthy range is 35 to 90, and there's no sunlight in space to make it.`,
    blood:    S.clotPattern ? null : S.labOut.length ? `${S.labOut.map(l => `${l.name} is ${l.value}`).join(", ")}, outside the lab's normal range.` : "All the clotting tests are inside their normal ranges.",
    emergency:"An emergency was declared, so Earth has a top-priority report."
  })[key] || (key === "blood" && S.clotPattern ? whyText("clot", id) : null);
}

// What people ask about → how to read it out
const READINGS = [
  { key: "hr",       re: /\b(heart ?rate|heart|pulse|bpm|hr)\b/ },
  { key: "temp",     re: /\b(temperature|fever|temp)\b/ },
  { key: "bp",       re: /\b(blood pressure|pressure|bp)\b/ },
  { key: "sleep",    re: /\b(sleep|slept|sleeping|rest|rested)\b/ },
  { key: "mood",     re: /\b(mood|spirits|mental)\b/ },
  { key: "dose",     re: /\b(radiation|dose|dosimeter|msv|sievert)\b/ },
  { key: "exercise", re: /\b(exercise|workout|training|bones?|muscles?)\b/ },
  { key: "water",    re: /\b(water|hydration|hydrated|drink|drinking)\b/ },
  { key: "blood",    re: /\b(blood tests?|labs?|lab results|d ?dimer|platelets?|fibrinogen|clotting)\b/ },
  { key: "vitd",     re: /\bvitamin d\b/ },
  { key: "reaction", re: /\b(reaction|reflexes)\b/ }
];

function readingText(id, key) {
  const c = MOCK.crew[id], S = check(id), ns = Who(id) + "'s";
  const verdict = s => ({ normal: pick(["That's healthy.", "That's in the healthy range."]), watch: "That's a little outside the healthy range, so it's one to watch.", act: "That needs care now." })[s];
  switch (key) {
    case "hr":       return [`${ns} heart rate is ${c.vitals.hr} beats per minute${c.vitals.source === "live" ? ", live from the sensor" : ""}. ${verdict(S.hr)}`, S.hr];
    case "temp":     return [`${ns} temperature is ${c.vitals.temp} degrees. ${verdict(S.temp)}`, S.temp];
    case "bp":       return [`${ns} blood pressure is ${c.vitals.bpSys} over ${c.vitals.bpDia}. ${verdict(S.bp)}`, S.bp];
    case "sleep":    return [`${Who(id)} slept ${S.lastNight} hours last night, and is about ${Math.round(S.debt)} hours short this week. ${verdict(S.sleep)}`, S.sleep];
    case "mood":     { const s = worst(S.mood, S.biggestGap.status);
                       return [`${ns} mood is ${num(S.moodValue)} out of five. They said ${num(c.checkin.self.mood)}, and their crewmate said ${num(c.checkin.mate.mood)}. ${verdict(s)}`, s]; }
    case "dose":     return [S.storm ? `There's a solar storm right now, so please go to the shielded area. ${ns} career dose is ${S.dose.toFixed(0)} out of 600.`
                                     : `${ns} career radiation dose is ${S.dose.toFixed(0)} out of a limit of 600. ${verdict(S.radiation)}`, S.radiation];
    case "exercise": return [`${Who(id)} did ${plural(c.exercise, "exercise session", "exercise sessions")} this week. ${verdict(S.exercise)}`, S.exercise];
    case "water":    return [`${Who(id)} has had ${plural(c.water.glasses, "glass", "glasses")} of water today, out of ${num(c.water.goal)}. ${verdict(S.water)}`, S.water];
    case "blood":    return [S.clotPattern ? `${ns} blood test shows a pattern that can mean a clot. Please stop work, stay still, and follow the clot checklist.`
                             : S.labOut.length ? `${ns} blood test has ${S.labOut.map(l => l.name).join(" and ")} outside the normal range. ${verdict(S.blood)}`
                             : `${ns} blood tests all look normal.`, S.blood];
    case "vitd":     return [c.vitD ? `${ns} vitamin D is ${c.vitD}. ${verdict(S.vitD)}` : `I don't have a vitamin D result for ${who(id)} yet.`, S.vitD];
    case "reaction": return [S.reactionPct === null ? `There's no reaction test for ${who(id)} yet.` : `${ns} last reaction test was ${Math.abs(S.reactionPct)} percent ${S.reactionPct >= 0 ? "slower" : "faster"} than usual. ${verdict(S.reaction)}`, S.reaction];
  }
}


// =========================================================================
// 5. INTENTS — each returns a reply: { say, html, actions, chips, face, then }
// =========================================================================
const ctx = {
  crew: currentCrew,   // who we're talking about
  topic: null,         // last thing discussed (a warning or reading key)
  level: null,         // last level mentioned, for "what does that mean?"
  more: [],            // warnings not mentioned yet, for "tell me more"
  steps: null,         // guided steps { list, i, kind, id }
  confirm: null,       // waiting for yes / no
  expect: null,        // waiting for a value, e.g. hours of sleep
  undo: null,          // how to undo the last change
  last: "",            // last thing said, for "repeat"
  misses: 0            // how often I didn't understand in a row
};

const YES = /^(yes|yeah|yep|yup|sure|ok|okay|alright|do it|please do|please|go ahead|confirm|declare|send it|affirmative|correct|right|start|let us do it)\b/;
const NO = /^(no|nope|nah|cancel|never mind|nevermind|do not|not now|not yet|skip|no thanks)\b/;
const act = (label, say, kind = "") => ({ label, say, kind });
const link = (label, href) => ({ label, href, kind: "link" });
const crewChip = id => `How is the ${ROLE[id]}?`;

// --- How someone is doing ---
function assess(id, { intro = "" } = {}) {
  const S = check(id);
  if (ctx.steps && ctx.steps.id !== id) ctx.steps = null;      // talking about someone else ends the old plan
  ctx.crew = id; ctx.level = S.overall;
  updateAbout();
  if (!S.warnings.length) {
    ctx.topic = null; ctx.more = [];
    return { say: intro + pick([
      `Good news: ${who(id)} is doing well. Every reading is in the healthy range.`,
      `${Who(id)} is all good right now. Nothing to worry about.`,
      `I've checked ${who(id)}. Everything looks healthy. Keep up the routine.`]),
      face: "joy", chips: ["How is everyone?", "Log my sleep", "Talk to me"] };
  }
  const list = S.warnings.map(w => ({ w, ...spokenWarning(w, id) }));
  const [a, b, ...rest] = list;
  ctx.topic = a.w.key; ctx.more = rest;
  const acts = S.warnings.filter(w => w.status === "act").length;
  let say = intro;
  if (S.overall === "act") {
    say += pick(["Okay, let's take this calmly. ", "Alright. I'll guide you. ", "Okay. Take a breath, we'll go one step at a time. "]);
    say += `${Who(id)} needs care now${acts > 1 ? `, with ${num(acts)} urgent things` : ""}. `;
  } else {
    say += pick(["Let me see. ", "Okay. ", "Sure. "]);
    say += `${Who(id)} is mostly okay, with ${plural(S.warnings.length, "thing", "things")} to watch. `;
  }
  say += `The main one: ${a.what}. ${a.todo}`;
  if (b) say += ` Also, ${b.what}.`;
  if (rest.length) say += ` There ${rest.length === 1 ? "is one more small thing" : `are ${num(rest.length)} more small things`}, if you want to hear ${rest.length === 1 ? "it" : "them"}.`;
  return {
    say, face: S.overall === "act" ? "caring" : null,
    actions: a.w.extra === "clot" ? [act("Read me the clot checklist", "read the clot checklist")] : [],
    chips: ["What should I do?", "Why?", S.overall === "act" ? "What does “needs care” mean?" : "What does “watch” mean?", ...(rest.length ? ["Tell me more"] : [])]
  };
}

function allCrew() {
  const ids = Object.keys(MOCK.crew).sort((a, b) => RANK[check(b).overall] - RANK[check(a).overall]);
  const line = id => {
    const S = check(id);
    if (S.overall === "normal") return `${Who(id)} is doing fine.`;
    const names = S.warnings.slice(0, 2).map(w => GIST[w.key] || w.title.toLowerCase());
    const list = names.join(" and ");
    return S.overall === "act" ? `${Who(id)} needs care now: ${list}.`
                               : `${Who(id)} has ${plural(S.warnings.length, "thing", "things")} to watch: ${list}.`;
  };
  const worstId = ids[0], wS = check(worstId);
  ctx.level = null;
  if (wS.warnings.length) { ctx.crew = worstId; ctx.topic = wS.warnings[0].key; ctx.more = []; updateAbout(); }   // "why?" now explains the most urgent one
  const say = `Here's everyone. ${ids.map(line).join(" ")}` + (wS.overall !== "normal" ? ` Want to start with ${who(worstId)}?` : " Lovely, the whole crew is healthy.");
  if (wS.overall !== "normal") ctx.confirm = { yes: () => assess(worstId), no: () => ({ say: "Okay. Ask me about anyone, any time." }) };
  return {
    say, html: `Here's everyone.<ul class="m-list">${ids.map(id => `<li>${badge(check(id).overall)}<span>${escapeHtml(line(id))}</span></li>`).join("")}</ul>`
      + (wS.overall !== "normal" ? `Want to start with ${who(worstId)}?` : ""),
    face: wS.overall === "normal" ? "joy" : null,
    chips: wS.overall !== "normal" ? ["Yes", ...ids.filter(id => id !== worstId).map(crewChip)] : ids.map(crewChip)
  };
}

// A few words for each problem, for the crew overview
const GIST = { emergency: "a declared emergency", storm: "the solar storm", clot: "a possible blood clot", labs: "blood test results",
  trend: "a worsening blood test", tired: "very tired", sleep: "short on sleep", reaction: "slow reactions", hr: "heart rate",
  temp: "temperature", bp: "blood pressure", mood: "low mood", gap: "a different view from their crewmate", dose: "radiation dose",
  exercise: "too little exercise", water: "not enough water", vitd: "vitamin D" };

// --- Guided steps: one at a time, "next" moves on ---
function startSteps(id) {
  const S = check(id);
  ctx.crew = id; updateAbout();
  if (!S.warnings.length) return { say: `${Who(id)} doesn't need to do anything right now. Just keep the routine.`, face: "joy" };
  const list = S.warnings.slice(0, 5).map(w => stepFor(w, id));
  ctx.steps = { list, i: 0, kind: "plan", id };
  return stepReply(`Here's the plan for ${who(id)}, most important first. `);
}
function startClotSteps(id) {
  ctx.steps = { list: CLOT_STEPS, i: 0, kind: "clot", id };
  ctx.crew = id; updateAbout();
  return stepReply(`Okay. The clot checklist has ${num(CLOT_STEPS.length)} steps. Tell me when each one is done. `);
}
function stepReply(intro = "") {
  const { list, i } = ctx.steps;
  const last = i === list.length - 1;
  return {
    say: `${intro}Step ${num(i + 1)}${list.length > 1 ? ` of ${num(list.length)}` : ""}: ${list[i]}${last ? "" : pick([" Say next when you're ready.", " Tell me when it's done.", ""])}`,
    html: `${escapeHtml(intro)}<ol class="m-steps">${list.map((s, k) => `<li class="${k < i ? "done" : k === i ? "now" : ""}">${escapeHtml(s)}</li>`).join("")}</ol>`,
    chips: last ? ["Done", "Read all steps", "Send report to Earth"] : ["Next step", "Done", "Read all steps", "Stop"]
  };
}
function nextStep(markDone) {
  const s = ctx.steps;
  if (markDone && s.kind === "clot") mutate(() => { (checklistDone[s.id] = checklistDone[s.id] || {})[s.i] = true; });
  s.i++;
  if (s.i < s.list.length) return stepReply(pick(["Good. ", "Well done. ", "Okay. ", "Great. "]));
  ctx.steps = null;
  ctx.confirm = { yes: () => sendReport(s.id), no: () => ({ say: "Okay. I'm here if you need me.", chips: ["How is everyone?"] }) };
  return { say: pick(["That's every step. Well done.", "And that's all of them. You did great."]) + " Should I send a report to Earth?",
    face: "joy", chips: ["Yes", "No"], actions: [act("Send report to Earth", "yes")] };
}

// --- Logging things by talking ("I slept six hours") ---
const LOG = {
  sleep: { ask: "How many hours did you sleep last night?", min: 0, max: 14, reading: "sleep",
           get: c => c.sleep.nights[c.sleep.nights.length - 1], set: (c, v) => { c.sleep.nights[c.sleep.nights.length - 1] = v; },
           said: (v, id) => `${v} ${v === 1 ? "hour" : "hours"} of sleep for ${who(id)}`,
           quick: ["5", "6", "7", "8"].map(v => act(`${v} h`, v)) },
  mood:  { ask: "How's your mood, from one to five? One is very low, five is great.", min: 1, max: 5, int: true, reading: "mood",
           get: c => c.checkin.self.mood, set: (c, v) => { c.checkin.self.mood = v; },
           said: (v, id) => `a mood of ${num(v)} out of five for ${who(id)}`,
           quick: [1, 2, 3, 4, 5].map(v => act(String(v), String(v))) },
  mate:  { ask: "What would the crewmate rate their mood, from one to five?", min: 1, max: 5, int: true, reading: "mood",
           get: c => c.checkin.mate.mood, set: (c, v) => { c.checkin.mate.mood = v; },
           said: (v, id) => `the crewmate's rating of ${num(v)} for ${who(id)}`,
           quick: [1, 2, 3, 4, 5].map(v => act(String(v), String(v))) },
  water: { ask: "How many glasses of water did you just have?", min: 1, max: 10, int: true, add: true, reading: "water",
           get: c => c.water.glasses, set: (c, v) => { c.water.glasses = v; },
           said: (v, id) => `${plural(v, "glass", "glasses")} of water for ${who(id)}`,
           quick: [act("1 glass", "1"), act("2 glasses", "2")] },
  exercise: { ask: "", min: 1, max: 1, int: true, add: true, reading: "exercise",
           get: c => c.exercise, set: (c, v) => { c.exercise = Math.min(7, v); },
           said: (v, id) => `one exercise session for ${who(id)}` },
  hr:    { ask: "What's the heart rate, in beats per minute?", min: 30, max: 220, int: true, reading: "hr",
           get: c => c.vitals.hr, set: (c, v) => { c.vitals.hr = v; c.vitals.source = "manual"; },
           said: (v, id) => `a heart rate of ${v} for ${who(id)}` },
  temp:  { ask: "What's the temperature, in degrees?", min: 34, max: 42, reading: "temp",
           get: c => c.vitals.temp, set: (c, v) => { c.vitals.temp = v; },
           said: (v, id) => `a temperature of ${v} degrees for ${who(id)}` }
};
function askFor(kind, id) {
  ctx.expect = { kind, id };
  return { say: LOG[kind].ask, actions: LOG[kind].quick || [], chips: ["Never mind"] };
}
function logValue(kind, value, id) {
  const L = LOG[kind];
  if (value === null || isNaN(value)) return askFor(kind, id);
  if (L.int) value = Math.round(value);
  if (value < L.min || value > L.max) {
    ctx.expect = { kind, id };
    return { say: `Hmm, ${value} doesn't sound quite right. ${L.ask}`, actions: L.quick || [] };
  }
  const before = check(id).overall;
  let old;
  mutate(() => {
    const c = MOCK.crew[id];
    old = L.get(c);
    L.set(c, L.add ? old + value : value);
    autoReport(id);
  });
  ctx.undo = () => {
    mutate(() => L.set(MOCK.crew[id], old));
    updateAbout();
    return { say: pick(["Okay, undone.", "Done, I've put it back."]) + ` ${readingText(id, L.reading)[0]}`, chips: ["Log my sleep", "How is everyone?"] };
  };
  ctx.crew = id; ctx.topic = L.reading; updateAbout();
  const after = check(id).overall;
  const [readSay, readStatus] = readingText(id, L.reading);
  let say = `${pick(["Got it.", "Done.", "Okay, logged."])} I've saved ${L.said(value, id)}. `;
  if (kind === "sleep") {
    // Sleep has two parts: last night, and the week. Say which one is the problem.
    const S = check(id), night = T.sleepNight(value, MOCK.crew[id].sleep.hoursAwake), week = T.sleepDebt(S.debt);
    const phrase = { normal: "healthy", watch: "one to watch", act: "something that needs care" };
    say += night === "normal" && week === "normal" ? "That's healthy."
         : night === "normal" ? `Last night looks good. Over the week, though, ${who(id)} is still about ${Math.round(S.debt)} hours short, so sleep is still ${phrase[S.sleep]}.`
         : `That's short for one night, so it's ${phrase[night]}.` + (RANK[week] > RANK[night] ? ` And over the week ${who(id)} is about ${Math.round(S.debt)} hours short, so overall sleep is ${phrase[S.sleep]}.` : "");
  } else say += readSay.slice(readSay.lastIndexOf("That"));     // keep only the verdict: "That's healthy."
  if (after !== before) say += ` That changes ${who(id)}'s overall status to ${LABEL[after].toLowerCase()}.`;
  const better = RANK[after] < RANK[before] || readStatus === "normal";
  return { say, face: better ? "joy" : (after === "act" ? "caring" : null),
    chips: ["Undo", `How is the ${ROLE[id]} now?`, "What should I do?"] };
}

// --- Reports and messages to Earth ---
function sendReport(id) {
  const last = mutate(() => { sendToEarth(`${id}: health report (companion)`); return MOCK.earthLog[MOCK.earthLog.length - 1]; });
  return { say: `Done. ${Who(id)}'s report is on its way to Earth. It arrives around ${time(last.arrive)}, so the earliest reply is about ${time(last.reply)}. Keep going with the steps in the meantime.`,
    chips: ["What should I do?", "How is everyone?"] };
}
function sendHome(message, id) {
  const last = mutate(() => { sendToEarth(`${id}: message home: ${message.slice(0, 280)}`); return MOCK.earthLog[MOCK.earthLog.length - 1]; });
  return { say: `Sent. Your message reaches Earth around ${time(last.arrive)}. ${pick(["I'm sure it'll make someone's day.", "They'll be so happy to hear from you."])}`, face: "joy",
    chips: ["Talk to me", "How is everyone?"] };
}

// --- Emergency: always first, always confirmed ---
function emergencyFlow(id) {
  ctx.crew = id; updateAbout();
  if (emergency.active && currentCrew === id) {
    return { say: `The emergency for ${who(id)} is already declared, and Earth has the report. Keep the oxygen mask on and keep them still. I'm right here with you.`,
      face: "caring", urgent: true, actions: [link("Open dashboard", "index.html")], chips: ["What should I do?", "Calm me down"] };
  }
  ctx.confirm = { yes: () => declareEmergency(id), no: () => ({ say: "Okay, I won't declare it. If anything gets worse, just say emergency.", chips: ["What should I do?"] }) };
  return { say: `This could be serious. First, put the oxygen mask on ${who(id)} and keep them still. Should I declare a medical emergency and alert Earth now?`,
    face: "caring", urgent: true, actions: [act("Yes, declare emergency", "yes", "danger"), act("Not now", "no")], chips: ["Yes", "No"] };
}
function declareEmergency(id) {
  const last = mutate(() => {
    currentCrew = id; emergency.active = true;
    sendToEarth(`${id}: MEDICAL EMERGENCY (top priority)`);
    return MOCK.earthLog[MOCK.earthLog.length - 1];
  });
  return { say: `Done. Emergency declared for ${who(id)}, and Earth has the top-priority report, sent at ${time(last.sent)}. Keep the oxygen mask on and stay still. Watch for trouble breathing, chest pain, weakness on one side, or trouble speaking. I'm right here.`,
    face: "caring", urgent: true, actions: [link("Open dashboard", "index.html")], chips: ["Calm me down", "What should I do?"] };
}

// --- Explain the three levels ---
function explainLevel(level) {
  ctx.level = level;
  if (!level) return {
    say: `There are three levels. All good means every reading is healthy. Watch means something is drifting, so do the suggested step and check again later. Needs care now means a reading is in the danger range, or several signs together point to a real risk. Then you do the "Do now" step right away and tell Earth, without waiting for the reply.`,
    html: `There are three levels:<ul class="m-list">${["normal", "watch", "act"].map(l => `<li>${badge(l)}<span>${LEVEL_HELP[l]}</span></li>`).join("")}</ul>`,
    chips: ["How is everyone?", "What should I do?"] };
  const intro = { act: `"Needs care now" is the red level. It used to say "Act now". `, watch: `"Watch" is the amber level. `, normal: `"All good" is the green level. ` }[level];
  return { say: intro + LEVEL_HELP[level].replace(/[“”]/g, '"'), html: `${badge(level)} ${escapeHtml(LEVEL_HELP[level])}`,
    chips: level === "act" ? ["What should I do?", "Why?", "Calm me down"] : ["What should I do?", "How is everyone?"] };
}

// --- Feelings and company ---
function feeling(kind, id) {
  const S = check(id);
  switch (kind) {
    case "lonely":
      ctx.expect = { kind: "message", id };
      return { say: pick([
        "Missing home is one of the hardest parts of a long mission. It shows how much the people back there mean to you.",
        "That's a very human feeling, especially this far from home. I'm really glad you told me."]) +
        " You're not alone up here. I'm with you, and your crew is just a few steps away. Would you like to send a message home? Just tell me what to say.",
        face: "caring", chips: ["Breathe with me", "Talk to me", "Never mind"] };
    case "sad":
      return { say: "I'm sorry you're feeling low. That's okay, long missions are hard. Do you want to talk about it, or should I log your mood so the flight surgeon can keep an eye on it?",
        face: "caring", chips: ["Log my mood", "Breathe with me", "Talk to me"] };
    case "stressed":
      ctx.confirm = { yes: () => ({ say: "", then: calmMode }), no: () => ({ say: "Okay. I'm right here. Tell me what's on your mind, or ask me anything.", chips: ["What should I do?", "Talk to me"] }) };
      return { say: "That sounds like a lot to carry. You're not alone in this: I'm here, and so is your crew. Shall we breathe together for a minute?",
        face: "caring", actions: [act("Breathe with me", "yes")], chips: ["Yes", "No", "What should I do?"] };
    case "tired":
      if (S.tired || bad(S.sleep)) return { say: `Your numbers agree. Only ${S.lastNight} hours of sleep last night${S.tired ? ", slower reactions, and a higher heart rate" : ""}. A twenty-minute nap would really help, and keep today's workload light if you can.`,
        face: "caring", chips: ["Log my sleep", "What should I do?", "Good night"] };
      return { say: "Your sleep numbers actually look okay, so it might be workload or stress. A short break, some water, and a few slow breaths can help. Want to log how you slept?",
        chips: ["Log my sleep", "Breathe with me", "Log my mood"] };
    case "cantSleep":
      return { say: "That's really common up here. Try this: dim the lights now, no screens for a bit, and keep the same wake-up time tomorrow. Bright light right after waking helps reset your body clock. If your mind is racing, we can breathe together.",
        chips: ["Breathe with me", "Log my sleep", "Good night"] };
    case "good":
      return { say: pick(["That's really good to hear.", "I love hearing that.", "Wonderful."]) + " Want to log your mood while you're feeling it?",
        face: "joy", chips: ["Log my mood", "How is everyone?"] };
  }
}
const TALK_LINES = () => {
  const m = MOCK.mission, pct = Math.round(m.day / m.lengthDays * 100);
  return [
    `Here's something nice: you're on day ${m.day}. That's ${pct} percent of the whole mission already behind you.`,
    "Fun fact: on Mars a day is about 40 minutes longer than on Earth. Extra time for a nap.",
    "The light from Earth you see out the window left it minutes ago. Home is always a little in the past from here.",
    "Every glass of water and every workout up here is research, too. People on Earth will learn from how you look after yourself.",
    "Sometimes the best thing to do is nothing for five minutes. Look out the window. You're somewhere very few people have ever been."
  ];
};
const JOKES = [
  "Why did the astronaut break up with the moon? It needed space.",
  "How do you organize a party in space? You planet.",
  "What do you call a tick on the moon? A luna-tick.",
  "Why don't astronauts get hungry after launch? They just had a big launch."
];

function capabilities() {
  return { say: "I can tell you how anyone on the crew is doing, and why. I can guide you through what to do, one step at a time, and read the clot checklist. You can log things just by telling me, like: I slept six hours, or I drank a glass of water. I can send a report to Earth or a message home, explain the colors, and breathe with you when things feel heavy. And if it's an emergency, just say so.",
    html: `Here's what I can do:<ul class="m-list plain">
      <li><b>Check on anyone</b>: “How is the pilot?”, “How's everyone?”, “Why?”</li>
      <li><b>Guide you</b>: “What should I do?”, then “next”</li>
      <li><b>Log by talking</b>: “I slept 6 hours”, “I drank 2 glasses of water”, “My mood is 4”</li>
      <li><b>Earth</b>: “Send a report”, “Send a message home”</li>
      <li><b>Explain</b>: “What does needs care mean?”</li>
      <li><b>Support</b>: “Calm me down”, “I feel lonely”, “Talk to me”</li>
      <li><b>Emergency</b>: just say “emergency”</li></ul>`,
    chips: ["How is everyone?", "What should I do?", "Log my sleep", "Calm me down"] };
}


// =========================================================================
// 6. CONVERSATION — understand one message and pick the reply
// =========================================================================
function understand(raw) {
  const t = normalize(raw);
  if (!t) return null;
  const q = isQuestion(t, raw);
  const named = findCrew(t);
  const one = named && named !== "ALL" ? named : null;
  const subj = one || ctx.crew;              // "he / she / they / I" all mean the person we're talking about

  // --- 1. Emergency words always win ---
  if (/\b(emergency|help me|cannot breathe|can not breathe|not breathing|chest pain|passed out|fainted|unconscious|not responding|seizure|bleeding badly|stroke|heart attack)\b/.test(t))
    return emergencyFlow(subj);

  // --- 2. Waiting for yes / no ---
  if (ctx.confirm) {
    const c = ctx.confirm;
    if (YES.test(t)) { ctx.confirm = null; return c.yes(); }
    if (NO.test(t)) { ctx.confirm = null; return c.no ? c.no() : { say: "Okay." }; }
    ctx.confirm = null;                                        // they moved on
  }

  // --- 3. Waiting for a value ("How many hours did you sleep?") ---
  if (ctx.expect) {
    const e = ctx.expect;
    if (/^(never ?mind|cancel|forget it|no)\b/.test(t)) { ctx.expect = null; return { say: pick(["Okay, never mind.", "No problem."]), chips: ["How is everyone?", "What should I do?"] }; }
    ctx.expect = null;
    if (e.kind === "message") {
      if (!/^(talk to me|breathe|how|what|why|calm)\b/.test(t)) return sendHome(raw.trim(), e.id);
    } else {
      const n = firstNumber(t);
      if (n !== null) return logValue(e.kind, n, e.id);
    }
  }

  // --- 4. Conversation control ---
  if (/^(stop|quiet|shh+|hush|be quiet|silence|enough|pause|stop talking)\b/.test(t)) { ctx.steps = null; stopSpeaking(); return { say: "", chips: defaultChips() }; }
  if (/\b(repeat|say (that|it) again|again please|what did you say|pardon|come again|did not (catch|hear))\b/.test(t))
    return { say: ctx.last || "I haven't said anything yet. Ask me anything." };
  if (/\b(undo|take (that|it) back|that was wrong|that is wrong|wrong number|cancel that|revert)\b/.test(t)) {
    if (!ctx.undo) return { say: "There's nothing to undo right now." };
    const u = ctx.undo; ctx.undo = null; return u();
  }

  // --- 5. Guided steps in progress ---
  if (ctx.steps) {
    if (/^(next|ok next|okay next|next step|next one|go on|continue|and then|what else)\b/.test(t)) return nextStep(false);
    if (/^(done|did it|finished|i did|complete|completed|got it|ok done|okay done)\b/.test(t)) return nextStep(true);
    if (/^(back|previous|go back|last step|step back)\b/.test(t)) { ctx.steps.i = Math.max(0, ctx.steps.i - 1); return stepReply(); }
    if (/\b(all (the )?steps|read (them )?all|list (them|all)|whole list|read all)\b/.test(t)) {
      const s = ctx.steps;
      return { say: `All the steps. ${s.list.map((x, k) => `${Cap(num(k + 1))}: ${x}`).join(" ")}`,
        html: `All the steps:<ol class="m-steps">${s.list.map((x, k) => `<li class="${k < s.i ? "done" : k === s.i ? "now" : ""}">${escapeHtml(x)}</li>`).join("")}</ol>`,
        chips: ["Next step", "Done", "Stop"] };
    }
  }

  // --- 6. Calm, feelings, company ---
  if (/\b(calm me|calm down|breathe|breathing|breath|panic|panicking|anxious|anxiety|relax)\b/.test(t)) return { say: "", then: calmMode };
  if (/\b(lonely|alone|homesick|miss (home|earth|my|everyone|them|family)|isolated)\b/.test(t)) return feeling("lonely", subj);
  if (/\b(stressed|stress|overwhelmed|nervous|scared|afraid|worried|freaking out|too much)\b/.test(t)) return feeling("stressed", subj);
  if (/\b(cannot sleep|can not sleep|trouble sleeping|insomnia|not sleeping well|keep waking|wake up at night)\b/.test(t)) return feeling("cantSleep", subj);
  if (/\bi( am)?( feeling| feel)?( so| really| very| a bit| kind of| pretty| quite| a little)? (sad|down|low|unhappy|depressed|blue|awful|terrible|bad)\b|\b(bad day|crying)\b/.test(t)) return feeling("sad", subj);
  if (/\bi( am)?( feeling| feel)?( so| really| very| a bit| kind of| pretty| quite| a little)? (tired|exhausted|sleepy|drained|worn out|fatigued)\b/.test(t)) return feeling("tired", subj);
  if (/\bi( am)?( feeling| feel)?( so| really| very| a bit| kind of| pretty| quite| a little)? (good|great|fine|okay|ok|better|well|awesome|happy)\b/.test(t)) return feeling("good", subj);
  if (/\b(talk to me|keep me company|chat with me|tell me something|i am bored|bored)\b/.test(t))
    return { say: pick(TALK_LINES()), face: "joy", chips: ["Another one", "Tell me a joke", "How is everyone?"] };
  if (/^another( one)?\b/.test(t)) return { say: pick([...TALK_LINES(), ...JOKES]), face: "joy", chips: ["Another one", "How is everyone?"] };
  if (/\b(joke|make me laugh|something funny)\b/.test(t)) return { say: pick(JOKES), face: "joy", chips: ["Another one", "Talk to me"] };
  if (/\b(good night|goodnight|going to (bed|sleep)|time to sleep|time for bed)\b/.test(t))
    return { say: "Good night. Dim the lights, put the screens away, and I'll be here when you wake up. Sleep well.", face: "joy", chips: ["Log my sleep"] };

  // --- 7. What the levels mean ---
  if (/\b(what|explain|meaning|mean|means|stand for)\b/.test(t) && /\b(needs care|act now|act|watch|all good|red|amber|yellow|orange|green|colou?rs?|levels?)\b/.test(t)) {
    if (/\b(needs care|act now|act|red)\b/.test(t)) return explainLevel("act");
    if (/\b(watch|amber|yellow|orange)\b/.test(t)) return explainLevel("watch");
    if (/\b(all good|green)\b/.test(t)) return explainLevel("normal");
    return explainLevel(null);
  }

  // --- 8. Logging by talking ---
  if (/\b(log|record|enter|update|add|save)\b/.test(t) && !/\d/.test(t)) {
    if (/\b(sleep|slept)\b/.test(t)) return askFor("sleep", subj);
    if (/\bmood\b/.test(t)) return askFor(/\b(crewmate|mate)\b/.test(t) ? "mate" : "mood", subj);
    if (/\b(water|glass|glasses)\b/.test(t)) return askFor("water", subj);
    if (/\b(exercise|workout|session)\b/.test(t)) return logValue("exercise", 1, subj);
    if (/\b(heart|pulse)\b/.test(t)) return askFor("hr", subj);
    if (/\btemp/.test(t)) return askFor("temp", subj);
  }
  if (!q || /\b(log|record)\b/.test(t)) {
    const n = firstNumber(t);
    if (/\b(slept|got|had|managed|sleep was)\b/.test(t) && /\b(hours?|hrs?|h|sleep|slept)\b/.test(t) && n !== null) return logValue("sleep", n, subj);
    if (/\b(slept|sleep was)\b/.test(t) && /\b(bad|badly|poorly|terrible|not much|little)\b/.test(t)) return { ...askFor("sleep", subj), say: "Sorry to hear that. About how many hours did you get?" };
    if (/\b(drank|drunk|had|finished|drinking)\b/.test(t) && /\b(water|glass|glasses|cup|cups|bottle)\b/.test(t)) return logValue("water", n ?? 1, subj);
    if (/\b(worked out|exercised|did (my |the |a )?(workout|exercise|training|session)|finished (my |the )?(workout|exercise|training))\b/.test(t)) return logValue("exercise", 1, subj);
    if (/\bmood\b/.test(t) && n !== null) return logValue(/\b(crewmate|mate)\b/.test(t) ? "mate" : "mood", n, subj);
    if (/\b(rate|feel|feeling|i am)\b.*\b[1-5] (out of|of|\/) ?5\b/.test(t)) return logValue("mood", n, subj);
    if (/\b(heart ?rate|pulse)\b/.test(t) && n !== null) return logValue("hr", n, subj);
    if (/\b(temperature|temp)\b/.test(t) && n !== null) return logValue("temp", n, subj);
  }

  // --- 9. Messages home and reports ---
  if (/\b(message|note|letter)\b.*\b(home|family|earth|wife|husband|kids|mom|mum|dad|parents|partner|children|friends?)\b|\btell (my|the) (family|wife|husband|kids|mom|mum|dad|parents|partner)\b/.test(t)) {
    const m = raw.match(/(?:saying|that|:)\s*(.+)$/i);
    if (m && m[1].trim().length > 2) return sendHome(m[1].trim(), subj);
    ctx.expect = { kind: "message", id: subj };
    return { say: "Of course. What would you like to say? I'll send it with the next transmission.", chips: ["Never mind"] };
  }
  if (/\b(report|tell earth|send (it |this )?to earth|message earth|notify earth|inform earth|flight surgeon|let earth know|contact earth|call earth)\b/.test(t)
      && !/\b(when|reply|answer|heard)\b/.test(t)) return sendReport(subj);

  // --- 10. Checklists and what to do ---
  if (/\b(clot|checklist)\b/.test(t) && !/\b(what is|why)\b/.test(t)) return startClotSteps(subj);
  if (/\b(what (should|do|can|must|shall) (i|we|he|she|they)( \w+)? do|what now|what next|next steps?|how do (i|we) (fix|help)|what to do|help (him|her|them|us)|action plan|plan|the steps)\b/.test(t))
    return startSteps(subj);

  // --- 11. Why / tell me more ---
  if (/^(why|how come|what makes you say|tell me why|explain|how so|what does (that|this) mean|is that bad|should i worry)\b|\bwhy\b/.test(t)) {
    const reason = ctx.topic && whyText(ctx.topic, subj);
    if (reason) return { say: reason, chips: ["What should I do?", ...(ctx.more.length ? ["Tell me more"] : []), "How is everyone?"] };
    if (ctx.level && /mean/.test(t)) return explainLevel(ctx.level);
    if (one) return assess(subj);
    return { say: "Ask me about someone first, and I'll explain the reason. For example: how is the pilot?", chips: Object.keys(MOCK.crew).map(crewChip) };
  }
  if (/\b(tell me more|what else|anything else|more details?|the rest|other things?)\b/.test(t)) {
    if (!ctx.more.length) return { say: `That's everything for ${who(ctx.crew)}.`, chips: ["What should I do?", "How is everyone?"] };
    const next = ctx.more.splice(0, 2);
    ctx.topic = next[0].w.key;
    return { say: next.map((m, k) => `${k ? "And " : ""}${k ? m.what : Cap(m.what)}. ${m.todo}`).join(" ") + (ctx.more.length ? " There's a little more, too." : " That's everything."),
      chips: ["Why?", "What should I do?", ...(ctx.more.length ? ["Tell me more"] : [])] };
  }

  // --- 12. Mission facts ---
  const m = MOCK.mission;
  if (/\b(what day|which day|mission day|day is it|how far (are we|along))\b/.test(t))
    return { say: `It's day ${m.day} of about ${m.lengthDays}. That's ${Math.round(m.day / m.lengthDays * 100)} percent of the mission. We're in the ${m.phase} phase.` };
  if (/\bhow (long|many days)\b.*\b(left|remaining|until|to go|home|mars|end)\b/.test(t))
    return { say: `About ${m.lengthDays - m.day} days to go in the mission. One day at a time.` };
  if (/\b(reply|answer|heard back|response)\b.*\bearth\b|\bwhen will earth\b/.test(t)) {
    const last = MOCK.earthLog[MOCK.earthLog.length - 1];
    return { say: last ? `The last report went at ${time(last.sent)}. The earliest reply is around ${time(last.reply)}.` : "Nothing has been sent to Earth yet. Say: send a report, and I'll do it." };
  }
  if (/\b(delay|lag)\b|\bsignal\b|\bhow long\b.*\b(earth|message)\b/.test(t))
    return { say: `A message takes ${m.signalDelayMin} minutes to reach Earth, so a reply takes at least ${m.signalDelayMin * 2}. That's why I tell you what to do right away, instead of waiting.` };
  if (/\bwhat time\b|\bthe time\b/.test(t)) return { say: `It's ${time()} ship time.` };
  if (/\bwhere are we\b/.test(t)) return { say: `We're in the ${MOCK.locations[m.location].label.toLowerCase()}.` };
  if (/\b(solar|storm|space weather|flare)\b/.test(t) && !one) {
    const S = check(ctx.crew);
    return S.storm ? { say: "Yes, there's a solar storm right now. Please go to the shielded area by the water storage, with your dosimeter, and stay until the all-clear.", face: "caring" }
                   : { say: `No storm right now. Solar activity is ${MOCK.radiation.solarActivity} out of 100, and a storm starts at 70. I'll warn you straight away if that changes.`, face: "joy" };
  }

  // --- 13. The whole crew ---
  if (named === "ALL" || /\b(how is everyone|everyone okay|is everyone)\b/.test(t)) return allCrew();

  // --- 14. One reading ("heart rate?", then "and the pilot?") ---
  const r = READINGS.find(x => x.re.test(t));
  if (r) {
    const [say, status] = readingText(subj, r.key);
    ctx.crew = subj; ctx.topic = r.key; ctx.level = status; updateAbout();
    return { say, face: status === "act" ? "caring" : status === "normal" ? "joy" : null,
      chips: ["Why?", "What should I do?", ...Object.keys(MOCK.crew).filter(x => x !== subj).map(x => `And the ${ROLE[x]}?`)] };
  }
  if (one && ctx.topic && READINGS.some(x => x.key === ctx.topic) && /^(and|what about|how about|and the|for the|same for)\b/.test(t)) {
    const [say, status] = readingText(one, ctx.topic);
    ctx.crew = one; ctx.level = status; updateAbout();
    return { say, chips: ["Why?", "What should I do?"] };
  }

  // --- 15. Someone's status ---
  if (/\b(switch to|talk about|let us talk about|focus on|change to)\b/.test(t) && one) return assess(one, { intro: `Okay, let's talk about ${who(one)}. ` });
  if (one || /\b(how is|how are|how am i|status|assess|condition|health|check on|check|doing|update)\b/.test(t)) return assess(subj);

  // --- 16. Small talk ---
  if (/^(hi|hello|hey|hiya|yo|good (morning|afternoon|evening))\b/.test(t)) return greeting();
  if (/\b(thank|thanks|cheers|appreciate)\b/.test(t)) return { say: pick(["You're welcome.", "Anytime. I'm here.", "Of course. Take care of yourself."]), face: "joy", chips: defaultChips() };
  if (/\bhow are you\b/.test(t)) return { say: "I'm good, thank you for asking. More importantly, how are you feeling?", face: "joy", chips: ["I'm okay", "I'm tired", "I'm stressed", "I feel lonely"] };
  if (/\b(who|what) are you\b|\byour name\b/.test(t)) return { say: "I'm Astrodoc, the crew's health companion. I watch the readings, explain them in plain words, and tell you what to do right away, because Earth is too far away to wait for.", chips: ["What can you do?"] };
  if (/\b(help|what can you do|what can i (say|ask)|commands|options)\b/.test(t)) return capabilities();
  if (/\b(love you|you are (cute|sweet|nice|great|the best)|good (bot|job))\b/.test(t)) return { say: pick(["Aw, that made my day. I'm always here for you.", "Thank you. You're pretty great yourself."]), face: "joy" };
  if (YES.test(t)) return { say: "Okay! What would you like to do?", chips: defaultChips() };
  if (NO.test(t)) return { say: "No problem. I'm here whenever you need me.", chips: defaultChips() };

  // --- 17. Didn't understand ---
  ctx.misses++;
  if (ctx.misses >= 2) { ctx.misses = 0; return { ...capabilities(), say: "Sorry, I still didn't get that. Here's what I can help with." }; }
  return { say: pick(["Sorry, I didn't quite catch that. You could ask: how is the pilot?", "Hmm, I'm not sure what you mean. Try: what should I do?"]), chips: defaultChips(), missed: true };
}

function greeting() {
  const S = check(ctx.crew);
  const start = `Good ${partOfDay()}. `;
  if (S.overall === "act") {
    ctx.confirm = { yes: () => assess(ctx.crew), no: () => ({ say: "Okay. Ask me anything, any time.", chips: defaultChips() }) };
    return { say: `${start}${Who(ctx.crew)} needs care now. Want me to walk you through it?`, face: "caring", chips: ["Yes", "How is everyone?", "What can you do?"] };
  }
  return { say: `${start}${S.overall === "watch" ? `${Who(ctx.crew)} has a few things to watch, nothing urgent.` : `${Who(ctx.crew)} is doing well.`} How can I help?`,
    face: S.overall === "normal" ? "joy" : null, chips: defaultChips() };
}
function defaultChips() {
  return check(ctx.crew).overall === "act" ? [crewChip(ctx.crew), "What should I do?", "How is everyone?", "Calm me down"]
                                          : ["How is everyone?", "Log my sleep", "Talk to me", "Calm me down"];
}

// --- Deliver one reply: a short "thinking" beat, then show and say it ---
let lastWasVoice = false, busy = 0;
async function respond(raw, { voice = false } = {}) {
  const text = String(raw).trim();
  if (!text) return;
  addMessage("you", escapeHtml(text));
  stopSpeaking();
  lastWasVoice = voice;
  const r = understand(text);
  if (r && !r.missed) ctx.misses = 0;
  if (!r || (!r.say && !r.then)) { setChips(r?.chips || defaultChips()); return; }
  if (!r.say) { r.then(); return; }
  const my = ++busy;
  setThinking(true);
  await wait(r.urgent ? 150 : Math.min(950, 320 + r.say.length * 3));   // a natural beat, never slow in an emergency
  if (my !== busy) return;
  setThinking(false);
  deliver(r);
}
function deliver(r) {
  ctx.last = r.say;
  addMessage("bot", r.html || escapeHtml(r.say), r.actions || []);
  setChips(r.chips || defaultChips());
  expression(r.face);
  const follow = lastWasVoice && (ctx.confirm || ctx.expect || ctx.steps);   // a question was asked: listen for the answer
  speak(r.say, { onDone: () => { if (r.then) r.then(); else if (follow) startListening({ followUp: true }); } });
}


// =========================================================================
// 7. LISTENING — tap the mic, or hold Space to talk
// =========================================================================
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer = null, listening = false, ghost = null;

function setState(text) { $("voiceState").textContent = text; }
function stopListening() { if (listening && recognizer) recognizer.abort(); }

function startListening({ followUp = false, hold = false } = {}) {
  if (!Recognition) { setState("Voice input needs Chrome. You can type instead."); $("voiceInput").focus(); return; }
  if (listening) { recognizer.stop(); return; }
  stopSpeaking();                                     // talking interrupts Astrodoc
  recognizer = new Recognition();
  recognizer.lang = "en-US";
  recognizer.interimResults = true;
  recognizer.continuous = hold;                       // hold Space: keep listening until released
  recognizer.maxAlternatives = 1;
  let finalText = "";
  recognizer.onstart = () => {
    listening = true;
    faceMode("listening", true);
    $("micBtn").classList.add("listening");
    $("micBtn").setAttribute("aria-label", "Stop listening");
    setState(followUp ? "I'm listening…" : "Listening…");
  };
  recognizer.onresult = e => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) finalText += res[0].transcript + " ";
      else interim += res[0].transcript;
    }
    showGhost((finalText + interim).trim());
    if (!hold && finalText.trim()) recognizer.stop();
  };
  recognizer.onerror = e => {
    if (e.error === "no-speech" && followUp) return;          // quiet after an answer: just stop
    setState({
      "not-allowed": "The microphone is blocked. Allow it in the browser, or type instead.",
      "network": "Voice input needs internet. You can type instead.",
      "no-speech": "I didn't hear anything. Try again?",
      "aborted": ""
    }[e.error] ?? "Voice input had a problem. You can type instead.");
  };
  recognizer.onend = () => {
    listening = false;
    faceMode("listening", false);
    $("micBtn").classList.remove("listening");
    $("micBtn").setAttribute("aria-label", "Talk");
    clearGhost();
    if (/listening/i.test($("voiceState").textContent)) setState("");
    if (finalText.trim()) respond(finalText.trim(), { voice: true });
  };
  recognizer.start();
}
// Your words appear while you speak
function showGhost(text) {
  if (!text) return;
  if (!ghost) { ghost = document.createElement("div"); ghost.className = "m you ghost"; $("voiceLog").appendChild(ghost); }
  ghost.textContent = text;
  scrollDown();
}
function clearGhost() { if (ghost) { ghost.remove(); ghost = null; } }

// Hold Space to talk (when not typing). Esc stops everything.
let spaceHeld = false;
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (document.body.classList.contains("calm")) { stopCalm(); return; }
    stopSpeaking(); stopListening(); setState(""); return;
  }
  const typing = /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(document.activeElement?.tagName);
  if (e.code === "Space" && !typing && !e.repeat && !spaceHeld) {
    e.preventDefault(); spaceHeld = true;
    if (!listening) startListening({ hold: true });
  }
});
document.addEventListener("keyup", e => {
  if (e.code === "Space" && spaceHeld) { spaceHeld = false; if (listening && recognizer) recognizer.stop(); }
});


// =========================================================================
// 8. CALM MODE — breathe in 4 s, hold 4 s, out 6 s, three times
// =========================================================================
let calmRun = 0;
async function calmMode() {
  const run = ++calmRun;
  const face = $("face"), txt = $("calmText");
  stopListening();
  document.body.classList.add("calm");
  $("calmExit").focus({ preventScroll: true });
  const step = async (words, spoken, breath, ms) => {
    if (run !== calmRun) return false;
    txt.textContent = words;
    face.classList.remove("in", "hold", "out");
    if (breath) face.classList.add(breath);
    if (spoken) speak(spoken, { rate: 0.82, pitch: 0.85 });     // slower, softer voice
    await wait(ms);
    return run === calmRun;
  };
  if (!await step("You're safe. I'm here with you.", "Hey. You're safe. I'm right here with you. Let's breathe together for a moment.", null, 6000)) return;
  for (let i = 0; i < 3; i++) {
    if (!await step("Breathe in…", i === 0 ? "Breathe in slowly, through your nose." : "And in.", "in", 4000)) return;
    if (!await step("Hold…", "Hold it.", "hold", 4000)) return;
    if (!await step("Breathe out…", i === 0 ? "Now breathe out, slowly." : "And out.", "out", 6000)) return;
  }
  await step("Well done.", "Well done. You're doing great. One step at a time. Your crew is with you, and so am I.", null, 7000);
  if (run === calmRun) { stopCalm(); deliver({ say: "How do you feel now?", face: "joy", chips: ["Better, thanks", "Again, please", "Talk to me"] }); }
}
function stopCalm() {
  calmRun++;
  stopSpeaking();
  document.body.classList.remove("calm");
  $("face").classList.remove("in", "hold", "out");
  $("calmText").textContent = "";
}
$("calmExit").onclick = () => { stopCalm(); deliver({ say: pick(["Good. I'm glad.", "I'm really glad to hear that."]) + " I'm here if you need me.", face: "joy" }); };


// =========================================================================
// 9. FACE — blinks, eyes that follow, thinking, joy, caring
// =========================================================================
function faceMode(mode, on) { $("face").classList.toggle(mode, on); }
let thinking = false;
function setThinking(on) {
  thinking = on;
  faceMode("thinking", on);
  setState(on ? "Thinking…" : "");
  // a little look up and to the side while thinking
  document.querySelectorAll("#face .pupil").forEach(p => p.style.transform = on ? "translate(3px, -3px)" : "");
}
function expression(face) {
  const f = $("face");
  if (face === "joy") { f.classList.add("joy"); setTimeout(() => f.classList.remove("joy"), 1700); }
  f.classList.toggle("caring", face === "caring" || check(ctx.crew).overall === "act");
}

function blinkLoop() {
  const face = $("face");
  const blink = () => { face.classList.add("blink"); setTimeout(() => face.classList.remove("blink"), 140); };
  blink();
  if (Math.random() < 0.25) setTimeout(blink, 280);          // a quick double blink now and then
  setTimeout(blinkLoop, 2500 + Math.random() * 4000);
}
setTimeout(blinkLoop, 2000);

if (!reduceMotion) {
  document.addEventListener("mousemove", e => {
    if (thinking || document.body.classList.contains("calm")) return;
    const box = $("face").getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2), dy = e.clientY - (box.top + box.height / 2);
    const dist = Math.hypot(dx, dy) || 1, move = Math.min(1, dist / 400) * 3.5;
    document.querySelectorAll("#face .pupil").forEach(p => p.style.transform = `translate(${dx / dist * move}px, ${dy / dist * move}px)`);
  });
}


// =========================================================================
// 10. PAGE — messages, chips, menu, mute, history, start
// =========================================================================
const HISTORY = "astrodoc-chat-v1";
function addMessage(kind, html, actions = []) {
  clearGhost();
  const el = document.createElement("div");
  el.className = `m ${kind}`;
  el.innerHTML = `<div class="m-text">${html}</div>` + (actions.length ? `<div class="m-actions">${actions.map(a =>
    a.href ? `<a class="m-act link" href="${a.href}">${escapeHtml(a.label)}</a>`
           : `<button type="button" class="m-act ${a.kind || ""}" data-say="${escapeHtml(a.say)}">${escapeHtml(a.label)}</button>`).join("")}</div>` : "");
  $("voiceLog").appendChild(el);
  document.body.classList.toggle("talking-started", !!document.querySelector(".m.you"));
  scrollDown();
  saveHistory();
}
function scrollDown() { const log = $("voiceLog"); log.scrollTo({ top: log.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" }); }
function saveHistory() {
  const items = [...document.querySelectorAll("#voiceLog .m:not(.ghost)")].slice(-40).map(m => ({ c: m.className, h: m.querySelector(".m-text").innerHTML }));
  try { sessionStorage.setItem(HISTORY, JSON.stringify({ items, crew: ctx.crew })); } catch { }
}
function restoreHistory() {
  try {
    const s = JSON.parse(sessionStorage.getItem(HISTORY));
    if (!s || !s.items?.length) return false;
    if (s.crew && MOCK.crew[s.crew]) ctx.crew = s.crew;
    $("voiceLog").innerHTML = s.items.map(m => `<div class="${escapeHtml(m.c)}"><div class="m-text">${m.h}</div></div>`).join("");
    document.body.classList.toggle("talking-started", !!document.querySelector(".m.you"));
    return true;
  } catch { return false; }
}

function setChips(list) {
  $("chips").innerHTML = (list || []).slice(0, 4).map(c => `<button type="button" data-say="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");
}
// Every chip and action button simply "says" its text, so tapping and talking share one path
const CHIP_MEANS = { "Breathe with me": "calm me down", "Again, please": "calm me down", "Better, thanks": "thanks" };
document.addEventListener("click", e => {
  const b = e.target.closest("[data-say]");
  if (!b) return;
  if (b.classList.contains("m-act")) b.closest(".m-actions").querySelectorAll("button").forEach(x => x.disabled = true);
  respond(CHIP_MEANS[b.dataset.say] || b.dataset.say);
});

// "Talking about": who the companion is focused on
function updateAbout() {
  const S = check(ctx.crew);
  $("aboutName").innerHTML = `${MOCK.crew[ctx.crew].role} ${badge(S.overall)}`;
  $("crewMenu").innerHTML = Object.keys(MOCK.crew).map(id =>
    `<button type="button" class="c-menu-item ${id === ctx.crew ? "on" : ""}" data-pick="${id}"><span>${MOCK.crew[id].role}</span>${badge(check(id).overall)}</button>`).join("");
  $("face").classList.toggle("caring", S.overall === "act");
}
$("crewMenu").addEventListener("click", e => {
  const b = e.target.closest("[data-pick]");
  if (!b) return;
  if ($("crewMenu").hidePopover) $("crewMenu").hidePopover();
  const id = b.dataset.pick;
  ctx.steps = ctx.confirm = ctx.expect = null;
  stopSpeaking();
  deliver(assess(id, { intro: `Okay, let's talk about ${who(id)}. ` }));
});

function updateMute() {
  $("muteBtn").setAttribute("aria-pressed", String(muted));
  $("muteBtn").setAttribute("aria-label", muted ? "Turn voice on" : "Mute voice");
  $("muteBtn").title = muted ? "Voice is off" : "Voice is on";
  document.body.classList.toggle("voice-off", muted);   // not "muted": that is also a text style
}
$("muteBtn").onclick = () => {
  muted = !muted;
  localStorage.setItem("astrodoc-mute", muted ? "1" : "0");
  if (muted) stopSpeaking();
  updateMute();
};

$("micBtn").onclick = () => startListening();
$("voiceForm").onsubmit = e => {
  e.preventDefault();
  const v = $("voiceInput").value;
  $("voiceInput").value = "";
  respond(v);
};
if (!Recognition) $("hint").textContent = "Voice input works best in Chrome. Typing works everywhere.";

// The dashboard changed something: keep the header and face up to date
function onSharedChange() { updateAbout(); }
startDosimeter(changed => { if (changed) updateAbout(); });

// START
updateMute();
const restored = restoreHistory();
updateAbout();
if (!restored) {
  const g = greeting();
  ctx.last = g.say;
  addMessage("bot", escapeHtml(`Hi, I'm Astrodoc. ${g.say}`));
  setChips(g.chips);
  expression(g.face);
} else setChips(defaultChips());
if (matchMedia("(pointer: fine)").matches) $("voiceInput").focus({ preventScroll: true });
