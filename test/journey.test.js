const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const journey=require('../public/journey'),planner=require('../public/planner');
const local=require('../data/local-options.json'),original=require('../data/options.json'),townData=require('../data/towns.json');
journey.setTowns(townData);
const app=require('../server');let server,base;
before(async()=>{server=app.listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;});
after(()=>new Promise(resolve=>server.close(resolve)));
const post=body=>fetch(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

test('all local towns have sourced representative points; photo records carry HTTPS license attribution',()=>{
 assert.match(townData.sourceUrl,/tigerweb.geo.census.gov/);
 for(const o of local){assert.ok(townData.towns[o.venue.city]);const [lat,lon]=townData.towns[o.venue.city];assert.ok(lat>40&&lat<42&&lon>-75&&lon<-73);}
 const media=require('../data/place-media.json');assert.ok(Object.keys(media).length>=6);
 for(const [id,p]of Object.entries(media)){assert.ok(local.some(o=>o.venue.id===id));for(const k of ['url','authorUrl','licenseUrl','sourceUrl'])assert.equal(new URL(p[k]).protocol,'https:');assert.ok(p.author&&p.license&&p.alt&&p.note);}
});

test('quick, evening and full dates return the right categories, schedule and integer budget arithmetic',async()=>{
 for(const format of Object.keys(journey.formats)){
  const response=await post({budget:150,area:'paterson',date:'2026-11-21',journey:{format,start:format==='full'?'11:00':'17:00'}});
  assert.equal(response.status,200);const plan=await response.json();
  assert.deepEqual(plan.picks.map(o=>o.category),journey.formats[format].categories);
  assert.equal(plan.schedule.stops.length,plan.picks.length);
  assert.ok(plan.schedule.durationMinutes<=journey.formats[format].minutes);
  assert.equal(new Set(plan.picks.map(o=>o.venue.id)).size,plan.picks.length);
  assert.equal(plan.totalCents,plan.picks.reduce((n,o)=>n+o.costCents,0));assert.ok(plan.totalCents<=15000);
  assert.deepEqual(plan.schedule,journey.schedule(plan.picks,plan.journey));
  assert.ok(plan.picks.every(o=>journey.miles(townData.towns.Paterson,townData.towns[o.venue.city])<=10));
  for(const stop of plan.schedule.stops.slice(1))assert.ok(stop.straightLineMiles<=10);
  assert.ok(plan.schedule.stops.every(s=>s.endMinute<=21*60));
 }
});

test('journey fields reject malformed, unknown and oversized preference values with readable 400s',async()=>{
 const invalid=[null,[],{format:'toString'},{format:'month'},{start:'99:00'},{start:'12:75'},{start:1700},{origin:'Not a town'},{radius:11},{legMiles:-1},{age:'unrestricted'},{cuisine:'__proto__'},{vegetarian:1},{lowEffort:'true'},{alcoholFree:null},{fresh:{}},{seen:'none'},{seen:Array(41).fill('x')},{seen:['no-such-id']},{partner:{mood:'cozy',cuisine:'any',extra:true}},{partner:{mood:'wild',cuisine:'any'}},{order:['dinner','dinner','treat']},{extra:true}];
 for(const value of invalid){const r=await post({budget:100,journey:value});assert.equal(r.status,400,JSON.stringify(value));assert.equal(typeof(await r.json()).error,'string');}
 const r=await post({budget:'100',journey:{}});assert.equal(r.status,400);
});

test('late starts, impossible budgets and incompatible locks return honest 422s',async()=>{
 for(const body of [
  {budget:50,journey:{start:'23:00'}},
  {budget:0,area:'paterson',journey:{format:'quick'}},
  {budget:100,journey:{format:'quick'},locked:{activity:'nj-great-falls'}},
  {budget:100,area:'paterson',journey:{format:'quick',origin:'Paterson',legMiles:0}}
 ]){const r=await post(body);assert.equal(r.status,422);assert.equal(typeof(await r.json()).error,'string');}
});

test('daytime menus and galleries never slip into evening suggestions; adult activities respect audience',()=>{
 const dinner=local.find(o=>o.name.includes('waffle brunch')),museum=local.find(o=>o.venue.id==='mam'),spa=local.find(o=>/one-hour massage/.test(o.name));
 const j=journey.normalize({format:'quick',start:'19:00'});
 assert.equal(journey.schedule([dinner,local.find(o=>o.category==='treat')],j),null);
 assert.ok(journey.meta(museum).window[1]<=18*60);
 assert.equal(journey.matches(spa,journey.normalize({age:'teen'})),false);
 assert.equal(journey.matches(spa,journey.normalize({age:'adult'})),true);
 assert.equal(journey.matches(spa,journey.normalize({age:'adult',lowEffort:true})),true);
 const alcohol={id:'x',name:'Wine tasting',description:'Winery tasting',category:'activity',settings:['indoor']};
 assert.equal(journey.matches(alcohol,journey.normalize({age:'adult',alcoholFree:false})),false);
 assert.equal(journey.matches(alcohol,journey.normalize({age:'21plus',alcoholFree:false})),true);
 assert.equal(journey.matches(alcohol,journey.normalize({age:'21plus'})),false);
});

test('diet, cuisine, low effort and tried-venue preferences affect the actual selected mix',()=>{
 const body={budget:120,area:'paterson',spending:'flexible',journey:{format:'evening',start:'12:00',vegetarian:true,cuisine:'italian',lowEffort:true}};
 const first=planner.prepare(body,local,false,()=>0);assert.ok(first.selectedPicks,first.error);
 const meal=first.selectedPicks.find(o=>o.category==='dinner');assert.equal(journey.meta(meal).cuisine,'italian');assert.equal(journey.meta(meal).vegetarian,true);
 assert.ok(first.selectedPicks.every(o=>!journey.meta(o).physical));
 const second=planner.prepare({...body,journey:{...body.journey,fresh:true,seen:[meal.id]}},local,false,()=>0);
 assert.ok(second.selectedPicks,second.error);assert.ok(second.selectedPicks.every(o=>o.venue.id!==meal.venue.id));
});

test('rerolls preserve other picks and previous dates are excluded before finding the attainable maximum',()=>{
 const body={budget:100,area:'paterson',journey:{format:'evening'}};
 const first=planner.prepare(body,local,false,()=>0);assert.ok(first.selectedPicks);
 const fixed=Object.fromEntries(first.selectedPicks.filter(o=>o.category!=='treat').map(o=>[o.category,o.id]));
 const next=planner.prepare({...body,locked:fixed,previous:first.selectedPicks.map(o=>o.id)},local,false,total=>total-1);
 assert.ok(next.selectedPicks,next.error);
 for(const o of next.selectedPicks)if(o.category!=='treat')assert.equal(o.id,fixed[o.category]);
 assert.ok(next.selectedPicks[2].id!==first.selectedPicks[2].id||next.unchanged);
 assert.deepEqual(next.plans,[]);
});

test('both partners receive mood weight and either cuisine preference can win',()=>{
 const options=[
  {id:'d1',category:'dinner',name:'Cheese pizza',description:'Shared cheese pizza',costCents:100,settings:['indoor']},
  {id:'d2',category:'dinner',name:'Vegetarian tacos',description:'Vegetarian tacos',costCents:100,settings:['indoor']},
  {id:'d3',category:'dinner',name:'Sushi meal',description:'Sushi',costCents:100,settings:['indoor']},
  {id:'t1',category:'treat',name:'Coffee',description:'Coffee',costCents:0,settings:['indoor']}
 ];
 const body={budget:10,mood:'romantic',spending:'flexible',journey:{format:'quick',cuisine:'italian',partner:{mood:'cozy',cuisine:'mexican'}}};
 const all=planner.prepare(body,options);assert.equal(all.plans.length,2);
 const observed={};let weightCount=0;planner.prepare(body,options,false,total=>{weightCount=total;return 0;});
 for(let ticket=0;ticket<weightCount;ticket++){const r=planner.prepare(body,options,false,total=>ticket);const id=r.selectedPicks[0].id;observed[id]=(observed[id]||0)+1;}
 assert.ok(observed.d1>0&&observed.d2>0&&!observed.d3);
 const solo={...body,journey:{...body.journey,partner:null}};let soloWeight=0;planner.prepare(solo,options,false,total=>{soloWeight=total;return 0;});assert.ok(weightCount>soloWeight);
});

test('home requests retain four categories and fit the bounded parser with exclusions and Unicode custom ideas',async()=>{
 const all=[...original,...local],customOptions=planner.categories.map((category,i)=>({id:'custom-'+i,category,name:'💛'.repeat(24),costCents:0,settings:['home']}));
 const body={budget:10,area:'general',setting:'home',excluded:all.map(o=>o.id),customOptions,journey:{format:'quick',seen:all.slice(0,40).map(o=>o.id),partner:{mood:'romantic',cuisine:'any'}}};
 assert.ok(Buffer.byteLength(JSON.stringify(body))<8192);
 const r=await post(body);assert.equal(r.status,200);assert.equal((await r.json()).picks.length,4);
});

test('numeric search matches independent itinerary enumeration across order, timing, distance and reroll constraints',()=>{
 const fixture=planner.categories.flatMap((category,k)=>[0,1,2].map(i=>({id:`${category}-${i}`,category,name:category==='dinner'?(i?'Cheese pizza':'Breakfast waffles'):category==='activity'?(i?'Arcade games':'Outdoor hike'):category==='treat'?'Coffee':'Museum gallery',description:'A planned visit',settings:['indoor'],costCents:(i+1)*300,venue:{id:`venue-${k}-${i}`,city:i===2?'Hoboken':'Paterson',openDays:[0,1,2,3,4,5,6]}})));
 const signature=p=>p.map(o=>o.id).join('|');
 for(let trial=0;trial<48;trial++){
  const format=['quick','evening','full'][trial%3],active=journey.formats[format].categories;
  const value={format,start:trial%2?'11:00':'17:00',radius:trial%4?10:50,legMiles:trial%5?10:0,age:trial%7?'teen':'adult',order:trial%4===0?[...active].reverse():active};
  const j=journey.normalize(value),budget=10+trial%10,previous=trial%3===0?active.map(c=>c+'-1'):[];
  let possibilities=[[]];for(const category of active)possibilities=possibilities.flatMap(p=>fixture.filter(o=>o.category===category&&journey.matches(o,j)).map(o=>[...p,o]));
  const sum=p=>p.reduce((n,o)=>n+o.costCents,0);
  possibilities=possibilities.filter(p=>sum(p)<=budget*100&&journey.schedule(p,j));
  const result=planner.prepare({budget,spending:trial%2?'treat':'flexible',previous,journey:value},fixture);
  if(!possibilities.length){assert.equal(result.status,422);continue;}
  assert.equal(result.combinationCount,possibilities.length);
  const alternatives=possibilities.filter(p=>signature(p)!==previous.join('|'));if(alternatives.length)possibilities=alternatives;
  const maximum=Math.max(...possibilities.map(sum)),near=Math.ceil(budget*100*.9),target=trial%2?(maximum>=near?near:Math.ceil(maximum*.95)):0;
  assert.equal(result.maximumCents,maximum);assert.equal(result.targetCents,target);
  assert.deepEqual(result.plans.map(signature).sort(),possibilities.filter(p=>sum(p)>=target).map(signature).sort());
 }
});
