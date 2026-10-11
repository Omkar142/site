import assert from "node:assert/strict";
import * as THREE from "three";
import { createPilot, posePilot } from "../src/pilot-rig.js";
import { frameCamera } from "../src/pilot-camera.js";
import {
  createMotion,
  advanceMotion,
  footTarget,
  solveLeg,
  springTo,
  smootherstep,
} from "../src/pilot-motion.js";
const rig = createPilot();
let meshes = 0;
rig.root.traverse((node) => {
  if (node.isMesh) meshes++;
});
assert.ok(
  meshes > 25 && meshes < 45,
  "Modelled geometry should retain articulation with fewer draw calls",
);
const feet = () =>
  rig.legs.map((leg) => leg.ankle.getWorldPosition(new THREE.Vector3()));
posePilot(rig, { phase: 0.6, walk: 1, yaw: 0 });
const a = feet();
assert.ok(
  Math.abs(a[0].z - a[1].z) > 0.15,
  "Foot targets occupy different gait phases",
);
assert.ok(
  rig.legs.some((leg) => leg.knee.rotation.x > 0.2),
  "IK bends the knee",
);
posePilot(rig, { phase: 2.6, walk: 1, yaw: 0 });
const b = feet();
assert.ok(
  a.every((point, i) => point.distanceTo(b[i]) > 0.1),
  "Feet actually move in world space",
);
posePilot(rig, { time: 1, walk: 0, wave: 1 });
assert.ok(rig.arms[1].shoulder.rotation.z > 2, "Greeting raises the arm");
assert.ok(Math.abs(rig.legs[0].hip.rotation.x) < 1e-10);
posePilot(rig, { time: 4.73 });
assert.ok(
  rig.eyes.every((eye) => eye.scale.y < 0.1),
  "Eyes blink with eased closing and opening",
);
posePilot(rig, { time: 5 });
assert.equal(rig.eyes[0].scale.y, 1);
for (const boundary of [0, 0.58, 1]) {
  const before = footTarget((boundary - 0.00001) * Math.PI * 2, 1);
  const after = footTarget((boundary + 0.00001) * Math.PI * 2, 1);
  assert.ok(
    Math.hypot(before.y - after.y, before.z - after.z) < 0.00001,
    "Foot path is continuous across stance/swing boundaries",
  );
  const angles = solveLeg(after.y, after.z);
  assert.ok(Number.isFinite(angles.hip) && Number.isFinite(angles.knee));
}
const runSpring = (fps) => {
  const state = { value: 0, velocity: 0 };
  for (let i = 0; i < fps; i++) springTo(state, 1, 1 / fps);
  return state;
};
assert.ok(
  Math.abs(runSpring(30).value - runSpring(120).value) < 1e-10,
  "Spring response is independent of frame rate",
);
const simulate = (fps) => {
  const state = createMotion("hero");
  let pose;
  for (let i = 0; i < fps * 5; i++) pose = advanceMotion(state, 1 / fps);
  return pose;
};
const slow = simulate(30),
  fast = simulate(120);
