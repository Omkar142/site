const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../section-mascots.js'),'utf8');
function setup({reduced=false,saveData=false}={}) {
 const classes=new Set(['js-motion']),callbacks={},observers=[],events={},timers=new Map(),revoked=[];let key=0,urls=0,fetches=0,now=0;
 const states=[0,1].map(()=>{const actor={src:'still.webp',dataset:{idle:'idle.webp',hello:'hello.webp'},events:{},getAttribute:()=> 'still.webp',addEventListener(k,f){this.events[k]=f;}};const link={events:{},addEventListener(k,f){this.events[k]=f;}};const stage={querySelector:()=>actor,closest:()=>({querySelectorAll:()=>[link]})};return{actor,link,stage};});
 const document={hidden:false,documentElement:{classList:{contains:k=>classes.has(k)}},querySelectorAll:()=>states.map(s=>s.stage),addEventListener:(k,f)=>events[k]=f};
 const context={document,Date:{now:()=>now},Promise,navigator:{connection:{saveData,addEventListener(){}}},matchMedia:()=>({matches:reduced,addEventListener(){}}),
 fetch(){fetches++;return Promise.resolve({ok:true,blob:()=>Promise.resolve({})});},URL:{createObjectURL:()=>`blob:${++urls}`,revokeObjectURL:v=>revoked.push(v)},
 setTimeout(f,ms){timers.set(++key,{f,ms});return key;},clearTimeout:k=>timers.delete(k),
 window:{IntersectionObserver:true,addEventListener:(k,f)=>events[k]=f},IntersectionObserver:class{constructor(fn){observers.push(fn);}observe(){}},MutationObserver:class{constructor(fn){callbacks.mutation=fn;}observe(){}}};
 vm.runInNewContext(source,context);return{states,document,classes,callbacks,events,observers,timers,revoked,fetches:()=>fetches,advance:n=>now+=n};
}
const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
(async()=>{
 const s=setup();assert.equal(s.fetches(),0);s.observers[0]([{isIntersecting:true,intersectionRatio:1}]);await settle();assert.equal(s.states[0].actor.src,'blob:1');s.states[0].actor.events.load();const [key,timer]=[...s.timers][0];assert.equal(timer.ms,4536);s.timers.delete(key);timer.f();assert.equal(s.states[0].actor.src,'idle.webp');assert.deepEqual(s.revoked,['blob:1']);
 s.observers[1]([{isIntersecting:true,intersectionRatio:1}]);await settle();assert.equal(s.states[1].actor.src,'blob:2');assert.equal(s.fetches(),1,'Lower sections share downloaded gesture bytes');
 s.document.hidden=true;s.events.visibilitychange();assert.ok(s.states.every(x=>x.actor.src==='still.webp'));assert.equal(s.timers.size,0,'Hidden page stops every section');
 s.document.hidden=false;s.events.visibilitychange();await settle();assert.ok(s.states.every(x=>x.actor.src==='idle.webp'),'Returning does not replay section arrival');s.advance(7000);s.states[1].link.events.focus();await settle();assert.equal(s.states[1].actor.src,'blob:3','Contact link focus acknowledges visitor action');
 s.observers[1]([{isIntersecting:false,intersectionRatio:0}]);assert.equal(s.states[1].actor.src,'still.webp');assert.equal(s.timers.size,0);
 s.classes.delete('js-motion');s.callbacks.mutation();assert.equal(s.states[0].actor.src,'still.webp');
 for(const options of [{reduced:true},{saveData:true}]){const q=setup(options);q.observers[0]([{isIntersecting:true,intersectionRatio:1}]);await settle();assert.equal(q.fetches(),0);assert.equal(q.states[0].actor.src,'still.webp');}
 console.log('PASS: consistent lower-section arrivals, shared gesture bytes, load-timed replay, contextual focus, hidden/offscreen pause and reduced/data-saver fallbacks');
})().catch(error=>{console.error(error);process.exitCode=1;});
