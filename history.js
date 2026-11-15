// =========================================================================
// Astrodoc — THE LAST 6 MONTHS (dashboard card)
// 26 weekly points (mission days 39 to 214) for sleep, mood, bone and body
// mass, and an analysis of how the person is doing.
// The people are simulated (real astronaut health records are private), but
// every trend follows what NASA measured in real astronauts:
//   - sleep: ISS crews slept 6.09 h a night on average, NASA schedules 8.5 h
//     (Barger et al., The Lancet Neurology, 2014)
//   - bone: 1% to 1.5% of bone density lost per month on 4–6 month missions
//     (NASA Human Research Program, Risk of Spaceflight-Induced Bone Changes)
//   - body mass: Scott Kelly lost 7% in his year on the ISS (NASA Twins Study, 2019)
// Uses core.js (check, MOCK, badge, ICON, LABEL).
// =========================================================================

const NASA_REF = {
  sleepIss: 6.09, sleepScheduled: 8.5,        // hours a night
  boneLow: 1.0, boneHigh: 1.5,                // % lost per month
  kellyMassYear: 7                            // % body mass lost in about a year
};

// Each person's own story over the 6 months (rates follow the NASA ranges above)
const HISTORY_PLAN = {
  CDR: { sleepFrom: 7.1, bonePerMonth: 1.25, massPerMonth: 0.6, moodFrom: 4.4 },   // sleep slides in the last 2 months
  PLT: { sleepFrom: 7.3, bonePerMonth: 1.65, massPerMonth: 0.45, moodFrom: 4.2 },  // fewer exercise sessions: faster bone loss
  MS1: { sleepFrom: 7.7, bonePerMonth: 1.0, massPerMonth: 0.3, moodFrom: 4.0 }
};

// Small, repeatable wobble so the lines look like real weekly data
const wobble = (seed, i) => { const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return (x - Math.floor(x)) - 0.5; };

function sixMonths(id) {
  const c = MOCK.crew[id], S = check(id), P = HISTORY_PLAN[id] || HISTORY_PLAN.MS1;
  const seed = id.charCodeAt(0) + id.charCodeAt(1) * 3;
  const N = 26, end = MOCK.mission.day;
  const sleepNow = c.sleep.nights.reduce((a, b) => a + b, 0) / c.sleep.nights.length;
  const weeks = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);                                     // 0 = six months ago, 1 = this week
    const day = end - 7 * (N - 1 - i);
    const months = (day - (end - 7 * (N - 1))) / 30.4 + 0.25;  // the 6 months start about a week after launch
    // Sleep: steady, then it bends toward this week's real average
    const bend = Math.max(0, (t - 0.6) / 0.4);
    const sleep = P.sleepFrom + (sleepNow - P.sleepFrom) * (t * 0.35 + bend * bend * 0.65) + wobble(seed, i) * 0.35;
    // Mood: drifts toward today's rating
    const mood = P.moodFrom + (S.moodValue - P.moodFrom) * Math.pow(t, 1.6) + wobble(seed + 7, i) * 0.4;
    const bone = -(P.bonePerMonth * months) + wobble(seed + 3, i) * 0.25;
    const mass = -(P.massPerMonth * months) + wobble(seed + 5, i) * 0.35;
    weeks.push({ day, sleep: +sleep.toFixed(2), mood: +Math.max(1, Math.min(5, mood)).toFixed(2), bone: +bone.toFixed(2), mass: +mass.toFixed(2) });
  }
  weeks[N - 1].sleep = +sleepNow.toFixed(2);
  weeks[N - 1].mood = S.moodValue;
  return weeks;
}

