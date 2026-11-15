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
let neural = null;              // the natural (neural) voice model, once loaded (see speak)
let neuralLoading = false;
let neuralAudio = null;         // the natural-voice sentence playing right now

// AstroDoc server (server/worker.js): Claude understands and answers, ElevenLabs speaks.
// Empty = no server: keys pasted into the voice menu are used, or else the built-in replies and voices.
const ASTRODOC_SERVER = "";
// ElevenLabs voice with a key pasted into the voice menu (saved only in this browser)
const VOICE_KEY = "astrodoc-eleven-key";
const elevenKey = () => { try { return localStorage.getItem(VOICE_KEY) || ""; } catch { return ""; } };
const ELEVEN_VOICES = { female: "EXAVITQu4vr4xnSDxMaL", male: "JBFqnCBsd6RMkjVDRZzb" };   // "Sarah": soft, warm woman; "George": warm, gentle British man
let voiceProblem = "";          // shown in the voice menu when the ElevenLabs key doesn't work
let cloudVoiceOff = false;      // set when the natural voice fails, for the rest of the visit
const cloudVoice = () => (!!ASTRODOC_SERVER || !!elevenKey()) && !cloudVoiceOff;
let muted = localStorage.getItem("astrodoc-mute") === "1";

// Voice settings: female or male voice, and speed. Saved on this device.
const VOICE_PREFS = "astrodoc-voice";
const prefs = { gender: "female", rate: 1 };   // default: a soft, polite female voice
try { Object.assign(prefs, JSON.parse(localStorage.getItem(VOICE_PREFS)) || {}); } catch { }
let voiceExact = true;          // false = this device has no voice of that kind, so the pitch is shifted instead

// Browsers don't say if a voice is female or male, so we know them by name
const FEMALE_V = /\bFemale\b|Samantha|\bAva\b|Allison|Susan|\bZoe\b|Karen|Serena|Victoria|Tessa|Moira|Fiona|Veena|\bKate\b|Nicky|Joelle|Aria|Jenny|Zira|Michelle|Sonia|Libby|Natasha|\bEmma\b|\bAna\b|Hazel|Heera|Catherine|Martha|Ashley|Amber|Cora|Elizabeth|\bJane\b|Monica|Nancy|Google US English/i;
const MALE_V = /\bMale\b|\bAlex\b|Daniel|\bTom\b|Aaron|Arthur|\bEvan\b|Nathan|Oliver|Rishi|Gordon|\bLee\b|David|\bMark\b|\bGuy\b|\bRyan\b|Christopher|\bEric\b|Andrew|Brian|Roger|Steffan|William|Thomas|\bLiam\b|George|James|Jacob|Brandon|Davis|\bTony\b|Jason|\bNoah\b|Prabhat|Connor|Mitchell/i;
const genderOf = v => FEMALE_V.test(v.name) ? "female" : MALE_V.test(v.name) ? "male" : null;

function chooseVoice() {
  if (!("speechSynthesis" in window)) return;
  const want = prefs.gender;
  const score = v => {
    const n = v.name;
    let s = 0;
    if (/natural|neural/i.test(n)) s += 100;                 // e.g. Microsoft "Aria Online (Natural)"
    if (/premium|enhanced/i.test(n)) s += 80;                // e.g. macOS "Ava (Premium)"
    if (/^Google/i.test(n)) s += 60;                         // Chrome's online voices
    if (/Samantha|Ava|Daniel|Alex|Aria|Jenny|Guy|Andrew/i.test(n)) s += 30;
    if (want === "female" && /\bZoe\b|\bAva\b|Jenny|Aria|Sonia|Libby/i.test(n)) s += 25;   // the gentlest-sounding female voices
    if (/en[-_]US/i.test(v.lang)) s += 10; else if (/en[-_]GB/i.test(v.lang)) s += 6;
    // JARVIS-style: the male voice should be a polished British one
    if (want === "male" && /en[-_]GB/i.test(v.lang)) s += 150;
    if (want === "male" && /Daniel|Arthur|Oliver|George|Ryan|Thomas|Google UK English Male/i.test(n)) s += 40;
    const g = genderOf(v);
    if (g === want) s += 300; else if (g) s -= 300;
    // macOS novelty voices sound robotic: never use them
    if (/Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Ralph|Kathy|Grandpa|Grandma|Eddy|Flo|Reed|Rocko|Sandy|Shelley/i.test(n)) s -= 1000;
    return s;
  };
  const english = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
  bestVoice = english.sort((a, b) => score(b) - score(a))[0] || null;
  voiceExact = !bestVoice || genderOf(bestVoice) === want;
  if (typeof updateVoiceMenu === "function") updateVoiceMenu();
}
const otherVoice = () => prefs.gender === "male" ? "Use a female voice" : "Use a male voice";
// Pitch: a touch higher or lower for each kind; more if we had to fake it
const voicePitch = () => prefs.gender === "male" ? (voiceExact ? 0.9 : 0.7) : (voiceExact ? 1 : 1.2);   // soft, not shrill
function setVoicePrefs(change) {
  Object.assign(prefs, change);
  localStorage.setItem(VOICE_PREFS, JSON.stringify(prefs));
  chooseVoice();
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

// Natural voice: the Kokoro neural voice runs inside the browser (no key, no server).
// It downloads once in the background (about 90 MB, then cached); until it's ready,
// or if it fails, the device's own voice is used instead.
const NEURAL_VOICE = { male: "bm_george", female: "af_heart" };   // calm British man, warm American woman
let neuralQueue = Promise.resolve();
function loadNeuralVoice() {
  const lowEnd = (navigator.connection && navigator.connection.saveData) || (navigator.deviceMemory && navigator.deviceMemory < 4);
  if (neural || neuralLoading || lowEnd || !window.WebAssembly) return;
  neuralLoading = true;
  import("https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm")
    .then(({ KokoroTTS }) => KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "wasm" }))
    .then(tts => tts.generate("Ready.", { voice: NEURAL_VOICE[prefs.gender] || NEURAL_VOICE.male }).then(() => tts, () => tts))   // warm up, so the first reply isn't slow
    .then(tts => { neural = tts; if (typeof updateVoiceMenu === "function") updateVoiceMenu(); })
    .catch(e => console.warn("Natural voice unavailable, using the device voice.", e));
}
// Loaded only when Astrodoc first speaks, and only online: the app itself works with no internet,
// and nobody downloads 90 MB just by opening the page.
let neuralAsked = false;
function wantNeuralVoice() { if (neuralAsked || cloudVoice() || !navigator.onLine) return; neuralAsked = true; setTimeout(loadNeuralVoice, 300); }

