(() => {
  "use strict";
  const root = document.documentElement;
  const chapter = document.querySelector(".film-chapter");
  const sticky = document.querySelector(".film-sticky");
  const hero = document.querySelector(".hero-grid");
  const actor = document.querySelector(".hero-figure");
  const wordmark = document.querySelector(".hero-wordmark");
  const caption = document.querySelector(".film-caption");
  const counter = document.querySelector(".film-index");
  const labels = [
    "Understand the system.",
    "Connect the decisions.",
    "Move the work forward.",
  ];
  const clamp = (value) => Math.max(0, Math.min(1, value));
  let frame = 0;
  function render() {
    frame = 0;
    const headerHeight = document
      .querySelector(".site-header")
      .getBoundingClientRect().height;
    const enabled = root.classList.contains("js-motion");
    const pinned =
      enabled &&
      !window.omkarLayout?.compact &&
      innerHeight > 650 &&
      sticky.getBoundingClientRect().height <= innerHeight - headerHeight + 4;
    chapter.classList.toggle("film-unpinned", !pinned);
    const bounds = chapter.getBoundingClientRect();
    const inset = parseFloat(getComputedStyle(sticky).top) || 0;
    const travel = bounds.height - sticky.getBoundingClientRect().height;
    // Short screens retain animation even when the text cannot safely be pinned.
    const progress = !enabled
      ? 1
      : pinned && travel > 0
        ? clamp((inset - bounds.top) / travel)
        : clamp((innerHeight - bounds.top) / (innerHeight + bounds.height));
    chapter.style.setProperty("--film-progress", progress.toFixed(4));
    chapter.dataset.phase = String(Math.min(2, Math.floor(progress * 3)) + 1);
    const phase = Math.min(2, Math.floor(progress * 3));
    caption.textContent = labels[phase];
    counter.textContent = "0" + (phase + 1) + "—03";
    const heroBounds = hero.getBoundingClientRect();
    const heroProgress = enabled
      ? clamp(-heroBounds.top / Math.max(1, heroBounds.height))
      : 0;
    actor.style.setProperty(
      "--actor-orbit",
      (-20 + heroProgress * 70).toFixed(2) + "deg",
    );
    wordmark.style.transform = enabled
      ? "translateY(" +
        (-heroProgress * 60).toFixed(2) +
        "px) scale(" +
        (1 - heroProgress * 0.025).toFixed(4) +
        ")"
      : "";
    wordmark.style.opacity = String(1 - heroProgress * 0.65);
    window.omkarScene = {
      progress,
      enabled,
      pinned,
      inView: bounds.bottom > 0 && bounds.top < innerHeight,
    };
    window.dispatchEvent(
      new CustomEvent("omkar:scene", { detail: window.omkarScene }),
    );
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("load", schedule);
  window.addEventListener("omkar:layout", schedule);
  new MutationObserver(schedule).observe(root, {
    attributes: true,
    attributeFilter: ["class"],
  });
  if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(chapter);
  if (document.fonts) document.fonts.ready.then(schedule);
  schedule();

  const metrics = [...document.querySelectorAll("[data-count]")];
  const active = new Map();
  let countFrame = 0;
  function paint(element, value, progress) {
    const text = String(value).padStart(element.dataset.count.length, "0");
    element.querySelectorAll(".digit-reel").forEach((reel, index) => {
      reel.style.transform = "translateY(-" + Number(text[index]) * 10 + "%)";
    });
    element
      .closest(".impact-stat")
      .style.setProperty("--count-progress", progress.toFixed(4));
  }
  function finish() {
    if (countFrame) cancelAnimationFrame(countFrame);
    countFrame = 0;
    active.forEach((_, element) =>
      paint(element, Number(element.dataset.count), 1),
    );
    active.clear();
  }
  function count(now) {
    countFrame = 0;
    if (!root.classList.contains("js-motion") || document.hidden) {
      finish();
      return;
    }
    active.forEach((start, element) => {
      if (start === null) {
        start = now;
        active.set(element, start);
      }
      const progress = clamp((now - start) / 1700);
      const eased = 1 - Math.pow(1 - progress, 3);
      paint(element, Math.round(Number(element.dataset.count) * eased), eased);
      if (progress === 1) active.delete(element);
    });
    if (active.size) countFrame = requestAnimationFrame(count);
  }
  metrics.forEach((element) => {
    const value = element.querySelector(".metric-value");
    const digits = [...element.dataset.count].map((digit) => {
      const window = document.createElement("span");
      window.className = "digit-window";
      const reel = document.createElement("span");
      reel.className = "digit-reel";
      for (let i = 0; i < 10; i++) {
        const numeral = document.createElement("span");
        numeral.textContent = String(i);
        reel.append(numeral);
      }
      reel.style.transform = "translateY(-" + Number(digit) * 10 + "%)";
      window.append(reel);
      return window;
    });
    value.replaceChildren(...digits);
  });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target;
          observer.unobserve(element);
          element.closest(".impact-stat").classList.add("counted");
          if (!root.classList.contains("js-motion")) {
            paint(element, Number(element.dataset.count), 1);
            return;
          }
          paint(element, 0, 0);
          active.set(element, null);
          if (!countFrame) countFrame = requestAnimationFrame(count);
        }),
      { threshold: 0.35 },
    );
    metrics.forEach((element) => observer.observe(element));
  }
  new MutationObserver(() => {
    if (!root.classList.contains("js-motion")) finish();
  }).observe(root, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) finish();
  });
})();
