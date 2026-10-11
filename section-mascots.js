/* One character across the portfolio: calm idle, contextual greeting, static fallback. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let alive = true, greetingPromise = null, greetingBlob = null;
  const stages = [...document.querySelectorAll('[data-mascot-media]')].map(stage => {
    const actor = stage.querySelector('.section-mascot');
    return {stage, actor, still: actor.getAttribute('src'), visible: false, greeted: false,
      timer: 0, url: null, token: 0, waving: false, last: -Infinity, failed: false};
  });
  const enabled = state => alive && state.visible && !document.hidden && !state.failed &&
    root.classList.contains('js-motion') && !root.classList.contains('is-initializing') && !reduced.matches && !connection?.saveData;
  function release(state) {
    clearTimeout(state.timer); state.timer = 0;
    if (state.url) { URL.revokeObjectURL(state.url); state.url = null; }
  }
  function idle(state) {
    state.waving = false; release(state);
    state.actor.src = enabled(state) ? state.actor.dataset.idle : state.still;
  }
  function stop(state) { ++state.token; state.waving = false; release(state); state.actor.src = state.still; }
  async function greet(state) {
    if (!enabled(state) || state.waving || Date.now() - state.last < 6000) return;
    state.waving = true; const token = ++state.token;
    if (!greetingPromise) greetingPromise = fetch(state.actor.dataset.hello).then(r => {
      if (!r.ok) throw new Error('Gesture unavailable'); return r.blob();
    }).then(blob => greetingBlob = blob).catch(() => null);
    await greetingPromise;
    if (token !== state.token || !enabled(state)) return;
    if (!greetingBlob) { state.failed = true; idle(state); return; }
    release(state); state.url = URL.createObjectURL(greetingBlob);
    state.actor.src = state.url; state.last = Date.now();
    // Start duration when the decoder is ready; also bound slow/failed loads.
    state.timer = setTimeout(() => idle(state), 12000);
  }
  function sync(state) {
    if (!enabled(state)) { stop(state); return; }
    if (state.waving) return;
    idle(state);
    if (!state.greeted) { state.greeted = true; greet(state); }
  }
  for (const state of stages) {
    state.actor.addEventListener('load', () => {
      if (!state.waving || !enabled(state)) return;
      clearTimeout(state.timer); state.timer = setTimeout(() => idle(state), 4536);
    });
    state.actor.addEventListener('error', () => { state.failed = true; stop(state); });
    const section = state.stage.closest('section');
    // The character acknowledges the action this section asks the visitor to take.
    for (const link of section?.querySelectorAll('.text-link, .contact-actions a') || []) {
      link.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') greet(state); });
      link.addEventListener('focus', () => greet(state));
    }
    if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting && entry.intersectionRatio >= .35; sync(state);
    }, {threshold: [0, .35]}).observe(state.stage);
  }
  const syncAll = () => stages.forEach(sync);
  new MutationObserver(syncAll).observe(root, {attributes: true, attributeFilter: ['class']});
  document.addEventListener('visibilitychange', syncAll);
  reduced.addEventListener('change', syncAll);
  connection?.addEventListener?.('change', syncAll);
  window.addEventListener('pagehide', () => {alive = false; stages.forEach(stop);});
  window.addEventListener('pageshow', () => {alive = true; syncAll();});
})();