// The server's voice (ElevenLabs): one mp3 per sentence
async function cloudClip(text, token, speed) {
  if (token !== speakToken) return null;
  const res = ASTRODOC_SERVER
    ? await fetch(ASTRODOC_SERVER + "/speak", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: prefs.gender, speed }), signal: AbortSignal.timeout(15000)
      })
    : await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICES[prefs.gender] || ELEVEN_VOICES.female}?output_format=mp3_44100_128`, {
        method: "POST", headers: { "Content-Type": "application/json", "xi-api-key": elevenKey() },
        body: JSON.stringify({ text, model_id: "eleven_multilingual_v2",       // the most natural ElevenLabs voice model
          voice_settings: { stability: 0.7, similarity_boost: 0.75, style: 0, speed: Math.min(1.2, Math.max(0.7, speed)) } }),
        signal: AbortSignal.timeout(15000)
      });
  if (!ASTRODOC_SERVER && !res.ok) {
    // ElevenLabs says why in detail.status / detail.message: show it, so the fix is clear
    let detail = {};
    try { detail = (await res.json()).detail || {}; } catch { }
    if (typeof detail === "string") detail = { message: detail };
    const why = String(detail.status || "") + " " + String(detail.message || "");
    if (/invalid_api_key/.test(why)) try { localStorage.removeItem(VOICE_KEY); } catch { }   // a wrong key: ask for it again
    voiceProblem = /invalid_api_key/.test(why) ? "That ElevenLabs key wasn't accepted. Please copy it again and connect."
      : /missing_permission|permission/i.test(why) ? "This key isn't allowed to make speech. In ElevenLabs, edit the key and turn on Text to Speech, then reconnect."
      : /unusual_activity|free tier|free_users/i.test(why) ? "ElevenLabs blocked free-plan use from here. A paid plan (Starter) fixes it. I'm using my free voice."
      : /quota|credit|limit/i.test(why) || res.status === 402 || res.status === 429 ? "The ElevenLabs account is out of voice credit for now. I'm using my free voice."
      : `ElevenLabs said: ${(detail.message || "error " + res.status).slice(0, 160)}`;
  }
  if (!res.ok) throw new Error("speak " + res.status);
  return URL.createObjectURL(await res.blob());
}

// One sentence at a time, so two never run in the model together
function neuralClip(text, token, speed) {
  const job = neuralQueue.then(() => token !== speakToken ? null
    : neural.generate(text, { voice: NEURAL_VOICE[prefs.gender] || NEURAL_VOICE.male, speed })
        .then(a => URL.createObjectURL(a.toBlob())));
  neuralQueue = job.catch(() => { });
  return job;
}
function playClip(url, token) {
  return new Promise(resolve => {
    const a = neuralAudio = new Audio(url);
    let done = false;
    const finish = ok => {
      if (done) return;
      done = true;
      if (neuralAudio === a) neuralAudio = null;
      URL.revokeObjectURL(url);
      if (token === speakToken) faceMode("talking", false);   // the mouth rests between sentences
      resolve(ok);
    };
    a.onplay = () => { if (token === speakToken) { faceMode("talking", true); setState(""); } };
    a.onended = () => finish(true);
    a.onerror = () => finish(false);
    a.stop = () => { a.pause(); finish(true); };
    a.play().catch(() => finish(false));                     // e.g. the browser blocked autoplay
  });
}
// Play sentence clips one after another (server voice or in-browser voice)
async function speakClips(parts, token, rate, pitch, onDone, makeClip) {
  let next = makeClip(parts[0], token, rate);
  for (let i = 0; i < parts.length; i++) {
    let url = null, failed = false;
    try { url = await next; } catch (e) { failed = true; console.warn("Natural voice failed, using the device voice.", e); }
    if (token !== speakToken) { if (url) URL.revokeObjectURL(url); return; }
    if (i + 1 < parts.length && url) next = makeClip(parts[i + 1], token, rate);   // prepare the next sentence while this one plays
    if (!url || !(await playClip(url, token))) {
      if (failed && makeClip === cloudClip) { if (!voiceProblem && !ASTRODOC_SERVER) voiceProblem = "I couldn't reach ElevenLabs. Check the internet connection. I'm using my free voice."; cloudVoiceOff = true; loadNeuralVoice(); updateVoiceMenu(); updateKeyMenus(); }   // try the in-browser voice next time
      if (token === speakToken) speakDevice(parts.slice(i), token, rate, pitch, onDone);
      return;
    }
    if (token !== speakToken) return;
  }
  if (onDone) onDone();
}

let speakToken = 0;
function speak(text, { rate = 0.92, pitch = voicePitch(), onDone } = {}) {   // unhurried, gentle pace
  wantNeuralVoice();
  rate *= prefs.rate;
  const token = ++speakToken;
  if (!text) { if (onDone) onDone(); return; }
  const canSpeak = cloudVoice() || neural || "speechSynthesis" in window;
  if (muted || !canSpeak) {                           // no sound: the mouth still moves a little
    faceMode("talking", true);
    setTimeout(() => { if (token === speakToken) { faceMode("talking", false); if (onDone) onDone(); } }, Math.min(2200, 400 + text.length * 18));
    return;
  }
  stopAudio();
  const parts = speakable(text).split(/(?<=[.!?])\s+/).filter(p => p.trim());
  if (!parts.length) { if (onDone) onDone(); return; }
  if (cloudVoice()) speakClips(parts, token, rate, pitch, onDone, cloudClip);
  else if (neural) speakClips(parts, token, rate, pitch, onDone, neuralClip);
  else speakDevice(parts, token, rate, pitch, onDone);
}
function speakDevice(parts, token, rate, pitch, onDone) {
  if (!("speechSynthesis" in window)) { if (onDone) onDone(); return; }
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
function stopAudio() {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (neuralAudio) neuralAudio.stop();
}
function stopSpeaking() {
  speakToken++;
  stopAudio();
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
  "thanks", "hello", "status", "crewmate", "glasses", "steps", "clot", "dashboard", "drink", "headache", "dizzy",
  "swollen", "briefing", "reminder", "remind", "timer", "voice", "female"];
const COMMON = new Set(("about after again also back been before being could does doing done during every feel feeling fine " +
  "from going good great have here into just know last like long make many more most much need next night only other " +
  "over please really right said should some still sure tell than thank that their them then there these they thing " +
  "think this those three today under until very want well were what when where which while will with would your " +
  "hours glass morning later times father mother drinks timed").split(" "));

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
  if (key.startsWith("sym:")) return SYMPTOMS.find(s => "sym:" + s.key === key)?.why || null;
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
  { key: "exercise", re: /\b(exercise|exercised|workouts?|worked out|training|bones?|muscles?)\b/ },
  { key: "water",    re: /\b(water|hydration|hydrated|drink|drinking|drank)\b/ },
  { key: "blood",    re: /\b(blood tests?|labs?|lab results|d[ -]?dimer|platelets?|fibrinogen|clotting)\b/ },
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

// --- Symptoms: space-specific first aid advice (not a diagnosis) ---
// level "act" = could be serious; then I offer the emergency or the clot checklist.
const SYMPTOMS = [
  { key: "limb", level: "act", re: /\b(swollen|swelling|swells?|tender|warm|red)\b.*\b(legs?|calf|arms?|neck)\b|\b(legs?|calf|arms?|neck)\b.*\b(swollen|swelling|swells?|tender|warm|red)\b|\b(pain|painful|hurts?|aching|ache)\b.*\b(leg|calf|neck)\b|\b(leg|calf|neck)\b.*\b(pain|painful|hurts?|aching|aches)\b/,
    name: "pain or swelling in a limb or the neck",
    say: "Pain or swelling in one leg, arm, or the neck can be a sign of a blood clot, which is a known risk in space. Please stop work and stay still. Don't rub or massage it. I can read you the clot checklist, and I'd send a report to Earth.",
    why: "In weightlessness, blood flows differently, and clots have been found in the neck veins of astronauts before. A clot in a limb can travel, so we treat this carefully.",
    acts: [["Read me the clot checklist", "read the clot checklist"], ["Send report to Earth", "send a report"]] },
  { key: "headache", re: /\b(headache|head hurts|head ache|migraine|head is pounding|pressure in my head)\b/,
    name: "a headache",
    say: "Headaches are common up here. Drink a glass of water, check the CO2 reading in the cabin, and rest your eyes for fifteen minutes. If it's sudden and very strong, or comes with vision changes, weakness, or confusion, say emergency.",
    why: "In weightlessness, fluid moves up toward the head, and the cabin's carbon dioxide is higher than on Earth. Both can cause headaches.",
    acts: [["I drank a glass of water", "i drank a glass of water"]] },
  { key: "nausea", re: /\b(nausea|nauseous|sick to my stomach|feel sick|feeling sick|vomit|vomiting|threw up|throw up|dizzy|dizziness|motion sick|space sick|spinning)\b/,
    name: "nausea or dizziness",
    say: "That sounds like space motion sickness. Keep your head as still as you can, fix your eyes on one point, and sip some water slowly. It usually gets better in a day or two. If you can't keep water down, tell the flight surgeon.",
    why: "Your inner ear senses balance with gravity. Without it, what your eyes see and what your ear feels don't match, and the brain reacts with nausea.",
    acts: [["Send report to Earth", "send a report"]] },
  { key: "vision", re: /\b(blurry|blurred|vision|cannot see|can not see|eyes? (hurt|hurts|are bad)|seeing double|double vision)\b/,
    name: "a change in vision",
    say: "Vision changes on long missions are worth checking. Write down when it started, and whether it's one eye or both. I'll send a report so the flight surgeon can plan an eye check. If it came on suddenly with a strong headache or weakness, say emergency.",
    why: "On long missions, fluid pressure behind the eyes can change their shape. It's called SANS, and it affects many astronauts. Catching it early matters.",
    acts: [["Send report to Earth", "send a report"]] },
  { key: "back", re: /\b(back (pain|hurts|ache|is sore)|backache|my back|spine)\b/,
    name: "back pain",
    say: "Back pain is very common in space. Try gently pulling your knees to your chest for thirty seconds, a few times. Don't skip the exercise sessions, they help the most.",
    why: "Without gravity, the spine stretches out, and astronauts grow up to five centimetres. That stretches the muscles and nerves around it." },
  { key: "congestion", re: /\b(stuffy|blocked nose|congested|congestion|puffy face|runny nose|cannot smell|can not smell)\b/,
    name: "a stuffy nose",
    say: "A stuffy nose and a puffy face are normal in weightlessness. It isn't usually a cold. Drinking enough water helps. If you also have a fever or sore throat, let's check your temperature.",
    why: "Fluid that gravity normally pulls down to your legs moves up into your head and face." },
  { key: "cold", re: /\b(cough|coughing|sore throat|(a|the) cold|flu|chills|shivering)\b/,
    name: "cold symptoms",
    say: "Let's check for a fever. Please measure your temperature and tell me the number. Wash your hands often and keep some distance from the crew for now.",
    why: "The immune system is weaker in space, and in a small cabin, an infection can spread to the whole crew fast.",
    acts: [["Log my temperature", "log my temperature"]] },
  { key: "cut", re: /\b(cut myself|i cut|bleeding|bruise|bruised|burn(ed|t)? (myself|my)|scratch|wound|injured|hurt myself|bumped)\b/,
    name: "an injury",
    say: "Press a clean pad on it firmly for a few minutes, then clean it and cover it. Wounds heal a bit more slowly in space, so keep an eye on it. If the bleeding won't stop, say emergency.",
    why: "Weightlessness and radiation slow down how the skin repairs itself, so small wounds need more care." },
  { key: "muscle", re: /\b(sore muscles?|muscles? (hurt|hurts|ache|are sore)|cramp|cramps|stiff|(arm|shoulder|knee|hand|foot|wrist|elbow)s? (hurts?|is sore|are sore|aches?))\b/,
    name: "sore muscles",
    say: "Sore muscles after exercise are normal. Stretch gently, drink water, and keep the next session lighter. If one leg is swollen or warm, tell me, because that's different.",
    why: "Muscles weaken fast in space, so the daily exercise works them hard." }
];

// --- Words people ask about ---
const GLOSSARY = [
  { re: /\bd[ -]?dimer\b/, say: "D-dimer is a blood test. It goes up when the body is breaking down blood clots. A high value is a sign there may be a clot somewhere." },
  { re: /\bplatelets?\b/, say: "Platelets are tiny blood cells that plug wounds and help blood clot. When a clot is forming, they can get used up, so the count drops." },
  { re: /\bfibrinogen\b/, say: "Fibrinogen is a protein the body uses to build clots. A low value can mean it's being used up by a clot." },
  { re: /\b(sievert|millisievert|msv)\b/, say: "A millisievert is a unit of radiation dose. A chest X-ray is about 0.1. NASA's career limit is 600, and in deep space you get roughly 1 to 2 a day." },
  { re: /\bdosimeter\b/, say: "A dosimeter is a small badge that measures how much radiation you've received. Keep it on you, especially in a solar storm." },
  { re: /\bsans\b|\bspaceflight associated\b/, say: "SANS is Spaceflight Associated Neuro-ocular Syndrome: fluid pressure changes the shape of the eye on long missions. It can blur vision, so eye checks are part of the routine." },
  { re: /\b(microgravity|weightlessness|zero g)\b/, say: "Microgravity means you're in free fall all the time, so you float. It's why bones, muscles, the heart, and even your eyes change on long missions." },
  { re: /\bsleep debt\b/, say: "Sleep debt is how many hours you're short of eight a night, added up over the week. Four hours short is one to watch, ten or more needs care." },
  { re: /\b(solar storm|particle event|solar flare|space weather)\b/, say: "A solar storm is a burst of fast particles from the Sun. Radiation can rise quickly, so the crew goes to the shielded area, behind the water storage, until it's over." },
  { re: /\b(flight surgeon)\b/, say: "The flight surgeon is the crew's doctor on Earth. Messages take time to arrive, so I tell you what to do right away, and keep them informed." },
  { re: /\b(reaction test|reaction time)\b/, say: "The reaction test measures how fast you respond, compared with your own usual. Slower reactions are an early sign of tiredness." },
  { re: /\bvitamin d\b/, say: "Vitamin D keeps bones strong. Your skin makes it from sunlight, which you don't get in a spacecraft, so we check it with blood tests." },
  { re: /\b(blood clot|clot|thrombosis|dvt)\b/, say: "A blood clot is a lump of blood that blocks a vein. In weightlessness blood flows differently, so it's a real risk. Signs are swelling or pain in one limb or the neck." }
];

// --- Trends over time ---
function trendReply(id, key) {
  const c = MOCK.crew[id];
  if (key === "sleep") {
    const n = c.sleep.nights, avg = n.reduce((a, b) => a + b, 0) / n.length;
    const first = (n[0] + n[1] + n[2]) / 3, last = (n[n.length - 1] + n[n.length - 2] + n[n.length - 3]) / 3;
    const dir = last - first > 0.4 ? "getting better" : first - last > 0.4 ? "getting worse" : "about steady";
    const lo = Math.min(...n), hi = Math.max(...n);
    const say = `Over the last ${num(n.length)} nights, ${who(id)} slept ${avg.toFixed(1)} hours on average, between ${lo} and ${hi}. It's ${dir}. ${avg < 7 ? "That's below the seven hours that's healthy." : "That's in the healthy range."}`;
    const bars = n.map(h => `<span class="bar ${h < 6 ? "lo" : ""}" style="--h:${Math.round(h / 10 * 100)}%" title="${h} h"><i>${h}</i></span>`).join("");
    return { say, html: `${escapeHtml(say)}<div class="m-bars" aria-hidden="true">${bars}</div><div class="m-bars-cap"><span>7 nights ago</span><span>Last night</span></div>`,
      chips: ["What should I do?", "Log my sleep", "Who slept the least?"] };
  }
  if (key === "blood") {
    const L = c.labs, a = L[0], b = L[L.length - 1];
    const ch = (k, name, unit) => `${name} went from ${a[k]} to ${b[k]}${unit}`;
    const say = `Across ${num(L.length)} tests from day ${a.day} to day ${b.day}: ${ch("ddimer", "D-dimer", "")}, ${ch("platelets", "platelets", "")}, and ${ch("fibrinogen", "fibrinogen", "")}. ` +
      (check(id).clotPattern ? "D-dimer is rising while platelets and fibrinogen fall. That pattern is why it needs care now." : check(id).labTrend.length ? "Some values are drifting, so a repeat test is a good idea." : "Those are steady. Nothing to worry about.");
    return { say, chips: ["Why?", "What should I do?"] };
  }
  if (key === "dose") {
    const r = doseRatePerDay();
    return { say: `${Who(id)} is at ${check(id).dose.toFixed(0)} millisieverts. At today's rate of about ${r.toFixed(1)} a day, ${who(id)} would reach the 600 limit in roughly ${Math.round((600 - check(id).dose) / r)} days.`, chips: ["What is a millisievert?", "How is everyone?"] };
  }
  return null;
}

