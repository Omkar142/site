const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const source = fs.readFileSync(
  path.join(__dirname, "../portfolio.js"),
  "utf8",
);
const start = source.indexOf("  function selectProject("),
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
