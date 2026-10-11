import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createMotion, advanceMotion, smootherstep } from "./pilot-motion.js";
import { frameCamera } from "./pilot-camera.js";
import { createPilot, posePilot } from "./pilot-rig.js";

const root = document.documentElement;
const stages = [];
let frame = 0,
  last = 0,
  elapsed = 0;
const clamp = THREE.MathUtils.clamp;
function makeStage(canvas, kind) {
  if (!canvas || !("IntersectionObserver" in window)) return;
  // Detailed transparent media owns these stages; never instantiate a competing rig.
  if (canvas.closest("[data-hero-film], [data-mascot-media]")) return;
  const stage = {
    canvas,
    kind,
    visible: false,
    renderer: null,
    failed: false,
    motion: createMotion(kind, window.omkarScene?.progress || 0),
  };
  stages.push(stage);
  new IntersectionObserver(
    ([entry]) => {
      stage.visible = entry.isIntersecting;
      schedule();
    },
    { threshold: 0.01 },
  ).observe(canvas);
  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      stage.failed = true;
      stage.canvas.hidden = true;
      canvas.parentElement.classList.remove("rig-ready");
      stage.renderer?.dispose();
      stage.environment?.dispose();
    },
    { once: true },
  );
}
function initialize(stage) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas: stage.canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    stage.renderer = renderer;
    renderer.setPixelRatio(
      Math.min(devicePixelRatio || 1, 1.5) *
        Math.min(1, window.visualViewport?.scale || 1),
    );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 40);
    const environment = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(renderer);
    const target = generator.fromScene(environment, 0.06);
    scene.environment = target.texture;
    scene.environmentIntensity = 0.6;
    environment.dispose();
    generator.dispose();
    scene.add(new THREE.HemisphereLight(0xeaf3ff, 0x141c35, 1.3));
    const key = new THREE.DirectionalLight(0xfff6e8, 2.8);
    key.position.set(-3, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -4;
    key.shadow.camera.right = key.shadow.camera.top = 4;
    key.shadow.bias = -0.001;
    key.shadow.normalBias = 0.025;
    key.shadow.radius = 3;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xa8c7ff, 2.2);
    rim.position.set(4, 3, -4);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xc8d5ff, 0.7);
    fill.position.set(0, 2, 6);
    scene.add(fill);
    const pilot = createPilot();
    scene.add(pilot.root);
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.32, 1.36, 0.13, 64),
      new THREE.MeshStandardMaterial({
        color: kindColor(stage),
        roughness: 0.58,
        metalness: 0.25,
      }),
    );
    plinth.position.y = -0.0825;
    plinth.receiveShadow = true;
    scene.add(plinth);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.33, 0.012, 8, 96),
      new THREE.MeshStandardMaterial({
        color: 0xff9959,
        emissive: 0xff7733,
        emissiveIntensity: 0.16,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.012;
    scene.add(ring);
    const orbit = new THREE.Group();
    scene.add(orbit);
    const nodes = [];
    // The hero is a character portrait. Keep orbiting system nodes for the
    // explanatory stage, rather than surrounding the introduction with props.
    for (let i = 0; i < (stage.kind === "hero" ? 0 : 5); i++) {
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.1 + (i % 2) * 0.04),
        new THREE.MeshStandardMaterial({
          color: i % 2 ? 0xff9959 : 0xc8daff,
          roughness: 0.22,
          metalness: 0.45,
        }),
      );
      orbit.add(mesh);
      nodes.push(mesh);
    }
    Object.assign(stage, {
      renderer,
      scene,
      camera,
      pilot,
      nodes,
      environment: target,
    });
    stage.canvas.parentElement.classList.add("rig-ready");
  } catch {
    stage.failed = true;
    stage.canvas.hidden = true;
    stage.renderer?.dispose();
    stage.canvas.parentElement.classList.remove("rig-ready");
  }
}
function kindColor(stage) {
  return stage.kind === "hero" ? 0x202b48 : 0x1d263d;
}
function enabled() {
  return root.classList.contains("js-motion") && !document.hidden;
}
function draw(now) {
  frame = 0;
  const delta = last ? Math.min((now - last) / 1000, 0.05) : 0;
  last = now;
  elapsed += delta;
  let active = false;
  for (const stage of stages) {
    if (!enabled() || !stage.visible || stage.failed) continue;
    active = true;
    if (!stage.renderer) initialize(stage);
    if (stage.failed) continue;
    const { width, height } = stage.canvas.getBoundingClientRect();
    if (!width || !height) continue;
    if (width !== stage.width || height !== stage.height) {
      stage.width = width;
      stage.height = height;
      stage.renderer.setSize(width, height, false);
    }
    const progress = window.omkarScene?.progress || 0;
    const pose = advanceMotion(
      stage.motion,
      delta,
      progress,
      window.omkarHeroAim,
    );
    const arrival = smootherstep(stage.motion.age / 2.9);
    frameCamera(
      stage.camera,
      width,
      height,
      stage.kind === "hero"
        ? 0.5 - (1 - arrival) * 0.55 + pose.lookX * 0.18
        : stage.motion.progress.value,
      stage.kind === "hero" ? 1 + (1 - arrival) * 0.045 : 1,
    );
    posePilot(stage.pilot, pose);
    stage.nodes.forEach((node, i) => {
      const angle = elapsed * 0.3 + (i * Math.PI * 2) / 5;
      node.position.set(
        Math.cos(angle) * 1.85,
        1.55 + Math.sin(angle * 1.7 + i) * 0.8,
        Math.sin(angle) * 0.65 - 0.55,
      );
      node.rotation.set(elapsed * 0.45, angle, angle * 0.5);
    });
    stage.renderer.render(stage.scene, stage.camera);
  }
  if (active && enabled()) frame = requestAnimationFrame(draw);
  else last = 0;
}
function schedule() {
  if (!enabled()) {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    return;
  }
  if (!frame && stages.some((stage) => stage.visible && !stage.failed))
    frame = requestAnimationFrame(draw);
}
makeStage(document.querySelector("#hero-canvas"), "hero");
makeStage(document.querySelector("#signal-canvas"), "film");
makeStage(document.querySelector("#contact-canvas"), "contact");
new MutationObserver(schedule).observe(root, {
  attributes: true,
  attributeFilter: ["class"],
});
window.addEventListener("omkar:scene", schedule);
window.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", schedule);
window.addEventListener("pagehide", () => {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  last = 0;
});
window.addEventListener("pageshow", schedule);