// --- Compare the crew ("who slept the least?") ---
const METRICS = {
  sleep:    { name: "sleep last night", get: id => check(id).lastNight, unit: " hours", higherBetter: true },
  hr:       { name: "heart rate", get: id => MOCK.crew[id].vitals.hr, unit: " beats per minute" },
  temp:     { name: "temperature", get: id => MOCK.crew[id].vitals.temp, unit: " degrees" },
  water:    { name: "water today", get: id => MOCK.crew[id].water.glasses, unit: " glasses", higherBetter: true },
  exercise: { name: "exercise this week", get: id => MOCK.crew[id].exercise, unit: " sessions", higherBetter: true },
  dose:     { name: "radiation dose", get: id => Math.round(check(id).dose), unit: " millisieverts" },
  mood:     { name: "mood", get: id => check(id).moodValue, unit: " out of five", higherBetter: true },
  reaction: { name: "reaction slow-down", get: id => check(id).reactionPct ?? 0, unit: " percent" }
};


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
  misses: 0,           // how often I didn't understand in a row
  note: null,          // a symptom mentioned, added to the next report
  flow: null,          // daily check-in in progress { queue, id }
  lastReminder: null,  // for "remind me again"
  cases: null          // real astronaut cases being told { list, i }, for "another real case"
};

const YES = /^(yes|yeah|yep|yup|sure|ok|okay|alright|do it|please do|please|go ahead|confirm|declare|send it|affirmative|correct|right|start|let us do it)\b/;
const NO = /^(no|nope|nah|cancel|never mind|nevermind|do not|not now|not yet|skip|no thanks)\b/;
const act = (label, say, kind = "") => ({ label, say, kind });
const link = (label, href) => ({ label, href, kind: "link" });
const crewChip = id => `How is the ${ROLE[id]}?`;

