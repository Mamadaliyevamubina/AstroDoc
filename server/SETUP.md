# AstroDoc server setup (Claude brain + ElevenLabs voice)

The website is static (GitHub Pages), so API keys can't go in the page: anyone could copy them.
`worker.js` is a tiny free Cloudflare Worker that holds the keys and passes requests along.
Until it's set up, AstroDoc keeps working exactly as before (built-in replies, in-browser voice).

## 1. Claude API key (the brain)
1. Go to https://console.anthropic.com and sign up.
2. **Billing** → add a few dollars of credit ($5 lasts a long time for a demo).
3. **Limits** → set a monthly spend limit (for example $10), so costs can never surprise you.
4. **API keys** → **Create key** → copy it (starts with `sk-ant-`). Keep it private.

## 2. ElevenLabs API key (the voice)
1. Go to https://elevenlabs.io and sign up.
2. Click your profile → **API Keys** → **Create API key** → allow **Text to Speech** → copy it.
3. Note: the free plan sometimes blocks requests coming from servers. If the voice doesn't work,
   the Starter plan (about $5/month) fixes it. AstroDoc falls back to its free voice meanwhile.

## 3. Cloudflare Worker (free)
1. Go to https://dash.cloudflare.com and sign up.
2. **Workers & Pages** → **Create** → **Create Worker** → name it `astrodoc` → **Deploy**.
3. **Edit code** → delete everything → paste the whole of `server/worker.js` → **Deploy**.
4. Back on the worker page → **Settings** → **Variables and Secrets** → **Add**:
   - Type **Secret**, name `ANTHROPIC_API_KEY`, value = your Claude key
   - Type **Secret**, name `ELEVENLABS_API_KEY`, value = your ElevenLabs key
   → **Deploy**.
5. Copy the worker's address, like `https://astrodoc.your-name.workers.dev`.
   Opening it in a browser should show `{"ok":true,"service":"astrodoc"}`.

## 4. Connect the website
Send the worker address to Claude, or put it in `voice.js`:

```js
const ASTRODOC_SERVER = "https://astrodoc.your-name.workers.dev";
```

## Changing voices
Defaults: **Sarah** (soft, warm woman, used by default) and **George** (warm, gentle British man).
To use other ElevenLabs voices, copy a voice's ID from the ElevenLabs Voice Library and add plain
variables `VOICE_MALE` / `VOICE_FEMALE` on the worker.
