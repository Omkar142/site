const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../hero-sequence.js'),'utf8');
function setup({compact=false,reduced=false,saveData=false,fetchFail=false,noCanvas=false,deferred=false,pinned=false}={}) {
 const classes=new Set(['js-motion',...(compact?['compact']:[])]),heroClasses=new Set(),events={},docEvents={},callbacks={},frames=new Map(),images=[],draws=[],drawCalls=[],dispatches=[];
 let y=0,key=0,fetches=0,resolveFetch,maxConcurrent=0;
 const document={hidden:false,documentElement:{classList:{contains:k=>classes.has(k)}},addEventListener:(k,fn)=>docEvents[k]=fn};
 const hero={style:{setProperty(){}},classList:{contains:k=>heroClasses.has(k),toggle:(k,v)=>v?heroClasses.add(k):heroClasses.delete(k)}};
 const portrait={getBoundingClientRect:()=>({top:400-y,bottom:892-y,width:400,height:492})};
 const canvas={width:400,height:492,dataset:{manifest:'manifest.json'},getContext:()=>noCanvas?null:{clearRect(){},drawImage:(img,sx,sy,sw,sh)=>{drawCalls.push({src:img.src,sx,sy,sw,sh});const parts=img.src.match(/(desktop|mobile)-atlas-(\d+)/);draws.push(`assets/mascot-scroll/${parts[1]}/${Number(parts[2])*16+sy/sh*4+sx/sw}.webp`);}}};
 const action={events:{},addEventListener(k,fn){this.events[k]=fn;}};
 const proofCards=[0,1,2,3].map(()=>({attrs:{},style:{setProperty(k,v){this[k]=v;}},classes:new Set(),classList:{toggle(k,v){this.owner[k]=v;},owner:{}},setAttribute(k,v){this.attrs[k]=v;}}));
 const proofButtons=[0,1,2,3].map(()=>({attrs:{},events:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){this.events[k]=f;}}));
 document.querySelectorAll=s=>s==='[data-experience-card]'?proofCards:s==='[data-experience-step]'?proofButtons:[];
 const proofControls={hidden:true};
 const proofLink={textContent:'',setAttribute(k,v){this[k]=v;}},proofIndex={textContent:''};
 document.querySelector=s=>({'.experience-controls':proofControls,'.hero-scroll-stage':pinned?{getBoundingClientRect:()=>({top:88-y,height:1020})}:null,'.hero-mascot-chapter':pinned?{getBoundingClientRect:()=>({top:400-y,height:844})}:null,'.hero-grid':{getBoundingClientRect:()=>({height:700})},'#mascot-proof-link':proofLink,'#mascot-proof-index':proofIndex,'.hero':hero,'[data-hero-film]':portrait,'#hero-sequence':canvas,'#mascot-action':action,'.site-header':{getBoundingClientRect:()=>({height:88})}})[s];
 const preference={matches:reduced,addEventListener:(_,fn)=>callbacks.motion=fn};
 const connection={saveData,addEventListener:(_,fn)=>callbacks.connection=fn};
 const makeTier=(name,width,height,count)=>({width,height,count,atlases:Array.from({length:Math.ceil(count/16)},(_,i)=>({file:`assets/mascot-scroll/${name}-atlas-${String(i).padStart(2,'0')}.webp`,first:i*16,count:Math.min(16,count-i*16),columns:4,width:width*4,height:height*Math.ceil(Math.min(16,count-i*16)/4)}))});
 const manifest={tiers:{desktop:makeTier('desktop',400,492,120),mobile:makeTier('mobile',240,296,72)}};
 const response={ok:true,json:()=>Promise.resolve(manifest)};
 class TestImage {
  constructor(){this.onload=null;this.onerror=null;this.pending=false;images.push(this);}
  set src(value){this.value=value;this.pending=!!value&&!!this.onload;maxConcurrent=Math.max(maxConcurrent,images.filter(i=>i.pending).length);}
  get src(){return this.value;}
 }
 const context={document,navigator:{connection},Image:TestImage,Promise,innerHeight:900,
  get scrollY(){return y;},matchMedia:()=>preference,
  fetch(){fetches++;return fetchFail?Promise.reject(new Error('Missing')):deferred?new Promise(resolve=>resolveFetch=resolve):Promise.resolve(response);},
  requestAnimationFrame(fn){frames.set(++key,fn);return key;},cancelAnimationFrame:k=>frames.delete(k),
  CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail;}},
  window:{IntersectionObserver:true,addEventListener:(k,fn)=>events[k]=fn,dispatchEvent:event=>dispatches.push(event)},
  IntersectionObserver:class{constructor(fn){callbacks.visible=fn;}observe(){}},
  MutationObserver:class{constructor(fn){callbacks.mutation=fn;}observe(){}},
 };
 vm.runInNewContext(source,context);
 const load=()=>{for(let safety=0;safety<300;safety++){const img=images.find(i=>i.pending);if(!img)break;img.pending=false;img.onload();}};
 const tick=now=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));};
 const settleFrames=(base=0)=>{load();for(let i=0;i<150&&frames.size;i++){tick(base+i*16);load();}};
 return {proofCards,proofButtons,proofControls,proofLink,proofIndex,classes,heroClasses,events,docEvents,callbacks,frames,images,draws,dispatches,canvas,action,drawCalls,document,preference,connection,load,tick,settleFrames,scroll(value){y=value;events.scroll();},fetches:()=>fetches,maxConcurrent:()=>maxConcurrent,resolve:()=>resolveFetch(response)};
}
const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
async function show(s){s.callbacks.visible([{isIntersecting:true,intersectionRatio:1}]);await settle();s.settleFrames();}
const index=s=>Number(s.draws.at(-1).match(/(\d+)\.webp$/)[1]);
(async()=>{
 const pinned=setup({pinned:true});await show(pinned);pinned.scroll(160);pinned.settleFrames(1000);assert.ok(Math.abs(index(pinned)-60)<=1,'Pinned desktop uses the reserved 320px timeline');assert.equal(pinned.proofLink.href,'#case-cisco','Middle gesture presents engineering evidence');pinned.scroll(320);pinned.settleFrames(3000);assert.equal(pinned.proofLink.href,'#case-screengod');pinned.scroll(0);pinned.settleFrames(5000);assert.equal(pinned.proofLink.href,'#case-google');
 pinned.proofButtons[1].events.click();pinned.settleFrames(7000);assert.equal(pinned.proofLink.href,'#case-tracxn','Selecting experience drives the presenting pose');assert.equal(pinned.proofButtons[1].attrs['aria-pressed'],'true');assert.equal(pinned.proofCards[1].attrs['aria-hidden'],'false');assert.equal(pinned.proofCards[0].attrs['aria-hidden'],'true');assert.equal(pinned.proofCards[0].style['--experience-offset'],'-18px');assert.equal(pinned.proofCards[2].style['--experience-offset'],'18px');pinned.scroll(0);pinned.settleFrames(9000);assert.equal(pinned.proofLink.href,'#case-google','Scroll resumes native timeline after selection');
 const cold=setup({pinned:true});cold.callbacks.visible([{isIntersecting:true,intersectionRatio:1}]);await settle();cold.scroll(160);assert.equal(cold.proofLink.href,'#case-cisco','Evidence updates in the scroll callback before either RAF or image load');assert.equal(cold.draws.length,0);cold.scroll(80);assert.ok(Math.abs(Number(cold.proofCards[0].style['--experience-opacity'])-.5)<.001);assert.ok(Math.abs(Number(cold.proofCards[1].style['--experience-opacity'])-.5)<.001,'Company crossfade follows distance at the exact boundary');cold.scroll(72);assert.equal(cold.proofCards[0].style['--experience-opacity'],'1');assert.equal(cold.proofCards[1].style['--experience-opacity'],'0','Reverse scroll restores the previous company immediately');
 const waiting=setup({pinned:true,deferred:true});waiting.callbacks.visible([{isIntersecting:true,intersectionRatio:1}]);waiting.scroll(320);assert.equal(waiting.proofLink.href,'#case-screengod','Company timeline works while the manifest is still downloading');waiting.callbacks.visible([{isIntersecting:false}]);waiting.resolve();await settle();
 const mobilePinned=setup({pinned:true,compact:true});await show(mobilePinned);mobilePinned.scroll(416);mobilePinned.settleFrames(1000);assert.ok(Math.abs(index(mobilePinned)-36)<=1,'Mobile timeline uses chapter height minus character and caption');
 const d=setup();assert.equal(d.fetches(),0,'No sequence request before visible');await show(d);
 assert.equal(d.fetches(),1);assert.ok(!d.heroClasses.has('sequence-active'),'Idle remains at top');assert.equal(d.frames.size,0);
 assert.ok(d.maxConcurrent()<=2,'Atlas downloads are bounded');
 const initialRequests=d.images.length;d.scroll(5);d.scroll(15);d.scroll(20);assert.equal(d.frames.size,1,'Scroll events coalesce into one rendering callback');assert.equal(d.images.length,initialRequests,'Scroll callbacks do not start image decodes');d.tick(1000);assert.equal(index(d),8,'A warmed pose follows scroll in one frame without spring lag');assert.equal(d.frames.size,0,'Warm scroll settles in the same frame');
 d.scroll(100);d.settleFrames(2000);assert.ok(d.heroClasses.has('sequence-active'));assert.ok(Math.abs(index(d)-41)<=1,'Scroll reaches the matching pose');assert.equal(d.frames.size,0,'Stopped scroll has no permanent frame loop');
 d.scroll(292);d.settleFrames(5000);assert.equal(index(d),119,'Full timeline reaches the final source pose');
 d.scroll(146);d.settleFrames(8000);assert.ok(Math.abs(index(d)-60)<=1,'Reverse scrolling reverses the frame sequence');
 d.action.events.click();d.load();d.tick(11000);d.load();d.tick(14000);d.load();d.tick(14016);d.load();assert.ok(Math.abs(index(d)-60)<=1,'Replay advances through the actual sequence');d.tick(17000);d.load();d.settleFrames(17016);assert.equal(index(d),119);assert.equal(d.frames.size,0,'Replay settles into a held pose');
 d.scroll(0);d.settleFrames(20000);assert.ok(!d.heroClasses.has('sequence-active'),'Returning to top restores idle');
 d.scroll(100);d.settleFrames(23000);d.document.hidden=true;d.docEvents.visibilitychange();assert.equal(d.frames.size,0);assert.ok(!d.heroClasses.has('sequence-active'));assert.ok(d.images.every(i=>!i.pending),'Hidden page cancels image work');
 d.document.hidden=false;d.docEvents.visibilitychange();await settle();d.settleFrames(26000);assert.ok(d.heroClasses.has('sequence-active'));
 d.classes.add('compact');d.callbacks.mutation();await settle();d.settleFrames(29000);assert.equal(d.canvas.width,240);assert.ok(d.draws.at(-1).includes('/mobile/'),'Layout change selects lighter frames');
 d.classes.delete('js-motion');d.callbacks.mutation();assert.ok(!d.heroClasses.has('sequence-active'));assert.equal(d.frames.size,0);
 for(const opts of [{reduced:true},{saveData:true}]){const q=setup(opts);await show(q);assert.equal(q.fetches(),0);assert.equal(q.images.length,0);q.proofButtons[3].events.click();assert.equal(q.proofLink.href,'#case-screengod','Static preferences retain full experience access');}
 const no=setup({noCanvas:true});assert.equal(no.fetches(),0);assert.equal(no.proofControls.hidden,false);no.proofButtons[2].events.click();assert.equal(no.proofLink.href,'#case-cisco','Experience selectors work without canvas');
 const bad=setup({fetchFail:true});await show(bad);assert.equal(bad.images.length,0);assert.ok(!bad.heroClasses.has('sequence-active'));
 const late=setup({deferred:true});late.callbacks.visible([{isIntersecting:true}]);late.callbacks.visible([{isIntersecting:false}]);late.resolve();await settle();assert.equal(late.images.length,0,'Late manifest does not reactivate offscreen actor');
 const error=setup();error.callbacks.visible([{isIntersecting:true}]);await settle();for(let i=0;i<200;i++){const img=error.images.find(i=>i.pending);if(!img)break;img.pending=false;img.onerror();}assert.ok(!error.heroClasses.has('sequence-active'),'Failed frames preserve base character');assert.equal(error.frames.size,1);error.tick(0);assert.equal(error.frames.size,0);
 console.log('PASS: frame-position mapping, reverse scroll, replay/hold/idle handoff, bounded downloads, RAF settling, compact tier, hidden/offscreen cancellation, reduced/data-saver and failure fallbacks');
})().catch(error=>{console.error(error);process.exitCode=1;});
