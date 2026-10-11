// Frame-rate-independent motion state shared by the hero and scroll stage.
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const smootherstep = (x) => {
  x = clamp(x);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
export function springTo(state, target, delta, frequency = 11) {
  const distance = state.value - target;
  const decay = Math.exp(-frequency * delta);
  const advance = (state.velocity + frequency * distance) * delta;
  state.value = target + (distance + advance) * decay;
  state.velocity = (state.velocity - frequency * advance) * decay;
  return state.value;
}
export function createMotion(kind, progress = 0) {
  return {
    kind,
    age: 0,
    phase: 0,
    previousX:
      kind === "hero" ? -0.65 : kind === "contact" ? 0 : -0.55 + progress * 1.1,
    previousZ:
      kind === "hero"
        ? -0.3
        : kind === "contact"
          ? 0
          : Math.sin(progress * Math.PI) * 0.14,
    progress: { value: progress, velocity: 0 },
    walk: { value: 0, velocity: 0 },
    yaw: { value: kind === "hero" ? 0.97 : 0.3, velocity: 0 },
    wave: { value: 0, velocity: 0 },
    focusX: { value: 0, velocity: 0 },
    focusY: { value: 0, velocity: 0 },
  };
}
export function advanceMotion(state, delta, targetProgress = 0, aim = {}) {
  state.age += delta;
  let x, z, heading, waveTarget;
  if (state.kind === "hero") {
    const arrival = smootherstep(state.age / 2.9);
    x = -0.65 * (1 - arrival);
    z = -0.3 * (1 - arrival);
    heading = 0.97;
    // One introduction, followed by a quiet idle. Repeated waves distract
    // from the recruiter's reading and make the character feel mechanical.
    const greeting = state.age - 3.1;
    waveTarget =
      greeting > 0 && greeting < 2.6
        ? smootherstep(greeting / 0.75) *
          (1 - smootherstep((greeting - 1.65) / 0.95)) *
          0.86
        : 0;
  } else if (state.kind === "contact") {
    x = 0;
    z = 0;
    heading = 0.3;
    const greeting = (state.age - 0.8) % 14;
    waveTarget =
      greeting > 0 && greeting < 3.4
        ? smootherstep(greeting / 0.65) *
          (1 - smootherstep((greeting - 2.35) / 1.05)) *
          0.8
        : 0;
  } else {
    const p = springTo(state.progress, clamp(targetProgress), delta, 12);
    x = -0.55 + p * 1.1;
    z = Math.sin(p * Math.PI) * 0.14;
    heading = Math.atan2(1.1, Math.cos(p * Math.PI) * 0.14 * Math.PI);
    if (x < state.previousX) heading -= Math.PI;
    waveTarget = smootherstep((p - 0.68) / 0.26) * 0.78;
  }
  const distance = Math.hypot(x - state.previousX, z - state.previousZ);
  const speed = delta > 0 ? distance / delta : 0;
  const walk = springTo(state.walk, clamp(speed / 0.37), delta, 10);
  // Stride advances with travelled distance, not a free-running clock.
  state.phase += (distance * Math.PI * 2) / 0.65;
  const restYaw = 0.3;
  const targetYaw = restYaw + (heading - restYaw) * smootherstep(walk);
  const nearest =
    state.yaw.value +
    Math.atan2(
      Math.sin(targetYaw - state.yaw.value),
      Math.cos(targetYaw - state.yaw.value),
    );
  const yaw = springTo(state.yaw, nearest, delta, 9);
  const wave = springTo(state.wave, waveTarget * (1 - walk), delta, 10);
  state.previousX = x;
  state.previousZ = z;
  const lookX = springTo(
    state.focusX,
    state.kind === "hero" ? clamp(aim.x || 0, -1, 1) : 0,
    delta,
    7,
  );
  const lookY = springTo(
    state.focusY,
    state.kind === "hero" ? clamp(aim.y || 0, -1, 1) : 0,
    delta,
    7,
  );
  const nod =
    state.kind === "hero"
      ? smootherstep((state.age - 2.8) / 0.3) *
        (1 - smootherstep((state.age - 3.2) / 0.55))
      : 0;
  return {
    time: state.age,
    phase: state.phase,
    walk,
    wave,
    yaw,
    x,
    z,
    lookX,
    lookY,
    nod,
  };
}

// Two-bone IK target: supported stance, eased swing and a soft toe lift.
export function footTarget(phase, walk) {
  const cycle = (((phase / (Math.PI * 2)) % 1) + 1) % 1;
  const stance = cycle < 0.58;
  const u = stance ? cycle / 0.58 : (cycle - 0.58) / 0.42;
  const eased = smootherstep(u);
  const z = (stance ? 0.22 - 0.44 * eased : -0.22 + 0.44 * eased) * walk;
  const lift = stance ? 0 : 0.14 * Math.pow(Math.sin(Math.PI * eased), 2);
  return {
    y: -0.94 + (0.035 + lift) * walk,
    z,
    toe: stance ? 0 : -0.22 * Math.pow(Math.sin(Math.PI * eased), 2) * walk,
    stance,
  };
}
export function solveLeg(y, z) {
  const thigh = 0.53,
    shin = 0.42;
  const distance = clamp(
    Math.hypot(y, z),
    Math.abs(thigh - shin) + 0.0001,
    thigh + shin - 0.0001,
  );
  const hip =
    Math.atan2(-z, -y) -
    Math.acos(
      clamp(
        (thigh * thigh + distance * distance - shin * shin) /
          (2 * thigh * distance),
        -1,
        1,
      ),
    );
  const knee =
    Math.PI -
    Math.acos(
      clamp(
        (thigh * thigh + shin * shin - distance * distance) /
          (2 * thigh * shin),
        -1,
        1,
      ),
    );
  return { hip, knee };
}
