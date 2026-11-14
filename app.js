// =========================================================================
// Astrodoc — Dashboard page (index.html). Health rules live in core.js.
//   1. WHO       "who are you?" once, then you and your crewmates
//   2. SHOW      status, the blood-test chart, four readings
//   3. INPUT     today's input, clot checklist, report, emergency
//   4. DEMO      solar storm, location, sensor hooks, reset
// =========================================================================


// =========================================================================
// 1. WHO — the app belongs to one astronaut ("me"). Asked once.
// =========================================================================
const ROLE_NOTE = { CDR: "Leads the mission", PLT: "Flies the spacecraft", MS1: "Runs the science" };
const isMe = id => id === me;
const nameOf = id => isMe(id) ? "You" : MOCK.crew[id].role;

// Welcome: pick yourself. No health badges here: this is who you are, not triage.
function showWelcome() {
  $("crewSelector").innerHTML = Object.keys(MOCK.crew).map(id => `
    <button class="choice" data-crew="${id}">
      <span class="choice-name">${MOCK.crew[id].role}</span>
      <span class="choice-note">${ROLE_NOTE[id] || id}</span>
    </button>`).join("");
  document.querySelectorAll("[data-crew]").forEach(b => b.onclick = () => chooseMe(b.dataset.crew));
}
function chooseMe(id) {
  mutate(() => { me = id; currentCrew = id; emergency.active = false; emergency.signs = {}; });
  emergencyAsk = false;
  document.body.classList.remove("choosing");
  showAll();
  window.scrollTo(0, 0);
  const first = document.querySelector("[data-view]");
  if (first) first.focus({ preventScroll: true });
}
$("changeUser").onclick = () => {
  document.body.classList.add("choosing");
  showWelcome();
  window.scrollTo(0, 0);
  const current = document.querySelector(`[data-crew="${me}"]`);
  if (current) current.focus();
};

// Crew strip: you first, then crewmates with the most urgent first. Each shows WHY.
function showCrewStrip() {
  const ids = [me, ...Object.keys(MOCK.crew).filter(id => id !== me).sort(bySeverity)];
  $("crewStrip").innerHTML = ids.map(id => {
    const S = check(id);
    return `<button class="crew-tab ${S.overall}" data-view="${id}" aria-pressed="${id === currentCrew}">
      <span class="crew-icon">${ICON[S.overall]}</span>
      <span class="crew-text">
        <span class="crew-name">${nameOf(id)}${isMe(id) ? `<small>${MOCK.crew[id].role}</small>` : ""}</span>
        <span class="crew-why"><span class="sr-only">${LABEL[S.overall]}: </span>${reasonFor(id)}</span>
      </span></button>`;
  }).join("");
  document.querySelectorAll("[data-view]").forEach(b => b.onclick = () => view(b.dataset.view));
}
function view(id) {
  if (id === currentCrew) return;
  mutate(() => { emergency.active = false; emergency.signs = {}; currentCrew = id; autoReport(id); });
  emergencyAsk = false;
  showAll();
  const tab = document.querySelector(`[data-view="${id}"]`);
  if (tab) tab.focus({ preventScroll: true });
}


// =========================================================================
// 2. SHOW
// =========================================================================
function showMission() {
  const m = MOCK.mission;
  $("missionStrip").innerHTML = `<span>Day ${m.day} · ${m.phase}</span><span>Earth delay ${m.signalDelayMin} min</span>`;
}

