// =========================================================================
// Astrodoc — RADIATION OVER THE WHOLE MISSION (dashboard card)
// Real data: the dose rates NASA's Curiosity rover measured with its RAD
// instrument, inside its spacecraft on the way to Mars (1.8 mSv a day) and
// on the surface of Mars (0.67 mSv a day). The line adds them up day by day
// for the mission's three phases and shows when the person passes NASA's
// 600 mSv career limit. Uses core.js (missionDoseUntil, phaseAt, check).
// =========================================================================

function showDose(S) {
  const el = $("doseCard");
  if (!el || !me) return;
  const m = MOCK.mission, len = missionLength(), lim = MOCK.radiation.careerLimit;
  const c = MOCK.crew[currentCrew];
  const you = currentCrew === me;
  const who = you ? "you" : `the ${c.role.toLowerCase()}`;
  const extra = c.radiation.accrued;
  const doseAt = d => S.prior + missionDoseUntil(d) + (d >= m.day ? extra : extra * d / m.day);
  const fmt = n => Math.round(n).toLocaleString("en-US");
  const limitPhase = S.limitDay != null ? phaseAt(S.limitDay).name.toLowerCase() : "";

  // Chart geometry
  const narrow = (el.clientWidth || 760) < 620;           // phones: fewer pixels, so a smaller drawing scale
  const W = narrow ? Math.max(300, Math.round(el.clientWidth - 34)) : 760, H = narrow ? 260 : 250, L = narrow ? 40 : 48, R = narrow ? 10 : 20, T = 34, B = 30;
  const yMax = Math.ceil(Math.max(S.doseAtEnd, lim) * 1.08 / 200) * 200;
  const x = d => L + d / len * (W - L - R);
  const y = v => T + (1 - v / yMax) * (H - T - B);
  const step = 6;                                   // one point every 6 days
  const pts = d0 => { const a = []; for (let d = d0[0]; d <= d0[1]; d += step) a.push(d); if (a[a.length - 1] !== d0[1]) a.push(d0[1]); return a; };
  const path = days => days.map((d, i) => `${i ? "L" : "M"}${x(d).toFixed(1)},${y(doseAt(d)).toFixed(1)}`).join("");
  const past = path(pts([0, m.day])), future = path(pts([m.day, len]));

  let start = 0;
  const bands = m.phases.map((p, i) => {
    const b = { ...p, start, rate: MOCK.locations[p.where].ratePerDay, i };
    start += p.days; return b;
  });
  const ticks = []; for (let v = 0; v <= yMax; v += 200) ticks.push(v);
  const today = doseAt(m.day);

  el.innerHTML = `
    <div class="dose-head">
      <div>
        <h2 id="doseTitle">Radiation over the whole mission</h2>
        <p class="dose-lead">${S.limitDay != null
          ? `At the rates NASA's Curiosity rover measured, ${who} ${you ? "pass" : "passes"} the 600 mSv career limit on <b>day ${S.limitDay}</b>, ${limitPhase === "on mars" ? "while on Mars" : "during the " + limitPhase.replace("to mars", "trip to Mars").replace("back to earth", "trip home")}. By the end: about <b>${fmt(S.doseAtEnd)} mSv</b>.`
          : `At the rates NASA's Curiosity rover measured, ${who} ${you ? "stay" : "stays"} under the 600 mSv career limit, ending at about <b>${fmt(S.doseAtEnd)} mSv</b>.`}</p>
      </div>
      <a class="text-btn dose-src" href="science.html#radiation">Where these numbers come from</a>
    </div>
    <figure class="dose-chart">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="doseDesc">
        <desc id="doseDesc">Total radiation dose over a ${len}-day Mars mission. Today, day ${m.day}: ${fmt(today)} mSv. Career limit ${lim} mSv${S.limitDay != null ? `, passed on day ${S.limitDay}` : ""}. End of mission: ${fmt(S.doseAtEnd)} mSv.</desc>
        ${bands.map(b => `
          <rect class="dose-band ${b.where}" x="${x(b.start)}" y="${T - 22}" width="${x(b.start + b.days) - x(b.start)}" height="${H - B - T + 22}"/>
          <text class="dose-phase" x="${x(b.start) + (narrow ? 4 : 8)}" y="${T - 8}"><tspan class="n">${narrow ? b.name.replace("Back to Earth", "Home") : b.name}</tspan>${narrow ? "" : `<tspan dx="6">${b.rate} mSv/day</tspan>`}</text>`).join("")}
        ${ticks.map(v => `<line class="dose-grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="dose-tick" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("")}
        <line class="dose-limit" x1="${L}" x2="${W - R}" y1="${y(lim)}" y2="${y(lim)}"/>
        <text class="dose-limit-label" x="${W - R - 6}" y="${y(lim) - 7}" text-anchor="end">${narrow ? "Limit" : "NASA career limit"} · ${lim} mSv</text>
        <path class="dose-line" d="${past}"/>
        <path class="dose-line future" d="${future}"/>
        <line class="dose-now" x1="${x(m.day)}" x2="${x(m.day)}" y1="${T - 22}" y2="${H - B}"/>
        ${S.limitDay != null ? `<circle class="dose-cross" cx="${x(S.limitDay)}" cy="${y(lim)}" r="5"/>
          <text class="dose-cross-label" x="${x(S.limitDay)}" y="${y(lim) + 20}" text-anchor="middle">Day ${S.limitDay}</text>` : ""}
        <circle class="dose-today" cx="${x(m.day)}" cy="${y(today)}" r="6"/>
        <text class="dose-today-label" x="${x(m.day) + 10}" y="${y(today) + 18}">Today · ${fmt(today)} mSv</text>
        <text class="dose-axis" x="${L}" y="${H - 8}">Day 0</text>
        <text class="dose-axis" x="${W - R}" y="${H - 8}" text-anchor="end">Day ${len}</text>
        <text class="dose-axis" x="${L - (narrow ? 34 : 40)}" y="${T - 26}">mSv</text>
        <g class="dose-hover" hidden><line class="dose-cursor" y1="${T - 22}" y2="${H - B}"/><circle class="dose-cursor-dot" r="4.5"/></g>
        <rect class="dose-hit" x="${L}" y="${T - 22}" width="${W - L - R}" height="${H - B - T + 22}"/>
      </svg>
      <div class="dose-tip" hidden></div>
    </figure>
    <p class="dose-foot">One day in deep space gives about as much radiation as 9 months of natural background on Earth (about 2.4 mSv a year).
      Readings of the crew are simulated; the dose rates are real measurements.</p>`;

  // Hover / touch: crosshair and a small tooltip with the day, phase and total dose
  const svg = el.querySelector("svg"), hit = el.querySelector(".dose-hit"), g = el.querySelector(".dose-hover"), tip = el.querySelector(".dose-tip");
  const cursor = g.querySelector(".dose-cursor"), dot = g.querySelector(".dose-cursor-dot");
  const move = e => {
    const r = svg.getBoundingClientRect();
    const px = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width * W;
    const day = Math.round(Math.max(0, Math.min(len, (px - L) / (W - L - R) * len)));
    const v = doseAt(day), p = phaseAt(day);
    cursor.setAttribute("x1", x(day)); cursor.setAttribute("x2", x(day));
    dot.setAttribute("cx", x(day)); dot.setAttribute("cy", y(v));
    g.hidden = false;
    tip.hidden = false;
    tip.innerHTML = `<b>Day ${day}</b><span>${p.name} · ${fmt(v)} mSv${v >= lim ? " · over the limit" : ""}</span>`;
    const left = x(day) / W * r.width;
    tip.style.left = `${Math.min(r.width - 180, Math.max(0, left - 90))}px`;
    tip.style.top = `${y(v) / H * r.height - 64}px`;
  };
  const leave = () => { g.hidden = true; tip.hidden = true; };
  hit.addEventListener("pointermove", move);
  hit.addEventListener("pointerdown", move);
  hit.addEventListener("pointerleave", leave);
}

// Redraw when the screen gets narrow or wide (phone turned, window resized)
let doseNarrow = null;
window.addEventListener("resize", () => {
  const el = $("doseCard"); if (!el || !me) return;
  const n = el.clientWidth < 620;
  if (doseNarrow !== null && n !== doseNarrow) showDose(check(currentCrew));
  doseNarrow = n;
});
