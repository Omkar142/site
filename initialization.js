/* Paint → existing name splash → curtain reveal, once per browser session. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let finished = false, closing = false, guard = 0, paint = 0, hold = 0, exit = 0;
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(guard); clearTimeout(paint); clearTimeout(hold); clearTimeout(exit);
    root.classList.remove('is-initializing', 'is-painting', 'splash-exiting');
    try { sessionStorage.setItem('omkar-splash-20261011-v17', 'yes'); } catch {}
    window.removeEventListener('pointerdown', finish);
    window.removeEventListener('keydown', finish);
  }
  function reveal() {
    if (finished || closing) return;
    closing = true;
    root.classList.add('splash-exiting');
    exit = setTimeout(finish, 550);
  }
  try {
    if (location.hash || reduced.matches || navigator.connection?.saveData ||
        localStorage.getItem('omkar-motion') === 'off' || sessionStorage.getItem('omkar-splash-20261011-v17')) return;
  } catch { return; }
  root.classList.add('is-initializing', 'is-painting');
  guard = setTimeout(finish, 2900);
  document.addEventListener('DOMContentLoaded', () => {
    if (finished) return;
    paint = setTimeout(() => {
      root.classList.remove('is-painting');
      hold = setTimeout(reveal, 900);
    }, 1100);
  }, {once: true});
  window.addEventListener('pointerdown', finish, {once: true});
  window.addEventListener('keydown', finish, {once: true});
  reduced.addEventListener('change', finish, {once: true});
  window.addEventListener('pagehide', finish, {once: true});
})();
