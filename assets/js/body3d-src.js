// SOURCE of assets/js/body3d.js. To rebuild after editing:
//   npm i three@0.170.0 esbuild && npx esbuild body3d-src.js --bundle --minify --format=iife --outfile=body3d.js

// Astrodoc — 3D body for "Check how I feel" (bundled into assets/js/body3d.js)
// Tap the astronaut where you feel something. Places light up with a mint marker.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const MINT = 0x2fbfa6;

function mount(host, { url, onToggle, label = p => p }) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const W = () => host.clientWidth, H = () => host.clientHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W() / H(), 0.01, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fa3c8, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fffe9, 1.2); rim.position.set(-3, 2, -3); scene.add(rim);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; controls.enableZoom = false; controls.enableDamping = true;
  controls.minPolarAngle = controls.maxPolarAngle = Math.PI / 2;   // turn left/right only

  const pivot = new THREE.Group(); scene.add(pivot);
  const markers = new THREE.Group(); pivot.add(markers);
  let model = null, box = null, size = null, center = null;
  const hits = new Map();          // place -> marker
  let needsRender = true;

  // Hover label
  const tip = document.createElement("div"); tip.className = "b3d-tip"; tip.hidden = true; host.appendChild(tip);

  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const ready = new Promise((resolve, reject) => loader.load(url, gltf => {
    model = gltf.scene;
    model.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material) o.material.envMapIntensity = 1; } });
    pivot.add(model);
    model.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model, true);
    size = box.getSize(new THREE.Vector3()); center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);             // stand in the middle
    model.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model, true); center = box.getCenter(new THREE.Vector3());
    const dist = (size.y / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.12;
    camera.position.set(0, 0, dist); camera.lookAt(0, 0, 0); controls.update();
    needsRender = true; resolve();
  }, undefined, reject));

  // Which place is this point? Uses height and side, in the model's own frame.
  function placeAt(p) {
    const h = (p.y - box.min.y) / size.y;           // 0 feet … 1 top of helmet
    const side = Math.abs(p.x - center.x) / (size.x / 2);
    const back = p.z < center.z - size.z * 0.05;
    if (h > 0.83) return "head";
    if (h > 0.78) return "neck";
    if (side > 0.42 && h > 0.42) return "arms";
    if (h > 0.6) return back ? "back" : "chest";
    if (h > 0.46) return back ? "back" : "belly";
    return "legs";
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(ev) {
    if (!model) return null;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(model, true)[0];
    if (!hit) return null;
    const local = pivot.worldToLocal(hit.point.clone());
    // Lift the marker slightly off the suit along the surface, so the suit doesn't hide it
    let lifted = local.clone();
    if (hit.face) {
      const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      const nLocal = n.applyQuaternion(pivot.quaternion.clone().invert());
      lifted.addScaledVector(nLocal, size.y * 0.02);
    }
    return { place: placeAt(local), point: lifted };
  }

  function marker(point) {
    const g = new THREE.Group(); g.position.copy(point);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(size.y * 0.018, 20, 20),
      new THREE.MeshBasicMaterial({ color: MINT, transparent: true, opacity: .95 }));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(size.y * 0.045, 24, 24),
      new THREE.MeshBasicMaterial({ color: MINT, transparent: true, opacity: .3, depthWrite: false }));
    dot.renderOrder = halo.renderOrder = 10; g.add(halo, dot); g.userData.halo = halo;
    return g;
  }
  function set(place, on, point) {
    const has = hits.has(place);
    if (on && !has) {
      const p = point || defaultPoint(place);
      if (p) { const m = marker(p); markers.add(m); hits.set(place, m); }
    } else if (!on && has) { markers.remove(hits.get(place)); hits.delete(place); }
    needsRender = true;
  }
  // Where a marker goes when the place was chosen from the list instead of the model
  function defaultPoint(place) {
    if (!box) return null;
    const guess = roughPoint(place); if (!guess) return null;
    // cast from outside toward the body to land on the suit
    const from = guess.clone(); const dir = new THREE.Vector3();
    if (place === "back") { from.z = box.max.z + 1; from.z = box.min.z - 1; dir.set(0, 0, 1); }
    else { from.z = box.max.z + 1; dir.set(0, 0, -1); }
    model.updateMatrixWorld(true);
    const r = new THREE.Raycaster(pivot.localToWorld(from.clone()), dir.clone().applyQuaternion(pivot.quaternion));
    const hit = r.intersectObject(model, true)[0];
    if (!hit) return guess;
    const local = pivot.worldToLocal(hit.point.clone());
    return local.addScaledVector(dir, -size.y * 0.02);
  }
  function roughPoint(place) {
    const y = f => box.min.y + size.y * f, front = center.z + size.z * 0.32, rear = center.z - size.z * 0.32;
    return ({ head: [center.x, y(.9), front], neck: [center.x, y(.8), front * .8], chest: [center.x, y(.68), front],
      belly: [center.x, y(.53), front], back: [center.x, y(.62), rear], arms: [center.x + size.x * .4, y(.56), center.z],
      legs: [center.x - size.x * .1, y(.25), front * .6] })[place]?.reduce((v, n, i) => (v[["x", "y", "z"][i]] = n, v), new THREE.Vector3());
  }

  // Tap = toggle; a drag turns the astronaut instead
  let down = null;
  renderer.domElement.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener("pointerup", e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    const p = pick(e); if (!p) return;
    const on = !hits.has(p.place);
    set(p.place, on, p.point);
    onToggle && onToggle(p.place, on);
  });
  renderer.domElement.addEventListener("pointermove", e => {
    if (e.buttons) { tip.hidden = true; return; }
    const p = pick(e);
    renderer.domElement.style.cursor = p ? "pointer" : "grab";
    if (!p) { tip.hidden = true; return; }
    const r = host.getBoundingClientRect();
    tip.textContent = label(p.place); tip.hidden = false;
    tip.style.left = `${e.clientX - r.left}px`; tip.style.top = `${e.clientY - r.top}px`;
  });
  renderer.domElement.addEventListener("pointerleave", () => { tip.hidden = true; });
  controls.addEventListener("change", () => { needsRender = true; });

  // Turn around (front / back), like a person turning to show their back
  let turning = null;
  function turn() {
    const from = pivot.rotation.y, to = from + Math.PI, t0 = performance.now(), dur = reduce ? 1 : 700;
    turning = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      pivot.rotation.y = from + (to - from) * e; if (k >= 1) turning = null; needsRender = true; };
  }

  const clock = new THREE.Clock();
  function loop(t) {
    requestAnimationFrame(loop);
    if (turning) turning(t);
    controls.update();
    const pulse = reduce ? 1 : 1 + Math.sin(clock.getElapsedTime() * 3) * 0.12;
    if (hits.size) { hits.forEach(m => m.userData.halo.scale.setScalar(pulse)); needsRender = true; }
    if (needsRender) { renderer.render(scene, camera); needsRender = false; }
  }
  requestAnimationFrame(loop);
  new ResizeObserver(() => { if (!W() || !H()) return; renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); needsRender = true; }).observe(host);

  return { ready, set, turn, has: p => hits.has(p) };
}

window.Body3D = { mount };
