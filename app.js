// =========================================================================
// Astrodoc — Dashboard page (index.html). Health rules live in core.js.
//   1. WELCOME   choose who to check on
//   2. SHOW      status, level help, four readings
//   3. INPUT     today's input, clot checklist, report, emergency
//   4. DEMO      solar storm, location, sensor hooks, reset
// =========================================================================


// =========================================================================
// 1. WELCOME — choose who to check on (once per visit)
// =========================================================================
const ROLE_NOTE = { CDR: "Leads the mission", PLT: "Flies the spacecraft", MS1: "Runs the science" };

function showCrew() {
  $("crewSelector").innerHTML = Object.keys(MOCK.crew).map(id => {
    const S = check(id);
    return `<button class="choice ${S.overall}" data-crew="${id}">
      <span class="choice-name">${MOCK.crew[id].role}</span>
      <span class="choice-note">${ROLE_NOTE[id] || id}</span>
      ${badge(S.overall)}</button>`;
  }).join("");
  document.querySelectorAll("[data-crew]").forEach(b => b.onclick = () => chooseCrew(b.dataset.crew));
  const S = check(currentCrew);
  $("switchCrew").innerHTML = `<span class="crew-dot ${S.overall}">${ICON[S.overall]}</span>${MOCK.crew[currentCrew].role}
    <span class="sr-only">, ${LABEL[S.overall]}.</span><span class="change">Change</span>`;
}
function chooseCrew(id) {
  mutate(() => {
    if (id !== currentCrew) { emergency.active = false; emergency.signs = {}; }
    currentCrew = id;
  });
  emergencyAsk = false;
  sessionStorage.setItem("astrodoc-chosen", "1");
  document.body.classList.remove("choosing");
  showAll();
  window.scrollTo(0, 0);
  $("switchCrew").focus({ preventScroll: true });
}
$("switchCrew").onclick = () => {
  document.body.classList.add("choosing");
  showCrew();
  window.scrollTo(0, 0);
  const current = document.querySelector(`[data-crew="${currentCrew}"]`);
  if (current) current.focus();
};
// Coming back from the chat: skip the welcome screen
if (sessionStorage.getItem("astrodoc-chosen")) document.body.classList.remove("choosing");


// =========================================================================
// 2. SHOW
// =========================================================================
function showMission() {
  const m = MOCK.mission, last = MOCK.earthLog[MOCK.earthLog.length - 1];
  $("missionStrip").innerHTML = `<span>Day ${m.day} · ${m.phase}</span><span>Earth delay ${m.signalDelayMin} min</span>` +
    (last ? `<span>Last report ${time(last.sent)}, reply ~${time(last.reply)}</span>` : "");
}

// Status: the most urgent thing and what to do now; the rest as short lines.
let helpOpen = false;
function showStatus(S) {
  const c = MOCK.crew[currentCrew];
  const sorted = [...S.warnings].sort((a, b) => RANK[b.status] - RANK[a.status]);
  const [first, ...rest] = sorted;
  $("statusCard").innerHTML = `
    <div class="st-top">
      <span class="who">${currentCrew} · ${c.role}</span>
      <span class="st-level">${badge(S.overall)}
        <button class="help-btn" id="helpBtn" aria-expanded="${helpOpen}" aria-controls="levelHelp">What does this mean?</button></span>
    </div>
    <div class="level-help" id="levelHelp" ${helpOpen ? "" : "hidden"}>
      ${["act", "watch", "normal"].map(l => `<p class="${l === S.overall ? "current" : ""}">${badge(l)}<span>${LEVEL_HELP[l]}</span></p>`).join("")}
    </div>
    ${first ? `
      <h1 class="st-title">${first.title}</h1>
      <p class="st-do"><span class="do-label">Do now</span>${first.todo}</p>
      ${first.extra === "clot" || rest.some(w => w.extra === "clot") ? clotSteps() : ""}
      ${rest.length ? `<ul class="st-more">${rest.map(w => `
        <li class="${w.status}" title="Do now: ${w.todo}">${ICON[w.status]}<span class="sr-only">${LABEL[w.status]}:</span><span>${w.title}</span></li>`).join("")}</ul>` : ""}`
    : `<h1 class="st-title">All good</h1><p class="st-do">Every reading is in the normal range. Keep the routine.</p>`}`;
  $("helpBtn").onclick = () => { helpOpen = !helpOpen; showStatus(check(currentCrew)); $("helpBtn").focus(); };
  document.querySelectorAll("[data-step]").forEach(cb => cb.onchange = () => {
    mutate(() => { (checklistDone[currentCrew] = checklistDone[currentCrew] || {})[cb.dataset.step] = cb.checked; });
    cb.closest("li").classList.toggle("done", cb.checked);
  });
}
function clotSteps() {
  const done = checklistDone[currentCrew] || {};
  return `<details class="clot" open><summary>Blood clot checklist</summary><ol class="checklist">${CLOT_STEPS.map((s, i) =>
    `<li class="${done[i] ? "done" : ""}"><label><input type="checkbox" data-step="${i}" ${done[i] ? "checked" : ""}><span>${s}</span></label></li>`).join("")}</ol></details>`;
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
  const S = check(currentCrew);
  showCrew();
  showMission();
  showStatus(S);
  showVitals(S);
  showEmergency();
  fillToday(MOCK.crew[currentCrew]);
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
}
const update = fn => { mutate(() => { fn(MOCK.crew[currentCrew]); autoReport(); }); showAll(); };

