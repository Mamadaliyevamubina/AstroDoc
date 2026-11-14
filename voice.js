// =========================================================================
// Astrodoc — Voice assistant
// Press the mic and ask, e.g. "How is the commander?" The app assesses that
// crew member with the same rules as the dashboard and answers out loud.
// Uses the browser's built-in speech tools (Chrome):
//   - SpeechRecognition: needs internet in Chrome
//   - speechSynthesis:   works offline
// If the mic doesn't work, the crew can type or tap a quick button instead.
// =========================================================================

const VOICE_NAMES = { CDR: "Commander", PLT: "Pilot", MS1: "Mission Specialist" };
const SAY_STATUS = { normal: "all good", watch: "keep watching", act: "act now" };

// ---------- Speaking ----------
// Turn screen text into something that sounds natural
function speakable(text) {
  return text
    .replace(/(\d+)\/(\d+)/g, "$1 over $2")
    .replace(/°C/g, " degrees")
    .replace(/\bbpm\b/g, "beats per minute")
    .replace(/\bmSv\b/g, "millisieverts")
    .replace(/(\d+(\.\d+)?) h\b/g, "$1 hours")
    .replace(/\bCDR\b/g, "Commander").replace(/\bPLT\b/g, "Pilot").replace(/\bMS1\b/g, "Mission Specialist")
    .replace(/[()]/g, ", ");
}
// The face: "talking" moves the mouth, "listening" widens the eyes
function faceMode(mode, on) { $("face").classList.toggle(mode, on); }

