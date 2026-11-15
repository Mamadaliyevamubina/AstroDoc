// =========================================================================
// Astrodoc — MOOD CHECK-IN ("How is your inner orbit today?")
// Used in two places, with the same pieces:
//   - the dashboard (index.html): its own card for your own health
//   - "Check how I feel" (check.html): a step just before the result
//   - Five moods, from "Drifting in deep space" (1) to "Supernova" (5).
//   - The choice is saved as your own mood (1–5), the same value as
//     "Your mood" on the dashboard, so it counts in your health status
//     and in the result of the check.
//   - The result ends with "Your mood": a kind word, ideas that help,
//     a small to-do list and a private journal note.
// Moon icons and neutral colors: green/amber/red stay for health status only.
// =========================================================================

const MOODS = [
  { v: 1, name: "Drifting in deep space", short: "Very low",
    title: "It's okay to feel heavy out here. You don't have to carry it alone.",
    message: "Far from Earth, sadness or loneliness can feel vast. Be extra gentle with yourself: your feelings are valid, even on a mission. Start with one small step to reconnect with your body, your crew, or a quiet corner of the ship.",
    ideas: [
      ["Share a warm meal", "Eat together with your crew in the galley. Food and simple conversation remind you that your crew is right beside you."],
      ["Talk to someone", "Tell a crewmate you trust, or book a private call with the flight surgeon or a counselor. Saying it out loud lightens the load."],
      ["Tend the plants", "Check the plants in the growth chamber and touch the leaves. Caring for something living brings quiet calm."],
      ["Take a visual pause", "Look out the window for a few minutes, or breathe slowly with Astrodoc."],
      ["Water and a stretch", "Weightlessness quietly dehydrates you and that affects mood. Drink a full pouch and stretch your neck and shoulders."]
    ],
    todo: ["Drink a full pouch of water", "Eat a meal with the crew", "Talk openly with someone you trust"],
    prompt: "What feels heaviest right now, and what is one gentle thing you need today?" },
  { v: 2, name: "Low orbit", short: "Low",
    title: "Low orbit happens. Let's gently lift your trajectory.",
    message: "Feeling drained, homesick or flat is natural on long missions. You don't need to force a smile: give your mind a change of scene, a little movement, or warm company.",
    ideas: [
      ["Light exercise", "Fifteen minutes on the bike or light resistance work. Gentle movement clears mental fog."],
      ["Write freely", "Five minutes of writing whatever is on your mind, no filter. It makes room to breathe."],
      ["Check on the plants", "A few calm minutes with the plants. Slow growth is a quiet reminder of steady progress."],
      ["A warm drink", "Drink some water first, then make a warm tea and look out the window."]
    ],
    todo: ["Drink water", "Do 15 minutes of light exercise", "Write a short journal note"],
    prompt: "What small comfort would make the next hour feel a little lighter?" },
  { v: 3, name: "Cruising steady", short: "Okay",
    title: "Steady orbit. A good time for small, kind habits.",
    message: "You're calm and holding steady. Balanced days are the best time for small habits that keep your energy and spirits strong for the rest of the mission.",
    ideas: [
      ["A relaxed crew meal", "Laughs and shared stories at the table keep the crew close."],
      ["Water and posture", "Drink some water, roll your shoulders back and take three slow breaths."],
      ["Time with the plants", "Caring for living plants is a refreshing break from screens."],
      ["A short workout", "Keep your momentum with a session that keeps bones and muscles strong."]
    ],
    todo: ["Drink water and stretch", "Share a meal or tea with the crew", "Note one thing that went well"],
    prompt: "What went smoothly today, or what are you looking forward to later?" },
  { v: 4, name: "Solar flare", short: "Good",
    title: "Bright readings! Your good energy lifts the whole crew.",
    message: "It's great to see you feeling good. Good spirits are contagious in a small cabin: share it, or save the feeling in your journal for a quieter day.",
    ideas: [
      ["Host a crew meal", "Bring everyone together, share music and stories. Your energy can brighten a crewmate's day."],
      ["A gratitude note", "Write down what made today good. Future you will love reading it."],
      ["Harvest something fresh", "See if any herbs or leaves are ready to share at the next meal."],
      ["Use the energy", "An upbeat workout, then plenty of water."]
    ],
    todo: ["Write down what made today good", "Encourage a crewmate", "Stay hydrated"],
    prompt: "What sparked your good mood today, so you can come back to it later?" },
  { v: 5, name: "Supernova", short: "Great",
    title: "Supernova! You're thriving today.",
    message: "Days like this are special on a long mission. Enjoy the view, celebrate with your crew, and capture this feeling in your journal.",
    ideas: [
      ["Celebrate together", "Gather the crew for a meal and a toast with water pouches."],
      ["Take in the view", "Float to the window and take in the stars and the planet ahead."],
      ["A time-capsule entry", "Write down every detail of why today feels so good. It's worth keeping."],
      ["Check on a crewmate", "Share the good mood with someone who might need a chat or a laugh."]
    ],
    todo: ["Celebrate with the crew", "Write about today in your journal", "Stay hydrated"],
    prompt: "How does today feel, and what are you most proud of right now?" }
];