// Status: the most urgent thing and what to do now; the rest as short lines.
let helpOpen = false;
function showStatus(S) {
  const c = MOCK.crew[currentCrew];
  const [first, ...rest] = S.warnings;          // already most urgent first (core.js)
  const auto = lastReport(currentCrew, { automatic: true });
  const showClot = first && (first.extra === "clot" || rest.some(w => w.extra === "clot"));
  const showDimer = showClot || S.labTrend.includes("D-dimer");
  $("statusCard").innerHTML = `
    <div class="st-top">
      <span class="who">${isMe(currentCrew) ? `You · ${c.role}` : `Crewmate · ${c.role}`}</span>
      <span class="st-level">${badge(S.overall)}
        <button class="help-btn" id="helpBtn" aria-expanded="${helpOpen}" aria-controls="levelHelp">What does this mean?</button></span>
    </div>
    <div class="level-help" id="levelHelp" ${helpOpen ? "" : "hidden"}>
      ${["act", "watch", "normal"].map(l => `<p class="${l === S.overall ? "current" : ""}">${badge(l)}<span>${LEVEL_HELP[l]}</span></p>`).join("")}
    </div>
    ${first ? `
      <h1 class="st-title">${first.title}</h1>
      <p class="st-do"><span class="do-label">Do now</span>${first.todo}</p>
      ${auto ? `<p class="st-sent">${SENT_ICON}Sent to the flight surgeon automatically at ${time(auto.sent)} · earliest reply ~${time(auto.reply)}. Don't wait for it.</p>` : ""}
      ${showDimer || showClot ? `<div class="evidence">${showDimer ? dimerChart(c, S) : ""}${showClot ? clotSteps() : ""}</div>` : ""}
      ${rest.length ? `<ul class="st-more" aria-label="Also">${rest.map(w => `
        <li class="${w.status}">${ICON[w.status]}<span class="sr-only">${LABEL[w.status]}:</span>
          <span><b>${w.title}</b><small>${w.todo}</small></span></li>`).join("")}</ul>` : ""}`
    : `<h1 class="st-title">${isMe(currentCrew) ? "You're doing well" : "All good"}</h1><p class="st-do">Every reading is in the healthy range. Keep the routine.</p>`}`;
  $("helpBtn").onclick = () => { helpOpen = !helpOpen; showStatus(check(currentCrew)); $("helpBtn").focus(); };
  document.querySelectorAll("[data-step]").forEach(cb => cb.onchange = () => {
    mutate(() => { (checklistDone[currentCrew] = checklistDone[currentCrew] || {})[cb.dataset.step] = cb.checked; });
    cb.closest("li").classList.toggle("done", cb.checked);
  });
  showReportFoot(S);
}
const SENT_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 8 14.5 2 11 14.5 7.5 9.5Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7.5 9.5 14.5 2" stroke="currentColor" stroke-width="1.5"/></svg>';

function clotSteps() {
  const done = checklistDone[currentCrew] || {};
  return `<details class="clot" open><summary>Blood clot checklist</summary><ol class="checklist">${CLOT_STEPS.map((s, i) =>
    `<li class="${done[i] ? "done" : ""}"><label><input type="checkbox" data-step="${i}" ${done[i] ? "checked" : ""}><span>${s}</span></label></li>`).join("")}</ol></details>`;
}

