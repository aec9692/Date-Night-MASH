const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

function harness({reduced=false,supported=true}={}) {
 let time=0,id=0;const timers=new Map(),voices=[],events={};
 const make=()=>({children:[],classList:{add(){}},style:{setProperty(){}},append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},scrollIntoView(){},hidden:true});
 const nodes=Object.fromEntries(['mash-stage','reveal-board','skip-reveal','confetti'].map(id=>[`#${id}`,make()]));
 class Context {
  constructor(){this.state='running';this.currentTime=0;this.destination={};}
  resume(){return Promise.resolve();}
  createOscillator(){const voice={frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(gain){return gain;},start(){voice.started=true;},stop(){voice.stopped=true;},disconnect(){}};voices.push(voice);return voice;}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(value){assert.ok(value<=.035);}},connect(){},disconnect(){}};}
 }
 const window={matchMedia:()=>({matches:reduced}),addEventListener:(type,fn)=>events[type]=fn,...(supported?{AudioContext:Context}:{})};
 const document={createElement:make,querySelector:selector=>nodes[selector],addEventListener:(type,fn)=>events[type]=fn};
 vm.runInNewContext(fs.readFileSync('public/show.js','utf8'),{window,document,setTimeout(fn,delay){const next=++id;timers.set(next,{fn,at:time+delay});return next;},clearTimeout(key){timers.delete(key);}});
 function advance(until){while(timers.size){const [key,next]=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(next.at>until)break;time=next.at;timers.delete(key);next.fn();}time=until;}
 const picks=['dinner','activity','treat','entertainment'].map((category,index)=>({id:String(index),category,name:category}));
 return {show:window.MashShow,plan:{picks},pool:[],timers,voices,events,nodes,advance};
}

test('rolling is silent by default and reduced-motion/instant reveals schedule no animation',async()=>{
 const h=harness();const pending=h.show.reveal(h.plan,h.pool,false);h.advance(3000);await pending;assert.equal(h.voices.length,0);
 const reduced=harness({reduced:true});await reduced.show.reveal(reduced.plan,[],false);assert.equal(reduced.timers.size,0);
 await h.show.reveal(h.plan,[],true);assert.equal(h.timers.size,0);
 assert.equal(harness({supported:false}).show.toggleSound(),false);
});

test('opt-in sound ticks while rolling, reveals with layered notes, and mute stops voices',async()=>{
 const h=harness();assert.equal(h.show.toggleSound(),true);
 const initial=h.voices.length,pending=h.show.reveal(h.plan,[],false);
 h.advance(500);assert.ok(h.voices.length>initial,'rolling ticks precede the first card reveal');
 h.advance(1900);assert.ok(h.voices.length>20,'rolling plus reveal notes play');
 assert.equal(h.show.toggleSound(),false);assert.ok(h.voices.every(voice=>voice.stopped));
 const mutedCount=h.voices.length;h.advance(3000);await pending;assert.equal(h.voices.length,mutedCount);
 assert.equal(h.timers.size,0);
});

test('skipping, leaving the page, and overlapping reveals clear pending timers and audio',async()=>{
 const h=harness();h.show.toggleSound();
 const first=h.show.reveal(h.plan,[],false);h.advance(200);h.nodes['#skip-reveal'].onclick();await first;
 assert.equal(h.timers.size,0);assert.ok(h.voices.every(voice=>voice.stopped));
 const second=h.show.reveal(h.plan,[],false),third=h.show.reveal(h.plan,[],false);await second;
 h.events.pagehide();await third;assert.equal(h.timers.size,0);assert.equal(h.nodes['#mash-stage'].hidden,true);
});