// A moon that fills up with the mood: 0 = new moon, 1 = full moon
function moonSvg(lit) {
  const r = 15, c = 18, rx = Math.abs(1 - 2 * lit) * r, sweep = lit < 0.5 ? 0 : 1;
  const litPath = lit <= 0 ? "" : lit >= 1 ? `<circle cx="${c}" cy="${c}" r="${r}" class="moon-lit"/>`
    : `<path class="moon-lit" d="M${c} ${c - r} A${r} ${r} 0 0 1 ${c} ${c + r} A${rx} ${r} 0 0 ${sweep} ${c} ${c - r}Z"/>`;
  return `<svg class="moon" viewBox="0 0 36 36" aria-hidden="true"><circle cx="${c}" cy="${c}" r="${r}" class="moon-dark"/>${litPath}<circle cx="${c}" cy="${c}" r="${r}" class="moon-ring"/></svg>`;
}

const mood = { picked: null, idea: 0, done: new Set() };

// --- The five choices ---
function moodCards(selected) {
  return `<div class="mood-grid" role="radiogroup" aria-label="Your mood">
    ${MOODS.map(m => `
      <button type="button" class="mood-card" role="radio" aria-checked="${selected === m.v}" data-mood="${m.v}">
        ${moonSvg((m.v - 1) / 4)}
        <span class="mood-short">${m.short}</span>
        <span class="mood-name">${m.name}</span>
        <kbd class="mood-key" aria-hidden="true">${m.v}</kbd>
      </button>`).join("")}
  </div>`;
}
// Clicks and the 1–5 keys
function bindMoodCards(root, onPick) {
  root.querySelectorAll("[data-mood]").forEach(b => b.onclick = () => onPick(+b.dataset.mood));
  root.querySelector(".mood-grid").onkeydown = e => {
    if (/^[1-5]$/.test(e.key)) { e.preventDefault(); onPick(+e.key); }
  };
}

// --- The step in "Check how I feel" ---
function drawMood() {
  $("stage").innerHTML = `
    <h1>How is your inner orbit today?</h1>
    <p class="k-lead">Long missions ask a lot of body and mind. Take a quiet breath, check in honestly, and pick what fits how you feel right now.</p>
    ${moodCards(mood.picked)}
    <div class="k-actions">
      <button class="soft-btn" id="backBtn">Back</button>
      <button class="primary-btn" id="nextBtn" ${mood.picked ? "" : "disabled"}>See my result</button>
    </div>`;
  bindMoodCards($("stage"), v => {
    if (mood.picked !== v) { mood.idea = 0; mood.done.clear(); }
    mood.picked = v;
    $("stage").querySelectorAll("[data-mood]").forEach(x => x.setAttribute("aria-checked", String(+x.dataset.mood === v)));
    $("stage").querySelector(`[data-mood="${v}"]`).focus();
    $("nextBtn").disabled = false;
  });
  $("backBtn").onclick = () => go("measure");
  $("nextBtn").onclick = () => {
    if (!mood.picked) return;
    // Your own mood rating: the same value as on the dashboard
    mutate(() => { MOCK.crew[me].checkin.self.mood = mood.picked; autoReport(me); });
    go("result");
  };
}

