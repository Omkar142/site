const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const source = fs.readFileSync(
  path.join(__dirname, "../continuity.js"),
  "utf8",
);
let moving = true;
const frames = [],
  observers = [],
  mutations = [];
const element = (top, height) => ({
  top,
  height,
  style: {
    setProperty(k, v) {
      this[k] = v;
    },
  },
  classes: new Set(),
  classList: {
    toggle(k, v) {
      v ? this.owner.classes.add(k) : this.owner.classes.delete(k);
    },
  },
  getBoundingClientRect() {
    return { top: this.top, height: this.height };
  },
});
const sections = [
  element(600, 650),
  element(1000, 900),
  element(2000, 1100),
  element(-200, 1800),
  element(5000, 500),
];
const cards = [element(875, 180), element(200, 180)];
const timeline = element(-50, 1200);
[...sections, ...cards].forEach((el) => (el.classList.owner = el));
const c = {
  innerHeight: 900,
  requestAnimationFrame: (fn) => {
    frames.push(fn);
    return frames.length;
  },
  MutationObserver: class {
    constructor(fn) {
      mutations.push(fn);
    }
    observe() {}
  },
  IntersectionObserver: class {
    constructor(fn) {
      observers.push(fn);
    }
    observe() {}
  },
  document: {
    documentElement: { classList: { contains: () => moving } },
    querySelectorAll: (selector) =>
      selector.includes("profile-lab") ? sections : cards,
    querySelector: (selector) =>
      selector === ".timeline" ? timeline : sections[3],
  },
  window: { addEventListener() {} },
};
c.window.IntersectionObserver = c.IntersectionObserver;
vm.createContext(c);
vm.runInContext(source, c);
frames.shift()();
observers[0](
  [...sections, ...cards].map((target) => ({ target, isIntersecting: true })),
);
frames.shift()();
assert.ok(
  Number(sections[0].style["--section-progress"]) > 0 &&
    Number(sections[0].style["--section-progress"]) < 1,
);
assert.equal(
  sections[1].style["--section-progress"],
  "0.0000",
  "Below-fold section clamps",
);
assert.equal(cards[1].style["--card-progress"], "1.0000");
assert.ok(Number(cards[0].style["--card-progress"]) < 0.1);
assert.ok(Number(timeline.style["--timeline-fill"]) > 0.5);
assert.equal(
  frames.length,
  0,
  "Scroll effects do not create an idle render loop",
);
const prior = sections[0].style["--section-progress"];
observers[0]([{ target: sections[0], isIntersecting: false }]);
sections[0].top = -500;
frames.shift()();
assert.equal(
  sections[0].style["--section-progress"],
  prior,
  "Offscreen section work is skipped",
);
assert.equal(sections[0].classes.has("motion-visible"), false);
moving = false;
mutations[0]();
frames.shift()();
assert.ok(sections.every((el) => el.style["--section-progress"] === "0.5000"));
assert.ok(cards.every((el) => el.style["--card-progress"] === "1.0000"));
assert.equal(timeline.style["--timeline-fill"], "1.0000");
console.log(
  "PASS: lower-section progress, viewport gating, offscreen pause, complete motion-off state and no idle scroll loop",
);
