const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const assert = require("node:assert/strict");
const classes = new Set(),
  events = {},
  changes = [];
const touch = { matches: false, addEventListener: (_, fn) => changes.push(fn) };
const phone = { matches: false, addEventListener: (_, fn) => changes.push(fn) };
const window = {
  addEventListener: (key, fn) => {
    events[key] = fn;
  },
  dispatchEvent() {},
};
const context = {
  window,
  innerWidth: 1440,
  Event: function (type) {
    this.type = type;
  },
  document: {
    documentElement: {
      classList: {
        toggle: (key, value) =>
          value ? classes.add(key) : classes.delete(key),
      },
    },
  },
  matchMedia: (query) => (query.includes("pointer") ? touch : phone),
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "../layout.js"), "utf8"),
  context,
);
assert.equal(window.omkarLayout.compact, false);
touch.matches = phone.matches = true;
context.innerWidth = 980;
events.resize();
assert.equal(window.omkarLayout.compact, true);
assert.ok(
  classes.has("handheld-wide"),
  "Wide desktop-style phone viewport gets a readable scale",
);
context.innerWidth = 390;
events.resize();
assert.equal(window.omkarLayout.compact, true);
assert.ok(
  !classes.has("handheld-wide"),
  "Normal phone keeps its ordinary 16px reading scale",
);
context.innerWidth = 800;
phone.matches = false;
events.resize();
assert.equal(window.omkarLayout.compact, true);
assert.ok(
  !classes.has("handheld-wide"),
  "Portrait tablet does not get phone magnification",
);
context.innerWidth = 1440;
touch.matches = false;
changes[0]();
assert.equal(window.omkarLayout.compact, false);
assert.ok(!classes.has("compact"));
console.log(
  "PASS: normal phone, wide touch-phone reading scale, tablet and desktop layout policies",
);
