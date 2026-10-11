(() => {
  "use strict";
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const actor = document.querySelector('#hero-mascot');
  const action = document.querySelector('#mascot-action');
  const label = document.querySelector('#mascot-label');
  const body = document.querySelector('.mascot-body');
  const atmosphere = document.querySelector('#hero-atmosphere-video');
  if (!hero || !actor || !action || !body || !atmosphere) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const connection = navigator.connection;
  const still = actor.getAttribute('src');
  const portrait = actor.closest?.('.hero-figure') || hero;
  const gestureDuration = 4536;
  let sequenceActive = false;
  let visible = false, active = true, broken = false, helloFailed = false;
  let mode = 'still', greetingTimer = 0, idleTimer = 0, frame = 0, previous = 0;
  let greeted = false, scrollGreeted = false, pending = false, generation = 0;
  let helloBlobPromise = null, helloURL = '', lastGesture = -Infinity;
  let pointerX = 0, pointerY = 0, x = 0, y = 0, turn = 0, scale = 1;
  let targetX = 0, targetY = 0, targetTurn = 0, targetScale = 1;
  let atmosphereFailed = false, atmospherePending = false;
  const enabled = () => active && visible && !document.hidden && !root.classList.contains('is-initializing') &&
    root.classList.contains('js-motion') && !reduced.matches && !connection?.saveData;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function stopTimers() {
    clearTimeout(greetingTimer); clearTimeout(idleTimer);
    greetingTimer = idleTimer = 0;
  }
  function updateCue() {
    const busy = !sequenceActive && (mode === 'hello' || pending);
    action.setAttribute('aria-label', sequenceActive ? 'Replay the mascot presenting gesture' : 'Say hello to the mascot');
    action.setAttribute('aria-busy', String(busy));
    if (label) label.textContent = !enabled() ? 'Motion paused' : helloFailed || broken ? 'Motion unavailable' : sequenceActive ? 'Replay gesture' : busy ? 'Hello there' : 'Say hello';
  }
  function releaseGesture() {
    if (helloURL) URL.revokeObjectURL(helloURL);
    helloURL = '';
  }
  function scheduleGesture() {
    clearTimeout(idleTimer); idleTimer = 0;
    if (enabled() && mode === 'idle' && !sequenceActive && !broken && !helloFailed && !pending)
      idleTimer = setTimeout(() => { idleTimer = 0; greet('idle'); }, 9000);
  }
  function setMode(next, src) {
    if (mode === next) return;
    stopTimers();
    mode = next;
    hero.classList.toggle('mascot-greeting', next === 'hello');
    actor.src = src || (next === 'still' ? still : actor.dataset[next]);
    if (next !== 'hello') releaseGesture();
    updateCue();
    if (next === 'idle') scheduleGesture();
  }
  function finishGesture() {
    setMode(enabled() && !broken ? 'idle' : 'still');
  }
  function prepareGesture() {
    // Fetch once, then create a fresh decoder URL for each replay. Reusing the
    // same one-shot WebP URL can leave its animation parked at the final frame.
    if (!helloBlobPromise) {
      helloBlobPromise = typeof fetch === 'function' && typeof URL?.createObjectURL === 'function'
        ? fetch(actor.dataset.hello).then(response => {
            if (!response.ok) throw new Error('Gesture unavailable');
            return response.blob();
          }).catch(() => null)
        : Promise.resolve(null);
    }
    return helloBlobPromise;
  }
  async function greet(reason) {
    if (!enabled() || sequenceActive || broken || helloFailed || pending || mode === 'hello') return;
    if (reason !== 'tap' && Date.now() - lastGesture < 6500) return;
    clearTimeout(idleTimer); idleTimer = 0;
    pending = true; updateCue();
    const request = ++generation;
    const blob = await prepareGesture();
    if (request !== generation || !enabled() || broken) return;
    pending = false;
    releaseGesture();
    helloURL = blob ? URL.createObjectURL(blob) : '';
    greeted = true; lastGesture = Date.now();
    setMode('hello', helloURL || actor.dataset.hello);
    // A delayed or failed load must never leave the character stuck in a gesture.
    greetingTimer = setTimeout(finishGesture, 15000);
  }
  function resetPose() {
    cancelAnimationFrame(frame);
    frame = previous = pointerX = pointerY = x = y = turn = 0;
    scale = 1;
    body.style.setProperty('--mascot-x', '0px');
    body.style.setProperty('--mascot-y', '0px');
    body.style.setProperty('--mascot-turn', '0deg');
    body.style.setProperty('--mascot-scale', '1');
  }
  function draw(now) {
    frame = 0;
    if (!enabled()) { resetPose(); return; }
    const dt = previous ? Math.min((now - previous) / 1000, .05) : 1 / 60;
    previous = now;
    const blend = 1 - Math.exp(-10 * dt);
    x += (targetX - x) * blend;
    y += (targetY - y) * blend;
    turn += (targetTurn - turn) * blend;
    scale += (targetScale - scale) * blend;
    body.style.setProperty('--mascot-x', `${x.toFixed(2)}px`);
    body.style.setProperty('--mascot-y', `${y.toFixed(2)}px`);
    body.style.setProperty('--mascot-turn', `${turn.toFixed(3)}deg`);
    body.style.setProperty('--mascot-scale', scale.toFixed(4));
    if (Math.abs(targetX-x) + Math.abs(targetY-y) + Math.abs(targetTurn-turn) + Math.abs(targetScale-scale)*100 > .04)
      frame = requestAnimationFrame(draw);
    else previous = 0;
  }
  function aim() {
    if (!enabled()) return;
    const bounds = hero.getBoundingClientRect();
    const progress = clamp(-bounds.top / Math.max(1, bounds.height), 0, 1);
    targetX = pointerX;
    targetY = pointerY - progress * (root.classList.contains('compact') ? 28 : 56);
    targetTurn = pointerX * .1 - progress * .6;
    targetScale = 1 - progress * .065;
    if (!frame) frame = requestAnimationFrame(draw);
  }
  function onScroll() {
    if (sequenceActive) return;
    aim();
    if (!enabled() || scrollGreeted) return;
    const bounds = hero.getBoundingClientRect();
    const progress = clamp(-bounds.top / Math.max(1, bounds.height), 0, 1);
    // React while the portrait is still mostly visible; do not replay throughout scrolling.
    if (progress > .035 && progress < .24 && mode === 'idle' && !pending && Date.now() - lastGesture >= 6500) {
      scrollGreeted = true; greet('scroll');
    }
  }
  function playAtmosphere() {
    if (atmosphereFailed || atmospherePending || !atmosphere.paused) return;
    if (!atmosphere.getAttribute('src')) { atmosphere.src = atmosphere.dataset.src; atmosphere.muted = true; atmosphere.load(); }
    atmospherePending = true;
    try {
      Promise.resolve(atmosphere.play()).catch(() => hero.classList.remove('atmosphere-playing')).finally(() => {
        atmospherePending = false;
        if (!enabled() || root.classList.contains('compact')) atmosphere.pause();
      });
    } catch { atmospherePending = false; }
  }
  function sync() {
    const on = enabled();
    action.disabled = !on || broken || helloFailed;
    if (on && !broken) {
      if (sequenceActive) setMode('still');
      else if (mode === 'still') { setMode('idle'); if (!greeted) greet('arrival'); }
      aim();
    } else {
      ++generation; pending = false; stopTimers(); setMode('still'); resetPose();
    }
    updateCue();
    if (on && !root.classList.contains('compact')) playAtmosphere();
    else { atmosphere.pause(); hero.classList.remove('atmosphere-playing'); }
  }
  actor.addEventListener('load', () => {
    if (mode === 'hello' && enabled()) {
      clearTimeout(greetingTimer);
      greetingTimer = setTimeout(finishGesture, gestureDuration);
    }
  });
  actor.addEventListener('error', () => {
    if (mode === 'hello') { helloFailed = true; finishGesture(); }
    else { broken = true; setMode('still'); }
    action.disabled = true; updateCue();
  });
  action.addEventListener('click', () => greet('tap'));
  action.addEventListener('pointerenter', event => {
    if (fine.matches && event.pointerType !== 'touch') greet('hover');
  });
  action.addEventListener('focus', () => greet('focus'));
  hero.addEventListener('pointermove', event => {
    if (!enabled() || !fine.matches || event.pointerType === 'touch') return;
    const bounds = hero.getBoundingClientRect();
    pointerX = clamp((event.clientX - bounds.left) / bounds.width - .5, -.5, .5) * 14;
    pointerY = clamp((event.clientY - bounds.top) / bounds.height - .5, -.5, .5) * 8;
    aim();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pointerX = pointerY = 0; aim(); });
  atmosphere.addEventListener('playing', () => {
    if (enabled() && !root.classList.contains('compact')) hero.classList.add('atmosphere-playing');
    else atmosphere.pause();
  });
  atmosphere.addEventListener('error', () => { atmosphereFailed = true; atmosphere.pause(); hero.classList.remove('atmosphere-playing'); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && (entry.intersectionRatio ?? 1) >= .2;
      sync();
    }, { threshold: [0, .2] }).observe(portrait);
  } else {
    const check = () => { const bounds = portrait.getBoundingClientRect(); visible = bounds.bottom > 0 && bounds.top < innerHeight; sync(); };
    window.addEventListener('scroll', check, { passive: true }); check();
  }
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class'] });
  reduced.addEventListener('change', sync);
  connection?.addEventListener?.('change', sync);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', aim, { passive: true });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('omkar:hero-sequence', event => {
    sequenceActive = Boolean(event.detail?.active);
    if (sequenceActive) { ++generation; pending = false; stopTimers(); setMode('still'); }
    sync();
  });
  window.addEventListener('pagehide', () => { active = false; sync(); });
  window.addEventListener('pageshow', () => { active = true; sync(); });
  sync();
})();
