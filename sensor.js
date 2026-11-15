// =========================================================================
// Astrodoc — LIVE SENSOR (Arduino + MAX30102 pulse sensor over USB)
// Uses Web Serial (Chrome or Edge on a computer). The Arduino sketch in
// arduino/astrodoc_pulse/astrodoc_pulse.ino prints one line per reading:
//   HR:72          heart rate in beats per minute
//   T:36.7         (optional) temperature in °C from a separate sensor
// Each reading goes to applySensorReading() in app.js, so the dashboard,
// the warnings and the companion all react to the real pulse.
// =========================================================================
(function () {
  const row = $("sensorRow");
  if (!row) return;
  const supported = "serial" in navigator;
  let port = null, reader = null, last = null, lastSent = 0;

  function draw(state, note) {
    const c = me && MOCK.crew[currentCrew];
    const live = state === "live";
    row.className = `sensor-row ${state}`;
    row.innerHTML = `
      <span class="sensor-dot" aria-hidden="true"></span>
      <span class="sensor-text">${live
        ? `<b>Live pulse sensor</b> · ${last ? `${last} bpm at ${time()}` : "waiting for a beat… keep your finger still"}`
        : `<b>Heart rate and temperature are simulated.</b> ${note || "Connect the Arduino pulse sensor for real readings."}`}</span>
      ${live ? `<button type="button" class="text-btn" id="sensorStop">Disconnect</button>`
             : supported ? `<button type="button" class="soft-btn" id="sensorGo">Connect sensor</button>`
                         : `<span class="sensor-note">Live sensor works in Chrome or Edge on a computer.</span>`}`;
    if ($("sensorGo")) $("sensorGo").onclick = connect;
    if ($("sensorStop")) $("sensorStop").onclick = disconnect;
    if (c && live) row.dataset.who = currentCrew;
  }

  async function connect() {
    try {
      port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
    } catch (e) {
      port = null;
      draw("off", e && e.name === "NotFoundError" ? "No sensor chosen." : "Could not open the sensor. Check the USB cable and close the Arduino Serial Monitor.");
      return;
    }
    draw("live");
    read();
  }

  async function read() {
    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable).catch(() => {});
    reader = decoder.readable.getReader();
    let buf = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        const lines = buf.split(/\r?\n/);
        buf = lines.pop();
        lines.forEach(handle);
      }
    } catch { /* unplugged */ }
    if (port) { draw("off", "The sensor was disconnected."); port = null; }
  }

  function handle(line) {
    const hr = /HR\s*[:=]\s*(\d{2,3})/i.exec(line);
    const tc = /T\s*[:=]\s*(\d{2}(?:\.\d+)?)/i.exec(line);
    const reading = {};
    if (hr) { const v = +hr[1]; if (v >= 30 && v <= 220) reading.heartRate = v; }
    if (tc) { const v = +tc[1]; if (v >= 30 && v <= 43) reading.temperature = v; }
    if (!("heartRate" in reading) && !("temperature" in reading)) return;
    if (reading.heartRate) last = reading.heartRate;
    // Redraw the dashboard at most every 2 seconds
    if (Date.now() - lastSent < 2000) { draw("live"); return; }
    lastSent = Date.now();
    applySensorReading(reading);
    draw("live");
  }

  async function disconnect() {
    const p = port; port = null;
    try { if (reader) await reader.cancel(); } catch { }
    try { if (p) await p.close(); } catch { }
    last = null;
    draw("off", "Sensor disconnected.");
  }

  draw("off");
})();