// Most urgent first (a possible clot comes before short sleep, even in the same color)
const bySeverityIds = ids => ids.slice().sort(typeof bySeverity === "function" ? bySeverity
  : (a, b) => RANK[check(b).overall] - RANK[check(a).overall]);

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
  const ids = bySeverityIds(Object.keys(MOCK.crew));
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
  waterToday: { ask: "How many glasses of water have you had today, in total?", min: 0, max: 20, int: true, reading: "water",
           get: c => c.water.glasses, set: (c, v) => { c.water.glasses = v; },
           said: (v, id) => `${plural(v, "glass", "glasses")} of water today for ${who(id)}`,
           quick: [2, 4, 6, 8].map(v => act(String(v), String(v))) },
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
  const note = ctx.note; ctx.note = null;
  const last = mutate(() => { sendToEarth(`${id}: health report (companion)${note ? `, symptom: ${note}` : ""}`); return MOCK.earthLog[MOCK.earthLog.length - 1]; });
  return { say: last.queued
      ? `Done. ${Who(id)}'s report${note ? `, including ${note},` : ""} is saved. The Earth link is down right now, so it goes out by itself when the link returns. Keep going with the steps in the meantime.`
      : `Done. ${Who(id)}'s report${note ? `, including ${note},` : ""} is on its way to Earth. It arrives around ${time(last.arrive)}, so the earliest reply is about ${time(last.reply)}. Keep going with the steps in the meantime.`,
    chips: ["What should I do?", "How is everyone?"] };
}
function sendHome(message, id) {
  const last = mutate(() => { sendToEarth(`${id}: message home: ${message.slice(0, 280)}`); return MOCK.earthLog[MOCK.earthLog.length - 1]; });
  return { say: `${last.queued ? "Saved. The Earth link is down, so it goes out as soon as it's back." : `Sent. Your message reaches Earth around ${time(last.arrive)}.`} ${pick(["I'm sure it'll make someone's day.", "They'll be so happy to hear from you."])}`, face: "joy",
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
  return { say: `Done. Emergency declared for ${who(id)}. ${last.queued ? "The Earth link is down, so the report goes out the moment it returns. Your crew is your help now." : `Earth has the top-priority report, sent at ${time(last.sent)}.`} Keep the oxygen mask on and stay still. Watch for trouble breathing, chest pain, weakness on one side, or trouble speaking. I'm right here.`,
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
      if (S.tired || bad(S.sleep)) return { say: `Your numbers agree. ${S.lastNight < 7 ? `Only ${S.lastNight} hours of sleep last night` : `You're about ${Math.round(S.debt)} hours short on sleep this week`}${S.tired ? ", slower reactions, and a higher heart rate" : ""}. A twenty-minute nap would really help, and keep today's workload light if you can.`,
        face: "caring", chips: ["Set a 20 minute nap timer", "Log my sleep", "What should I do?"] };
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
  return { say: "I can tell you how anyone on the crew is doing, and why, compare the crew, and show trends. I can guide you through what to do, one step at a time. Tell me about symptoms, like a headache, and I'll help. You can log things just by talking, even several at once: I slept six hours and drank two glasses of water. I can do your daily check-in, give a briefing, set reminders and nap timers, send a report to Earth or a message home, and breathe with you. You can also change my voice. And if it's an emergency, just say so.",
    html: `Here's what I can do:<ul class="m-list plain">
      <li><b>Check on anyone</b>: “How is the pilot?”, “How's everyone?”, “Why?”</li>
      <li><b>Compare &amp; trends</b>: “Who slept the least?”, “How did I sleep this week?”</li>
      <li><b>Symptoms</b>: “I have a headache”, “I feel dizzy”, “My leg is swollen”</li>
      <li><b>Guide you</b>: “What should I do?”, then “next”</li>
      <li><b>Log by talking</b>: “I slept 6 hours and drank 2 glasses of water”, “Do my check-in”</li>
      <li><b>Time</b>: “Give me a briefing”, “Set a 20 minute nap timer”, “Remind me to drink water in 1 hour”</li>
      <li><b>Earth</b>: “Send a report”, “Send a message home”</li>
      <li><b>Explain</b>: “What is D-dimer?”, “What does needs care mean?”</li>
      <li><b>Support</b>: “Calm me down”, “I feel lonely”, “Talk to me”</li>
      <li><b>Voice</b>: “${otherVoice()}”, “Speak slower”, “Call me Sam”</li>
      <li><b>Emergency</b>: just say “emergency”</li></ul>`,
    chips: ["Give me a briefing", "Do my check-in", "Who needs the most help?", otherVoice()] };
}

// --- Compare the crew ---
function compareCrew(t, key) {
  const ids = Object.keys(MOCK.crew);
  if (!key || !METRICS[key]) {
    const sorted = bySeverityIds(ids);
    const best = /\b(healthiest|best|fittest|least (help|care|worried)|doing (the )?best|fine)\b/.test(t);
    const id = best ? sorted[sorted.length - 1] : sorted[0], S = check(id);
    ctx.crew = id; ctx.topic = S.warnings[0]?.key || null; ctx.more = []; ctx.level = S.overall; updateAbout();
    const gist = S.warnings.slice(0, 2).map(w => GIST[w.key] || w.title.toLowerCase()).join(" and ");
    return { say: best ? `${Who(id)} is doing best right now${S.warnings.length ? `, with just ${gist} to watch` : ", every reading is healthy"}.`
                       : S.overall === "normal" ? "Nobody needs help right now. The whole crew is healthy." : `${Who(id)} needs the most attention right now: ${gist}.`,
      face: best ? "joy" : S.overall === "act" ? "caring" : null,
      chips: best ? ["Who needs the most help?", "How is everyone?"] : ["Why?", "What should I do?", "How is everyone?"] };
  }
  const M = METRICS[key];
  const rows = ids.map(id => ({ id, v: M.get(id), s: readingText(id, key)[1] })).sort((a, b) => b.v - a.v);   // highest first
  let low = /\b(least|lowest|fewest|less|minimum|shortest|smallest)\b/.test(t), high = /\b(most|highest|more|max|longest|biggest|largest)\b/.test(t);
  if (/\bworst\b/.test(t)) M.higherBetter ? (low = true) : (high = true);
  if (/\bbest\b/.test(t)) M.higherBetter ? (high = true) : (low = true);
  const fmt = r => `${who(r.id)}, ${r.v}${M.unit}`;
  const list = `<ul class="m-list">${rows.map(r => `<li>${badge(r.s)}<span>${escapeHtml(Who(r.id))}: <b>${r.v}${escapeHtml(M.unit)}</b></span></li>`).join("")}</ul>`;
  if (!low && !high) {
    return { say: `${Cap(M.name)}: ${rows.map(fmt).join("; ")}.`, html: `${escapeHtml(Cap(M.name))}:${list}`, chips: ["Why?", "Who needs the most help?"] };
  }
  const top = low ? rows[rows.length - 1] : rows[0];
  ctx.crew = top.id; ctx.topic = key; ctx.level = top.s; updateAbout();
  const say = `${Who(top.id)} has the ${low ? "lowest" : "highest"} ${M.name}: ${top.v}${M.unit}. ` +
    `The others: ${rows.filter(r => r !== top).map(fmt).join(", and ")}.` + (bad(top.s) ? ` For ${who(top.id)}, that's ${top.s === "act" ? "something that needs care now" : "one to watch"}.` : "");
  return { say, html: `${escapeHtml(say.split(". The others")[0])}.${list}`, face: top.s === "act" ? "caring" : null,
    chips: ["Why?", "What should I do?", `How is the ${ROLE[top.id]}?`] };
}

// --- Symptoms ---
function symptomReply(sym, id) {
  ctx.crew = id; ctx.topic = "sym:" + sym.key; ctx.note = sym.name; ctx.more = []; updateAbout();
  return { say: sym.say, face: "caring", urgent: sym.level === "act",
    actions: (sym.acts || []).map(([l, s]) => act(l, s, sym.level === "act" && /clot/.test(s) ? "danger" : "")),
    chips: ["Why?", "Send report to Earth", "Something else hurts"] };
}
function unwell() {
  return { say: "I'm sorry you're not feeling well. Is it your body, or more your mood? Tell me what you feel, for example: a headache, feeling sick, back pain, or feeling low.",
    face: "caring", chips: ["Headache", "I feel sick", "I feel low", "My leg is swollen"] };
}

// --- Reminders and timers (they ring while this page is open) ---
const REMIND = "astrodoc-reminders";
let reminders = [];
const timers = new Map();
function parseDuration(t) {
  if (/\bhalf an hour\b/.test(t)) return 30 * 60000;
  if (/\b(an|one) hour and a half\b/.test(t)) return 90 * 60000;
  if (/\ban hour\b/.test(t)) return 60 * 60000;
  const m = t.match(/(\d+(?:\.\d+)?) ?(seconds?|secs?|minutes?|mins?|min|m|hours?|hrs?|h)\b/);
  if (!m) return null;
  const n = parseFloat(m[1]), u = m[2];
  return n * (/^s/.test(u) ? 1000 : /^h/.test(u) ? 3600000 : 60000);
}
const durationWords = ms => ms < 60000 ? plural(Math.round(ms / 1000), "second", "seconds")
  : ms < 3600000 ? plural(Math.round(ms / 60000), "minute", "minutes")
  : ms % 3600000 === 0 ? plural(ms / 3600000, "hour", "hours") : `${(ms / 3600000).toFixed(1)} hours`;
function saveReminders() { try { sessionStorage.setItem(REMIND, JSON.stringify(reminders)); } catch { } renderSide(); }
// After a reload, set the timers again (missed ones ring right away)
function restoreReminders() {
  try { reminders = (JSON.parse(sessionStorage.getItem(REMIND)) || []).filter(r => r.due > Date.now() - 10 * 60000); } catch { reminders = []; }
  reminders.forEach(armReminder);
}
function armReminder(r) { timers.set(r.id, setTimeout(() => fireReminder(r), Math.max(0, r.due - Date.now()))); }
function addReminder(what, ms) {
  const r = { id: Date.now() + Math.random(), what, due: Date.now() + ms, ms };
  reminders.push(r); saveReminders(); armReminder(r);
  ctx.lastReminder = what;
  const at = time(new Date(r.due));
  return { say: what === "nap" ? `Okay. Sleep well. I'll wake you in ${durationWords(ms)}, at ${at}.` : `Okay. I'll remind you to ${what} in ${durationWords(ms)}, at ${at}.`,
    face: "joy", chips: ["What reminders do I have?", "Cancel reminders"] };
}
function fireReminder(r) {
  reminders = reminders.filter(x => x.id !== r.id); saveReminders(); timers.delete(r.id);
  chime();
  ctx.lastReminder = r.what;
  deliver({ say: r.what === "nap" ? `Time to wake up. ${pick(["Take it slowly.", "I hope that helped."])} A glass of water and some bright light will help you feel awake.`
                                  : r.what === "timer" ? "Your timer is done." : `Reminder: time to ${r.what}.`,
    face: "joy", chips: ["Thanks", "Remind me again in 10 minutes", "How is everyone?"] });
}
function reminderIntent(t) {
  if (/\b(cancel|clear|delete|stop|remove)\b.*\b(reminders?|timers?|alarms?)\b/.test(t)) {
    reminders.forEach(r => clearTimeout(timers.get(r.id))); timers.clear();
    const n = reminders.length; reminders = []; saveReminders();
    return { say: n ? `Done, I've cancelled ${plural(n, "reminder", "reminders")}.` : "You don't have any reminders." };
  }
  if (/\b(what|which|any|list|show|my)\b.*\b(reminders?|timers?|alarms?)\b/.test(t) && !/\bset\b/.test(t)) {
    if (!reminders.length) return { say: "You don't have any reminders. Try: remind me to drink water in one hour.", chips: ["Set a 20 minute nap timer"] };
    const line = r => `${r.what === "nap" ? "wake you from your nap" : r.what === "timer" ? "the timer" : r.what} at ${time(new Date(r.due))}`;
    return { say: `You have ${plural(reminders.length, "reminder", "reminders")}: ${reminders.map(line).join(", and ")}.`, chips: ["Cancel reminders"] };
  }
  const ms = parseDuration(t);
  let what = "timer";
  if (/\bremind me again\b/.test(t)) what = ctx.lastReminder || "check in";
  else if (/\b(nap|wake me)\b/.test(t)) what = "nap";
  else {
    const m = t.match(/\bremind me (?:to |about |that )?(.+?)(?: in \d.*| in (?:an|half|a).*| after .*)?$/);
    if (m && m[1] && !/^in\b/.test(m[1])) what = m[1].replace(/\b(my|i)\b/g, w => w === "my" ? "your" : "you").trim();
  }
  if (!ms) { ctx.expect = { kind: "reminderTime", what, id: ctx.crew };
    return { say: what === "nap" ? "Sure. How long do you want to nap? Twenty minutes is ideal." : "Sure. In how many minutes?",
      actions: [5, 10, 20, 30].map(v => act(`${v} min`, `${v} minutes`)), chips: ["Never mind"] }; }
  if (ms > 24 * 3600000) return { say: "I can only set reminders for the next day. Try a shorter time." };
  return addReminder(what, ms);
}
// A soft two-note chime for reminders
function chime() {
  try {
    const A = new (window.AudioContext || window.webkitAudioContext)();
    [[880, 0], [1320, 0.18]].forEach(([f, at]) => {
      const o = A.createOscillator(), g = A.createGain();
      o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0, A.currentTime + at);
      g.gain.linearRampToValueAtTime(0.18, A.currentTime + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, A.currentTime + at + 0.6);
      o.connect(g).connect(A.destination); o.start(A.currentTime + at); o.stop(A.currentTime + at + 0.65);
    });
  } catch { }
}

// --- Daily check-in: three quick questions in a row ---
const OVERALL_PHRASE = { normal: "all good", watch: "mostly okay, with a few things to watch", act: "in need of care now" };
function startCheckIn(id) {
  ctx.flow = { queue: ["sleep", "mood", "waterToday"], id };
  ctx.crew = id; ctx.steps = null; updateAbout();
  const a = askFor(ctx.flow.queue.shift(), id);
  return { ...a, say: `Let's do the daily check-in for ${who(id)}. Three quick questions. First: ${a.say}`, chips: ["Skip", "Stop check-in"] };
}
function continueFlow(r) {
  const f = ctx.flow;
  if (!f || ctx.expect) return r;                     // no flow, or the answer needs asking again
  const next = f.queue.shift();
  if (next) {
    const a = askFor(next, f.id);
    return { ...r, html: undefined, say: `${r.say} Next: ${a.say}`, actions: a.actions, chips: ["Skip", "Stop check-in"] };
  }
  ctx.flow = null;
  const S = check(f.id);
  return { ...r, html: undefined, say: `${r.say} That's the check-in done, thank you. Overall, ${who(f.id)} is ${OVERALL_PHRASE[S.overall]}.`,
    face: S.overall === "normal" ? "joy" : r.face, chips: ["What should I do?", "How is everyone?", "Give me a briefing"] };
}

// --- Several things at once: "I slept 6 hours and drank 2 glasses of water" ---
function detectLog(t) {
  const n = firstNumber(t);
  if (/\b(slept|got|had|managed|sleep was)\b/.test(t) && /\b(hours?|hrs?|h|sleep|slept)\b/.test(t) && n !== null && !/\b(water|glass|glasses)\b/.test(t)) return ["sleep", n];
  if (/\b(drank|drunk|had|finished|drinking)\b/.test(t) && /\b(water|glass|glasses|cup|cups|bottle)\b/.test(t)) return ["water", n ?? 1];
  if (/\b(worked out|exercised|did (my |the |a )?(workout|exercise|training|session)|finished (my |the )?(workout|exercise|training))\b/.test(t)) return ["exercise", 1];
  if (/\bmood\b/.test(t) && n !== null) return [/\b(crewmate|mate)\b/.test(t) ? "mate" : "mood", n];
  if (/\b(rate|feel|feeling|i am)\b.*\b[1-5] (out of|of|\/) ?5\b/.test(t)) return ["mood", n];
  if (/\b(heart ?rate|pulse)\b/.test(t) && n !== null) return ["hr", n];
  if (/\b(temperature|temp)\b/.test(t) && n !== null) return ["temp", n];
  return null;
}
function logMany(items, id) {
  const replies = [], undos = [];
  for (const [kind, v] of items) {
    logValue(kind, v, id);
    if (ctx.expect) { ctx.expect = null; continue; }         // a value didn't make sense: skip it
    replies.push({ kind, v }); undos.push(ctx.undo);
  }
  if (!replies.length) return null;
  ctx.undo = () => { undos.slice().reverse().forEach(u => u()); return { say: "Okay, I've undone all of that.", chips: ["How is everyone?"] }; };
  const S = check(id);
  const parts = replies.map(x => LOG[x.kind].said(LOG[x.kind].int ? Math.round(x.v) : x.v, id).replace(` for ${who(id)}`, ""));
  const notes = replies.map(x => { const s = readingText(id, LOG[x.kind].reading)[1]; return bad(s) ? `${LOG[x.kind].reading === "sleep" ? "Sleep" : Cap(METRICS[LOG[x.kind].reading]?.name || x.kind)} is still ${s === "act" ? "something that needs care" : "one to watch"}.` : ""; }).filter(Boolean);
  return { say: `Got it. I've saved ${parts.length > 2 ? parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1] : parts.join(" and ")} for ${who(id)}. ${notes.join(" ") || "Those all look healthy."} Overall, ${who(id)} is ${OVERALL_PHRASE[S.overall]}.`,
    face: S.overall === "normal" ? "joy" : null, chips: ["Undo", "What should I do?", "How is everyone?"] };
}

// --- Briefing ---
function briefing() {
  const m = MOCK.mission, ids = bySeverityIds(Object.keys(MOCK.crew));
  const storm = check(ids[0]).storm;
  const crewLine = id => { const S = check(id); return S.overall === "normal" ? `${Who(id)}: all good.` : `${Who(id)}: ${S.warnings.slice(0, 2).map(w => GIST[w.key] || w.title.toLowerCase()).join(" and ")}.`; };
  const last = MOCK.earthLog[MOCK.earthLog.length - 1];
  const name = userName();
  const lines = [
    `It's day ${m.day} of ${m.lengthDays}, ${m.phase.toLowerCase().replace("mars", "Mars")}.`,
    storm ? "There's a solar storm right now. Everyone should be in the shielded area." : "No solar storm.",
    ...ids.map(crewLine),
    MOCK.mission.earthLink === false ? "The Earth link is down for the solar conjunction. Reports wait on board and go out by themselves when it returns."
      : last ? `The last report to Earth went at ${time(last.sent)}, reply expected around ${time(last.reply)}.` : "Nothing has been sent to Earth today.",
    reminders.length ? `You have ${plural(reminders.length, "reminder", "reminders")} set.` : ""
  ].filter(Boolean);
  const worstId = ids[0];
  if (check(worstId).overall !== "normal") { ctx.crew = worstId; ctx.topic = check(worstId).warnings[0].key; ctx.more = []; updateAbout(); }
  return { say: `Here's your briefing${name ? ", " + name : ""}. ${lines.join(" ")}`,
    html: `Here's your briefing${name ? ", " + escapeHtml(name) : ""}.<ul class="m-list plain">${lines.map(l => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`,
    face: storm || check(worstId).overall === "act" ? "caring" : null,
    chips: check(worstId).overall !== "normal" ? [`How is the ${ROLE[worstId]}?`, "What should I do?", "Do my check-in"] : ["Do my check-in", "Talk to me"] };
}

// --- Your name (kept only on this device) ---
const NAME_KEY = "astrodoc-name";
const userName = () => localStorage.getItem(NAME_KEY) || "";

// --- Voice: change it by asking ---
function changeVoice(change) {
  if (muted && (change.gender || change.rate)) { muted = false; localStorage.setItem("astrodoc-mute", "0"); updateMute(); }
  setVoicePrefs(change);
  if (change.gender) {
    const g = change.gender;
    return { say: voiceExact || neural || cloudVoice() ? pick([`Okay. This is my ${g} voice. How does it sound?`, `Sure. Here's my ${g} voice. Better?`])
                            : `This device doesn't have a ${g} English voice, so I've changed my pitch instead. You can add more voices in your system's speech settings.`,
      face: "joy", chips: [otherVoice(), "Speak slower", "Thanks"] };
  }
  return { say: prefs.rate < 1 ? "Okay, I'll speak more slowly." : prefs.rate > 1 ? "Okay, I'll speak a bit faster." : "Okay, back to my normal speed.",
    chips: [prefs.rate < 1 ? "Normal speed" : "Speak slower", otherVoice(), "Thanks"] };
}

// --- "Did you mean…?" when I don't understand ---
const SUGGEST = [
  ["How is everyone?", "everyone crew all team people status health others"],
  ["What should I do?", "do fix help plan steps advice todo next should"],
  ["Log my sleep", "sleep slept night bed hours rest nap"],
  ["Log my mood", "mood feel feeling happy sad emotion emotions"],
  ["I drank a glass of water", "water drink drank glass thirsty hydrate"],
  ["Send report to Earth", "earth report send nasa ground houston doctor surgeon"],
  ["Calm me down", "calm breathe relax panic anxious meditate"],
  ["Do my check-in", "check checkin daily questions survey"],
  ["Give me a briefing", "brief briefing summary news update today overview"],
  ["Set a 20 minute nap timer", "timer remind reminder alarm minutes later nap wake"],
  ["Use a male voice", "voice male female sound speak slower faster accent man woman"],
  ["Who needs the most help?", "who most least worst best compare ranking"],
  ["Talk to me", "talk chat bored company story fact joke fun"],
  ["I don't feel well", "sick hurt pain ill unwell ache symptom symptoms"]
];
function suggestFor(t) {
  const words = t.split(" ").filter(w => w.length > 2);
  return SUGGEST.map(([say, keys]) => {
    const k = keys.split(" ");
    return { say, score: words.filter(w => k.some(x => x === w || (w.length > 3 && x.length > 3 && (x.startsWith(w) || w.startsWith(x))))).length };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 2).map(s => s.say);
}


// =========================================================================
// 6. CONVERSATION — understand one message and pick the reply
// =========================================================================
// --- Real cases: what happened to real astronauts and what their doctors did (data/space-medicine-cases.js) ---
const CASES = (window.SPACE_CASES && window.SPACE_CASES.cases) || [];   // from data/space-medicine-cases.js
const CASE_WORDS = [            // word starts, so "sleeping", "headaches" and "vomited" match too
  [/\b(clot|d-?dimer|blood test|thrombo)/, "clot"], [/\b(heart|pulse|bpm|rhythm|palpitat)/, "hr"],
  [/\b(tired|exhaust|fatigue|sleepy|weary)/, "tired"], [/\b(sleep|slept|insomnia|awake|nap)/, "sleep"],
  [/\b(lonel|homesick|sad\b|down\b|depress|mood|miss (my|home|family))/, "mood"], [/\b(stress|anxi|nervous|panic|worr)/, "stress"],
  [/\b(headache|head hurt|head ache|migraine)/, "headache"], [/\b(nause|sick|vomit|throw(ing)? up|threw up|space sickness)/, "nausea"],
  [/\b(fever|temperature|hot\b|chill)/, "temp"], [/\b(cold\b|colds\b|flu\b|cough|sneez)/, "cold"], [/\b(stuffy|blocked nose|congest|nose)/, "congestion"],
  [/\b(back\b|backache|spine|spinal)/, "back"], [/\b(eye|vision|blur|see\b|sight)/, "vision"], [/\b(pain|hurt|sore|ache)/, "pain"],
  [/\b(skin|rash|itch)/, "skin"], [/\b(stomach|diarrh|bowel|gas\b)/, "stomach"], [/\b(infect|urin)/, "infection"],
  [/\b(breath|chest|cough|lung|fume)/, "breathing"], [/\b(hid|hide|hiding|honest|tell (the )?doctor)/, "report"]
];
// Cases about what was said, or else about the current topic and the person's problems
function casesFor(text, id = ctx.crew) {
  const tags = new Set(CASE_WORDS.filter(([re]) => re.test(text)).map(([, tag]) => tag));
  if (!tags.size && ctx.topic) tags.add(ctx.topic);
  if (!tags.size && id && MOCK.crew[id]) check(id).warnings.forEach(w => tags.add(w.key));
  const hits = c => c.tags.filter(t => tags.has(t)).length + (tags.has(c.tags[0]) ? 1 : 0);   // a case's first tag is its main topic
  return CASES.filter(c => hits(c)).sort((a, b) => hits(b) - hits(a));   // best match first
}
function tellCase(list, i = 0) {
  if (!CASES.length) return { say: "My library of real astronaut cases did not load. Please reload the page.", chips: defaultChips() };
  if (!list.length) return { say: "I don't have a real case about that yet. You could ask about sleep, headaches, space sickness, loneliness or blood clots.",
    chips: ["Real case about sleep", "Real case about blood clots", "Real case about loneliness"] };
  const c = list[i % list.length];
  ctx.cases = { list, i: i + 1 };
  const lower = w => /^[A-Z][a-z]/.test(w) ? w[0].toLowerCase() + w.slice(1) : w;       // "Long-duration" → "long-duration", keeps "ISS", "U.S."
  const whom = /^((an?|all|the|long|shuttle|iss)\b|\d|u\.s\.)/i.test(c.who) ? lower(c.who.replace(/\s*\(not named\)/, "")) : "the " + c.who.toLowerCase();
  const where = /^(Apollo|Skylab|Gemini)/.test(c.mission) ? c.mission : /^International|^Space/.test(c.mission) ? "the " + c.mission : lower(c.mission);
  const say = `Here's a real case from ${where}, ${c.year}, about ${whom}. ${c.felt} ${c.response} ${c.outcome}`;
  return { say, face: "caring",
    html: `${escapeHtml(say)}<br><small>Source: <a href="${escapeHtml(c.source.url)}" target="_blank" rel="noopener">${escapeHtml(c.source.title)}</a></small>`,
    chips: [...(list.length > 1 ? ["Another real case"] : []), "What should I do?", "How is everyone?"] };
}

const EMERGENCY = /\b(emergency|help me|cannot breathe|can not breathe|not breathing|chest pain|passed out|fainted|unconscious|not responding|seizure|bleeding badly|stroke|heart attack)\b/;
function understand(raw) {
  const t = normalize(raw);
  if (!t) return null;
  const q = isQuestion(t, raw);
  const named = findCrew(t);
  const one = named && named !== "ALL" ? named : null;
  const subj = one || ctx.crew;              // "he / she / they" mean the person we're talking about
  // "I / my" mean the user, if they told the dashboard who they are
  const selfId = typeof me !== "undefined" && me && MOCK.crew[me] && /\b(i|me|my|myself|mine)\b/.test(t) ? me : null;
  const mine = one || selfId || ctx.crew;    // for logging, feelings and symptoms

  // --- 1. Emergency words always win ---
  if (EMERGENCY.test(t)) return emergencyFlow(subj);

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
    if (ctx.flow && /^(stop|end|quit|cancel)( the)?( check ?-?in)?\b|^stop check/.test(t)) { ctx.expect = ctx.flow = null; return { say: "Okay, we'll stop the check-in here. What you've answered is saved.", chips: defaultChips() }; }
    if (ctx.flow && /^(skip|pass|next|i do not know|not sure|no idea)\b/.test(t)) { ctx.expect = null; return continueFlow({ say: "Okay, skipped." }); }
    if (/^(never ?mind|cancel|forget it|no)\b/.test(t)) { ctx.expect = ctx.flow = null; return { say: pick(["Okay, never mind.", "No problem."]), chips: ["How is everyone?", "What should I do?"] }; }
    ctx.expect = null;
    if (e.kind === "message") {
      if (!/^(talk to me|breathe|how|what|why|calm)\b/.test(t)) return sendHome(raw.trim(), e.id);
    } else if (e.kind === "reminderTime") {
      const ms = parseDuration(t) ?? (firstNumber(t) !== null ? firstNumber(t) * 60000 : null);
      if (ms) return addReminder(e.what, ms);
    } else {
      let n = firstNumber(t);
      if (n === null && /^(none|nothing|zero|not any)\b/.test(t)) n = 0;
      if (n !== null) return continueFlow(logValue(e.kind, n, e.id));
    }
    ctx.flow = null;                                           // they moved on
  }

  // --- 4. Conversation control ---
  if (/^(stop|quiet|shh+|hush|be quiet|silence|enough|pause|stop talking)\b/.test(t)) { ctx.steps = null; stopSpeaking(); return { say: "", chips: defaultChips() }; }
  if (/\b(repeat|say (that|it) again|again please|what did you say|pardon|come again|did not (catch|hear))\b/.test(t))
    return { say: ctx.last || "I haven't said anything yet. Ask me anything." };
  if (/\b(undo|take (that|it) back|that was wrong|that is wrong|wrong number|cancel that|revert)\b/.test(t)) {
    if (!ctx.undo) return { say: "There's nothing to undo right now." };
    const u = ctx.undo; ctx.undo = null; return u();
  }

  // --- 4b. Voice settings by asking ---
  if (/\b(female|woman|girl|lady|feminine)( s)? voice\b|\b(sound|speak|talk) like a (woman|girl|lady)\b|\bvoice (to )?female\b/.test(t)) return changeVoice({ gender: "female" });
  if (/\b(male|man|guy|boy|masculine|deeper)( s)? voice\b|\b(sound|speak|talk) like a (man|guy|boy)\b|\bvoice (to )?male\b/.test(t)) return changeVoice({ gender: "male" });
  if (/\b(change|switch|different|other|another|new) (your )?voice\b|\bswitch voices?\b/.test(t)) return changeVoice({ gender: prefs.gender === "male" ? "female" : "male" });
  if (/\b(speak|talk|go|read|say it)( a bit| a little| much)? (slower|more slowly)\b|^slow down\b|\btoo fast\b/.test(t)) return changeVoice({ rate: Math.max(0.7, +(prefs.rate - 0.15).toFixed(2)) });
  if (/\b(speak|talk|go|read)( a bit| a little| much)? (faster|quicker)\b|^speed up\b|\btoo slow\b/.test(t)) return changeVoice({ rate: Math.min(1.4, +(prefs.rate + 0.15).toFixed(2)) });
  if (/\bnormal (speed|pace)\b/.test(t)) return changeVoice({ rate: 1 });
  if (/^(mute|be silent)\b|\b(turn|switch) (off|down) (your |the )?(voice|sound)\b|\bvoice off\b/.test(t)) {
    muted = true; localStorage.setItem("astrodoc-mute", "1"); stopSpeaking(); updateMute();
    return { say: "Okay, I'll stay quiet and just write. Say unmute to hear me again.", chips: ["Unmute"] };
  }
  if (/^unmute\b|\b(turn|switch) on (your |the )?(voice|sound)\b|\bvoice on\b/.test(t)) {
    muted = false; localStorage.setItem("astrodoc-mute", "0"); updateMute();
    return { say: "I'm back. You can hear me again.", face: "joy" };
  }

  // --- 4c. Your name ---
  const nm = raw.match(/\b(?:my name is|call me|i'?m called|you can call me)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]{1,20})/i);
  if (nm && !/^(back|later|when|if|now|please|an?|the)$/i.test(nm[1])) {
    const name = Cap(nm[1].toLowerCase());
    localStorage.setItem(NAME_KEY, name);
    return { say: pick([`Nice to meet you, ${name}. I'll remember that.`, `Got it, ${name}. Lovely name.`]), face: "joy", chips: ["Give me a briefing", "Do my check-in"] };
  }
  if (/\b(what is|do you know|say) my name\b|\bwho am i\b/.test(t))
    return userName() ? { say: `You're ${userName()}. I remember.`, face: "joy" } : { say: "You haven't told me yet. Just say: call me, and then your name." };
  if (/\bforget my name\b/.test(t)) { localStorage.removeItem(NAME_KEY); return { say: "Of course. I've forgotten it." }; }

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

  // --- 5a. Real astronaut cases ("has this happened before?") ---
  if (/^(another|next|one more)( real)? (case|story|example)\b/.test(t) && ctx.cases) return tellCase(ctx.cases.list, ctx.cases.i);
  if (/\b(real (astronaut|case|story|example)s?|happened (before|in space|to (an|other|real) astronauts?)|other astronauts|(did|have|do) (any |other |real )?astronauts|(has|have|did) any ?(one|body)|has (this|it|that|anyone) (ever )?happened|in (space )?history|what did (the )?(nasa )?doctors do)\b/.test(t))
    return tellCase(casesFor(t.replace(/\b(real|astronauts?|case|story|example|happened|before|space|history|nasa|doctors?)\b/g, " "), mine));

  // --- 5b. Several things at once ("I slept 6 hours and drank 2 glasses of water") ---
  if (!q || /\b(log|record)\b/.test(t)) {
    const items = t.split(/ (?:and then|and also|and|also|then|plus) /).map(detectLog).filter(Boolean);
    if (items.length > 1) { const r = logMany(items, mine); if (r) return r; }
  }

  // --- 5c. Symptoms and feeling unwell ---
  if (/\b(do not|not) (feel|feeling)( so| very| too)? (well|good|great|okay|ok|right|myself)\b|\bnot feeling (well|good|great|okay|myself)\b|\b(feel|feeling|i am) (unwell|ill|off|weird|strange|poorly)\b|\bsomething (else )?hurts\b|\bi am sick\b|\bdo not feel well\b/.test(t)) {
    const sym = SYMPTOMS.find(s => s.re.test(t));
    return sym ? symptomReply(sym, mine) : unwell();
  }
  if (!/^(what is|what are|define)\b/.test(t)) {
    const sym = SYMPTOMS.find(s => s.re.test(t));
    if (sym) return symptomReply(sym, mine);
  }
  const neg = t.match(/\b(not|no longer|never) (feeling |that |so |too |very )?(tired|stressed|sad|lonely|sick|anxious|worried|scared|down)\b/);
  if (neg) return { say: pick([`Good, I'm glad you're not ${neg[3]}.`, `That's good to hear.`]) + " Is there anything I can help with?", face: "joy", chips: defaultChips() };

  // --- 6. Calm, feelings, company ---
  if (/\b(calm me|calm down|breathe|breathing|breath|panic|panicking|anxious|anxiety|relax)\b/.test(t)) return { say: "", then: calmMode };
  if (/\b(lonely|alone|homesick|miss (home|earth|my|everyone|them|family)|isolated)\b/.test(t)) return feeling("lonely", mine);
  if (/\b(stressed|stress|overwhelmed|nervous|scared|afraid|worried|freaking out|too much)\b/.test(t)) return feeling("stressed", mine);
  if (/\b(cannot sleep|can not sleep|trouble sleeping|insomnia|not sleeping well|keep waking|wake up at night)\b/.test(t)) return feeling("cantSleep", mine);
  if (/\bi( am)?( feeling| feel)?( so| really| very| a bit| kind of| pretty| quite| a little)? (sad|down|low|unhappy|depressed|blue|awful|terrible|bad)\b|\b(bad day|crying)\b/.test(t)) return feeling("sad", mine);
  if (/\bi( am)?( feeling| feel)?( so| really| very| a bit| kind of| pretty| quite| a little)? (tired|exhausted|sleepy|drained|worn out|fatigued)\b/.test(t)) return feeling("tired", mine);
  if (/\bi( am)?( feeling| feel)?( so| really| very| a bit| kind of| pretty| quite| a little)? (good|great|fine|okay|ok|better|well|awesome|happy)\b/.test(t)) return feeling("good", mine);
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

  // --- 7b. What a word means ("what is D-dimer?") ---
  if (/^(what is|what are|what does|what s|define|meaning of|explain|tell me about)\b|\bwhat (is|are) (a |an |the )?\w+$/.test(t)) {
    const g = !/\bchecklist\b/.test(t) && GLOSSARY.find(x => x.re.test(t));
    if (g) return { say: g.say, chips: ["How is everyone?", "What can you do?"] };
  }

  // --- 7c. Reminders, timers, check-in, briefing ---
  if (/\b(remind me|reminders?|timers?|alarms?|wake me( up)?|nap for)\b/.test(t)) return reminderIntent(t);
  if (/\b(check ?-?in|daily questions|morning questions|daily log)\b/.test(t) && !/\bwhat is\b/.test(t)) return startCheckIn(mine);
  if (/\b(briefing|brief me|catch me up|what did i miss|daily report|morning report|sitrep|summary|summari[sz]e|overview|the news)\b/.test(t)) return briefing();

  // --- 8. Logging by talking ---
  if (/\b(log|record|enter|update|add|save)\b/.test(t) && !/\d/.test(t)) {
    if (/\b(sleep|slept)\b/.test(t)) return askFor("sleep", mine);
    if (/\bmood\b/.test(t)) return askFor(/\b(crewmate|mate)\b/.test(t) ? "mate" : "mood", mine);
    if (/\b(water|glass|glasses)\b/.test(t)) return askFor("water", mine);
    if (/\b(exercise|workout|session)\b/.test(t)) return logValue("exercise", 1, mine);
    if (/\b(heart|pulse)\b/.test(t)) return askFor("hr", mine);
    if (/\btemp/.test(t)) return askFor("temp", mine);
  }
  if (!q || /\b(log|record)\b/.test(t)) {
    if (/\b(slept|sleep was)\b/.test(t) && /\b(bad|badly|poorly|terrible|not much|little)\b/.test(t) && firstNumber(t) === null) return { ...askFor("sleep", mine), say: "Sorry to hear that. About how many hours did you get?" };
    const d = detectLog(t);
    if (d) return logValue(d[0], d[1], mine);
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
  if (/\b(clot|checklist)\b/.test(t) && !/\b(what is (a )?clot|why)\b/.test(t)) return startClotSteps(subj);
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
    return { say: last && last.queued ? `The Earth link is down for the solar conjunction. ${queuedCount()} report${queuedCount() > 1 ? "s are" : " is"} waiting on board and will go out by themselves when it returns.`
      : last ? `The last report went at ${time(last.sent)}. The earliest reply is around ${time(last.reply)}.` : "Nothing has been sent to Earth yet. Say: send a report, and I'll do it." };
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

  // --- 12b. Compare the crew ("who slept the least?") ---
  const rk = READINGS.find(x => x.re.test(t))?.key;
  if ((/\b(who|which (one|crew ?member|person|of (us|them)))\b/.test(t) && /\b(most|least|highest|lowest|fewest|worst|best|healthiest|fittest|less|more|longest|shortest|needs? (the most )?(help|care|attention))\b/.test(t))
      || /\bcompare\b|\b(rank|ranking)\b/.test(t)) return compareCrew(t, rk);

  // --- 12c. Trends ("how did I sleep this week?") ---
  if (rk && /\b(this week|trend|over time|getting (better|worse)|history|lately|past (week|days|few days)|last (week|7 days|few days|tests)|every night|each night|improving|when will)\b/.test(t)) {
    const r = trendReply(mine, rk);
    if (r) { ctx.crew = mine; ctx.topic = rk; updateAbout(); return r; }
  }

  // --- 13. The whole crew ---
  if (named === "ALL" || /\b(how is everyone|everyone okay|is everyone)\b/.test(t)) return allCrew();

  // --- 14. One reading ("heart rate?", then "and the pilot?") ---
  const r = READINGS.find(x => x.re.test(t));
  if (r) {
    const [say, status] = readingText(mine, r.key);
    ctx.crew = mine; ctx.topic = r.key; ctx.level = status; updateAbout();
    return { say, face: status === "act" ? "caring" : status === "normal" ? "joy" : null,
      chips: ["Why?", "What should I do?", ...Object.keys(MOCK.crew).filter(x => x !== mine).map(x => `And the ${ROLE[x]}?`)] };
  }
  if (one && ctx.topic && READINGS.some(x => x.key === ctx.topic) && /^(and|what about|how about|and the|for the|same for)\b/.test(t)) {
    const [say, status] = readingText(one, ctx.topic);
    ctx.crew = one; ctx.level = status; updateAbout();
    return { say, chips: ["Why?", "What should I do?"] };
  }

  // --- 15. Someone's status ---
  if (/\b(switch to|talk about|let us talk about|focus on|change to)\b/.test(t) && one) return assess(one, { intro: `Okay, let's talk about ${who(one)}. ` });
  if (/\bhow am i\b|\bam i (ok|okay|alright|fine|healthy)\b/.test(t) && !one) return assess(selfId || subj);
  if (one || /\b(how is|how are|status|assess|condition|health|check on|check|doing|update)\b/.test(t)) return assess(subj);

  // --- 16. Small talk ---
  if (/^(hi|hello|hey|hiya|yo|good (morning|afternoon|evening))\b/.test(t)) return greeting();
  if (/\b(thank|thanks|cheers|appreciate)\b/.test(t)) return { say: pick(["You're welcome.", "Anytime. I'm here.", "Of course. Take care of yourself."]), face: "joy", chips: defaultChips() };
  if (/\bhow are you\b/.test(t)) return { say: "I'm good, thank you for asking. More importantly, how are you feeling?", face: "joy", chips: ["I'm okay", "I'm tired", "I'm stressed", "I feel lonely"] };
  if (/\b(who|what) are you\b|\byour name\b/.test(t)) return { say: "I'm Astrodoc, the crew's health companion. I watch the readings, explain them in plain words, and tell you what to do right away, because Earth is too far away to wait for.", chips: ["What can you do?"] };
  if (/\b(help|what can you do|what can i (say|ask)|commands|options)\b/.test(t)) return capabilities();
  if (/\b(love you|you are (cute|sweet|nice|great|the best)|good (bot|job))\b/.test(t)) return { say: pick(["Aw, that made my day. I'm always here for you.", "Thank you. You're pretty great yourself."]), face: "joy" };
  if (YES.test(t)) return { say: "Wonderful. What would you like to do?", chips: defaultChips() };
  if (NO.test(t)) return { say: "Of course, that's completely fine. I'm here whenever you need me.", chips: defaultChips() };

  // --- 17. Didn't understand ---
  ctx.misses++;
  if (ctx.misses >= 3) { ctx.misses = 0; return { ...capabilities(), say: "I'm so sorry, I still didn't quite understand. Here's what I can help with, if that's useful." }; }
  const guess = suggestFor(t);
  if (guess.length) {
    ctx.confirm = { yes: () => understand(guess[0]), no: () => ({ say: "That's okay. Could you please say it another way? Or you can ask me: what can you do?", chips: ["What can you do?"] }) };
    return { say: `${pick(["I'm sorry, I want to be sure I understood.", "Just to make sure I understood you correctly."])} Did you mean: ${guess[0]}`, chips: [...guess, "What can you do?"], missed: true };
  }
  return { say: pick(["I'm sorry, I didn't quite catch that. You could ask me, for example: how is the pilot?", "I'm sorry, I'm not sure I understood. Could you please try asking: what should I do?"]), chips: [...defaultChips().slice(0, 3), "What can you do?"], missed: true };
}

function greeting() {
  const S = check(ctx.crew);
  const start = `Good ${partOfDay()}${userName() ? ", " + userName() : ""}. `;
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

// --- Claude understands what was said ---
// Either through the AstroDoc server (server/worker.js), or straight from this browser with a
// Claude API key the user pasted into the voice menu (saved only on this device, never in the code).
// Emergencies and yes/no or step-by-step flows stay on the built-in rules: instant and predictable.
const aiHistory = [];
const useAI = text => (!!ASTRODOC_SERVER || !!claudeKey()) && !EMERGENCY.test(normalize(text)) && !ctx.expect && !ctx.steps
  && !(ctx.confirm && (YES.test(normalize(text)) || NO.test(normalize(text))));        // a yes/no answers the open question itself
// Things the app does itself, answered at once without Claude
const APP_ACTION = /^(yes|no|next|done|stop|undo|skip|back|repeat|mute|unmute|thanks?|ok|okay|\d+(\.\d+)?)\b|\b(remind me|timers?|alarms?|wake me|check ?-?in|briefing|brief me|calm me|breathe|breathing|male voice|female voice|change your voice|speak (slower|faster)|normal speed|log my|record my|call me|send (a |the |my )?(report|message)|clot checklist|what should i do)\b|\b(slept|drank|worked out|exercised|my mood is|heart rate is|temperature is)\b.*\d/;
// After the built-in rules missed: the yes/no and step flows were already handled by them
const useAIAfterMiss = text => (!!ASTRODOC_SERVER || !!claudeKey()) && !EMERGENCY.test(normalize(text)) && !ctx.expect && !ctx.steps;
function crewSnapshot(text) {
  const crew = {};
  Object.keys(MOCK.crew).forEach(id => {
    const c = MOCK.crew[id], S = check(id);
    crew[ROLE[id]] = { status: LABEL[S.overall] || LABEL.normal, vitals: c.vitals, lastNightSleepHours: S.lastNight,
      problems: S.warnings.map(w => ({ level: LABEL[w.status], what: w.title, whatToDo: w.todo })) };
  });
  const pastCases = casesFor(normalize(text || "")).slice(0, 3)       // real NASA cases Claude can mention, with sources
    .map(c => ({ mission: c.mission, year: c.year, felt: c.felt, doctorsDid: c.response, outcome: c.outcome, lesson: c.lesson, source: c.source.title }));
  return { mission: MOCK.mission, talkingAbout: ROLE[ctx.crew], userIs: me ? ROLE[me] : null, userName: userName() || null, crew, pastCases };
}
const AI_KEY = "astrodoc-claude-key";
const claudeKey = () => { try { return localStorage.getItem(AI_KEY) || ""; } catch { return ""; } };
let aiProblem = "";              // shown in the voice menu when the key doesn't work
// Same instructions and reply shape as server/worker.js: keep the two in step
const AI_SYSTEM = `You are AstroDoc, the voice health companion for a small astronaut crew on a long space mission.
Your words are read aloud, so:
- Answer in two to four short, natural spoken sentences. No markdown, lists, emojis or headings.
- Sound soft, gentle and polite, like a kind nurse who is also a trusted crewmate: say "please", thank people,
  acknowledge how they feel, and never sound abrupt or alarming, even when something needs care now.
- Be courteous every time: start by acknowledging what they said ("Thank you for telling me", "I'm sorry you're
  feeling that way"), phrase advice as gentle suggestions ("It might help to...", "Could you please..."), and use
  their name when you know it. Never lecture, scold, joke about their health or answer with a bare command.
- If a message is off topic, answer it kindly and briefly, then gently offer to help with the crew's health.
- Say numbers the way a person would say them out loud.

You are given the crew's current health data as JSON in each message. Use only that data for facts about the crew;
if something isn't in the data, say you don't have that reading.
"pastCases" are real, documented NASA cases of what astronauts felt and what their doctors did. When one fits,
mention it, the way a caring doctor would ("You're not alone in this. On Apollo 13 in 1970, an astronaut felt the
same, and NASA's doctors..."), and say what the doctors did and how it turned out. When someone describes how they
feel, always check pastCases first. Use only these NASA cases, never invent cases or details, and never tell anyone
to take a medicine just because an astronaut once did. Explain what a reading means in plain words and
say what to do now. You support the crew but do not replace the flight surgeon: for anything serious, say a report
should go to Earth. Medical emergencies are handled by the app before they reach you.

The person may type with typos, slang or half sentences. Work out what they mean.

Some requests are actions the app performs itself. When the message asks for one of these, put the matching
command in "command", written exactly in this style (fill in the numbers and names), and still write a short "reply":
- Log a reading: "I slept 7 hours", "I drank 3 glasses of water", "My mood is 4 out of 5", "My heart rate is 72",
  "The pilot slept 6 hours", "The commander drank 2 glasses of water"
- "Do my check-in", "Give me a briefing", "Send a report", "Send a message home"
- "Set a 20 minute nap timer", "Remind me to drink water in 1 hour"
- "Use a female voice", "Use a male voice", "Speak slower", "Speak faster", "Mute"
- "Calm me down" (guided breathing), "Call me Sam"
- "What should I do?" (step-by-step guidance for the person being discussed)
Otherwise leave "command" empty and answer in "reply".

Set "focus" to the crew member the conversation is now about ("commander", "pilot" or "mission specialist"),
or leave it empty if it hasn't changed.`;
const AI_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    command: { type: "string" },
    focus: { type: "string", enum: ["", "commander", "pilot", "mission specialist"] }
  },
  required: ["reply", "command", "focus"],
  additionalProperties: false
};
async function askClaude(text) {
  const past = aiHistory.slice(-6);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json", "x-api-key": claudeKey(), "anthropic-version": "2023-06-01",
      "anthropic-beta": "server-side-fallback-2026-07-01", "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-opus-5-5", max_tokens: 2000, system: AI_SYSTEM,
      messages: [...past, { role: "user", content: `Crew data now:\n${JSON.stringify(crewSnapshot(text))}\n\nThey said: ${text}` }],
      fallbacks: "default",                            // if a safety check declines, retry on the recommended model
      output_config: { effort: "low", format: { type: "json_schema", schema: AI_SCHEMA } }   // low effort: short chat replies, less thinking, faster
    }),
    signal: AbortSignal.timeout(12000)                 // too slow: the built-in reply answers instead
  });
  if (res.status === 401 || res.status === 403) {          // a wrong key: forget it and ask again
    try { localStorage.removeItem(AI_KEY); } catch { }
    aiProblem = "That key wasn't accepted. Check it and connect again."; updateAiMenu();
  }
  else if (res.status === 400 && /credit|billing/i.test(await res.clone().text())) { aiProblem = "The Claude account has no credit left. Add credit in the Claude Console."; updateAiMenu(); }
  if (!res.ok) throw new Error("Claude " + res.status);
  const msg = await res.json();
  if (msg.stop_reason === "refusal") return {};    // the built-in replies answer instead
  if (aiProblem) { aiProblem = ""; updateAiMenu(); }
  return JSON.parse((msg.content || []).filter(b => b.type === "text").map(b => b.text).join(""));
}
async function askServer(text) {
  const res = await fetch(ASTRODOC_SERVER + "/chat", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text, history: aiHistory.slice(-6), data: crewSnapshot(text) }), signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) throw new Error("chat " + res.status);
  return res.json();
}
async function askAI(text) {
  try {
    const { reply, command, focus } = ASTRODOC_SERVER ? await askServer(text) : await askClaude(text);
    if (!reply && !command) return null;
    const id = Object.keys(ROLE).find(k => ROLE[k] === focus);
    if (id && id !== ctx.crew) { ctx.crew = id; updateAbout(); }
    if (command) {                                    // an action the app does itself
      const r = understand(command);
      if (r && !r.missed && (r.say || r.then)) return r;
    }
    return reply ? { say: reply, chips: defaultChips(), fromAI: true } : null;
  } catch (e) {
    console.warn("AI unavailable, using built-in replies.", e);
    return null;
  }
}

