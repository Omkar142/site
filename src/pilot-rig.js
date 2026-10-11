import * as THREE from "three";
import { footTarget, solveLeg, smootherstep } from "./pilot-motion.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Original articulated model. Every limb has a real pivot; no pose sprites.
export function createPilot() {
  const root = new THREE.Group();
  const pearl = new THREE.MeshPhysicalMaterial({
    color: 0xf3f0df,
    roughness: 0.38,
    metalness: 0.12,
    clearcoat: 0.45,
  });
  const blue = new THREE.MeshPhysicalMaterial({
    color: 0x243ec4,
    roughness: 0.55,
    metalness: 0.04,
    clearcoat: 0.15,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x101829,
    roughness: 0.54,
  });
  const orange = new THREE.MeshStandardMaterial({
    color: 0xff9959,
    roughness: 0.3,
    metalness: 0.12,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x020916,
    roughness: 0.13,
    metalness: 0.38,
    clearcoat: 1,
  });
  const light = new THREE.MeshStandardMaterial({
    color: 0x8df5ff,
    emissive: 0x4bd9f3,
    emissiveIntensity: 2.4,
    roughness: 0.25,
  });
  function box(parent, w, h, d, material, x, y, z, radius = 0.08) {
    const mesh = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 5, Math.min(radius, w / 3, h / 3, d / 3)),
      material,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function joint(parent, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    parent.add(group);
    return group;
  }
  function capsule(parent, w, h, d, material, x, y, z) {
    const geometry = new THREE.CapsuleGeometry(0.5, 0.16, 8, 20).toNonIndexed();
    geometry.scale(w, h / 1.16, d);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const torso = joint(root, 0, 1.12, 0);
  capsule(torso, 1.12, 1.06, 0.72, blue, 0, 0.51, 0);
  box(torso, 0.92, 0.18, 0.67, dark, 0, 0, 0, 0.04);
  box(torso, 0.036, 0.72, 0.045, orange, 0, 0.5, 0.382, 0.006);
  box(torso, 0.3, 0.26, 0.075, dark, -0.29, 0.53, 0.375, 0.035);
  box(torso, 0.16, 0.026, 0.015, orange, -0.29, 0.55, 0.419, 0.005);
  box(torso, 0.09, 0.026, 0.015, pearl, -0.32, 0.48, 0.419, 0.005);
  box(torso, 0.31, 0.22, 0.06, blue, 0.29, 0.3, 0.375, 0.025);
  const neck = joint(torso, 0, 1.04, 0);
  box(neck, 0.45, 0.2, 0.43, dark, 0, 0.015, 0);
  const head = joint(neck, 0, 0.46, 0);
  box(head, 1.28, 1.01, 0.96, pearl, 0, 0, 0, 0.33);
  box(head, 1.1, 0.57, 0.14, glass, 0, 0.01, 0.47, 0.14);
  const eyes = [-1, 1].map((side) =>
    box(head, 0.16, 0.15, 0.025, light, side * 0.255, 0.04, 0.552, 0.045),
  );
  for (const side of [-1, 1]) {
    box(head, 0.14, 0.43, 0.44, dark, side * 0.645, 0, 0, 0.055);
    box(head, 0.08, 0.22, 0.25, orange, side * 0.73, 0, 0, 0.04);
  }
  box(head, 0.11, 0.28, 0.12, orange, 0.37, 0.57, -0.02, 0.035);
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.105, 0.012, 6, 20, Math.PI),
    light,
  );
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.115, 0.552);
  head.add(smile);
  const hips = joint(root, 0, 0, 0);
  const arms = [],
    legs = [];
  for (const side of [-1, 1]) {
    const shoulder = joint(torso, side * 0.64, 0.81, 0);
    capsule(shoulder, 0.39, 0.58, 0.43, blue, side * 0.035, -0.24, 0);
    box(shoulder, 0.28, 0.085, 0.45, orange, side * 0.035, -0.15, 0, 0.026);
    const elbow = joint(shoulder, side * 0.045, -0.54, 0);
    capsule(elbow, 0.33, 0.42, 0.38, blue, 0, -0.18, 0);
    box(elbow, 0.33, 0.11, 0.39, dark, 0, -0.38, 0, 0.025);
    const hand = joint(elbow, 0, -0.48, 0);
    box(hand, 0.31, 0.29, 0.34, pearl, 0, -0.025, 0.01, 0.095);
    box(hand, 0.13, 0.19, 0.18, pearl, -side * 0.16, 0.01, 0.08, 0.05);
    arms.push({ shoulder, elbow, hand, side });
    const hip = joint(hips, side * 0.28, 1.13, 0);
    box(hip, 0.43, 0.54, 0.5, dark, 0, -0.25, 0, 0.1);
    const knee = joint(hip, 0, -0.53, 0);
    box(knee, 0.36, 0.41, 0.41, dark, 0, -0.2, 0, 0.085);
    box(knee, 0.28, 0.19, 0.06, blue, 0, -0.05, 0.215, 0.05);
    const ankle = joint(knee, 0, -0.42, 0);
    box(ankle, 0.49, 0.23, 0.77, pearl, 0, -0.045, 0.15, 0.09);
    box(ankle, 0.5, 0.075, 0.78, orange, 0, -0.16, 0.15, 0.018);
    box(ankle, 0.29, 0.04, 0.11, dark, 0, 0.075, 0.26, 0.01);
    legs.push({ hip, knee, ankle, side });
  }
  const joints = { root, torso, hips, head, arms, legs, eyes };
  // Batch rigid details by pivot and material. Articulated joints and the
  // animated eyes remain independent, while the renderer issues fewer draws.
  root.traverse((pivot) => {
    if (!pivot.isGroup) return;
    const batches = new Map();
    for (const child of pivot.children) {
      if (!child.isMesh || eyes.includes(child)) continue;
      const key = child.material.uuid;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(child);
    }
    for (const meshes of batches.values()) {
      if (meshes.length < 2) continue;
      const geometries = meshes.map((mesh) => {
        mesh.updateMatrix();
        return mesh.geometry.clone().applyMatrix4(mesh.matrix);
      });
      const merged = new THREE.Mesh(
        mergeGeometries(geometries),
        meshes[0].material,
      );
      merged.castShadow = merged.receiveShadow = true;
      for (const mesh of meshes) {
        pivot.remove(mesh);
        mesh.geometry.dispose();
      }
      geometries.forEach((geometry) => geometry.dispose());
      pivot.add(merged);
    }
  });
  posePilot(joints, { time: 0, walk: 0, wave: 0, yaw: -0.2 });
  return joints;
}

