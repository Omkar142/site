/* Offline-rendered transparent frames; native scrolling owns the timeline. */
(() => {
  'use strict';
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const portrait = document.querySelector('[data-hero-film]');
  const canvas = document.querySelector('#hero-sequence');
  const action = document.querySelector('#mascot-action');
  const stage = document.querySelector('.hero-scroll-stage');
  const chapter = document.querySelector('.hero-mascot-chapter');
  const proofIndex = document.querySelector('#mascot-proof-index');
  const proofLink = document.querySelector('#mascot-proof-link');
  const proofCards = [...document.querySelectorAll('[data-experience-card]')];
  const proofButtons = [...document.querySelectorAll('[data-experience-step]')];
  const proofControls = document.querySelector('.experience-controls');
  const stick = document.querySelector('.hero-mascot-stick');
  const proofs = [
    ['01 / 04 · GOOGLE PLAY', 'Google Play', '#case-google'],
    ['02 / 04 · TRACXN', 'Tracxn', '#case-tracxn'],
    ['03 / 04 · CISCO', 'Cisco', '#case-cisco'],
    ['04 / 04 · INDEPENDENT AI', 'ScreenGod', '#case-screengod']
  ];
  let proofPhase = -1;
  if (!hero || !portrait || !canvas || !action) return;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const context = canvas.getContext('2d');
  if (!context) {
    proofButtons.forEach((button, index) => button.addEventListener('click', () => updateProof((index + .5) / 4)));
    if (proofControls) proofControls.hidden = false;
    updateProof(0); return;
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const cache = new Map(), loading = new Map(), failed = new Set();
  const capacity = 3, concurrency = 2;
  let visible = false, active = true, shown = false, fatal = false;
  let manifest = null, manifestPromise = null, tier = null, tierName = '', epoch = 0;
  let queue = [], primed = false, frame = 0, previous = 0;
  let target = 0, position = 0, start = 0, range = 240, drawn = -1;
  let replay = false, replayStart = null, held = false, manualProgress = null;
  const enabled = () => active && visible && !document.hidden && !fatal && !root.classList.contains('is-initializing') &&
    root.classList.contains('js-motion') && !reduced.matches && !connection?.saveData;
  function setShown(value) {
    if (shown === value) return;
    shown = value;
    hero.classList.toggle('sequence-active', value);
    window.dispatchEvent(new CustomEvent('omkar:hero-sequence', {detail: {active: value}}));
  }
  function cancelWork(clearCache = false) {
    ++epoch;
    cancelAnimationFrame(frame); frame = previous = 0;
    queue = []; replay = held = false; replayStart = null;
    for (const image of loading.values()) { image.onload = image.onerror = null; image.src = ''; }
    loading.clear();
    if (clearCache) { cache.clear(); failed.clear(); primed = false; drawn = -1; }
    setShown(false);
  }
  function updateProof(progress) {
    hero.style?.setProperty('--hero-progress', String(progress));
    const phase = Math.min(3, Math.floor(progress * 4));
    // Blend in scroll distance, not elapsed time. Even a cold image cache cannot delay the evidence.
    const cursor = progress * 4;
    proofCards.forEach((card, index) => {
      const enter = index === 0 ? 1 : clamp((cursor - index + .08) / .16, 0, 1);
      const leave = index === 3 ? 1 : clamp((index + 1 + .08 - cursor) / .16, 0, 1);
      const opacity = Math.min(enter, leave);
      card.classList.toggle('is-active', index === phase);
      card.classList.toggle('is-visible', opacity > 0);
      card.setAttribute('aria-hidden', String(index !== phase));
      card.style.setProperty('--experience-opacity', String(opacity));
      card.style.setProperty('--experience-offset', `${((1 - enter) - (1 - leave)) * 18}px`);
    });
    if (phase === proofPhase || !proofIndex || !proofLink) return;
    proofPhase = phase;
    proofIndex.textContent = proofs[phase][0];
    proofLink.textContent = 'Read the case ↗';
    proofLink.setAttribute('href', proofs[phase][2]);
    proofLink.setAttribute('aria-label', `Read the ${proofs[phase][1]} case study`);
    proofButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === phase)));
  }
  function measure() {
    const header = document.querySelector('.site-header')?.getBoundingClientRect().height || 88;
    hero.style?.setProperty('--hero-header', `${header}px`);
    const compact = root.classList.contains('compact');
    const owner = compact ? chapter : stage;
    if (owner && hero.classList.contains('hero-scroll-enabled')) {
      const box = owner.getBoundingClientRect();
      start = Math.max(0, scrollY + box.top - header - (compact ? 16 : 0));
      range = compact ? Math.max(1, box.height - (stick?.getBoundingClientRect().height || portrait.getBoundingClientRect().height + 112)) : Math.max(1, box.height - document.querySelector('.hero-grid').getBoundingClientRect().height);
    } else {
      const top = scrollY + portrait.getBoundingClientRect().top;
      start = Math.max(0, top - innerHeight * .55);
      range = clamp(top - start - header - 20, 180, 480);
    }
  }
  function readProgress() { return clamp((scrollY - start) / range, 0, 1); }
  function requestDraw() {
    if (enabled() && tier && !frame) frame = requestAnimationFrame(draw);
  }
  function nearest(index) {
    let result = null, distance = Infinity;
    for (const [key, image] of cache) {
      const atlas = tier.atlases[key];
      const pose = clamp(index, atlas.first, atlas.first + atlas.count - 1);
      const gap = Math.abs(pose - index);
      if (gap < distance) { distance = gap; result = {key, image, atlas, pose}; }
    }
    return result;
  }
  function paint(index) {
    const entry = nearest(index);
    if (!entry) return;
    if (drawn !== entry.pose) {
      const slot = entry.pose - entry.atlas.first;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(entry.image, (slot % entry.atlas.columns) * tier.width,
        Math.floor(slot / entry.atlas.columns) * tier.height, tier.width, tier.height,
        0, 0, canvas.width, canvas.height);
      drawn = entry.pose;
    }
    setShown(position > .002 || replay || held);
  }
  function trimCache() {
    const index = Math.round(target * (tier.count - 1));
    while (cache.size > capacity) {
      let farthest = -1, distance = -1;
      for (const key of cache.keys()) {
        const atlas = tier.atlases[key];
        const gap = Math.abs(atlas.first + atlas.count / 2 - index);
        if (gap > distance) { distance = gap; farthest = key; }
      }
      cache.delete(farthest);
    }
  }
  function pump() {
    if (!enabled() || !tier) return;
    while (loading.size < concurrency && queue.length) {
      const index = queue.shift();
      if (cache.has(index) || loading.has(index) || failed.has(index)) continue;
      const image = new Image();
      const requestEpoch = epoch;
      loading.set(index, image);
      image.onload = () => {
        if (requestEpoch !== epoch) return;
        image.onload = image.onerror = null;
        loading.delete(index); cache.set(index, image); trimCache();
        requestDraw(); pump();
      };
      image.onerror = () => {
        if (requestEpoch !== epoch) return;
        image.onload = image.onerror = null;
        loading.delete(index); failed.add(index); pump();
      };
      image.decoding = 'async';
      image.src = tier.atlases[index].file;
    }
  }
  function plan(progress) {
    if (!tier || !enabled()) return;
    const pose = Math.round(progress * (tier.count - 1));
    const index = tier.atlases.findIndex(a => pose >= a.first && pose < a.first + a.count);
    const wanted = [index, index + 1, index - 1];
    if (!primed) { primed = true; wanted.push(tier.atlases.length - 1); }
    queue = [...new Set(wanted)].filter(i => i >= 0 && i < tier.atlases.length && !cache.has(i) && !loading.has(i) && !failed.has(i));
    pump();
  }
  function draw(now) {
    frame = 0;
    if (!enabled() || !tier) return;
    const dt = previous ? Math.min((now - previous) / 1000, .05) : 1 / 60;
    previous = now;
    if (replay) {
      if (replayStart === null) replayStart = now;
      position = clamp((now - replayStart) / 6000, 0, 1);
      target = position;
      if (position === 1) { replay = false; held = true; }
      plan(position);
    } else if (manualProgress === null) {
      // Native scroll owns the pose immediately: no trailing spring.
      position = target;
    } else {
      position += (target - position) * (1 - Math.exp(-14 * dt));
      if (Math.abs(target - position) < .0005) position = target;
    }
    plan(position);
    updateProof(manualProgress ?? position);
    paint(Math.round(position * (tier.count - 1)));
    if (replay || Math.abs(target - position) > .0005) frame = requestAnimationFrame(draw);
    else { previous = 0; if (position === 0) setShown(false); }
  }
  function chooseTier() {
    if (!manifest) return;
    const name = root.classList.contains('compact') ? 'mobile' : 'desktop';
    if (name === tierName) return;
    cancelWork(true);
    tierName = name; tier = manifest.tiers[name];
    if (!tier || !Number.isInteger(tier.count) || tier.count < 2 || tier.count > 200 || tier.width > 600 || tier.height > 700 || !Array.isArray(tier.atlases) || tier.atlases.length < 1 || tier.atlases.some(a => !a.file.startsWith('assets/mascot-scroll/') || a.width > 2000 || a.height > 2000)) {
      fatal = true; return;
    }
    canvas.width = tier.width; canvas.height = tier.height;
    position = target = manualProgress ?? readProgress();
  }
  async function prepare() {
    if (!enabled()) return;
    if (!manifestPromise) {
      manifestPromise = fetch(canvas.dataset.manifest).then(response => {
        if (!response.ok) throw new Error('Sequence manifest unavailable');
        return response.json();
      }).then(value => { manifest = value; }).catch(() => { fatal = true; hero.classList.toggle('hero-scroll-enabled', false); setShown(false); });
    }
    await manifestPromise;
    if (!enabled() || !manifest) return;
    chooseTier();
    if (fatal) return;
    target = manualProgress ?? readProgress(); plan(target); requestDraw();
  }
  function sync() {
    hero.classList.toggle('hero-scroll-enabled', root.classList.contains('js-motion') && !reduced.matches && !connection?.saveData && !fatal && innerHeight >= (root.classList.contains('compact') ? 540 : 680));
    if (!enabled()) { cancelWork(); return; }
    measure();
    prepare();
  }
  function onScroll() {
    if (!enabled()) return;
    replay = held = false; replayStart = null; manualProgress = null;
    target = readProgress();
    updateProof(target);
    if (!tier) { prepare(); return; }
    requestDraw();
  }
  if (proofControls) proofControls.hidden = false;
  proofButtons.forEach((button, index) => button.addEventListener('click', () => {
    const progress = (index + .5) / 4;
    manualProgress = progress;
    updateProof(progress);
    replay = false; replayStart = null; held = true;
    if (!enabled() || !tier) { updateProof(progress); if (enabled()) prepare(); return; }
    target = progress; plan(target); requestDraw();
  }));
  action.addEventListener('click', () => {
    if (!enabled() || !tier || !shown) return;
    replay = true; held = false; replayStart = null;
    position = target = 0; plan(0); requestDraw();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && (entry.intersectionRatio ?? 1) >= .2; sync();
    }, {threshold: [0, .2]}).observe(portrait);
  } else {
    const check = () => { const box = portrait.getBoundingClientRect(); visible = box.bottom > 0 && box.top < innerHeight; sync(); };
    window.addEventListener('scroll', check, {passive: true}); check();
  }
  new MutationObserver(sync).observe(root, {attributes: true, attributeFilter: ['class']});
  reduced.addEventListener('change', sync);
  connection?.addEventListener?.('change', sync);
  window.addEventListener('scroll', onScroll, {passive: true});
  window.addEventListener('resize', sync, {passive: true});
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => {active = false; cancelWork(true);});
  window.addEventListener('pageshow', () => {active = true; sync();});
  measure(); updateProof(0);
})();
