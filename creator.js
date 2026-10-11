(() => {
  "use strict";
  const root = document.documentElement;
  const clamp = (n) => Math.max(0, Math.min(1, n));
  const enabled = () => root.classList.contains("js-motion");
  const stage = document.querySelector(".project-stage");
  const cards = [...stage.querySelectorAll(".case-study")];
  const texts = [...document.querySelectorAll("[data-scroll-text]")];
  const marquee = document.querySelector(".work-marquee");
  const figure = document.querySelector(".hero-figure");
  const hero = document.querySelector(".hero");
  const visible = new Set();
  let frame = 0;
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  let targetX = 0,
    targetY = 0,
    x = 0,
    y = 0,
    magnetFrame = 0,
    previous = 0;

  texts.forEach((element) => {
    const text = element.textContent.trim().replace(/\s+/g, " ");
    element.textContent = "";
    const accessible = document.createElement("span");
    accessible.className = "sr-only";
    accessible.textContent = text;
    element.append(accessible);
    const visual = document.createElement("span");
    visual.setAttribute("aria-hidden", "true");
    text.split(" ").forEach((word, index, words) => {
      const group = document.createElement("span");
      group.className = "reveal-word";
      for (const char of word) {
        const letter = document.createElement("span");
        letter.className = "reveal-char";
        letter.textContent = char;
        group.append(letter);
      }
      visual.append(group);
      if (index < words.length - 1) visual.append(document.createTextNode(" "));
    });
    element.append(visual);
  });

  function update() {
    frame = 0;
    const on = enabled();
    const fits =
      !window.omkarLayout?.compact &&
      innerWidth >= 900 &&
      innerHeight >= 780 &&
      cards.every(
        (card, index) => card.scrollHeight + 170 + index * 24 < innerHeight,
      );
    stage.classList.toggle("stack-ready", on && fits);
    if (!on || visible.has(stage)) {
      cards.forEach((card, index) => {
        const next = cards[index + 1];
        const progress =
          on && fits && next
            ? clamp(
                (innerHeight - next.getBoundingClientRect().top) /
                  Math.max(1, innerHeight - 170),
              )
            : 0;
        card.style.setProperty("--stack-progress", progress.toFixed(4));
      });
    }
    texts.forEach((element) => {
      if (on && !visible.has(element)) return;
      const bounds = element.getBoundingClientRect();
      const progress = on
        ? clamp(
            (innerHeight * 0.8 - bounds.top) /
              Math.max(1, bounds.height + innerHeight * 0.4),
          )
        : 1;
      const letters = element.querySelectorAll(".reveal-char");
      letters.forEach((letter, index) => {
        const local = clamp(
          progress * 1.25 - index / Math.max(1, letters.length),
        );
        letter.style.opacity = String(on ? 0.36 + 0.64 * clamp(local * 4) : 1);
      });
    });
    if (!on || visible.has(marquee)) {
      const bounds = marquee.getBoundingClientRect();
      const travel = on ? (innerHeight - bounds.top) * 0.2 : 0;
      marquee.style.setProperty("--marquee-travel", `${travel.toFixed(1)}px`);
    }
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  function magnet(now) {
    magnetFrame = 0;
    const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 1 / 60;
    previous = now;
    const blend = 1 - Math.exp(-12 * dt);
    x += (targetX - x) * blend;
    y += (targetY - y) * blend;
    window.omkarHeroAim = { x: x / 7, y: y / 4 };
    figure.style.setProperty("--magnet-x", `${x.toFixed(2)}px`);
    figure.style.setProperty("--magnet-y", `${y.toFixed(2)}px`);
    if (
      enabled() &&
      !document.hidden &&
      Math.abs(targetX - x) + Math.abs(targetY - y) > 0.1
    )
      magnetFrame = requestAnimationFrame(magnet);
    else previous = 0;
  }
  function scheduleMagnet() {
    if (!magnetFrame) magnetFrame = requestAnimationFrame(magnet);
  }
  function resetMagnet() {
    targetX = targetY = 0;
    if (enabled() && !document.hidden) scheduleMagnet();
    else {
      cancelAnimationFrame(magnetFrame);
      magnetFrame = previous = x = y = 0;
      window.omkarHeroAim = { x: 0, y: 0 };
      figure.style.setProperty("--magnet-x", "0px");
      figure.style.setProperty("--magnet-y", "0px");
    }
  }
  hero.addEventListener(
    "pointermove",
    (event) => {
      if (!enabled() || !fine.matches || event.pointerType === "touch") return;
      const bounds = hero.getBoundingClientRect();
      targetX = Math.max(
        -7,
        Math.min(7, ((event.clientX - bounds.left) / bounds.width - 0.5) * 14),
      );
      targetY = Math.max(
        -4,
        Math.min(4, ((event.clientY - bounds.top) / bounds.height - 0.5) * 8),
      );
      scheduleMagnet();
    },
    { passive: true },
  );
  hero.addEventListener("pointerleave", resetMagnet);
  fine.addEventListener("change", resetMagnet);
  document.addEventListener("visibilitychange", resetMagnet);
  window.addEventListener("pagehide", resetMagnet);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (isIntersecting) visible.add(target);
          else visible.delete(target);
        });
        schedule();
      },
      { rootMargin: "100px 0px", threshold: 0 },
    );
    [stage, marquee, ...texts].forEach((element) => observer.observe(element));
  } else [stage, marquee, ...texts].forEach((element) => visible.add(element));
  if ("ResizeObserver" in window) {
    const resize = new ResizeObserver(schedule);
    cards.forEach((card) => resize.observe(card));
  }
  stage.addEventListener("toggle", schedule, true);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("load", schedule);
  new MutationObserver(() => {
    schedule();
    resetMagnet();
  }).observe(root, {
    attributes: true,
    attributeFilter: ["class"],
  });
  schedule();
})();