function say(text, { log = true, rate = 1 } = {}) {
  if (log) addLog("assistant", text);
  if (!("speechSynthesis" in window)) {           // no voice: still animate the mouth for a moment
    faceMode("talking", true);
    setTimeout(() => faceMode("talking", false), Math.min(6000, text.length * 60));
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(speakable(text));
  u.lang = "en-US";
  u.rate = rate;
  const voice = speechSynthesis.getVoices().find(v => v.lang && v.lang.startsWith("en"));
  if (voice) u.voice = voice;
  u.onstart = () => faceMode("talking", true);
  u.onend = u.onerror = () => faceMode("talking", false);
  speechSynthesis.speak(u);
}

// ---------- Calm mode: big face + guided breathing ----------
// Box-style breathing: in 4 s, hold 4 s, out 6 s, three times.
let calmRun = 0;   // changes when calm mode stops, so old timers end
const wait = ms => new Promise(r => setTimeout(r, ms));

async function calmMode() {
  const run = ++calmRun;
  const panel = $("voicePanel"), face = $("face"), txt = $("calmText");
  openVoice();
  panel.classList.add("calm");
  const step = async (words, spoken, breath, ms) => {
    if (run !== calmRun) return false;
    txt.textContent = words;
    face.classList.remove("in", "hold", "out");
    if (breath) face.classList.add(breath);
    if (spoken) say(spoken, { log: false, rate: 0.85 });
    await wait(ms);
    return run === calmRun;
  };
  addLog("assistant", "Calm mode: let's breathe together.");
  if (!await step("You're safe. I'm here with you.", "You're safe. I'm right here with you. Let's breathe together.", null, 5000)) return;
  for (let i = 0; i < 3; i++) {
    if (!await step("Breathe in…", i === 0 ? "Breathe in slowly." : "In.", "in", 4000)) return;
    if (!await step("Hold…", "Hold.", "hold", 4000)) return;
    if (!await step("Breathe out…", i === 0 ? "And breathe out, slowly." : "Out.", "out", 6000)) return;
  }
  await step("Well done.", "Well done. You're doing great. One step at a time. Your crew is with you.", null, 6000);
  if (run === calmRun) stopCalm();
}
function stopCalm() {
  calmRun++;
  speechSynthesis.cancel();
  $("voicePanel").classList.remove("calm");
  $("face").classList.remove("in", "hold", "out", "talking");
  $("calmText").textContent = "";
}

// ---------- Answers (all built from the dashboard's check() function) ----------
function assess(id) {
  const S = check(id);
  const name = VOICE_NAMES[id];
  if (!S.warnings.length) return `${name}: all good. Every reading is normal. Keep the routine.`;
  const acts = S.warnings.filter(w => w.status === "act").length;
  const watches = S.warnings.length - acts;
  const counts = [acts ? `${acts} urgent` : "", watches ? `${watches} to watch` : ""].filter(Boolean).join(" and ");
  const top = S.warnings.slice(0, 2).map(w => `${w.title}. Do now: ${w.todo}`).join(" Next: ");
  // Calm, reassuring opening when something is urgent
  const calm = S.overall === "act" ? "Stay calm, I'm here to help. " : "";
  const offer = S.overall === "act" ? ' If you feel stressed, say "calm me down".' : "";
  return `${calm}${name}: ${SAY_STATUS[S.overall]}. ${counts}. Most important: ${top}${offer}`;
}

function allCrew() {
  return "Crew status. " + Object.keys(MOCK.crew).map(id => `${VOICE_NAMES[id]}: ${SAY_STATUS[check(id).overall]}.`).join(" ");
}

function whatToDo(id) {
  const S = check(id);
  if (!S.warnings.length) return `${VOICE_NAMES[id]} has nothing to do right now.`;
  return `${VOICE_NAMES[id]}, do this: ` + S.warnings.map((w, i) => `${i + 1}. ${w.todo}`).join(" ");
}

// One reading, e.g. "heart rate"
function reading(id, key) {
  const c = MOCK.crew[id], S = check(id), n = VOICE_NAMES[id];
  const lab = s => ({ normal: "normal", watch: "watch", act: "act now" })[s];
  switch (key) {
    case "hr":    return `${n}'s heart rate is ${c.vitals.hr} bpm. ${lab(S.hr)}.`;
    case "temp":  return `${n}'s temperature is ${c.vitals.temp} °C. ${lab(S.temp)}.`;
    case "bp":    return `${n}'s blood pressure is ${c.vitals.bpSys}/${c.vitals.bpDia}. ${lab(S.bp)}.`;
    case "sleep": return `${n} slept ${S.lastNight} h last night and is ${S.debt.toFixed(1)} h short this week. ${lab(S.sleep)}.`;
    case "mood":  return `${n}'s mood is ${S.moodValue} out of 5. Self rating ${c.checkin.self.mood}, crewmate rating ${c.checkin.mate.mood}. ${lab(worst(S.mood, S.biggestGap.status))}.`;
    case "rad":   return `${n}'s career radiation dose is ${S.dose.toFixed(0)} of 600 mSv. ${lab(S.radiation)}.` + (S.storm ? " Solar storm now. Go to the shielded area." : "");
    case "ex":    return `${n} did ${c.exercise} exercise sessions this week. ${lab(S.exercise)}.`;
    case "blood": return S.clotPattern ? `${n}'s blood test shows a dangerous clot pattern. ${ADVICE.clotAct}`
                    : S.labOut.length ? `${n}'s blood test: ${S.labOut.map(l => l.name).join(", ")} outside normal. ${lab(S.blood)}.`
                    : `${n}'s blood tests are normal.`;
  }
}

// ---------- Understanding a command ----------
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

function handleCommand(raw) {
  const t = raw.toLowerCase().trim();
  if (!t) return;
  addLog("user", raw);

  const id = findCrew(t);
  if (id && id !== currentCrew) { currentCrew = id; showAll(); }   // show the same person on screen
  showVoiceCrew();
  const who = id || currentCrew;

  // Emergency is checked first so "help me" is never mistaken for "help"
  if (/emergency|help me|can't breathe|cannot breathe|chest pain/.test(t)) {
    $("emergencyBtn").click();
    return say(`Emergency for ${VOICE_NAMES[who]}. Oxygen mask, keep the person still. Tick the signs you see and press Declare and report.`);
  }
  if (/calm|anxious|scared|afraid|panic|breath|nervous|worried|relax/.test(t)) { calmMode(); return; }
  if (/^(stop|quiet|be quiet|cancel)/.test(t)) { stopCalm(); addLog("assistant", "Stopped."); return; }
  if (/help|what can (you|i) (do|say)|commands/.test(t)) {
    return say("You can say: how is the commander. All crew. What should I do. Heart rate. Sleep. Radiation. Blood test. Send report. Calm me down. Or emergency.");
  }
  if (/report|tell earth|send to earth|message earth/.test(t)) {
    sendToEarth(`${who}: health report (voice)`);
    showMission();
    const last = MOCK.earthLog[MOCK.earthLog.length - 1];
    return say(`Report for ${VOICE_NAMES[who]} sent to Earth. It arrives at ${time(last.arrive)}. Earliest reply at ${time(last.reply)}. Keep following the actions now.`);
  }
  if (/check.?in/.test(t)) { openModal("checkinModal"); return say("Opening the daily check-in."); }
  if (/reaction/.test(t)) { openModal("reactionModal"); return say("Opening the reaction test. Press start when ready."); }
  if (/all crew|everyone|everybody|whole crew|crew status|team/.test(t)) return say(allCrew());
  if (/what (should|do) (i|we|they|he|she)|what to do|next step|action/.test(t)) return say(whatToDo(who));

  const r = READINGS.find(([re]) => re.test(t));
  if (r) return say(reading(who, r[1]));

  // "how is ...", "assess", "status", a crew name, or anything else about health
  if (id || /how|status|assess|condition|health|check|ok|okay|report/.test(t)) return say(assess(who));

  say("Sorry, I didn't catch that. Try: how is the commander?");
}

// ---------- Listening ----------
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer = null, listening = false;

function setVoiceState(text, on) {
  $("voiceState").textContent = text;
  $("micBtn").classList.toggle("listening", !!on);
}

function startListening() {
  if (!Recognition) { setVoiceState("Voice input isn't supported in this browser. Use Chrome, or type below."); return; }
  if (listening) { recognizer.stop(); return; }
  speechSynthesis.cancel();
  recognizer = new Recognition();
  recognizer.lang = "en-US";
  recognizer.interimResults = false;
  recognizer.maxAlternatives = 1;
  recognizer.onstart = () => { listening = true; faceMode("listening", true); setVoiceState("Listening… speak now", true); };
  recognizer.onresult = e => handleCommand(e.results[0][0].transcript);
  recognizer.onerror = e => {
    const msg = {
      "not-allowed": "Microphone blocked. Allow the mic in Chrome, or type below.",
      "network": "Voice input needs internet. Type below instead.",
      "no-speech": "I didn't hear anything. Press the mic and try again."
    }[e.error] || "Voice input error. Type below instead.";
    setVoiceState(msg, false);
  };
  recognizer.onend = () => { listening = false; faceMode("listening", false); if ($("micBtn").classList.contains("listening")) setVoiceState("Press the mic and ask a question", false); };
  recognizer.start();
}

// ---------- Panel ----------
function addLog(who, text) {
  const log = $("voiceLog");
  log.insertAdjacentHTML("beforeend", `<div class="vmsg ${who}">${who === "user" ? "You: " : ""}${text}</div>`);
  log.scrollTop = log.scrollHeight;
}

// Line under the face: whose status the assistant is talking about
function showVoiceCrew() {
  const S = check(currentCrew);
  $("voiceCrew").innerHTML = `${VOICE_NAMES[currentCrew]} ${badge(S.overall)}`;
}

// Open / close the full-screen assistant
function openVoice() {
  $("voicePanel").hidden = false;
  showVoiceCrew();
  if (!$("voiceLog").children.length) addLog("assistant", 'Hi, I\'m Astrodoc. Ask me "How is the commander?" or tap a button.');
}
function closeVoice() { stopCalm(); $("voicePanel").hidden = true; }

$("voiceFab").onclick = openVoice;
$("voiceClose").onclick = closeVoice;
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("voicePanel").hidden && !document.querySelector("dialog[open]")) closeVoice();
});
$("calmExit").onclick = () => { stopCalm(); say("Good. I'm here if you need me."); };
$("micBtn").onclick = startListening;
$("voiceForm").onsubmit = e => { e.preventDefault(); handleCommand($("voiceInput").value); $("voiceInput").value = ""; };
document.querySelectorAll("[data-ask]").forEach(b => b.onclick = () => handleCommand(b.dataset.ask));
