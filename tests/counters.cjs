const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const source = fs.readFileSync(
  require("node:path").join(__dirname, "../cinematic.js"),
  "utf8",
);
const logic = source.slice(
  source.indexOf("  const metrics ="),
  source.lastIndexOf("})();"),
);
const frames = [],
  observers = [],
  mutations = [];
let moving = true;
function element() {
  return {
    style: {},
    children: [],
    append(child) {
      this.children.push(child);
    },
    replaceChildren(...children) {
      this.children = children;
    },
  };
}
const metric = element();
metric.dataset = { count: "33" };
metric.value = element();
metric.stat = {
  style: {
    setProperty(key, value) {
      this[key] = value;
    },
  },
  classList: { add() {} },
};
metric.querySelector = () => metric.value;
metric.closest = () => metric.stat;
metric.querySelectorAll = () =>
  metric.value.children.map((child) => child.children[0]);
const c = {
  root: { classList: { contains: () => moving } },
  clamp: (v) => Math.max(0, Math.min(1, v)),
  requestAnimationFrame: (fn) => {
    frames.push(fn);
    return frames.length;
  },
  cancelAnimationFrame() {},
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
    unobserve() {}
  },
  document: {
    hidden: false,
    querySelectorAll: () => [metric],
    createElement: element,
    addEventListener() {},
  },
};
c.window = { IntersectionObserver: c.IntersectionObserver };
vm.createContext(c);
vm.runInContext(logic, c);
const digits = () =>
  metric.querySelectorAll().map((reel) => reel.style.transform);
assert.deepEqual(
  digits(),
  ["translateY(-30%)", "translateY(-30%)"],
  "Final data is visible before intersection",
);
observers[0]([{ isIntersecting: true, target: metric }]);
assert.deepEqual(digits(), ["translateY(-0%)", "translateY(-0%)"]);
frames.shift()(100);
frames.shift()(600);
assert.notDeepEqual(
  digits(),
  ["translateY(-0%)", "translateY(-0%)"],
  "Counter advances during animation",
);
frames.shift()(1800);
assert.deepEqual(digits(), ["translateY(-30%)", "translateY(-30%)"]);
assert.equal(frames.length, 0, "No idle counter loop");
observers[0]([{ isIntersecting: true, target: metric }]);
frames.shift()(2000);
moving = false;
mutations[0]();
assert.deepEqual(
  digits(),
  ["translateY(-30%)", "translateY(-30%)"],
  "Motion off finishes at exact value",
);
moving = true;
observers[0]([{ isIntersecting: true, target: metric }]);
c.document.hidden = true;
frames.shift()(3000);
assert.deepEqual(
  digits(),
  ["translateY(-30%)", "translateY(-30%)"],
  "Background tabs retain final value",
);
console.log(
  "PASS: digit reels, viewport trigger, count progression, exact final value, no idle loop, reduced-motion interruption and hidden-tab completion",
);
