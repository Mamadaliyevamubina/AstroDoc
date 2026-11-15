// =========================================================================
// Astrodoc — LANDING (landing.html)
// The 3D astronaut stays in view while the words scroll past. Each stop
// lights the part of the body it talks about, in the colour of its level,
// and turns the astronaut round for the back. Uses assets/js/body3d.js.
// Opening the app from here marks the introduction as seen.
// =========================================================================
(function () {
  const SEEN = "astrodoc-intro-seen";
  document.addEventListener("click", e => { if (e.target.closest("[data-open]")) { try { localStorage.setItem(SEEN, "1"); } catch { } } });

  // The three levels, drawn exactly as the app draws them (shape + colour + word)
  if (typeof badge === "function") document.querySelectorAll(".ld-lv").forEach(el => { el.outerHTML = badge([...el.classList].find(c => c !== "ld-lv"), el.textContent); });

  const host = document.getElementById("ld3d"), label = document.getElementById("ldStageLabel");
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const COLOR = { act: () => css("--act") || "#b33a33", watch: () => css("--watch") || "#93600a", normal: () => css("--thread") || "#2f6fd0" };
  let body = null, facingBack = false, current = null;

  function show(stop) {
    if (!stop || stop === current) return;
    current = stop;
    document.querySelectorAll(".ld-stop.is-active").forEach(s => s.classList.remove("is-active"));
    stop.classList.add("is-active");
    const place = stop.dataset.place, level = stop.dataset.level || "normal";
    label.textContent = stop.dataset.label || "";
    label.hidden = !place;
    if (!body) return;
    body.clear();
    const wantBack = place === "back";
    if (wantBack !== facingBack) { body.turn(); facingBack = wantBack; }
    if (!place) { body.select(null); return; }
    const places = place === "whole" ? ["head", "chest", "belly", "legs"] : place === "back" ? ["back", "legs"] : [place];
    places.forEach(p => body.set(p, true, null, COLOR[level]()));
    body.select(places[0]);
  }

  // Which stop is in the middle of the screen
  const stops = [...document.querySelectorAll("[data-place]")];
  const io = new IntersectionObserver(es => {
    const vis = es.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (vis[0]) show(vis[0].target);
  }, { rootMargin: "-40% 0px -45% 0px", threshold: [0, .25, .5, 1] });
  stops.forEach(s => io.observe(s));

  // The astronaut: loads after the words, never blocks them
  function load() {
    if (!window.Body3D) return fail();
    try {
      body = window.Body3D.mount(host, { url: "assets/models/astronaut.glb", label: () => "", onPick: () => {} });
      body.ready.then(() => { host.classList.add("loaded"); const c = current; current = null; show(c || stops[0]); }).catch(fail);
    } catch { fail(); }
  }
  function fail() { body = null; host.classList.add("no-3d"); }
  if (document.readyState === "complete") load(); else addEventListener("load", load);
})();
