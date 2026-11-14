// =========================================================================
// Astrodoc — Voice assistant
// Press the mic and ask, e.g. "How is the commander?" The app assesses that
// crew member with the same rules as the dashboard and answers out loud,
// in plain conversational words.
//
// Uses the browser's built-in speech tools (Chrome):
//   - SpeechRecognition: needs internet in Chrome
//   - speechSynthesis:   works offline
// If the mic doesn't work, the crew can type or tap a quick button instead.
// =========================================================================

// How we talk about each crew member in a sentence
const VOICE_NAMES = { CDR: "Commander", PLT: "Pilot", MS1: "Mission Specialist" };
const who = id => ({ CDR: "the commander", PLT: "the pilot", MS1: "the mission specialist" })[id];
const Cap = s => s[0].toUpperCase() + s.slice(1);
const pick = list => list[Math.floor(Math.random() * list.length)];
const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const num = n => NUM[n] || String(n);


// =========================================================================
// 1. THE VOICE — choose the most natural voice and speak in short sentences
// =========================================================================
let bestVoice = null;

// Score the installed voices and keep the most natural-sounding English one
function chooseVoice() {
  if (!("speechSynthesis" in window)) return;
  const score = v => {
    const n = v.name;
    let s = 0;
    if (/natural|neural/i.test(n)) s += 100;                 // e.g. Microsoft "Aria Online (Natural)"
    if (/premium|enhanced/i.test(n)) s += 80;                // e.g. macOS "Ava (Premium)"
    if (/Google US English/i.test(n)) s += 60;               // Chrome's online voice
    if (/Samantha|Ava|Allison|Susan|Zoe|Karen|Serena|Aria|Jenny|Google UK English Female/i.test(n)) s += 40;
    if (/en[-_]US/i.test(v.lang)) s += 10;
    // macOS novelty voices sound robotic: never use them
    if (/Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Ralph|Kathy|Grandpa|Grandma|Eddy|Flo|Reed|Rocko|Sandy|Shelley/i.test(n)) s -= 200;
    return s;
  };
  const english = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
  bestVoice = english.sort((a, b) => score(b) - score(a))[0] || null;
}
if ("speechSynthesis" in window) {
  chooseVoice();
  speechSynthesis.onvoiceschanged = chooseVoice;   // Chrome loads voices a moment after start
}

// Turn numbers and units into words that sound right
function speakable(text) {
  return text
    .replace(/(\d+)\/(\d+)/g, "$1 over $2")
    .replace(/°C/g, " degrees")
    .replace(/\bbpm\b/g, "beats per minute")
    .replace(/\bmSv\b/g, "millisieverts")
    .replace(/(\d+(\.\d+)?) h\b/g, "$1 hours")
    .replace(/\bCDR\b/g, "commander").replace(/\bPLT\b/g, "pilot").replace(/\bMS1\b/g, "mission specialist")
    .replace(/[()]/g, ", ");
}

// The face: "talking" moves the mouth, "listening" widens the eyes
function faceMode(mode, on) { $("face").classList.toggle(mode, on); }

