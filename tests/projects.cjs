const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const source = fs.readFileSync(
  path.join(__dirname, "../portfolio.js"),
  "utf8",
);
const navigationStart = source.indexOf("  function scrollToProject(");
const start = navigationStart >= 0 ? navigationStart : source.indexOf("  function selectProject("),
  end = source.indexOf("  selectProject(projectFromURL()", start);
const choices = ["google", "tracxn", "screengod", "cisco"].map((name) => ({
  dataset: { project: name },
  setAttribute(key, value) {
    this[key] = value;
  },
  querySelector() {
    return { childNodes: [{ textContent: name }] };
  },
}));
const panels = choices.map((choice) => ({
  id: "case-" + choice.dataset.project,
  classList: { remove() {}, add() {}, toggle() {} },
}));
const status = {};
const context = {
  choices,
  panels,
  document: { querySelector: () => status },
  motionOff: () => false,
  requestAnimationFrame: (fn) => fn(),
  location: { hash: "#case-cisco", search: "" },
  URLSearchParams,
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);
assert.equal(context.projectFromURL(), "cisco");
context.selectProject("cisco", false, false);
assert.equal(panels[3].hidden, false);
assert.ok(
  panels.every((p) => p.hidden === false),
  "Every story stays readable",
);
assert.equal(choices[3]["aria-pressed"], "true");
context.location.hash = "#case-screengod";
assert.equal(context.projectFromURL(), "screengod");
context.selectProject("screengod", false, false);
assert.equal(choices[2]["aria-pressed"], "true");
assert.ok(panels.every((p) => p.hidden === false));
context.location.hash = "";
context.location.search = "?project=tracxn";
assert.equal(context.projectFromURL(), "tracxn");
context.selectProject("tracxn", false, false);
assert.equal(panels[1].hidden, false);
context.selectProject("unavailable", false, false);
assert.equal(panels[0].hidden, false);
assert.equal(choices[0]["aria-pressed"], "true");
console.log(
  "PASS: Cisco and ScreenGod deep-links, all four work stories remain visible, pressed-state controls and invalid-project fallback",
);

// A browser can report a sticky card at y=112 while its document-flow
// position is thousands of pixels earlier. Model that distinction explicitly.
const classes = new Set(["stack-ready"]);
const stage = {
  classList: {
    contains: (name) => classes.has(name),
    add: (name) => classes.add(name),
    remove: (name) => classes.delete(name),
  },
};
const scrolls = [];
let off = false;
context.root = {};
context.getComputedStyle = (element) => element === context.root
  ? { scrollPaddingTop: "96px" }
  : { scrollMarginTop: "118px" };
context.window = {
  scrollY: 3800,
  scrollX: 0,
  events: {},
  addEventListener(name, fn) { this.events[name] = fn; },
  scrollTo(options) {
    scrolls.push(options);
    this.scrollY = options.top;
  },
};
panels.forEach((panel, index) => {
  panel.closest = () => stage;
  panel.getBoundingClientRect = () => ({
    top: classes.has("stack-ready")
      ? Math.max(112 + index * 24, (index + 1) * 1000 - context.window.scrollY)
      : (index + 1) * 1000 - context.window.scrollY,
  });
  panel.scrollIntoView = (options) => context.window.scrollTo({
    top: context.window.scrollY + panel.getBoundingClientRect().top - 214,
    behavior: options.behavior,
  });
});
context.location.href = "https://www.omkarg.co.in/?keep=yes#case-cisco";
context.URL = URL;
context.history = {
  replaceState(_state, _unused, url) {
    context.location.href = String(url);
    context.location.hash = url.hash;
    context.location.search = url.search;
  },
};
context.motionOff = () => off;
context.selectProject("google", true);
assert.equal(scrolls.at(-1).top, 786, "Back-navigation must reach the earlier story, not its pinned position");
assert.ok(classes.has("stack-ready"), "The visual card stack is restored synchronously");
assert.equal(scrolls.at(-1).behavior, "smooth");
assert.ok(context.location.href.includes("keep=yes"));
assert.equal(context.location.hash, "#case-google");
const settledCalls = scrolls.length;
context.selectProject("google", true);
assert.equal(scrolls.length, settledCalls, "Repeated clicks at the destination do not nudge the page");
context.selectProject("cisco", true);
assert.equal(scrolls.at(-1).top, 3786);
context.selectProject("tracxn", true);
assert.equal(scrolls.at(-1).top, 1786, "Fast direction changes retain the chosen story's document destination");
classes.delete("stack-ready");
off = true;
context.selectProject("screengod", true);
assert.equal(scrolls.at(-1).top, 2786);
assert.equal(scrolls.at(-1).behavior, "instant", "Motion-off navigation does not animate");
assert.ok(!classes.has("stack-ready"), "Reading layouts never gain sticky stacking");

const link = { hash: "#case-google", addEventListener(_name, fn) { this.click = fn; } };
context.document.querySelectorAll = () => [link];
choices.forEach((choice) => choice.addEventListener = (_name, fn) => { choice.click = fn; });
const bindingsStart = source.indexOf("  choices.forEach((choice) =>", end);
const bindingsEnd = source.indexOf('  if ("IntersectionObserver" in window)', bindingsStart);
vm.runInContext(source.slice(bindingsStart, bindingsEnd), context);
classes.add("stack-ready");
off = false;
link.hash = "#case-cisco"; // The hero's experience link changes after setup.
let prevented = false;
let before = scrolls.length;
link.click?.({ button: 0, preventDefault() { prevented = true; } });
assert.ok(prevented, "Case links suppress the browser's competing fragment scroll");
assert.equal(scrolls.length, before + 1, "A case link starts exactly one navigation");
assert.equal(scrolls.at(-1).top, 3786);
before = scrolls.length;
prevented = false;
link.click({ button: 0, ctrlKey: true, preventDefault() { prevented = true; } });
assert.ok(!prevented, "Modified clicks retain native browser behavior");
assert.equal(scrolls.length, before);
context.location.hash = "#case-tracxn";
context.window.events.hashchange();
assert.equal(scrolls.at(-1).top, 1786);
assert.equal(choices[1]["aria-pressed"], "true");
console.log("PASS: pinned-card back-navigation, repeat/rapid selection, preserved stack, motion-off fallback, dynamic case links and single-scroll fragment navigation");
