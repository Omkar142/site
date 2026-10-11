(() => {
  "use strict";
  const root = document.documentElement;
  const sections = [
    ...document.querySelectorAll(
      ".profile-lab, #work, #approach, #about, #contact",
    ),
  ];
  const cards = [...document.querySelectorAll("[data-motion-card]")];
  const visible = new Set();
  const clamp = (value) => Math.max(0, Math.min(1, value));
  let frame = 0;
  function update() {
    frame = 0;
    const enabled = root.classList.contains("js-motion");
    for (const element of sections) {
      if (enabled && !visible.has(element)) continue;
      const bounds = element.getBoundingClientRect();
      const progress = enabled
        ? clamp((innerHeight - bounds.top) / (innerHeight + bounds.height))
        : 0.5;
      element.style.setProperty("--section-progress", progress.toFixed(4));
    }
    for (const card of cards) {
      if (enabled && !visible.has(card)) continue;
      const bounds = card.getBoundingClientRect();
      const progress = enabled
        ? clamp(
            (innerHeight * 0.94 - bounds.top) /
              Math.max(1, bounds.height * 0.85),
          )
        : 1;
      card.style.setProperty("--card-progress", progress.toFixed(4));
    }
    const timeline = document.querySelector(".timeline");
    if (
      timeline &&
      (!enabled || visible.has(document.querySelector("#about")))
    ) {
      const bounds = timeline.getBoundingClientRect();
      const progress = enabled
        ? clamp(
            (innerHeight * 0.72 - bounds.top) /
              Math.max(1, bounds.height - 100),
          )
        : 1;
      timeline.style.setProperty("--timeline-fill", progress.toFixed(4));
    }
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (isIntersecting) visible.add(target);
          else visible.delete(target);
          target.classList.toggle("motion-visible", isIntersecting);
        });
        schedule();
      },
      { rootMargin: "50px 0px", threshold: 0 },
    );
    [...sections, ...cards].forEach((element) => observer.observe(element));
  } else {
    [...sections, ...cards].forEach((element) => {
      visible.add(element);
      element.classList.add("motion-visible");
    });
  }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("load", schedule);
  new MutationObserver(schedule).observe(root, {
    attributes: true,
    attributeFilter: ["class"],
  });
  schedule();
})();