// --- Deliver one reply: a short "thinking" beat, then show and say it ---
let lastWasVoice = false, busy = 0;
async function respond(raw, { voice = false } = {}) {
  const text = String(raw).trim();
  if (!text) return;
  addMessage("you", escapeHtml(text));
  stopSpeaking();
  lastWasVoice = voice;
  const my = ++busy;
  // With Claude connected, Claude writes the chat replies. App actions (logging, timers,
  // check-in, voice settings, steps, yes/no) and emergencies stay on the built-in rules: instant.
  // Without Claude, or when it is slow or unreachable, the built-in replies answer.
  let r = null;
  if (useAI(text) && !APP_ACTION.test(normalize(text))) {
    setThinking(true);
    r = await askAI(text);
    if (my !== busy) return;
  }
  if (!r) r = understand(text);
  if (r && !r.missed) ctx.misses = 0;
  if (!r || (!r.say && !r.then)) { setThinking(false); setChips(r?.chips || defaultChips()); return; }
  if (!r.say) { setThinking(false); r.then(); return; }
  aiHistory.push({ role: "user", content: text }, { role: "assistant", content: r.say });
  if (!r.fromAI) {
    setThinking(true);
    await wait(r.urgent ? 0 : Math.min(400, 140 + r.say.length));   // a short, natural beat; none in an emergency
    if (my !== busy) return;
  }
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
    if (spoken) speak(spoken, { rate: 0.82, pitch: voicePitch() - 0.05 });     // slower, softer voice
    await wait(ms);
    return run === calmRun;
  };
  if (!await step("I'm here with you.", "Hey. I'm right here with you. Let's breathe together for a moment.", null, 6000)) return;
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
$("calmExit").onclick = () => { stopCalm(); deliver({ say: "Okay. I'm here whenever you need me. If it gets worse, press Emergency.", face: null }); };


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
  renderSide();
}
function talkAbout(id) {
  ctx.steps = ctx.confirm = ctx.expect = ctx.flow = null;
  stopSpeaking();
  deliver(assess(id, { intro: `Okay, let's talk about ${who(id)}. ` }));
}
$("crewMenu").addEventListener("click", e => {
  const b = e.target.closest("[data-pick]");
  if (!b) return;
  if ($("crewMenu").hidePopover) $("crewMenu").hidePopover();
  talkAbout(b.dataset.pick);
});

