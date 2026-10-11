const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../hero-film.js'), 'utf8');
function setup({ compact = false, reduced = false, saveData = false, deferred = false, fetchFails = false } = {}) {
 const classes = new Set(['js-motion', ...(compact ? ['compact'] : [])]);
 const heroClasses = new Set(), callbacks = {}, changes = {}, page = {}, frames = new Map(), timers = new Map();
 let key = 0, top = 0, now = 10000, fetches = 0, urls = 0, resolveFetch;
 const revoked = [], attrs = {};
 const actor = { src: 'still.webp', dataset: { idle: 'idle.webp', hello: 'hello.webp' }, events: {}, getAttribute() { return this.src; }, addEventListener(k,fn) { this.events[k] = fn; } };
 const action = { events: {}, disabled: false, setAttribute(k,v) { attrs[k]=v; }, addEventListener(k,fn) { this.events[k] = fn; } };
 const label = { textContent: '' };
 const body = { style: { setProperty(k,v) { this[k]=v; } } };
 const atmosphere = { paused: true, plays: 0, loads: 0, events: {}, dataset: { src: 'atmosphere.mp4' }, getAttribute() { return this.src || null; }, load() { this.loads++; }, play() { this.plays++; this.paused=false; return Promise.resolve(); }, pause() { this.paused=true; }, addEventListener(k,fn) { this.events[k]=fn; } };
 const hero = { events: {}, classList: { add: k=>heroClasses.add(k), remove: (...ks)=>ks.forEach(k=>heroClasses.delete(k)), toggle: (k,v)=>v?heroClasses.add(k):heroClasses.delete(k) }, getBoundingClientRect: ()=>({top,bottom:top+800,left:0,width:1200,height:800}), addEventListener(k,fn) { this.events[k]=fn; } };
 const preference = { matches: reduced, addEventListener: (_,fn)=>changes.motion=fn };
 const fine = { matches: true };
 const connection = { saveData, addEventListener: (_,fn)=>changes.connection=fn };
 const document = { hidden: false, documentElement: { classList: { contains:k=>classes.has(k) } }, querySelector:s=>({'.hero':hero,'#hero-mascot':actor,'#mascot-action':action,'#mascot-label':label,'.mascot-body':body,'#hero-atmosphere-video':atmosphere})[s], addEventListener:(k,fn)=>callbacks[k]=fn };
 const response = { ok:true, blob:()=>Promise.resolve({type:'image/webp'}) };
 const context = { document, navigator:{connection}, Promise, Date: { now:()=>now },
  URL:{createObjectURL:()=>`blob:gesture-${++urls}`,revokeObjectURL:v=>revoked.push(v)},
  fetch() { fetches++; if(fetchFails)return Promise.reject(new Error('Network failed'));return deferred?new Promise(resolve=>resolveFetch=resolve):Promise.resolve(response); },
  matchMedia:q=>q.includes('hover')?fine:preference,
  setTimeout(fn,ms) { timers.set(++key,{fn,ms}); return key; }, clearTimeout:k=>timers.delete(k),
  requestAnimationFrame(fn) { frames.set(++key,fn); return key; }, cancelAnimationFrame:k=>frames.delete(k),
  window:{IntersectionObserver:true,addEventListener:(k,fn)=>page[k]=fn},
  IntersectionObserver:class{constructor(fn){callbacks.visible=fn;}observe(){}},
  MutationObserver:class{constructor(fn){callbacks.mutation=fn;}observe(){}},
 };
 vm.runInNewContext(source,context);
 const tick=time=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));};
 const expire=ms=>{const entry=[...timers].find(([,t])=>t.ms===ms);assert.ok(entry,`Expected ${ms}ms timer`);timers.delete(entry[0]);now+=ms;entry[1].fn();};
 return {classes,heroClasses,actor,action,label,attrs,body,atmosphere,hero,callbacks,changes,page,document,preference,connection,frames,timers,tick,expire,setTop:v=>top=v,advance:ms=>now+=ms,revoked,fetches:()=>fetches,resolve:()=>resolveFetch(response)};
}
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
async function arrival(d) { d.callbacks.visible([{isIntersecting:true}]); await settle(); }
function finish(d) { d.actor.events.load(); d.expire(4536); }
(async()=>{
 const d=setup();
 assert.equal(d.actor.src,'still.webp');assert.equal(d.fetches(),0,'No gesture download before intersection');
 await arrival(d);
 assert.equal(d.actor.src,'blob:gesture-1','Arrival automatically plays the actual hand gesture');
 assert.equal(d.label.textContent,'Hello there');assert.equal(d.attrs['aria-busy'],'true');
 assert.equal(d.atmosphere.plays,1);assert.equal(d.fetches(),1);
 d.tick(16); assert.equal(d.frames.size,0,'No idle JavaScript rendering loop');
 d.action.events.click();await settle();assert.equal(d.actor.src,'blob:gesture-1','Inputs during a gesture do not interrupt it');
 finish(d);assert.equal(d.actor.src,'idle.webp');assert.equal(d.label.textContent,'Say hello');
 d.expire(9000);await settle();assert.equal(d.actor.src,'blob:gesture-2','Periodic idle gesture repeats visibly');
 assert.equal(d.fetches(),1,'Replay reuses bytes without redownloading');assert.deepEqual(d.revoked,['blob:gesture-1']);
 finish(d);
 d.action.events.click();await settle();assert.equal(d.actor.src,'blob:gesture-3','Tap restarts animation using a fresh decoder URL');finish(d);
 d.action.events.pointerenter({pointerType:'mouse'});await settle();assert.equal(d.actor.src,'idle.webp','Hover has a cooldown');
 d.advance(2200);d.action.events.pointerenter({pointerType:'mouse'});await settle();assert.equal(d.actor.src,'blob:gesture-4','Hover after cooldown produces the hand wave');finish(d);
 d.advance(2200);d.action.events.focus();await settle();assert.equal(d.actor.src,'blob:gesture-5','Keyboard focus has the same visible response');finish(d);
 d.advance(2200);d.setTop(-80);d.page.scroll();await settle();assert.equal(d.actor.src,'blob:gesture-6','First scroll triggers a gesture while portrait is visible');finish(d);
 d.advance(2200);d.page.scroll();await settle();assert.equal(d.actor.src,'idle.webp','Scroll is one-shot, not continuous gesture restarts');
 d.setTop(-400);d.page.scroll();d.tick(32);
 assert.ok(parseFloat(d.body.style['--mascot-y'])<0,'Scroll changes character position');
 for(let i=1;i<100&&d.frames.size;i++)d.tick(32+i*16);
 assert.equal(d.frames.size,0,'Scroll springs settle without permanent RAF');
 d.hero.events.pointermove({clientX:1200,clientY:100,pointerType:'mouse'});d.tick(2000);
 assert.ok(parseFloat(d.body.style['--mascot-x'])>0,'Fine pointer affects portrait');
 d.document.hidden=true;d.callbacks.visibilitychange();
 assert.equal(d.actor.src,'still.webp');assert.ok(d.atmosphere.paused);assert.equal(d.frames.size,0);assert.equal(d.timers.size,0);
 assert.equal(d.label.textContent,'Motion paused');
 d.document.hidden=false;d.callbacks.visibilitychange();await settle();assert.equal(d.actor.src,'idle.webp','Arrival is not repeated after every tab switch');
 d.action.events.click();await settle();d.actor.events.load();
 d.callbacks.visible([{isIntersecting:false}]);assert.equal(d.timers.size,0);assert.equal(d.actor.src,'still.webp');
 d.callbacks.visible([{isIntersecting:true}]);await settle();assert.equal(d.actor.src,'idle.webp');
 d.page['omkar:hero-sequence']({detail:{active:true}});assert.equal(d.actor.src,'still.webp','Sequence owns pose and stops background idle/gesture');assert.equal(d.timers.size,0);d.action.events.click();await settle();assert.equal(d.actor.src,'still.webp','No overlapping greeting while frames own the portrait');assert.equal(d.label.textContent,'Replay gesture');d.page['omkar:hero-sequence']({detail:{active:false}});await settle();assert.equal(d.actor.src,'idle.webp','Scroll return hands back to idle');
 d.classes.delete('js-motion');d.callbacks.mutation();assert.equal(d.actor.src,'still.webp');assert.ok(d.action.disabled);
 const m=setup({compact:true});await arrival(m);assert.equal(m.actor.src,'blob:gesture-1');assert.equal(m.atmosphere.src,undefined,'No atmospheric video on compact layouts');finish(m);
 m.page.pagehide();assert.equal(m.actor.src,'still.webp');m.page.pageshow();await settle();assert.equal(m.actor.src,'idle.webp');
 for(const opts of [{reduced:true},{saveData:true}]){const q=setup(opts);await arrival(q);assert.equal(q.actor.src,'still.webp');assert.equal(q.fetches(),0);assert.equal(q.atmosphere.src,undefined);assert.ok(q.action.disabled);}
 const partial=setup();partial.callbacks.visible([{isIntersecting:true,intersectionRatio:.1}]);await settle();assert.equal(partial.fetches(),0,'Greeting waits for a visible portrait, not a sliver or the hero heading');
 const late=setup({deferred:true});late.callbacks.visible([{isIntersecting:true}]);late.callbacks.visible([{isIntersecting:false}]);late.resolve();await settle();assert.equal(late.actor.src,'still.webp','Late download does not reactivate offscreen actor');assert.equal(late.timers.size,0);
 const failed=setup({fetchFails:true});await arrival(failed);assert.equal(failed.actor.src,'hello.webp','Fetch failure uses native image loading');failed.expire(15000);assert.equal(failed.actor.src,'idle.webp','Load watchdog returns safely to idle');
 const bad=setup();await arrival(bad);bad.actor.events.error();assert.equal(bad.actor.src,'idle.webp','Gesture failure preserves healthy idle');assert.ok(bad.action.disabled);assert.equal(bad.timers.size,0);
 bad.actor.events.error();assert.equal(bad.actor.src,'still.webp');bad.callbacks.mutation();assert.equal(bad.actor.src,'still.webp');
 console.log('PASS: automatic/periodic hand waves, fresh cached-byte replay, hover/focus/tap/one-shot scroll, cooldowns, visible cue state, springs, compact/reduced/data-saver policies, offscreen cancellation, watchdog and errors');
})().catch(error=>{console.error(error);process.exitCode=1;});
