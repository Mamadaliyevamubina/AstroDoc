// =========================================================================
// Astrodoc — THE REPORT EARTH RECEIVES (report.html)
// Exactly what the flight surgeon gets about one crew member: who, when,
// when it arrives and when the earliest reply can come, the problems with
// their numbers, what was already done on board, the latest readings, the
// blood tests and the 6-month trends. Printable and savable as PDF.
// report.html?id=PLT shows the pilot; otherwise the person shown on the dashboard.
// Uses core.js and history.js.
// =========================================================================
(function () {
  const el = $("report");
  if (!el) return;
  const want = (location.search.match(/id=(\w+)/) || [])[1];
  const id = MOCK.crew[want] ? want : MOCK.crew[currentCrew] ? currentCrew : "CDR";
  const c = MOCK.crew[id], S = check(id), m = MOCK.mission;
  const last = lastReport(id);
  const sent = last ? last.sent : new Date();
  const down = m.earthLink === false;
  const fmtDate = d => d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const done = checklistDone[id] || {};
  const doneSteps = CLOT_STEPS.filter((_, i) => done[i]);
  const W = typeof sixMonths === "function" ? sixMonths(id) : null;
  const A = W ? analyse(id, W) : null;
  const labs = c.labs || [];
  const L = [
    ["Heart rate at rest", `${c.vitals.hr} bpm`, S.hr, "simulated"],
    ["Temperature", `${c.vitals.temp} °C`, S.temp, "simulated"],
    ["Blood pressure", `${c.vitals.bpSys}/${c.vitals.bpDia}`, S.bp, "simulated"],
    ["Sleep last night", `${S.lastNight} h (${S.debt.toFixed(1)} h short this week)`, S.sleep, "simulated"],
    ["Reactions vs own baseline", S.reactionPct === null ? "No test" : `${S.reactionPct > 0 ? "+" : ""}${S.reactionPct}%`, S.reaction, "simulated"],
    ["Mood (self / crewmate)", `${c.checkin.self.mood} / ${c.checkin.mate.mood} of 5`, S.mood, "simulated"],
    ["Water today", `${c.water.glasses} of ${c.water.goal} glasses`, S.water, "simulated"],
    ["Exercise this week", `${c.exercise} of 6 sessions`, S.exercise, "simulated"],
    ["Vitamin D", c.vitD ? `${c.vitD} ng/mL` : "No test", S.vitD, "simulated"],
    ["Career radiation dose", `${Math.round(S.dose)} of ${MOCK.radiation.careerLimit} mSv`, S.radiation, "NASA Curiosity rates"]
  ];

  el.innerHTML = `
    <header class="rp-head">
      <div>
        <p class="rp-kind">Medical report · sent by Astrodoc</p>
        <h1>${c.role} <span>(${id})</span></h1>
        <p class="rp-overall">${badge(S.overall)} ${S.warnings[0] ? S.warnings[0].title : "All readings in the healthy range"}</p>
      </div>
      <dl class="rp-route">
        <div><dt>To</dt><dd>Flight surgeon, Mission Control</dd></div>
        <div><dt>From</dt><dd>Mars transit vehicle · day ${m.day}</dd></div>
        <div><dt>Sent</dt><dd>${last ? fmtDate(sent) : "Not sent yet (preview)"}</dd></div>
        <div><dt>Arrives</dt><dd>${down || (last && last.queued) ? "When the Earth link returns" : last ? `${time(last.arrive)} · ${m.signalDelayMin} min one way` : `${m.signalDelayMin} min after sending`}</dd></div>
        <div><dt>Earliest reply</dt><dd>${down || (last && last.queued) ? "After the link returns" : last ? time(last.reply) : `${m.signalDelayMin * 2} min after sending`}</dd></div>
      </dl>
    </header>

    <section>
      <h2>Problems found</h2>
      ${S.warnings.length ? `<table class="rp-table">
        <thead><tr><th>Problem</th><th>Level</th><th>Told the crew to</th></tr></thead>
        <tbody>${S.warnings.map(w => `<tr><td>${w.title}</td><td>${badge(w.status)}</td><td>${w.todo}</td></tr>`).join("")}</tbody>
      </table>` : `<p>None. Every reading is in the healthy range.</p>`}
    </section>

    <section>
      <h2>Already done on board</h2>
      <ul class="rp-list">
        <li>Crew member told what to do now (above), without waiting for Earth.</li>
        ${S.clotPattern ? `<li>Blood clot checklist: ${doneSteps.length} of ${CLOT_STEPS.length} steps ticked${doneSteps.length ? `: ${doneSteps.map(s => s.replace(/\.$/, "").toLowerCase()).join("; ")}` : ""}.</li>` : ""}
        ${emergency.active && currentCrew === id ? "<li>Medical emergency declared on board.</li>" : ""}
        <li>${MOCK.earthLog.filter(e => e.title.startsWith(id + ":")).length} report${MOCK.earthLog.filter(e => e.title.startsWith(id + ":")).length === 1 ? "" : "s"} about this crew member sent so far this session.</li>
      </ul>
    </section>

    <section>
      <h2>Latest readings</h2>
      <table class="rp-table">
        <thead><tr><th>Reading</th><th>Value</th><th>Level</th><th>Source</th></tr></thead>
        <tbody>${L.map(([n, v, s, src]) => `<tr><td>${n}</td><td class="num">${v}</td><td>${badge(s)}</td><td class="src">${src}</td></tr>`).join("")}</tbody>
      </table>
    </section>

    ${labs.length ? `<section>
      <h2>Blood tests</h2>
      <table class="rp-table">
        <thead><tr><th>Mission day</th><th>D-dimer (mg/L FEU)</th><th>Platelets (×10⁹/L)</th><th>Fibrinogen (mg/dL)</th><th>INR</th></tr></thead>
        <tbody>${labs.map(e => `<tr><td class="num">${e.day}</td><td class="num">${e.ddimer ?? "–"}</td><td class="num">${e.platelets ?? "–"}</td><td class="num">${e.fibrinogen ?? "–"}</td><td class="num">${e.inr ?? "–"}</td></tr>`).join("")}</tbody>
      </table>
      ${S.clotPattern ? `<p class="rp-note">Pattern: D-dimer rising while platelets and fibrinogen fall. Reported automatically.</p>` : ""}
    </section>` : ""}

    ${A ? `<section>
      <h2>The last 6 months</h2>
      <p class="rp-note">${A.summary}</p>
      <table class="rp-table">
        <thead><tr><th>Measure</th><th>Now</th><th>Level</th><th>Compared with NASA</th></tr></thead>
        <tbody>${A.items.map(x => `<tr><td>${x.name}</td><td class="num">${x.head}</td><td>${badge(x.status)}</td><td>${x.text}</td></tr>`).join("")}</tbody>
      </table>
    </section>` : ""}

    <section>
      <h2>What we need from Earth</h2>
      <p>Confirm or change the steps above. The crew is acting on them now and will not wait for this reply.</p>
    </section>

    <p class="rp-foot">Astrodoc prototype · crew readings are simulated; radiation rates and reference values are real NASA data (see the science page) · not a medical device.</p>`;

  document.title = `Report: ${c.role} · Astrodoc`;
  $("printBtn").onclick = () => window.print();
  const pick = $("reportWho");
  if (pick) {
    pick.innerHTML = Object.keys(MOCK.crew).map(k => `<option value="${k}" ${k === id ? "selected" : ""}>${MOCK.crew[k].role}</option>`).join("");
    pick.onchange = () => { location.search = `?id=${pick.value}`; };
  }
})();
