const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

// Exercise the shipped controller with measured-layout inputs. These tests
// verify scroll state, not browser rendering or accessibility.
const source = fs.readFileSync(
  path.join(__dirname, "../portfolio.js"),
  "utf8",
);
const start = source.indexOf("  function updateScrollStory()");
const end = source.indexOf("  refreshScrollStory =", start);
assert.ok(start >= 0 && end > start);
const values = {},
  heroValues = {},
  classes = new Set();
const labels = {
  ".scene-count": { textContent: "" },
  ".scene-label": { textContent: "" },
};
let top = 120,
  off = false;
const toggle = (set) => (name, enabled) =>
  enabled ? set.add(name) : set.delete(name);
const steps = [0, 1, 2].map(() => {
  const state = new Set();
  return { state, classList: { toggle: toggle(state) } };
});
const context = {
  window: {},
  storyFrame: 0,
  activeStoryStep: -1,
  motionOff: () => off,
  desktopStory: { matches: true },
  approach: {
    classList: { toggle: toggle(classes) },
    style: { setProperty: (name, value) => (values[name] = value) },
  },
  story: { getBoundingClientRect: () => ({ top, height: 2000 }) },
  storyVisual: { getBoundingClientRect: () => ({ height: 500 }) },
  storySteps: steps,
  getComputedStyle: () => ({ top: "120px" }),
  clamp: (value) => Math.max(0, Math.min(1, value)),
  document: { querySelector: (selector) => labels[selector] },
  storyLabels: [
    "Find the signal.",
    "Connect the pieces.",
    "Deliver the outcome.",
  ],
  figure: { getBoundingClientRect: () => ({ top: -300 }), offsetHeight: 600 },
  heroImage: {
    style: { setProperty: (name, value) => (heroValues[name] = value) },
  },
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);
const update = (progress) => {
  top = 120 - progress * 1500;
  context.updateScrollStory();
};
update(-1);
assert.equal(values["--story-progress"], "0.0000");
assert.equal(values["--trace"], "0.0000");
assert.equal(labels[".scene-count"].textContent, "01 / 03");
assert.ok(steps[0].state.has("is-current"));
update(0.2);
assert.equal(values["--trace"], "0.6000");
assert.equal(values["--deliver"], "0.0000");
update(0.5);
assert.equal(values["--plane-gap"], "21.00px");
assert.equal(labels[".scene-count"].textContent, "02 / 03");
assert.ok(steps[1].state.has("is-current"));
update(0.8);
assert.equal(values["--plane-gap"], "0.00px");
assert.equal(values["--deliver"], "0.4000");
update(2);
assert.equal(values["--story-progress"], "1.0000");
assert.equal(values["--deliver"], "1.0000");
assert.equal(labels[".scene-count"].textContent, "03 / 03");
update(0.1);
assert.equal(values["--trace"], "0.3000");
assert.equal(values["--deliver"], "0.0000");
assert.equal(labels[".scene-count"].textContent, "01 / 03");
off = true;
update(0);
assert.equal(classes.has("story-motion"), false);
assert.equal(values["--story-progress"], "1.0000");
assert.equal(values["--plane-gap"], "0.00px");
assert.equal(heroValues["--hero-drift"], "0.00px");
assert.ok(steps.every((step) => !step.state.has("is-current")));
context.desktopStory.matches = true;
off = false;
context.window.omkarLayout = { compact: true };
update(0.5);
assert.equal(
  classes.has("story-motion"),
  false,
  "Wide touch layouts avoid the desktop runway",
);
context.window.omkarLayout.compact = false;
off = false;
update(1);
assert.ok(steps[2].state.has("is-current"));
context.desktopStory.matches = false;
update(0);
assert.equal(classes.has("story-motion"), false);
assert.equal(values["--deliver"], "1.0000");
assert.ok(steps.every((step) => !step.state.has("is-current")));
console.log(
  "PASS: scroll boundaries, three stages, reversal, motion off/on and compact viewport fallback",
);