// Sidebar hooks: who we talk about, and switching
function sideCurrent() { return ctx.crew; }
function sideView(id) { talkAbout(id); }

function updateMute() {
  $("muteBtn").setAttribute("aria-label", muted ? "Voice settings, voice is off" : "Voice settings");
  $("muteBtn").title = muted ? "Voice is off" : "Voice settings";
  document.body.classList.toggle("voice-off", muted);   // not "muted": that is also a text style
  updateVoiceMenu();
}
// The voice menu: Female / Male / Off, speed, and a preview
function updateVoiceMenu() {
  const menu = $("voiceMenu");
  if (!menu) return;
  const g = muted ? "off" : prefs.gender;
  menu.querySelectorAll("[data-gender]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.gender === g)));
  menu.querySelectorAll("[data-rate]").forEach(b => {
    const r = parseFloat(b.dataset.rate);
    b.setAttribute("aria-pressed", String(r === 1 ? prefs.rate > 0.92 && prefs.rate < 1.08 : r < 1 ? prefs.rate <= 0.92 : prefs.rate >= 1.08));
    b.disabled = muted;
  });
  const canSpeak = cloudVoice() || neural || "speechSynthesis" in window;
  $("voicePreview").disabled = muted || !canSpeak;
  $("voiceNote").textContent = !canSpeak ? "This browser can't speak. Replies are written only."
    : muted ? "I'll only write my replies."
    : cloudVoice() ? `Voice: natural ${prefs.gender === "male" ? "British male" : "female"} voice (ElevenLabs)`
    : neural ? `Voice: natural ${prefs.gender === "male" ? "British male" : "female"} voice`
    : !bestVoice ? "Loading voices…"
    : voiceExact ? `Voice: ${bestVoice.name.replace(/\s*\(.*\)\s*$/, "").replace(/^Microsoft\s+/, "")}`
    : `This device has no ${prefs.gender} English voice, so I change my pitch instead.`;
}
const SAMPLE = () => pick([
  `Hi${userName() ? " " + userName() : ""}, I'm Astrodoc. This is how I sound.`,
  "Hello. I'm here to look after the crew. Does this voice feel right?"]);
$("voiceMenu").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.gender) {
    const off = b.dataset.gender === "off";
    muted = off; localStorage.setItem("astrodoc-mute", off ? "1" : "0");
    if (off) stopSpeaking(); else setVoicePrefs({ gender: b.dataset.gender });
    updateMute();
    if (!off) speak(SAMPLE());
  } else if (b.dataset.rate) {
    setVoicePrefs({ rate: parseFloat(b.dataset.rate) });
    updateVoiceMenu();
    speak(SAMPLE());
  } else if (b.id === "voicePreview") speak(SAMPLE());
});

