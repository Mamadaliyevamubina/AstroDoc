// =========================================================================
// AstroDoc server — a Cloudflare Worker that keeps the API keys secret.
//
//   POST /chat   { message, history, data }  → Claude understands and answers
//   POST /speak  { text, voice, speed }       → ElevenLabs reads the text aloud (mp3)
//
// Secrets (Cloudflare → Worker → Settings → Variables and Secrets):
//   ANTHROPIC_API_KEY    required for /chat
//   ELEVENLABS_API_KEY   required for /speak
// Optional plain variables:
//   ALLOWED_ORIGINS      comma-separated, default: the GitHub Pages site + localhost
//   VOICE_MALE / VOICE_FEMALE   ElevenLabs voice ids
// =========================================================================

const DEFAULT_ORIGINS = ["https://mamadaliyevamubina.github.io", "http://localhost:8000", "http://127.0.0.1:8000"];
const CLAUDE_MODEL = "claude-opus-5-5";
const ELEVEN_MODEL = "eleven_multilingual_v2";       // the most natural ElevenLabs voice model
const VOICES = {
  male: "JBFqnCBsd6RMkjVDRZzb",                      // "George": warm, gentle British man
  female: "EXAVITQu4vr4xnSDxMaL"                     // "Sarah": soft, warm woman
};

const SYSTEM = `You are AstroDoc, the voice health companion for a small astronaut crew on a long space mission.
Your words are read aloud, so:
- Answer in one to three short, natural spoken sentences. No markdown, lists, emojis or headings.
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
you may briefly mention it ("On Apollo 13 in 1970, ...") to reassure or guide. Never invent cases, and never tell
anyone to take a medicine just because an astronaut once did. Explain what a reading means in plain words and
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

const SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    command: { type: "string" },
    focus: { type: "string", enum: ["", "commander", "pilot", "mission specialist"] }
  },
  required: ["reply", "command", "focus"],
  additionalProperties: false
};

export default {
  async fetch(request, env) {
    const origins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map(s => s.trim()) : DEFAULT_ORIGINS;
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": origins.includes(origin) ? origin : origins[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return json({ ok: true, service: "astrodoc" }, 200, cors);
    if (!origins.includes(origin)) return json({ error: "origin not allowed" }, 403, cors);

    let body;
    try { body = await request.json(); } catch { return json({ error: "bad json" }, 400, cors); }
    const path = new URL(request.url).pathname;
    try {
      if (path === "/chat") return json(await chat(body, env), 200, cors);
      if (path === "/speak") return await speak(body, env, cors);
      return json({ error: "not found" }, 404, cors);
    } catch (e) {
      return json({ error: String(e.message || e) }, 502, cors);
    }
  }
};

async function chat({ message, history, data }, env) {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  const text = String(message || "").slice(0, 1000);
  if (!text.trim()) throw new Error("empty message");

  // Earlier turns: alternate user / assistant, start with the user, keep it short
  const past = (Array.isArray(history) ? history : []).slice(-12)
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map(m => ({ role: m.role, content: m.content.slice(0, 1000) }));
  while (past.length && past[0].role !== "user") past.shift();
  const messages = [];
  for (const m of past) if (!messages.length || messages[messages.length - 1].role !== m.role) messages.push(m);
  if (messages.length && messages[messages.length - 1].role === "user") messages.pop();
  messages.push({ role: "user", content: `Crew data now:\n${JSON.stringify(data || {}).slice(0, 12000)}\n\nThey said: ${text}` });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "server-side-fallback-2026-07-01"
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      messages,
      fallbacks: "default",                          // if a safety check declines, retry on the recommended model
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } }   // low effort: quick spoken replies
    })
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const msg = await res.json();
  if (msg.stop_reason === "refusal") return { reply: "", command: "", focus: "" };   // the app answers on its own
  const out = (msg.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  return JSON.parse(out);
}

async function speak({ text, voice, speed }, env, cors) {
  if (!env.ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY is not set");
  const words = String(text || "").slice(0, 600);
  if (!words.trim()) throw new Error("empty text");
  const id = voice === "female" ? (env.VOICE_FEMALE || VOICES.female) : (env.VOICE_MALE || VOICES.male);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "content-type": "application/json", "xi-api-key": env.ELEVENLABS_API_KEY },
    body: JSON.stringify({
      text: words,
      model_id: ELEVEN_MODEL,
      voice_settings: { stability: 0.7, similarity_boost: 0.75, style: 0, speed: Math.min(1.2, Math.max(0.7, Number(speed) || 1)) }
    })
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return new Response(res.body, { headers: { ...cors, "content-type": "audio/mpeg", "cache-control": "no-store" } });
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });
}
