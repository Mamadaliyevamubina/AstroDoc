// =========================================================================
// Astrodoc — PORTHOLE GLASS behaviour (with glass.css)
//   1. The background light takes the colour of the crew member on screen
//   2. The header greets you and shows the ship clock
//   3. Light follows the pointer across a glass panel
// =========================================================================
(function () {
  const body = document.body;

  // 1. Whose colour? The crew member being viewed, else you.
  function crewNow() {
    try { if (typeof currentCrew !== "undefined" && currentCrew) return currentCrew; } catch (e) { }
    try { if (typeof me !== "undefined" && me) return me; } catch (e) { }
    return "";
  }
  function tint() {
    const c = crewNow();
    if (c && body.dataset.crew !== c) body.dataset.crew = c;
  }
  tint();
  setInterval(tint, 800);
  document.addEventListener("click", () => setTimeout(tint, 60));

  // 2. Header: who you are and the ship clock
  const top = document.querySelector(".top");
  if (top && top.querySelector("#missionStrip")) {
    const hello = document.createElement("div");
    hello.className = "top-hello";
    const anchor = top.querySelector("#missionStrip") || top.querySelector(".check-link");
    top.insertBefore(hello, anchor);
    const drawHello = () => {
      let who = "", link = true;
      try {
        const id = typeof me !== "undefined" ? me : "";
        const c = id && MOCK.crew[id];
        let name = ""; try { name = localStorage.getItem("astrodoc-name") || ""; } catch (e) { }
        who = name || (c ? c.role : "");
        link = MOCK.mission.earthLink !== false;
      } catch (e) { }
      const h = new Date().getHours();
      const part = h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
      const clock = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      hello.innerHTML = `<b>${part}${who ? ", " + who.replace(/[<>&]/g, "") : ""}</b>`
        + `<span>Ship time ${clock} · <i class="link-dot${link ? "" : " down"}" aria-hidden="true"></i>Earth link ${link ? "up" : "down"}</span>`;
    };
    drawHello();
    setInterval(drawHello, 20000);
    document.addEventListener("click", () => setTimeout(drawHello, 80));
  }

  // 3. Pointer light (mouse and pen only; skipped when motion is reduced)
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const SEL = ".card, .vital, .crew-tab, .choice, .sci-doc, .k-cause";
  document.addEventListener("pointermove", e => {
    if (e.pointerType === "touch") return;
    const el = e.target.closest && e.target.closest(SEL);
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });
})();