// D-dimer over time: the evidence behind the clot warning, readable in 3 seconds.
function dimerChart(c, S) {
  const pts = c.labs.filter(e => e.ddimer != null).map(e => ({ day: e.day, v: e.ddimer }));
  if (pts.length < 2) return "";
  const W = 380, H = 168, L = 34, R = 56, T = 14, B = 28;
  const yMax = Math.max(2, Math.ceil(Math.max(...pts.map(p => p.v)) * 1.15 * 2) / 2);
  const d0 = pts[0].day, d1 = pts[pts.length - 1].day;
  const x = d => L + (d - d0) / (d1 - d0 || 1) * (W - L - R);
  const y = v => T + (1 - v / yMax) * (H - T - B);
  const NORMAL_MAX = 0.5;
  const ticks = [0, 1, 2, 3, 4].filter(v => v <= yMax);
  const last = pts[pts.length - 1];
  const lastStatus = LABS[0].classify(last.v) === "normal" ? "normal" : S.clotPattern ? "act" : LABS[0].classify(last.v);
  const series = key => c.labs.map(e => e[key]).filter(v => v != null);
  const plt = series("platelets"), fib = series("fibrinogen");
  const falling = plt.length > 1 && fib.length > 1 && plt[plt.length - 1] < plt[0] && fib[fib.length - 1] < fib[0];
  const desc = `D-dimer, mg/L FEU: ${pts.map(p => `day ${p.day} ${p.v.toFixed(2)}`).join(", ")}. Normal is up to ${NORMAL_MAX}.`;
  return `<figure class="chart">
    <figcaption><b>D-dimer is ${last.v > pts[0].v ? "rising" : "steady"}</b><span>mg/L FEU · last ${pts.length} blood tests</span></figcaption>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${desc}">
      <rect class="band" x="${L}" y="${y(NORMAL_MAX)}" width="${W - L - R}" height="${y(0) - y(NORMAL_MAX)}"/>
      <text class="band-label" x="${W - R - 6}" y="${y(NORMAL_MAX) + 13}" text-anchor="end">Normal ≤ ${NORMAL_MAX}</text>
      ${ticks.map(v => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("")}
      <polyline class="line" points="${pts.map(p => `${x(p.day).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ")}"/>
      ${pts.map((p, i) => {
        const isLast = i === pts.length - 1;
        return `<g class="pt ${isLast ? lastStatus : ""}"><circle class="hit" cx="${x(p.day)}" cy="${y(p.v)}" r="14"><title>Day ${p.day}: ${p.v.toFixed(2)} mg/L FEU</title></circle>
          <circle class="dot" cx="${x(p.day)}" cy="${y(p.v)}" r="${isLast ? 5.5 : 4}"/>
          <text class="day" x="${x(p.day)}" y="${H - 8}" text-anchor="${i === 0 ? "start" : isLast ? "end" : "middle"}">Day ${p.day}</text>
          ${isLast || i === 0 ? `<text class="val" x="${x(p.day) + (isLast ? 10 : 0)}" y="${y(p.v) + (isLast ? 4 : -10)}" text-anchor="${isLast ? "start" : "start"}">${p.v.toFixed(2)}</text>` : ""}</g>`;
      }).join("")}
    </svg>
    ${falling ? `<p class="chart-note">Platelets ${plt[0]} → ${plt[plt.length - 1]} and fibrinogen ${fib[0]} → ${fib[fib.length - 1]} are falling at the same time.${S.clotPattern ? " Together, that is the clot pattern." : ""}</p>` : ""}
  </figure>`;
}

// Four readings only. Everything else is still checked and shows up above when it matters.
function showVitals(S) {
  const c = MOCK.crew[currentCrew];
  const items = [
    { name: "Heart rate", value: c.vitals.hr, unit: "bpm", status: S.hr },
    { name: "Sleep",      value: S.lastNight, unit: "h", status: S.sleep },
    { name: "Mood",       value: S.moodValue, unit: "/ 5", status: worst(S.mood, S.biggestGap.status) },
    { name: "Radiation",  value: `<span id="doseValue">${S.dose.toFixed(0)}</span>`, unit: "of 600 mSv", status: S.radiation }
  ];
  $("vitals").innerHTML = items.map(t => `
    <div class="vital ${t.status}">
      <span class="v-name">${t.name}</span>
      <span class="v-value">${t.value}<small>${t.unit}</small></span>
      ${badge(t.status)}
    </div>`).join("");
}

function showAll() {
  if (!me) { document.body.classList.add("choosing"); showWelcome(); return; }
  const S = check(currentCrew);
  document.body.classList.toggle("viewing-mate", !isMe(currentCrew));
  showCrewStrip();
  showMission();
  showStatus(S);
  showVitals(S);
  showEmergency();
  fillToday(MOCK.crew[currentCrew]);
  $("changeUser").textContent = `Not the ${MOCK.crew[me].role.toLowerCase()}? Change user`;
  document.title = (S.warnings.length ? `(${S.warnings.length}) ` : "") + "Astrodoc";
}
// The chat page changed something (e.g. logged sleep by voice): redraw
function onSharedChange() { showAll(); }


// =========================================================================
// 3. INPUT — everything saves at once, no forms to submit
// =========================================================================
function scaleButtons(el, value) {
  el.innerHTML = [1, 2, 3, 4, 5].map(n =>
    `<button type="button" data-v="${n}" aria-pressed="${n === value}" class="${n === value ? "on" : ""}">${n}</button>`).join("");
}
function fillToday(c) {
  if (document.activeElement !== $("ciSleep")) $("ciSleep").value = c.sleep.nights[c.sleep.nights.length - 1];
  scaleButtons($("moodSelf"), c.checkin.self.mood);
  scaleButtons($("moodMate"), c.checkin.mate.mood);
  $("waterCount").textContent = `${c.water.glasses} / ${c.water.goal}`;
  $("exCount").textContent = `${c.exercise} / 7`;
  $("todayTitle").textContent = isMe(currentCrew) ? "Your day" : `How does the ${c.role.toLowerCase()} seem to you?`;
  $("mateNote").textContent = `Your rating is compared with how they rate themselves (${c.checkin.self.mood} of 5). Tired people rarely notice it themselves.`;
}
const update = fn => { mutate(() => { fn(MOCK.crew[currentCrew]); autoReport(); }); showAll(); };
// Redrawing replaces the buttons, so put keyboard focus back where it was
const keepFocus = (scaleId, v) => { const b = document.querySelector(`#${scaleId} [data-v="${v}"]`); if (b) b.focus(); };

$("ciSleep").onchange = () => {
  const v = parseFloat($("ciSleep").value);
  if (!isNaN(v) && v >= 0 && v <= 24) update(c => { c.sleep.nights[c.sleep.nights.length - 1] = v; });
  else $("ciSleep").value = MOCK.crew[currentCrew].sleep.nights.at(-1);
};
$("moodSelf").onclick = e => { const b = e.target.closest("[data-v]"); if (!b) return; const v = Number(b.dataset.v); update(c => { c.checkin.self.mood = v; }); keepFocus("moodSelf", v); };
$("moodMate").onclick = e => { const b = e.target.closest("[data-v]"); if (!b) return; const v = Number(b.dataset.v); update(c => { c.checkin.mate.mood = v; }); keepFocus("moodMate", v); };
$("waterPlus").onclick  = () => { update(c => { c.water.glasses++; }); $("waterPlus").focus(); };
$("waterMinus").onclick = () => { update(c => { if (c.water.glasses > 0) c.water.glasses--; }); $("waterMinus").focus(); };
$("exPlus").onclick  = () => { update(c => { if (c.exercise < 7) c.exercise++; }); $("exPlus").focus(); };
$("exMinus").onclick = () => { update(c => { if (c.exercise > 0) c.exercise--; }); $("exMinus").focus(); };

// Report: the main button when someone needs care now, a quiet one otherwise
function showReportFoot(S) {
  const btn = $("reportBtn"), last = lastReport(currentCrew);
  btn.className = S.overall === "act" ? "primary-btn" : "soft-btn";
  btn.textContent = isMe(currentCrew) ? "Send my report to Earth" : `Send report on the ${MOCK.crew[currentCrew].role.toLowerCase()}`;
  $("reportNote").textContent = last ? `Last report ${time(last.sent)} · earliest reply ~${time(last.reply)}` : "No report sent yet today.";
}
$("reportBtn").onclick = () => {
  mutate(() => { sendToEarth(`${currentCrew}: health report`); });
  showReportFoot(check(currentCrew));
  $("reportNote").textContent = "Sent. " + $("reportNote").textContent + ". Keep going meanwhile.";
};

// --- Emergency: ask once, then show what to do ---
let emergencyAsk = false;
function showEmergency() {
  const box = $("emergencyBox");
  if (emergency.active) {
    const last = [...MOCK.earthLog].reverse().find(e => /EMERGENCY/.test(e.title));
    box.className = "emergency-box active";
    box.innerHTML = `<div><strong>Medical emergency · ${nameOf(currentCrew)}</strong>
      <p><b>Do now:</b> oxygen mask, keep the person still.${last ? ` Reported to Earth at ${time(last.sent)}.` : ""}</p></div>
      <button class="soft-btn" id="emergencyClear">Clear</button>`;
    $("emergencyClear").onclick = () => { mutate(() => { emergency.active = false; emergency.signs = {}; }); showAll(); };
  } else if (emergencyAsk) {
    box.className = "emergency-box";
    box.innerHTML = `<div><strong>Declare a medical emergency for ${isMe(currentCrew) ? "yourself" : "the " + MOCK.crew[currentCrew].role.toLowerCase()}?</strong>
      <p>This sends a top-priority report to Earth.</p></div>
      <div class="row"><button class="soft-btn" id="emergencyCancel">Cancel</button><button class="danger-btn" id="emergencyDeclare">Declare and report</button></div>`;
    $("emergencyCancel").onclick = () => { emergencyAsk = false; showEmergency(); };
    $("emergencyDeclare").onclick = () => {
      emergencyAsk = false;
      mutate(() => { emergency.active = true; sendToEarth(`${currentCrew}: MEDICAL EMERGENCY (top priority)`); });
      showAll();
    };
  }
  box.hidden = !(emergency.active || emergencyAsk);
}
$("emergencyBtn").onclick = () => {
  if (!emergency.active) emergencyAsk = true;
  showEmergency();
  $("emergencyBox").scrollIntoView({ block: "nearest" });
  ($("emergencyDeclare") || $("emergencyClear")).focus();
};


// =========================================================================
// 4. DEMO CONTROLS + SENSOR HOOKS
// =========================================================================
$("solarSlider").value = MOCK.radiation.solarActivity;
$("solarSlider").oninput = () => setSolarActivity(Number($("solarSlider").value));
$("locationSelect").innerHTML = Object.entries(MOCK.locations).map(([k, L]) =>
  `<option value="${k}" ${k === MOCK.mission.location ? "selected" : ""}>${L.label} (${L.multiplier}× ISS)</option>`).join("");
$("locationSelect").onchange = () => { mutate(() => { MOCK.mission.location = $("locationSelect").value; }); showAll(); };
$("simApply").onclick = () => applySensorReading({ heartRate: parseFloat($("simHr").value), temperature: parseFloat($("simTemp").value) });
$("resetDemo").onclick = resetDemo;

// Call from Arduino / Web Serial code later, e.g. applySensorReading({ heartRate: 96, temperature: 36.8 })
function applySensorReading({ heartRate, temperature }) {
  mutate(() => {
    const c = MOCK.crew[currentCrew];
    if (!isNaN(heartRate)) c.vitals.hr = Math.round(heartRate);
    if (!isNaN(temperature)) c.vitals.temp = temperature;
    c.vitals.source = "live";
  });
  showAll();
}
// Marjona's knob (potentiometer): 0-100. 70 or more = solar storm
function setSolarActivity(value) {
  mutate(() => { MOCK.radiation.solarActivity = Math.max(0, Math.min(100, value)); autoReportAll(); });
  $("solarSlider").value = MOCK.radiation.solarActivity;
  showAll();
}

// Simulated dosimeter (core.js): redraw only when a status changes
startDosimeter(changed => {
  if (!me) return;
  if (changed) showAll();
  else if ($("doseValue")) $("doseValue").textContent = check(currentCrew).dose.toFixed(0);
});


// START: every dangerous pattern is reported for every crew member, so "sent automatically" is always true
mutate(() => autoReportAll());
// A fresh visit opens on your own health; coming back from the chat keeps who you were looking at
if (me && !sessionStorage.getItem("astrodoc-chosen")) mutate(() => { currentCrew = me; });
sessionStorage.setItem("astrodoc-chosen", "1");
if (me) document.body.classList.remove("choosing");
showAll();
