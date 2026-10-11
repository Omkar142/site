const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const source = fs.readFileSync(
  path.join(__dirname, "../cinematic.js"),
  "utf8",
);
const values = {},
  actorValues = {},
  events = [],
  tasks = [];
let top = 80,
  moving = true,
  stickyHeight = 820;
const chapterClasses = new Set();
const context = {
  innerHeight: 900,
  getComputedStyle: () => ({ top: "80px" }),
  requestAnimationFrame: (fn) => {
    tasks.push(fn);
    return tasks.length;
  },
  cancelAnimationFrame() {},
  CustomEvent: function (type, input) {
    this.type = type;
    this.detail = input.detail;
  },
  MutationObserver: class {
    observe() {}
  },
  ResizeObserver: class {
    observe() {}
  },
};
const els = {
  ".film-chapter": {
    dataset: {},
    classList: {
      toggle: (name, value) =>
        value ? chapterClasses.add(name) : chapterClasses.delete(name),
    },
    getBoundingClientRect: () => ({ top, bottom: top + 1980, height: 1980 }),
    style: { setProperty: (name, value) => (values[name] = value) },
  },
  ".film-sticky": { getBoundingClientRect: () => ({ height: stickyHeight }) },
  ".site-header": { getBoundingClientRect: () => ({ height: 80 }) },
  ".hero-grid": { getBoundingClientRect: () => ({ top: -400, height: 800 }) },
  ".hero-figure": {
    style: { setProperty: (name, value) => (actorValues[name] = value) },
  },
  ".hero-wordmark": { style: {} },
  ".film-caption": { textContent: "" },
  ".film-index": { textContent: "" },
};
context.document = {
  documentElement: { classList: { contains: () => moving } },
  querySelector: (selector) => els[selector],
  querySelectorAll: () => [],
  addEventListener() {},
};
context.window = {
  addEventListener() {},
  dispatchEvent: (event) => events.push(event),
};
vm.createContext(context);
vm.runInContext(source, context);
const render = tasks[0];
function at(progress) {
  top = 80 - progress * 1160;
  render();
}
at(-1);
assert.equal(values["--film-progress"], "0.0000");
assert.equal(els[".film-index"].textContent, "01—03");

at(0.5);
assert.equal(els[".film-index"].textContent, "02—03");
assert.equal(els[".film-chapter"].dataset.phase, "2");
at(1.5);
assert.equal(values["--film-progress"], "1.0000");

assert.equal(els[".film-index"].textContent, "03—03");
at(0.1);

assert.equal(els[".film-index"].textContent, "01—03");
moving = false;
at(0);
assert.equal(context.window.omkarScene.enabled, false);
assert.equal(values["--film-progress"], "1.0000");
assert.equal(context.window.omkarScene.pinned, false);
assert.equal(els[".hero-wordmark"].style.transform, "");
assert.ok(chapterClasses.has("film-unpinned"));
moving = true;
context.innerHeight = 600;
stickyHeight = 500;
at(0);
assert.equal(context.window.omkarScene.enabled, true);
assert.equal(context.window.omkarScene.pinned, false);
context.innerHeight = 900;
stickyHeight = 1000;
at(0);
assert.equal(context.window.omkarScene.enabled, true);
assert.equal(context.window.omkarScene.pinned, false);
stickyHeight = 820;
at(0.8);
assert.equal(context.window.omkarScene.enabled, true);
assert.equal(chapterClasses.has("film-unpinned"), false);
assert.equal(events.at(-1).type, "omkar:scene");
assert.equal(events.at(-1).detail.progress, 0.8);
context.window.omkarLayout = { compact: true };
at(0.5);
assert.equal(
  context.window.omkarScene.pinned,
  false,
  "Wide phone view keeps motion without pinning",
);
assert.equal(context.window.omkarScene.enabled, true);
console.log(
  "PASS: cinematic stages, reverse scroll, motion reset, short-screen animation, oversized-layout unpinning and 3D event state",
);