assert.ok(
  Math.abs(slow.x - fast.x) < 1e-10 && Math.abs(slow.phase - fast.phase) < 1e-8,
  "Stride follows distance at either frame rate",
);
assert.ok(
  slow.walk < 0.01 && Math.abs(slow.yaw - 0.3) < 0.02,
  "Hero smoothly settles into a front-facing rest pose",
);
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 40);
for (const [width, height] of [
  [320, 365],
  [360, 250],
  [700, 750],
  [800, 530],
  [260, 260],
]) {
  for (const kind of ["hero", "film", "contact"]) {
    const state = createMotion(kind);
    for (let i = 0; i < 120; i++) {
      const pose = advanceMotion(
        state,
        1 / 20,
        kind === "film" ? Math.min(1, i / 100) : 0,
      );
      posePilot(rig, pose);
      frameCamera(
        camera,
        width,
        height,
        kind === "film"
          ? state.progress.value
          : kind === "hero"
            ? 0.5 - (1 - smootherstep(state.age / 2.9)) * 0.55
            : 0.5,
        kind === "hero" ? 1 + (1 - smootherstep(state.age / 2.9)) * 0.045 : 1,
      );
      let minimum = Infinity;
      for (const leg of rig.legs)
        for (const x of [-0.25, 0.25])
          for (const z of [-0.24, 0.54])
            minimum = Math.min(
              minimum,
              new THREE.Vector3(x, -0.1975, z).applyMatrix4(
                leg.ankle.matrixWorld,
              ).y,
            );
      assert.ok(
        Math.abs(minimum + 0.0175) < 1e-8,
        "The supported sole stays on the stage",
      );
      rig.root.traverse((node) => {
        if (!node.isMesh) return;
        const positions = node.geometry.attributes.position;
        for (let n = 0; n < positions.count; n++) {
          const point = new THREE.Vector3()
            .fromBufferAttribute(positions, n)
            .applyMatrix4(node.matrixWorld)
            .project(camera);
          assert.ok(
            Math.abs(point.x) < 1 && Math.abs(point.y) < 1,
            `Character clips in ${kind} at ${width}×${height}`,
          );
        }
      });
    }
  }
}
console.log(
  "PASS: IK gait, planted soles, smooth stance/swing, blink, spring timing at 30/120fps, distance-linked strides and perspective framing for all three stages",
);

const greeting = createMotion("contact");
let contactPose;
for (let i = 0; i < 60 * 9; i++) contactPose = advanceMotion(greeting, 1 / 60);
assert.ok(
  contactPose.wave < 0.01,
  "Contact greeting settles to rest rather than permanently holding the arm up",
);
const arrival = createMotion("hero");
for (let i = 0; i < 60 * 6; i++) {
  posePilot(rig, advanceMotion(arrival, 1 / 60));
  for (const { ankle } of rig.legs)
    for (const x of [-0.25, 0.25])
      for (const z of [-0.24, 0.54]) {
        const point = new THREE.Vector3(x, -0.1975, z).applyMatrix4(
          ankle.matrixWorld,
        );
        assert.ok(
          Math.hypot(point.x, point.z) <= 1.32,
          "Soles remain within the reduced pedestal during arrival",
        );
      }
}
console.log(
  "PASS: contact wave returns to rest and hero soles remain supported by the smaller pedestal",
);

// The hero introduction is bounded, then settles. Pointer attention also
// returns to neutral rather than leaving a sticky off-axis portrait.
const heroFocus = createMotion("hero");
let focusPose;
let repeatedWave = 0;
for (let i = 0; i < 60 * 32; i++) {
  focusPose = advanceMotion(
    heroFocus,
    1 / 60,
    0,
    i < 60 * 3 ? { x: 5, y: -5 } : {},
  );
  assert.ok(Math.abs(focusPose.lookX) <= 1 && Math.abs(focusPose.lookY) <= 1);
  if (i > 60 * 9) repeatedWave = Math.max(repeatedWave, focusPose.wave);
}
assert.ok(repeatedWave < 0.001, "Hero greeting is not a repeated wave loop");
assert.ok(
  Math.abs(focusPose.lookX) + Math.abs(focusPose.lookY) < 0.001,
  "Pointer attention settles to neutral",
);
for (const [width, height] of [
  [320, 320],
  [700, 750],
  [800, 530],
]) {
  for (const lookX of [-1, 1]) {
    for (const lookY of [-1, 1]) {
      posePilot(rig, { time: 3.4, wave: 0.86, lookX, lookY, nod: 1 });
      frameCamera(camera, width, height, 0.5 + lookX * 0.18);
      rig.root.traverse((node) => {
        if (!node.isMesh) return;
        const positions = node.geometry.attributes.position;
        for (let n = 0; n < positions.count; n++) {
          const p = new THREE.Vector3()
            .fromBufferAttribute(positions, n)
            .applyMatrix4(node.matrixWorld)
            .project(camera);
          assert.ok(
            Math.abs(p.x) < 1 && Math.abs(p.y) < 1,
            "Pointer gaze and greeting remain in portrait bounds",
          );
        }
      });
    }
  }
}
console.log(
  "PASS: one-time hero greeting, bounded gaze, attention reset and extreme-focus portrait framing",
);
