const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
class Element {
  constructor({
    top = 0,
    height = 100,
    text = "",
    scrollHeight = height,
  } = {}) {
    this.top = top;
    this.height = height;
    this.scrollHeight = scrollHeight;
    this.textContent = text;
    this.children = [];
    this.classes = new Set();
    this.events = {};
    this.classList = {
      contains: (key) => this.classes.has(key),
      toggle: (key, value) =>
        value ? this.classes.add(key) : this.classes.delete(key),
    };
    this.style = { setProperty: (key, value) => (this.style[key] = value) };
  }
  append(...items) {
    this.children.push(...items);
  }
  setAttribute(key, value) {
    this[key] = value;
  }
  addEventListener(event, fn) {
    this.events[event] = fn;
  }
  getBoundingClientRect() {
    return { top: this.top, height: this.height, width: 1200, left: 0 };
  }
  querySelectorAll(selector) {
    const found = [];
    for (const child of this.children) {
      if (child.className === selector.slice(1)) found.push(child);
      if (child.querySelectorAll)
        found.push(...child.querySelectorAll(selector));
    }
    return found;
  }
}
const root = new Element();
root.classes.add("js-motion");
const cards = [0, 1, 2].map(
  (index) => new Element({ top: 100 + index * 600, height: 550 }),
);
const stage = new Element();
stage.querySelectorAll = () => cards;
const text = new Element({
  top: 500,
  height: 180,
  text: "Systems and people.",
});
const marquee = new Element({ top: 400, height: 450 });
const figure = new Element(),
  hero = new Element();
const frames = new Map(),
  observers = [],
  mutations = [],
  resizeObservers = [];
const fine = { matches: true, addEventListener() {} };
let nextFrame = 0;
const document = {
  hidden: false,
  documentElement: root,
  events: {},
  querySelector: (selector) =>
    ({
      ".project-stage": stage,
      ".work-marquee": marquee,
      ".hero-figure": figure,
      ".hero": hero,
    })[selector],
  querySelectorAll: () => [text],
  createElement: () => new Element(),
  createTextNode: (value) => ({ textContent: value }),
  addEventListener(event, fn) {
    this.events[event] = fn;
  },
};
const window = {
  events: {},
  IntersectionObserver: true,
  ResizeObserver: true,
  addEventListener(event, fn) {
    this.events[event] = fn;
  },
};
const context = {
  document,
  window,
  innerWidth: 1440,
  innerHeight: 1000,
  matchMedia: () => fine,
  requestAnimationFrame(fn) {
    frames.set(++nextFrame, fn);
    return nextFrame;
  },
  cancelAnimationFrame(id) {
    frames.delete(id);
  },
  IntersectionObserver: class {
    constructor(fn) {
      observers.push(fn);
    }
    observe() {}
  },
  ResizeObserver: class {
    constructor(fn) {
      resizeObservers.push(fn);
    }
    observe() {}
  },
  MutationObserver: class {
    constructor(fn) {
      mutations.push(fn);
    }
    observe() {}
  },
};
function tick(now = 16) {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((fn) => fn(now));
}
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "../creator.js"), "utf8"),
  context,
);
observers[0](
  [stage, text, marquee].map((target) => ({ target, isIntersecting: true })),
);
tick();
assert.ok(stage.classes.has("stack-ready"));
assert.ok(Number(cards[0].style["--stack-progress"]) > 0);
assert.equal(cards[2].style["--stack-progress"], "0.0000");
assert.equal(
  frames.size,
  0,
  "Scroll controller does not keep an idle RAF loop",
);
assert.equal(text.children[0].textContent, "Systems and people.");
assert.equal(
  text.children[1]["aria-hidden"],
  "true",
  "Animated letters are not read twice",
);
assert.equal(text.querySelectorAll(".reveal-char").length, 17);
text.top = -600;
window.events.scroll();
tick();
assert.ok(
  text
    .querySelectorAll(".reveal-char")
    .every((letter) => Number(letter.style.opacity) === 1),
);
cards[1].scrollHeight = 1500;
resizeObservers[0]();
tick();
assert.ok(!stage.classes.has("stack-ready"), "Expanded content exits stacking");
cards[1].scrollHeight = 550;
context.innerHeight = 650;
window.events.resize();
tick();
assert.ok(
  !stage.classes.has("stack-ready"),
  "Short screens stay in normal document flow",
);
context.innerHeight = 1000;
context.innerWidth = 390;
window.events.resize();
tick();
assert.ok(
  !stage.classes.has("stack-ready"),
  "Mobile has no sticky card overlap",
);
hero.events.pointermove({ clientX: 1200, clientY: 100, pointerType: "mouse" });
tick(32);
assert.ok(parseFloat(figure.style["--magnet-x"]) > 0);
hero.events.pointerleave();
for (let i = 1; i < 100 && frames.size; i++) tick(32 + i * 16);
assert.equal(frames.size, 0, "Magnet settles and stops rendering");
hero.events.pointermove({ clientX: 1200, clientY: 100, pointerType: "mouse" });
tick(2000);
document.hidden = true;
document.events.visibilitychange();
assert.equal(frames.size, 0, "Hidden tabs stop magnetic motion");
document.hidden = false;
root.classes.delete("js-motion");
mutations[0]();
tick();
assert.ok(!stage.classes.has("stack-ready"));
assert.equal(marquee.style["--marquee-travel"], "0.0px");
assert.ok(
  text
    .querySelectorAll(".reveal-char")
    .every((letter) => Number(letter.style.opacity) === 1),
);
assert.equal(figure.style["--magnet-x"], "0px");
assert.equal(frames.size, 0);
root.classes.add("js-motion");
context.innerWidth = 980;
context.innerHeight = 2200;
window.omkarLayout = { compact: true };
mutations[0]();
tick();
assert.ok(
  !stage.classes.has("stack-ready"),
  "Desktop-style phone view must not enable desktop card stacking",
);
console.log(
  "PASS: readable story stacking, expanded/short/mobile fallbacks, accessible letter reveal, magnetic settling and reduced motion",
);
