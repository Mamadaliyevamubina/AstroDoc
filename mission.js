// =========================================================================
// Astrodoc — MISSION VIEW + FIRST-VISIT GUIDE (dashboard)
// The mission view is drawn from the data, not a picture:
//   - the ship sits on the Earth → Mars path at today's day (MOCK.mission)
//   - the glowing trail is the radiation the person has taken (check().dose)
//   - pulses travel to Earth at the real one-way delay; with the Earth link
//     down (solar conjunction) the Sun swells and blocks them
// The guide explains the app in three steps, once; "How to use" reopens it.
// Uses core.js.
// =========================================================================

const GUIDE_KEY = "astrodoc-guide-done";

function showMissionView() {
  const el = $("missionHero");
  if (!el || !me) return;
  const m = MOCK.mission, len = missionLength(), S = check(currentCrew);
  const p = phaseAt(m.day), left = p.start + p.days - m.day;
  const down = m.earthLink === false, waiting = queuedCount();
  const outbound = p.name === "To Mars", onMars = p.name === "On Mars";
  const prog = outbound ? (m.day - p.start) / p.days : onMars ? 1 : 1 - (m.day - p.start) / p.days;
  const lim = MOCK.radiation.careerLimit, dosePct = Math.min(1, S.dose / lim);
  const fmt = n => Math.round(n).toLocaleString("en-US");
  const who = currentCrew === me ? "You" : MOCK.crew[currentCrew].role;

  // Same stars every time
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const stars = Array.from({ length: 70 }, () => `<circle cx="${(rnd() * 960).toFixed(0)}" cy="${(rnd() * 200).toFixed(0)}" r="${(0.4 + rnd() * 1.1).toFixed(1)}" opacity="${(0.25 + rnd() * 0.6).toFixed(2)}"/>`).join("");

  el.innerHTML = `
    <svg class="mv-art" viewBox="0 0 960 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="mvSun"><stop offset="0" stop-color="#fff7d6"/><stop offset=".35" stop-color="#ffd27a" stop-opacity=".85"/><stop offset="1" stop-color="#ff9f45" stop-opacity="0"/></radialGradient>
        <radialGradient id="mvEarth" cx=".35" cy=".3"><stop offset="0" stop-color="#bfe1ff"/><stop offset=".55" stop-color="#4f8fe0"/><stop offset="1" stop-color="#1f4f9e"/></radialGradient>
        <radialGradient id="mvMars" cx=".35" cy=".3"><stop offset="0" stop-color="#ffc39e"/><stop offset=".6" stop-color="#d9714a"/><stop offset="1" stop-color="#9c4428"/></radialGradient>
        <radialGradient id="mvGlow"><stop offset="0" stop-color="#9fe8d6" stop-opacity=".9"/><stop offset="1" stop-color="#9fe8d6" stop-opacity="0"/></radialGradient>
        <linearGradient id="mvTrail" x1="0" x2="1"><stop offset="0" stop-color="#9fe8d6" stop-opacity=".15"/><stop offset="1" stop-color="#ffd9a8" stop-opacity="${(0.55 + dosePct * 0.45).toFixed(2)}"/></linearGradient>
      </defs>
      <g class="mv-stars">${stars}</g>
      <circle class="mv-sun ${down ? "big" : ""}" cx="480" cy="178" r="${down ? 120 : 58}" fill="url(#mvSun)"/>
      <path class="mv-path back" d="M850 160 Q 480 270 110 170"/>
      <path class="mv-path" id="mvOut" d="M138 146 Q 480 36 828 134"/>
      <path class="mv-trail" id="mvTrailPath" d="M138 146 Q 480 36 828 134" stroke="url(#mvTrail)"/>
      <line class="mv-signal ${down ? "blocked" : ""}" id="mvSignal" x1="0" y1="0" x2="128" y2="158"/>
      <!-- Real photos, cropped round: Earth from Apollo 17 (NASA), Mars from the Viking orbiters (NASA/USGS). Both public domain. -->
      <clipPath id="mvEarthClip"><circle cx="110" cy="160" r="27"/></clipPath>
      <clipPath id="mvMarsClip"><circle cx="850" cy="146" r="19"/></clipPath>
      <circle cx="110" cy="160" r="27" fill="url(#mvEarth)"/>
      <image class="mv-planet" href="assets/planets/earth.jpg" x="82" y="132" width="56" height="56" clip-path="url(#mvEarthClip)" preserveAspectRatio="xMidYMid slice"/>
      <circle cx="850" cy="146" r="19" fill="url(#mvMars)"/>
      <image class="mv-planet" href="assets/planets/mars.jpg" x="830.5" y="126.5" width="39" height="39" clip-path="url(#mvMarsClip)" preserveAspectRatio="xMidYMid slice"/>
      <text class="mv-name" x="146" y="186">Earth</text>
      <text class="mv-name" x="818" y="182" text-anchor="end">Mars</text>
      <g id="mvShip"><circle class="mv-halo" r="14" fill="url(#mvGlow)"/><circle r="4.5" fill="#fff"/></g>
    </svg>
    <div class="mv-text">
      <div class="mv-main">
        <p class="mv-day">Day ${m.day} <span>of ${fmt(len)}</span></p>
        <button type="button" class="mv-story" data-story><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.8v10.4L13 8z" fill="currentColor"/></svg>Watch the 60-second story</button>
        <p class="mv-sub">${outbound ? `On the way to Mars · ${left} days to arrival` : onMars ? `On Mars · ${left} days to launch home` : `On the way home · ${left} days to Earth`}</p>
      </div>
      <dl class="mv-facts">
        <div><dt>Radiation so far · ${who}</dt><dd>${fmt(S.dose)} <small>of ${lim} mSv</small></dd></div>
        <div><dt>Earth link</dt><dd>${down ? `Blocked by the Sun${waiting ? ` <small>· ${waiting} report${waiting > 1 ? "s" : ""} waiting</small>` : ""}` : `${m.signalDelayMin} min <small>each way</small>`}</dd></div>
      </dl>
    </div>
`;

  // Put the ship on the path at today's progress, and aim the signal at Earth
  const path = el.querySelector("#mvOut"), L = path.getTotalLength();
  const at = path.getPointAtLength(L * prog);
  el.querySelector("#mvShip").setAttribute("transform", `translate(${at.x.toFixed(1)} ${at.y.toFixed(1)})`);
  const trail = el.querySelector("#mvTrailPath");
  trail.style.strokeDasharray = `${(L * prog).toFixed(1)} ${L}`;
  const sig = el.querySelector("#mvSignal");
  sig.setAttribute("x1", at.x.toFixed(1)); sig.setAttribute("y1", at.y.toFixed(1));
  if (down) { sig.setAttribute("x2", "480"); sig.setAttribute("y2", (at.y + (480 - at.x) / (128 - at.x) * (158 - at.y)).toFixed(1)); }
  // One pulse loop = 3 seconds for the 18 minutes (a little clock in the corner of the eye)
  sig.style.animationDuration = `${Math.max(1.5, m.signalDelayMin / 6).toFixed(1)}s`;
}