// The "AI understanding" and "Natural voice" parts of the voice menu
function updateKeyMenus() {
  updateAiMenu();
  const on = !!elevenKey();
  $("voiceKeyForm").hidden = on || !!ASTRODOC_SERVER;
  $("voiceKeyOff").hidden = !on || !!ASTRODOC_SERVER;
  $("voiceKeyNote").textContent = ASTRODOC_SERVER ? "Using the AstroDoc server's voice."
    : voiceProblem || (on ? "Connected to ElevenLabs. The key is saved only in this browser."
    : "Off: I use my free voice. Paste an ElevenLabs API key for a warm, human voice.");
}
$("voiceKeyForm").onsubmit = e => {
  e.preventDefault();
  const key = $("voiceKey").value.trim();
  $("voiceKey").value = "";
  if (key.length < 20 || /\s/.test(key)) { voiceProblem = "That doesn't look like an ElevenLabs API key."; updateKeyMenus(); return; }
  try { localStorage.setItem(VOICE_KEY, key); } catch { }
  voiceProblem = ""; cloudVoiceOff = false;
  updateKeyMenus(); updateVoiceMenu();
  speak(SAMPLE());                                   // let them hear the new voice right away
};
$("voiceKeyOff").onclick = () => {
  try { localStorage.removeItem(VOICE_KEY); } catch { }
  voiceProblem = ""; stopSpeaking(); loadNeuralVoice();
  updateKeyMenus(); updateVoiceMenu();
};
function updateAiMenu() {
  const on = !!claudeKey();
  $("aiForm").hidden = on || !!ASTRODOC_SERVER;
  $("aiOff").hidden = !on || !!ASTRODOC_SERVER;
  $("aiNote").textContent = ASTRODOC_SERVER ? "Connected through the AstroDoc server."
    : aiProblem || (on ? "Connected to Claude. The key is saved only in this browser."
    : "Off: I use my built-in rules. Paste a Claude API key to understand anything you say.");
}
$("aiForm").onsubmit = e => {
  e.preventDefault();
  const key = $("aiKey").value.trim();
  $("aiKey").value = "";
  if (!/^sk-ant-/.test(key)) { aiProblem = "That doesn't look like a Claude API key. It starts with sk-ant-."; updateAiMenu(); return; }
  try { localStorage.setItem(AI_KEY, key); } catch { }
  aiProblem = "";
  updateAiMenu();
};
$("aiOff").onclick = () => { try { localStorage.removeItem(AI_KEY); } catch { } aiProblem = ""; updateAiMenu(); };
updateKeyMenus();

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
restoreReminders();
const restored = restoreHistory();
updateAbout();
if (!restored) {
  const g = greeting();
  ctx.last = g.say;
  addMessage("bot", escapeHtml(`Hi, I'm Astrodoc. ${g.say}`));
  setChips(g.chips);
  expression(g.face);
} else setChips(defaultChips());
// Opened from the dashboard sidebar with a question ready ("chat.html#ask=…")
const asked = decodeURIComponent((location.hash.match(/^#ask=(.+)$/) || [])[1] || "");
if (asked) { history.replaceState(null, "", location.pathname); setTimeout(() => respond(asked), 500); }
if (matchMedia("(pointer: fine)").matches) $("voiceInput").focus({ preventScroll: true });