// What the 6 months say, in plain words, with a status for each
function analyse(id, W) {
  const avg = (k, a, b) => W.slice(a, b).reduce((s, w) => s + w[k], 0) / (b - a);
  const first = k => avg(k, 0, 4), last = k => avg(k, W.length - 4, W.length);
  const months = (W[W.length - 1].day - W[0].day) / 30.4 + 0.25;
  const r = [];

  const sl0 = first("sleep"), sl1 = +last("sleep").toFixed(1);   // judged on the number shown
  r.push({ key: "sleep", name: "Sleep", status: sl1 < 6 ? "act" : sl1 < 7 ? "watch" : "normal",
    head: `${sl1.toFixed(1)} h a night lately (was ${sl0.toFixed(1)} h)`,
    text: sl1 < NASA_REF.sleepIss
      ? `Below the ${NASA_REF.sleepIss} h that ISS crews averaged, and far below the ${NASA_REF.sleepScheduled} h NASA schedules. Short sleep builds up over weeks.`
      : `Above the ${NASA_REF.sleepIss} h that ISS crews averaged. NASA schedules ${NASA_REF.sleepScheduled} h.` });

  const m0 = first("mood"), m1 = last("mood");
  const moodTrend = m1 - m0;
  r.push({ key: "mood", name: "Mood", status: m1 < 2.5 ? "act" : (m1 < 3.5 || moodTrend < -0.8) ? "watch" : "normal",
    head: `${m1.toFixed(1)} of 5 lately (was ${m0.toFixed(1)})`,
    text: moodTrend < -0.5 ? "Falling over the months. On long, isolated missions this is common and helps to catch early: talk with the crew and the flight surgeon."
      : "Steady over the months." });

  const b = W[W.length - 1].bone, perMonth = -b / months;
  r.push({ key: "bone", name: "Bone density", status: perMonth > NASA_REF.boneHigh ? "watch" : "normal",
    head: `${b.toFixed(1)}% since launch (${perMonth.toFixed(1)}% a month)`,
    text: perMonth > NASA_REF.boneHigh
      ? `Faster than the ${NASA_REF.boneLow}–${NASA_REF.boneHigh}% a month NASA measured on ISS missions. Check the resistance exercise sessions.`
      : `Inside the ${NASA_REF.boneLow}–${NASA_REF.boneHigh}% a month NASA measured on ISS missions. Keep the resistance exercise.` });

  const ms = W[W.length - 1].mass;
  r.push({ key: "mass", name: "Body mass", status: ms < -5 ? "watch" : "normal",
    head: `${ms.toFixed(1)}% since launch`,
    text: `Scott Kelly lost ${NASA_REF.kellyMassYear}% in his year on the ISS, partly from eating less than planned. ${ms < -3 ? "Check meals are being finished." : "On track."}` });

  const overall = worst(...r.map(x => x.status));
  const bad = r.filter(x => x.status !== "normal").map(x => x.name.toLowerCase());
  const list = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  const good = r.filter(x => x.status === "normal").map(x => x.name.toLowerCase());
  const summary = bad.length
    ? `Over the last 6 months: ${list(bad)} ${bad.length > 1 ? "need" : "needs"} attention${good.length ? `; ${list(good)} ${good.length > 1 ? "are" : "is"} on track` : ""}.`
    : "Over the last 6 months everything is on track with what NASA measured in real astronauts.";
  return { items: r, overall, summary };
}