// --- First-visit guide: three things to know ---
function showGuide(force) {
  const el = $("guideCard");
  if (!el || !me) return;
  let done = false; try { done = localStorage.getItem(GUIDE_KEY) === "1"; } catch { }
  if (done && !force) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `
    <div class="g-head">
      <h2 id="guideTitle">How to use Astrodoc</h2>
      <p>Earth is ${MOCK.mission.signalDelayMin} minutes away, so Astrodoc tells you what to do now and reports to Earth by itself. Three things to know:</p>
    </div>
    <ol class="g-steps">
      <li>
        <b>Read the colours</b>
        <span class="g-levels">${badge("normal")}${badge("watch")}${badge("act")}</span>
        <span>The card at the top always shows the most urgent problem and one thing to do now.</span>
      </li>
      <li>
        <b>Feel something? Check it</b>
        <span>Tap the 3D astronaut where it hurts. Emergency signs come first, then a few questions, then what it could be.</span>
        <a class="text-btn" href="check.html">Check how I feel</a>
      </li>
      <li>
        <b>Ask, or just talk</b>
        <span>Astrodoc answers questions, runs your daily check-in and breathes with you. Every number has a source.</span>
        <span class="g-links"><a class="text-btn" href="chat.html">Talk to Astrodoc</a><a class="text-btn" href="science.html">The science</a></span>
      </li>
    </ol>
    <div class="g-foot">
      <span>Showing Astrodoc to someone? <b>Demo controls</b> at the bottom start a solar storm, cut the Earth link or connect the pulse sensor.</span>
      <button type="button" class="primary-btn" id="guideDone">Got it</button>
    </div>`;
  $("guideDone").onclick = () => {
    try { localStorage.setItem(GUIDE_KEY, "1"); } catch { }
    el.hidden = true;
    const s = document.querySelector(".status-card"); if (s) s.scrollIntoView({ block: "nearest" });
  };
}
// The footer link brings the guide back
document.addEventListener("click", e => {
  if (!e.target.closest("[data-show-guide]")) return;
  e.preventDefault();
  showGuide(true);
  $("guideCard").scrollIntoView({ block: "start", behavior: "smooth" });
});

// Redraw with the dashboard (new day, other crew member, link down)
(function () {
  const base = window.showAll;
  if (typeof base === "function") window.showAll = function () { const r = base.apply(this, arguments); showMissionView(); showGuide(); return r; };
  document.body.classList.add("has-mission-view");
  showMissionView(); showGuide();
})();