// Speak sentence by sentence. Short pieces sound more natural, give small pauses
// between sentences, and avoid Chrome cutting off long speech.
let speakToken = 0;
function speak(text, { rate = 0.95, pitch = 1.05, onDone } = {}) {
  const token = ++speakToken;
  if (!("speechSynthesis" in window)) {            // no voice: still move the mouth for a moment
    faceMode("talking", true);
    setTimeout(() => { faceMode("talking", false); if (token === speakToken && onDone) onDone(); }, Math.min(6000, text.length * 55));
    return;
  }
  speechSynthesis.cancel();
  const parts = speakable(text).split(/(?<=[.!?])\s+/).filter(p => p.trim());
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    if (bestVoice) { u.voice = bestVoice; u.lang = bestVoice.lang; } else u.lang = "en-US";
    u.rate = rate;
    u.pitch = pitch;
    u.onstart = () => { if (token === speakToken) faceMode("talking", true); };
    u.onend = u.onerror = () => {
      if (token !== speakToken) return;
      faceMode("talking", false);                  // mouth rests between sentences
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

// Answer: show it in the conversation and say it.
// If the question was spoken, listen again afterwards for a follow-up.
let lastWasVoice = false;
function reply(text) {
  addLog("assistant", text);
  const followUp = lastWasVoice;
  speak(text, { onDone: () => { if (followUp && !$("voicePanel").hidden) startListening({ followUp: true }); } });
}


// =========================================================================
// 2. WHAT TO SAY — natural sentences built from the dashboard's check()
// =========================================================================

// Each warning (by its key from app.js) as natural speech: what is wrong + what to do
function spokenWarning(w, id) {
  const c = MOCK.crew[id], S = check(id);
  const n = who(id), ns = n + "'s";
  const phrases = {
    emergency: [`a medical emergency has been declared for ${n}`, "Put the oxygen mask on and keep still. Earth has been told."],
    storm:     ["there's a solar storm right now", "Please go to the shielded area by the water storage, and take your dosimeter with you."],
    clot:      ["the blood test shows a pattern that can mean a blood clot", "Please stop work, stay still, and follow the clot checklist on screen. I've already told Earth."],
    labs:      [`some blood test results are outside the normal range: ${S.labOut.map(l => l.name).join(" and ")}`,
                S.blood === "act" ? "Please stop work and follow the clot checklist." : "Drink some water, and repeat the test within a day."],
    trend:     [`the ${S.labTrend.join(" and ")} result keeps getting worse`, "I've already sent a report to the flight surgeon. Repeat the test within a day."],
    tired:     [`${n} is very tired. Only ${S.lastNight} hours of sleep, slower reactions, and a heart rate of ${c.vitals.hr}`,
                "A short nap now would really help, with a lighter workload today."],
    sleep:     [bad(T.sleepNight(S.lastNight, c.sleep.hoursAwake)) ? `${n} only slept ${S.lastNight} hours last night` : `${n} is about ${Math.round(S.debt)} hours short on sleep this week`,
                "Try to keep fixed sleep times, with bright light after waking and dim light before bed."],
    reaction:  [`${ns} reactions are ${S.reactionPct} percent slower than usual`, "It's better to avoid critical tasks for now, and rest if you can."],
    hr:        [`${ns} resting heart rate is ${c.vitals.hr > 100 ? "high" : "low"}, at ${c.vitals.hr} beats per minute`, "Sit down, rest for five minutes, and measure again."],
    temp:      [`${ns} temperature is ${c.vitals.temp >= 37.3 ? "a bit high" : "low"}, at ${c.vitals.temp} degrees`, "Rest, drink some water, and check again in an hour."],
    bp:        [`${ns} blood pressure is a little high, ${c.vitals.bpSys} over ${c.vitals.bpDia}`, "Rest for a few minutes and measure again."],
    mood:      S.mood === "act"
                ? [`${ns} mood is very low`, "Please talk to the flight surgeon, and take some work off the plan today."]
                : [`${ns} mood is a bit low today`, "Take a short break, do something you enjoy, and talk with the crew."],
    gap:       [`${n} and the crewmate see ${S.biggestGap.m} differently`, "It's worth talking about together. Tired people often don't notice it themselves."],
    dose:      [`${ns} radiation dose is ${S.dose.toFixed(0)}, out of a career limit of 600`, "Log it, and check the exposure plan with Earth."],
    exercise:  [`${n} only did ${num(c.exercise)} exercise sessions this week`, "Try not to skip the next one. It protects bones and muscles."],
    water:     [`${n} has only had ${num(c.water.glasses)} glasses of water today`, "Have a drink of water now."],
    vitd:      [`${ns} vitamin D is out of range`, "Ask the flight surgeon about a supplement."]
  };
  const [what, todo] = phrases[w.key] || [w.title, w.todo];
  return { what, todo };
}

// Full assessment of one crew member
function assess(id) {
  const S = check(id);
  const n = who(id);
  if (!S.warnings.length) {
    return pick([
      `Good news. ${Cap(n)} is doing well. Every reading is in the normal range.`,
      `${Cap(n)} is all good. Nothing to worry about right now.`,
      `I've checked ${n}. Everything looks normal. Keep up the routine.`
    ]);
  }
  const acts = S.warnings.filter(w => w.status === "act").length;
  const top = S.warnings.slice(0, 2).map(w => spokenWarning(w, id));
  const rest = S.warnings.length - top.length;
  let out = "";
  if (S.overall === "act") {
    out += pick(["Okay, stay calm. I'm here to help. ", "Alright, let's take this calmly. ", "Okay. Take a breath, I'll guide you. "]);
    out += `${Cap(n)} needs attention right now. `;
    out += acts === 1 ? "There's one urgent problem. " : `There are ${num(acts)} urgent problems. `;
  } else {
    out += pick(["Let me see. ", "Okay. ", "Sure. "]);
    out += `${Cap(n)} is mostly okay, but there ${S.warnings.length === 1 ? "is one thing" : `are ${num(S.warnings.length)} things`} to keep an eye on. `;
  }
  out += `The main one: ${top[0].what}. ${top[0].todo} `;
  if (top[1]) out += `Also, ${top[1].what}. ${top[1].todo} `;
  if (rest > 0) out += rest === 1 ? "There's one more small thing on the screen. " : `There are ${num(rest)} more small things on the screen. `;
  if (S.overall === "act") out += "If you feel stressed, just say: calm me down.";
  return out.trim();
}

function allCrew() {
  const say = { act: "needs attention right now", watch: "has a few things to watch", normal: "is doing fine" };
  const lines = Object.keys(MOCK.crew).map(id => `${Cap(who(id))} ${say[check(id).overall]}.`);
  return `Here's the whole crew. ${lines.join(" ")}`;
}

// One clear step per problem, for "what should I do?"
function stepFor(w, id) {
  const S = check(id);
  const steps = {
    emergency: "keep the oxygen mask on and stay still",
    storm:     "go to the shielded area by the water storage",
    clot:      "stop work, stay still, and follow the clot checklist on screen",
    labs:      S.blood === "act" ? "stop work and follow the clot checklist" : "drink some water and repeat the blood test within a day",
    trend:     "repeat the blood test within a day. I've already told the flight surgeon",
    tired:     "take a short nap, and keep today's workload light",
    sleep:     "keep fixed sleep times tonight, with dim light before bed",
    reaction:  "avoid critical tasks for now",
    hr:        "sit, rest for five minutes, and measure your heart rate again",
    temp:      "drink some water and check your temperature again in an hour",
    bp:        "rest, and measure your blood pressure again",
    mood:      S.mood === "act" ? "talk to the flight surgeon, and lighten today's plan" : "take a short break and talk with the crew",
    gap:       "talk with your crewmate about how you're feeling",
    dose:      "log the radiation dose",
    exercise:  "don't skip your next exercise session",
    water:     "drink a glass of water",
    vitd:      "ask the flight surgeon about vitamin D"
  };
  return steps[w.key] || w.todo;
}

function whatToDo(id) {
  const S = check(id);
  if (!S.warnings.length) return `${Cap(who(id))} doesn't need to do anything right now. Just keep the routine.`;
  const todos = S.warnings.slice(0, 4).map(w => stepFor(w, id) + ".");
  const words = ["First,", "Then,", "After that,", "And finally,"];
  const lower = t => /^I\b|^I'/.test(t) ? t : t[0].toLowerCase() + t.slice(1);   // keep "I" capital
  const steps = todos.map((t, i) => `${i === todos.length - 1 && i > 1 ? "And finally," : words[i]} ${lower(t)}`);
  return `Here's what ${who(id)} should do. ${steps.join(" ")}`;
}

// One reading, e.g. "heart rate"
function reading(id, key) {
  const c = MOCK.crew[id], S = check(id), ns = Cap(who(id)) + "'s";
  const verdict = s => ({
    normal: "That's normal.",
    watch: "That's a little outside the normal range, so keep an eye on it.",
    act: "That needs attention now."
  })[s];
  switch (key) {
    case "hr":    return `${ns} heart rate is ${c.vitals.hr} beats per minute. ${verdict(S.hr)}`;
    case "temp":  return `${ns} temperature is ${c.vitals.temp} degrees. ${verdict(S.temp)}`;
    case "bp":    return `${ns} blood pressure is ${c.vitals.bpSys} over ${c.vitals.bpDia}. ${verdict(S.bp)}`;
    case "sleep": return `${Cap(who(id))} slept ${S.lastNight} hours last night, and is about ${Math.round(S.debt)} hours short this week. ${verdict(S.sleep)}`;
    case "mood":  return `${ns} mood is ${num(S.moodValue)} out of five. They rated themselves ${num(c.checkin.self.mood)}, and the crewmate said ${num(c.checkin.mate.mood)}. ${verdict(worst(S.mood, S.biggestGap.status))}`;
    case "rad":   return S.storm
                    ? `There's a solar storm right now. Please go to the shielded area. ${ns} career dose is ${S.dose.toFixed(0)} out of 600.`
                    : `${ns} career radiation dose is ${S.dose.toFixed(0)} out of a limit of 600. ${verdict(S.radiation)}`;
    case "ex":    return `${Cap(who(id))} did ${num(c.exercise)} exercise sessions this week. ${verdict(S.exercise)}`;
    case "blood": return S.clotPattern ? `${ns} blood test shows a pattern that can mean a clot. Please stop work, stay still, and follow the clot checklist.`
                    : S.labOut.length ? `${ns} blood test has ${S.labOut.map(l => l.name).join(" and ")} outside the normal range. ${verdict(S.blood)}`
                    : `${ns} blood tests all look normal.`;
  }
}


// =========================================================================
// 3. CALM MODE — big face and guided breathing
// Breathing: in 4 s, hold 4 s, out 6 s, three times.
// =========================================================================
let calmRun = 0;   // changes when calm mode stops, so old timers end
const wait = ms => new Promise(r => setTimeout(r, ms));

async function calmMode() {
  const run = ++calmRun;
  const panel = $("voicePanel"), face = $("face"), txt = $("calmText");
  stopListening();
  openVoice();
  panel.classList.add("calm");
  const step = async (words, spoken, breath, ms) => {
    if (run !== calmRun) return false;
    txt.textContent = words;
    face.classList.remove("in", "hold", "out");
    if (breath) face.classList.add(breath);
    if (spoken) speak(spoken, { rate: 0.82, pitch: 1 });   // slower, softer voice
    await wait(ms);
    return run === calmRun;
  };
  addLog("assistant", "Let's breathe together for a minute.");
  if (!await step("You're safe. I'm here with you.", "Hey. You're safe. I'm right here with you. Let's breathe together for a moment.", null, 6000)) return;
  for (let i = 0; i < 3; i++) {
    if (!await step("Breathe in…", i === 0 ? "Breathe in slowly, through your nose." : "And in.", "in", 4000)) return;
    if (!await step("Hold…", "Hold it.", "hold", 4000)) return;
    if (!await step("Breathe out…", i === 0 ? "Now breathe out, slowly." : "And out.", "out", 6000)) return;
  }
  await step("Well done.", "Well done. You're doing great. One step at a time. Your crew is with you, and so am I.", null, 7000);
  if (run === calmRun) stopCalm();
}
function stopCalm() {
  calmRun++;
  stopSpeaking();
  $("voicePanel").classList.remove("calm");
  $("face").classList.remove("in", "hold", "out");
  $("calmText").textContent = "";
}


// =========================================================================
// 4. UNDERSTANDING A COMMAND
// =========================================================================
function findCrew(t) {
  if (/command|\bcdr\b|c d r|captain/.test(t)) return "CDR";
  if (/pilot|\bplt\b|p l t/.test(t)) return "PLT";
  if (/specialist|\bms ?1\b|m s 1|ms one|mission spec/.test(t)) return "MS1";
  return null;
}
const READINGS = [
  [/heart|pulse/, "hr"], [/temperature|fever|temp\b/, "temp"], [/pressure/, "bp"],
  [/sleep|tired|rest/, "sleep"], [/mood|feel|stress/, "mood"], [/radiation|dose|solar|storm/, "rad"],
  [/exercise|training|workout|bone|muscle/, "ex"], [/blood test|clot|lab/, "blood"]
];

function handleCommand(raw, fromVoice = false) {
  const t = raw.toLowerCase().trim();
  if (!t) return;
  lastWasVoice = fromVoice;
  addLog("user", raw);

  const id = findCrew(t);
  if (id && id !== currentCrew) { currentCrew = id; showAll(); }   // show the same person on screen
  showVoiceCrew();
  const p = id || currentCrew;

  // Emergency first, so "help me" is never mistaken for "help"
  if (/emergency|help me|can't breathe|cannot breathe|chest pain/.test(t)) {
    $("emergencyBtn").click();
    return reply("This is an emergency. Put the oxygen mask on and keep still. I've opened the emergency screen. Tick the signs you see, and press declare.");
  }
  if (/calm|anxious|scared|afraid|panic|breath|nervous|worried|relax/.test(t)) { calmMode(); return; }
  if (/^(stop|quiet|be quiet|cancel|that's all|that is all|nothing|no thanks|bye)/.test(t)) {
    stopCalm(); lastWasVoice = false;
    return reply(pick(["Okay. I'm here if you need me.", "Alright. Just press the mic when you need me."]));
  }
  if (/thank/.test(t)) { lastWasVoice = false; return reply(pick(["You're welcome.", "Anytime. I'm here if you need me.", "Of course. Take care."])); }
  if (/how are you/.test(t)) return reply("I'm doing well, thanks for asking. More importantly, how are you feeling?");
  if (/^(hi|hello|hey)\b/.test(t)) return reply("Hi there. You can ask me how anyone on the crew is doing.");
  if (/help|what can (you|i) (do|say)|commands/.test(t)) {
    return reply("You can ask me things like: how is the commander? How's everyone? What should I do? Or ask about heart rate, sleep, radiation or blood tests. And if you feel stressed, just say: calm me down.");
  }
  if (/report|tell earth|send to earth|message earth/.test(t)) {
    sendToEarth(`${p}: health report (voice)`);
    showMission();
    const last = MOCK.earthLog[MOCK.earthLog.length - 1];
    return reply(`Done. I've sent ${who(p)}'s report to Earth. It will arrive around ${time(last.arrive)}, so the earliest reply is about ${time(last.reply)}. Keep going with the actions in the meantime.`);
  }
  if (/check.?in/.test(t)) { openModal("checkinModal"); return reply("Sure, here's the daily check-in."); }
  if (/reaction/.test(t)) { openModal("reactionModal"); return reply("Okay, here's the reaction test. Press start when you're ready."); }
  if (/all crew|everyone|everybody|whole crew|crew status|team/.test(t)) return reply(allCrew());
  if (/\bwhat\b.*\bdo\b|what now|next step|action/.test(t)) return reply(whatToDo(p));   // "what should the pilot do?"

  const r = READINGS.find(([re]) => re.test(t));
  if (r) return reply(reading(p, r[1]));

  // "how is ...", "assess", "status", a crew name, or anything else about health
  if (id || /how|status|assess|condition|health|check|ok|okay/.test(t)) return reply(assess(p));

  reply(pick([
    "Sorry, I didn't quite catch that. You can ask: how is the commander?",
    "Hmm, I'm not sure what you mean. Try asking how the pilot is doing."
  ]));
}


// =========================================================================
// 5. LISTENING
// =========================================================================
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer = null, listening = false;

function setVoiceState(text, on) {
  $("voiceState").textContent = text;
  $("micBtn").classList.toggle("listening", !!on);
}
function stopListening() { if (listening && recognizer) recognizer.abort(); }

function startListening({ followUp = false } = {}) {
  if (!Recognition) { setVoiceState("Voice input isn't supported in this browser. Use Chrome, or type below."); return; }
  if (listening) { recognizer.stop(); return; }
  stopSpeaking();                                   // pressing the mic interrupts the assistant
  recognizer = new Recognition();
  recognizer.lang = "en-US";
  recognizer.interimResults = true;                 // show words as they are heard
  recognizer.maxAlternatives = 1;
  recognizer.onstart = () => {
    listening = true;
    faceMode("listening", true);
    setVoiceState(followUp ? "I'm listening. Anything else?" : "Listening… speak now", true);
  };
  recognizer.onresult = e => {
    const res = e.results[e.results.length - 1];
    const text = res[0].transcript;
    if (res.isFinal) handleCommand(text, true);
    else setVoiceState(`“${text}”`, true);
  };
  recognizer.onerror = e => {
    if (followUp && e.error === "no-speech") return;      // silence after an answer: just stop quietly
    const msg = {
      "not-allowed": "Microphone blocked. Allow the mic in Chrome, or type below.",
      "network": "Voice input needs internet. Type below instead.",
      "no-speech": "I didn't hear anything. Press the mic and try again.",
      "aborted": "Press the mic and ask a question"
    }[e.error] || "Voice input error. Type below instead.";
    setVoiceState(msg, false);
  };
  recognizer.onend = () => {
    listening = false;
    faceMode("listening", false);
    if ($("micBtn").classList.contains("listening")) setVoiceState("Press the mic and ask a question", false);
  };
  recognizer.start();
}


// =========================================================================
// 6. PANEL
// =========================================================================
function addLog(whoSaid, text) {
  const log = $("voiceLog");
  log.insertAdjacentHTML("beforeend", `<div class="vmsg ${whoSaid}">${whoSaid === "user" ? "You: " : ""}${text}</div>`);
  log.scrollTop = log.scrollHeight;
}

// Line under the face: whose status the assistant is talking about
function showVoiceCrew() {
  const S = check(currentCrew);
  $("voiceCrew").innerHTML = `${VOICE_NAMES[currentCrew]} ${badge(S.overall)}`;
  // Kind, caring brows when this crew member needs help
  $("face").classList.toggle("caring", S.overall === "act");
}

// Open / close the full-screen assistant
let greeted = false;
function openVoice() {
  $("voicePanel").hidden = false;
  showVoiceCrew();
  if (!greeted) {
    greeted = true;
    lastWasVoice = false;
    reply("Hi, I'm Astrodoc. Ask me how anyone on the crew is doing. Just press the mic, or tap a button.");
  }
}
function closeVoice() { stopCalm(); stopListening(); $("voicePanel").hidden = true; }

$("voiceFab").onclick = openVoice;
$("voiceClose").onclick = closeVoice;
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("voicePanel").hidden && !document.querySelector("dialog[open]")) closeVoice();
});
$("calmExit").onclick = () => { stopCalm(); lastWasVoice = false; reply("Good. I'm glad. I'm here if you need me."); };
$("micBtn").onclick = () => startListening();
$("voiceForm").onsubmit = e => { e.preventDefault(); handleCommand($("voiceInput").value); $("voiceInput").value = ""; };
document.querySelectorAll("[data-ask]").forEach(b => b.onclick = () => handleCommand(b.dataset.ask));


// =========================================================================
// 7. FACE LIFE — natural blinks and eyes that follow the cursor
// =========================================================================
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Blink at random moments (sometimes twice), like a real face
function blinkLoop() {
  const face = $("face");
  const blink = () => { face.classList.add("blink"); setTimeout(() => face.classList.remove("blink"), 140); };
  blink();
  if (Math.random() < 0.25) setTimeout(blink, 280);          // a quick double blink now and then
  setTimeout(blinkLoop, 2500 + Math.random() * 4000);
}
setTimeout(blinkLoop, 2000);

// Eyes gently follow the mouse (only while the assistant is open)
if (!reduceMotion) {
  document.addEventListener("mousemove", e => {
    if ($("voicePanel").hidden || $("voicePanel").classList.contains("calm")) return;
    const box = $("face").getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height / 2);
    const dist = Math.hypot(dx, dy) || 1;
    const move = Math.min(1, dist / 400) * 5;                  // at most 5 units inside the eye
    const x = dx / dist * move, y = dy / dist * move;
    document.querySelectorAll("#face .pupil").forEach(p => p.style.transform = `translate(${x}px, ${y}px)`);
  });
}