// One small chart per measure: the person's weekly line and NASA's reference
function miniChart(W, key, opt) {
  const Wd = 300, H = 120, L = 34, R = 10, T = 12, B = 22;
  const vals = W.map(w => w[key]);
  const lo = Math.min(opt.min, ...vals), hi = Math.max(opt.max, ...vals);
  const x = i => L + i / (W.length - 1) * (Wd - L - R);
  const y = v => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const pts = W.map((w, i) => `${x(i).toFixed(1)},${y(w[key]).toFixed(1)}`).join(" ");
  const ref = opt.ref != null ? `<line class="h-ref" x1="${L}" x2="${Wd - R}" y1="${y(opt.ref)}" y2="${y(opt.ref)}"/><text class="h-ref-label" x="${L + 4}" y="${y(opt.ref) + 14}">${opt.refLabel}</text>` : "";
  // A widening band: NASA's range for the time since launch at each week
  const band = opt.cone ? (() => {
    const top = W.map((w, i) => `${x(i).toFixed(1)},${y(opt.cone(w)[1]).toFixed(1)}`);
    const bot = W.map((w, i) => `${x(i).toFixed(1)},${y(opt.cone(w)[0]).toFixed(1)}`).reverse();
    const k = Math.round((W.length - 1) * 0.3), mid = opt.cone(W[k]);
    return `<polygon class="h-band" points="${top.concat(bot).join(" ")}"/><text class="h-ref-label" x="${x(k)}" y="${y(mid[0]) + 16}">${opt.bandLabel}</text>`;
  })() : "";
  const ticks = opt.ticks.map(v => `<text class="h-tick" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}${opt.unit || ""}</text><line class="h-grid" x1="${L}" x2="${Wd - R}" y1="${y(v)}" y2="${y(v)}"/>`).join("");
  const lastV = vals[vals.length - 1];
  return `<svg viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${opt.label}: ${vals[0]} to ${lastV}${opt.unit || ""} over 26 weeks">
    ${band}${ticks}${ref}
    <polyline class="h-line" points="${pts}"/>
    <circle class="h-dot" cx="${x(W.length - 1)}" cy="${y(lastV)}" r="4"/>
    <text class="h-axis" x="${L}" y="${H - 5}">Day ${W[0].day}</text><text class="h-axis" x="${Wd - R}" y="${H - 5}" text-anchor="end">Day ${W[W.length - 1].day}</text>
    ${W.map((w, i) => `<rect class="h-hit" x="${x(i) - (Wd - L - R) / (W.length - 1) / 2}" y="${T}" width="${(Wd - L - R) / (W.length - 1)}" height="${H - T - B}"><title>Day ${w.day}: ${w[key]}${opt.unit || ""}</title></rect>`).join("")}
  </svg>`;
}

function showHistory() {
  const el = $("historyCard");
  if (!el || !me) return;
  const id = currentCrew, c = MOCK.crew[id];
  const W = sixMonths(id), A = analyse(id, W);
  const by = Object.fromEntries(A.items.map(i => [i.key, i]));
  const charts = {
    sleep: miniChart(W, "sleep", { min: 4.5, max: 8.5, ticks: [5, 6, 7, 8], unit: " h", ref: NASA_REF.sleepIss, refLabel: `ISS crews ${NASA_REF.sleepIss} h`, label: "Sleep" }),
    mood:  miniChart(W, "mood",  { min: 1, max: 5, ticks: [1, 3, 5], label: "Mood" }),
    bone:  miniChart(W, "bone",  { min: -10, max: 0, ticks: [0, -5, -10], unit: "%", cone: w => { const mo = (w.day - W[0].day) / 30.4 + 0.25; return [-NASA_REF.boneHigh * mo, -NASA_REF.boneLow * mo]; }, bandLabel: "NASA range", label: "Bone density change" }),
    mass:  miniChart(W, "mass",  { min: -6, max: 1, ticks: [0, -3, -6], unit: "%", label: "Body mass change" })
  };
  el.innerHTML = `
    <div class="h-head">
      <div>
        <h2 id="historyTitle">The last 6 months${currentCrew === me ? "" : ` · ${c.role}`}</h2>
        <p class="h-summary">${A.summary}</p>
      </div>
      <a class="text-btn" href="science.html#history">How this is built</a>
    </div>
    <div class="h-grid-4">
      ${["sleep", "mood", "bone", "mass"].map(k => `
        <figure class="h-cell">
          <figcaption><span class="h-name">${by[k].name}</span>${badge(by[k].status)}</figcaption>
          <p class="h-now">${by[k].head}</p>
          ${charts[k]}
          <p class="h-text">${by[k].text}</p>
        </figure>`).join("")}
    </div>
    <p class="h-foot">Simulated person, real NASA rates: sleep from ${NASA_REF.sleepIss} h ISS crews (Barger 2014), bone loss of ${NASA_REF.boneLow}–${NASA_REF.boneHigh}% a month (NASA), body mass from the NASA Twins Study.</p>`;
}
