// =========================================================================
// Astrodoc — PORTHOLE GLASS behaviour (with glass.css)
//   1. The background light takes the colour of the crew member on screen
//   2. Light follows the pointer across a glass panel
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

  // 2. Pointer light (mouse and pen only; skipped when motion is reduced)
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
