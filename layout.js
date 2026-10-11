/* Run before first paint: touch portrait devices need a reading layout even
   when the browser exposes a wide desktop-style layout viewport. */
(() => {
  "use strict";
  const root = document.documentElement;
  const touch = matchMedia("(hover: none) and (pointer: coarse)");
  const phoneShape = matchMedia("(max-aspect-ratio: 9/16)");
  function update() {
    const handheldWide =
      touch.matches && phoneShape.matches && innerWidth > 850;
    const compact = innerWidth <= 850 || handheldWide;
    root.classList.toggle("compact", compact);
    root.classList.toggle("handheld-wide", handheldWide);
    window.omkarLayout = { compact, handheldWide };
    window.dispatchEvent(new Event("omkar:layout"));
  }
  touch.addEventListener("change", update);
  phoneShape.addEventListener("change", update);
  window.addEventListener("resize", update, { passive: true });
  update();
})();