$("ciSleep").onchange = () => {
  const v = parseFloat($("ciSleep").value);
  if (!isNaN(v)) update(c => { c.sleep.nights[c.sleep.nights.length - 1] = v; });
};
$("moodSelf").onclick = e => { const b = e.target.closest("[data-v]"); if (b) update(c => { c.checkin.self.mood = Number(b.dataset.v); }); };
$("moodMate").onclick = e => { const b = e.target.closest("[data-v]"); if (b) update(c => { c.checkin.mate.mood = Number(b.dataset.v); }); };
$("waterPlus").onclick  = () => update(c => { c.water.glasses++; });
$("waterMinus").onclick = () => update(c => { if (c.water.glasses > 0) c.water.glasses--; });
$("exPlus").onclick  = () => update(c => { if (c.exercise < 7) c.exercise++; });
$("exMinus").onclick = () => update(c => { if (c.exercise > 0) c.exercise--; });

$("reportBtn").onclick = () => {
  const last = mutate(() => { sendToEarth(`${currentCrew}: health report`); return MOCK.earthLog[MOCK.earthLog.length - 1]; });
  $("reportNote").textContent = `Sent ${time(last.sent)}. Earliest reply ~${time(last.reply)}. Keep going meanwhile.`;
  showMission();
};

// --- Emergency: ask once, then show what to do ---
let emergencyAsk = false;
function showEmergency() {
  const box = $("emergencyBox");
  if (emergency.active) {
    const last = [...MOCK.earthLog].reverse().find(e => /EMERGENCY/.test(e.title));
    box.className = "emergency-box active";
    box.innerHTML = `<div><strong>Medical emergency · ${currentCrew}</strong>
      <p><b>Do now:</b> oxygen mask, keep the person still.${last ? ` Reported to Earth at ${time(last.sent)}.` : ""}</p></div>
      <button class="soft-btn" id="emergencyClear">Clear</button>`;
    $("emergencyClear").onclick = () => { mutate(() => { emergency.active = false; emergency.signs = {}; }); showAll(); };
  } else if (emergencyAsk) {
    box.className = "emergency-box";
    box.innerHTML = `<div><strong>Declare a medical emergency for ${currentCrew}?</strong>
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
  mutate(() => { MOCK.radiation.solarActivity = Math.max(0, Math.min(100, value)); autoReport(); });
  $("solarSlider").value = MOCK.radiation.solarActivity;
  showAll();
}

// Simulated dosimeter (core.js): redraw only when a status changes
startDosimeter(changed => {
  if (changed) showAll();
  else if ($("doseValue")) $("doseValue").textContent = check(currentCrew).dose.toFixed(0);
});


// START
mutate(() => autoReport());
showAll();