// --- What helps: kind words, an idea, today's list, the journal ---
function moodHelp(v, { head = true } = {}) {
  const m = MOODS.find(x => x.v === v);
  if (!m) return "";
  const S = check(me);
  const [ideaTitle, ideaText] = m.ideas[mood.idea % m.ideas.length];
  return `
    ${head ? `<header class="k-mood-head">
      ${moonSvg((m.v - 1) / 4)}
      <div>
        <span class="k-rank">Your mood · ${m.v} of 5 · ${m.name}</span>
        <h2>${m.title}</h2>
      </div>
    </header>` : `<h3 class="mood-title">${m.title}</h3>`}
    <p class="k-why">${m.message}</p>
    ${S.moodValue < m.v ? `<p class="k-mood-note">Your crewmate rated your mood ${S.moodValue} of 5, so your health status uses ${S.moodValue}.</p>` : ""}
    <div class="k-cols">
      <div>
        <h3>Something that could help</h3>
        <div class="k-idea">
          <b data-idea-title>${ideaTitle}</b>
          <p data-idea-text>${ideaText}</p>
          <button type="button" class="text-btn" data-idea-next>Another idea</button>
        </div>
      </div>
      <div>
        <h3>Today <span class="k-count" data-todo-count>${mood.done.size} of ${m.todo.length} done</span></h3>
        <ul class="k-todo">${m.todo.map((t, i) => `
          <li><label><input type="checkbox" data-todo="${i}" ${mood.done.has(i) ? "checked" : ""}><span>${t}</span></label></li>`).join("")}
        </ul>
      </div>
    </div>
    <div class="k-journal">
      <label><h3>Journal</h3><span>${m.prompt}</span>
        <textarea data-journal rows="3" placeholder="Only you can see this. It stays on this device."></textarea></label>
      <div class="k-journal-row">
        <button type="button" class="soft-btn" data-journal-save>Save note</button>
        <a class="text-btn" href="chat.html#ask=${encodeURIComponent("Calm me down")}">Breathe with Astrodoc</a>
        <span class="k-note" data-journal-note aria-live="polite"></span>
      </div>
      <ul class="k-notes" data-journal-list>${journalItems()}</ul>
    </div>`;
}
function bindMoodHelp(root, v) {
  const m = MOODS.find(x => x.v === v);
  if (!m || !root.querySelector("[data-idea-next]")) return;
  const q = sel => root.querySelector(sel);
  q("[data-idea-next]").onclick = () => {
    mood.idea++;
    const [t, d] = m.ideas[mood.idea % m.ideas.length];
    q("[data-idea-title]").textContent = t;
    q("[data-idea-text]").textContent = d;
  };
  root.querySelectorAll("[data-todo]").forEach(c => c.onchange = () => {
    c.checked ? mood.done.add(+c.dataset.todo) : mood.done.delete(+c.dataset.todo);
    q("[data-todo-count]").textContent = `${mood.done.size} of ${m.todo.length} done`;
  });
  q("[data-journal-save]").onclick = () => {
    const text = q("[data-journal]").value.trim();
    if (!text) { q("[data-journal-note]").textContent = "Write a few words first."; q("[data-journal]").focus(); return; }
    const list = journal();
    list.unshift({ when: new Date().toISOString(), mood: m.v, text: text.slice(0, 1000) });
    try { localStorage.setItem(JOURNAL, JSON.stringify(list.slice(0, 30))); } catch { }
    q("[data-journal]").value = "";
    q("[data-journal-note]").textContent = "Saved.";
    q("[data-journal-list]").innerHTML = journalItems();
  };
}

// --- At the end of the check's result ---
function moodResult() {
  const m = MOODS.find(x => x.v === mood.picked);
  return m ? `<details class="k-mood" id="moodResult">
    <summary>${moonSvg((m.v - 1) / 4)}<span><b>Something for your mood</b><small>You feel “${m.short.toLowerCase()}” · ideas, a short list and a private journal</small></span></summary>
    ${moodHelp(mood.picked, { head: false })}</details>` : "";
}
function bindMoodResult() { if ($("moodResult")) bindMoodHelp($("moodResult"), mood.picked); }

// --- The dashboard card (your own health only) ---
// Drawn again only when the mood or the person changes, so a half-written note is never lost.
let moodDrawn = "";
function showMoodCard() {
  const el = $("moodCard");
  if (!el || !me) return;
  const v = MOCK.crew[me].checkin.self.mood, key = `${me}:${v}`;
  if (key === moodDrawn) return;
  if (moodDrawn && moodDrawn.split(":")[1] !== String(v)) { mood.idea = 0; mood.done.clear(); }
  moodDrawn = key;
  const hadFocus = el.contains(document.activeElement);
  const m = MOODS.find(x => x.v === v);
  el.innerHTML = `
    <span class="field-label" id="moodCardTitle">Your mood right now</span>
    ${moodCards(v)}
    ${m ? `<p class="mood-line">${m.title}${v <= 2 ? ` <a href="chat.html#mode=chat">Talk it through with Astrodoc</a>` : ""}</p>` : ""}`;
  bindMoodCards(el, pick => {
    mutate(() => { MOCK.crew[me].checkin.self.mood = pick; autoReport(me); });
    if (typeof showAll === "function") showAll(); else showMoodCard();
    const b = el.querySelector(`[data-mood="${pick}"]`); if (b) b.focus();
  });
  if (hadFocus) { const b = el.querySelector('[aria-checked="true"]'); if (b) b.focus(); }
}

// Journal notes: private, only on this device
const JOURNAL = "astrodoc-journal";
const journal = () => { try { return JSON.parse(localStorage.getItem(JOURNAL)) || []; } catch { return []; } };
function journalItems() {
  return journal().filter(n => n && n.text).slice(0, 3).map(n => `
    <li><span>${time(new Date(n.when))} · mood ${n.mood} of 5</span><p>${escapeHtml(n.text)}</p></li>`).join("");
}