export function posePilot(
  rig,
  {
    time = 0,
    phase = time * 5.2,
    walk = 0,
    wave = 0,
    yaw = 0.3,
    x = 0,
    z = 0,
    lookX = 0,
    lookY = 0,
    nod = 0,
  } = {},
) {
  const breathing = Math.sin(time * 1.45);
  rig.root.position.set(x, 0, z);
  rig.root.rotation.y = yaw;
  rig.hips.rotation.y = Math.sin(phase) * 0.075 * walk;
  rig.hips.rotation.z = Math.sin(phase) * 0.025 * walk;
  rig.torso.rotation.set(
    -0.045 * walk + breathing * 0.006,
    -Math.sin(phase - 0.25) * 0.055 * walk,
    Math.sin(phase + 0.2) * 0.024 * walk + breathing * 0.008,
  );
  rig.torso.position.y = 1.12 + breathing * 0.008 * (1 - walk);
  rig.head.rotation.set(
    0.009 * Math.sin(time * 1.1) - 0.012 * walk + lookY * 0.07 + nod * 0.11,
    Math.sin(time * 0.65) * 0.035 - yaw * 0.28 + lookX * 0.17,
    Math.sin(time * 0.9) * 0.012 - lookX * 0.012,
  );
  rig.legs.forEach(({ hip, knee, ankle, side }) => {
    const target = footTarget(phase + (side === 1 ? Math.PI : 0), walk);
    const angles = solveLeg(target.y, target.z);
    hip.rotation.x = angles.hip * walk;
    knee.rotation.x = angles.knee * walk;
    // Stance keeps the sole level. Swing rolls the toe before contact.
    ankle.rotation.x = -hip.rotation.x - knee.rotation.x + target.toe;
  });
  rig.arms.forEach(({ shoulder, elbow, hand, side }) => {
    const swing = Math.sin(phase - 0.15 + (side === 1 ? Math.PI : 0));
    const greeting = side === 1 ? wave : 0;
    shoulder.rotation.set(
      -swing * 0.29 * walk - greeting * 0.22,
      side * 0.08 * greeting,
      side * (0.1 + breathing * 0.012) + greeting * 2.1,
    );
    // Follow-through: elbow and wrist lag the shoulder instead of moving as one.
    elbow.rotation.x = -0.16 - 0.07 * (1 + swing) * walk - greeting * 0.25;
    elbow.rotation.z = greeting * (0.22 + Math.sin(time * 4.8 - 0.3) * 0.15);
    hand.rotation.z = greeting * Math.sin(time * 4.8 - 0.6) * 0.15;
    hand.rotation.y = greeting * Math.sin(time * 4.8 - 0.8) * 0.1;
  });
  const blinkPhase = time % 5.1;
  const closed =
    smootherstep((blinkPhase - 4.64) / 0.075) *
    (1 - smootherstep((blinkPhase - 4.745) / 0.13));
  rig.eyes.forEach((eye, index) => {
    eye.scale.y = 1 - closed * 0.94;
    eye.position.x =
      (index === 0 ? -0.255 : 0.255) +
      Math.sin(time * 0.65) * 0.012 +
      lookX * 0.028;
  });
  rig.root.updateMatrixWorld(true);
  let lowest = Infinity;
  const point = new THREE.Vector3();
  for (const { ankle } of rig.legs) {
    for (const x of [-0.25, 0.25]) {
      for (const z of [-0.24, 0.54]) {
        point.set(x, -0.1975, z).applyMatrix4(ankle.matrixWorld);
        lowest = Math.min(lowest, point.y);
      }
    }
  }
  rig.root.position.y += -0.0175 - lowest;
  rig.root.updateMatrixWorld(true);
}
