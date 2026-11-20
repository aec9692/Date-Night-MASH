const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const places=require('../public/places'),directions=require('../public/directions'),journey=require('../public/journey'),planner=require('../public/planner');
const local=require('../data/local-options.json'),original=require('../data/options.json'),app=require('../server');
let server,base;before(async()=>{server=app.listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;});after(()=>new Promise(r=>server.close(r)));
const post=body=>fetch(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('MASH always draws four budgeted categories independently of timed scene settings',async()=>{
 for(const budget of [25,50,100,1000]){
  const body={budget,area:'paterson',mash:{origin:'Paterson',radius:25,age:'teen'}};
  const response=await post(body);assert.equal(response.status,200);const plan=await response.json();
  assert.deepEqual(plan.picks.map(o=>o.category),planner.categories);assert.equal(plan.journey,undefined);assert.equal(plan.schedule,undefined);
  assert.ok(plan.totalCents<=budget*100);assert.equal(plan.totalCents,plan.picks.reduce((n,o)=>n+o.costCents,0));
  assert.ok(plan.picks.every(o=>journey.matchesMash(o,plan.mash)));
  assert.equal(plan.combinationCount,planner.prepare(body,[...original,...local],false).combinationCount);
 }
 const scene=await(await post({budget:100,area:'paterson',journey:{format:'quick'}})).json();assert.equal(scene.picks.length,2);
});
test('MASH nested preferences are strict, mutually exclusive with a timed journey, and rerolls keep other categories',async()=>{
 for(const mash of [null,[],{age:'child'},{origin:'Unknown'},{radius:9},{radius:'10'},{gps:[1,2]},{origin:'__proto__'}])assert.equal((await post({budget:100,mash})).status,400);
 assert.equal((await post({budget:100,mash:{},journey:{}})).status,400);
 const body={budget:100,area:'paterson',mash:{}};
 const first=await(await post(body)).json();
 const locked=Object.fromEntries(first.picks.filter(o=>o.category!=='activity').map(o=>[o.category,o.id]));
 const next=await(await post({...body,locked,previous:first.picks.map(o=>o.id)})).json();
 assert.equal(next.picks.length,4);for(const pick of next.picks)if(pick.category!=='activity')assert.equal(pick.id,locked[pick.category]);
});
test('restaurant discovery groups dishes under one venue with an honest sample-price range',()=>{
 const meals=local.filter(o=>o.category==='dinner'),groups=places.group(meals);
 assert.ok(groups.length<meals.length);
 const s=groups.find(g=>g.venue.id==='saddle');assert.ok(s.options.length>=3);assert.equal(s.min,Math.min(...s.options.map(o=>o.costCents)));assert.equal(s.max,Math.max(...s.options.map(o=>o.costCents)));
 assert.equal(places.title(s.options[0]),s.venue.name);assert.ok(places.range(s).includes('–'));
 assert.equal(places.visible(meals,{query:'Saddle River Inn'})[0].key,s.key);
});
test('paid experiences lead discovery, and paid/free filters respect admission rather than optional donations',()=>{
 for(const category of ['activity','entertainment']){
  const options=local.filter(o=>o.category===category),all=places.visible(options);
  assert.ok(all[0].options.some(o=>o.pricing.baseCents>0));
  const paid=places.visible(options,{kind:'paid'}),free=places.visible(options,{kind:'free'});
  assert.ok(paid.length>0&&free.length>0);assert.ok(paid.every(g=>g.options.some(o=>o.pricing.baseCents>0)));assert.ok(free.every(g=>g.options.some(o=>o.pricing.baseCents===0)));
 }
 const donation={...local.find(o=>o.id==='nj-paterson-museum')};assert.equal(places.visible([donation],{kind:'paid'}).length,0);assert.equal(places.visible([donation],{kind:'free'}).length,1);
});
test('directions default to Maps device origin and retain explicit town fallback and three-waypoint limit',()=>{
 const device=new URL(directions.url('Some Place, NJ'));assert.equal(device.searchParams.has('origin'),false);assert.equal(device.searchParams.get('destination'),'Some Place, NJ');
 const town=new URL(directions.url('Some Place, NJ',{origin:'Hoboken, NJ',waypoints:['a','b','c','d']}));assert.equal(town.searchParams.get('origin'),'Hoboken, NJ');assert.equal(town.searchParams.get('waypoints'),'a|b|c');
});
test('new paid entries have transparent prices and conservative source restrictions',()=>{
 const added=local.filter(o=>o.id.startsWith('nj-p00'));assert.equal(added.length,9);assert.equal(new Set(added.map(o=>o.venue.id)).size,8);
 assert.ok(added.every(o=>o.pricing.baseCents>0&&o.costCents===o.pricing.baseCents+o.pricing.taxCents+o.pricing.tipCents+o.pricing.donationCents));
 for(const id of ['nj-p002','nj-p005','nj-p009']){
  const option=added.find(o=>o.id===id);assert.equal(journey.matchesMash(option,journey.normalizeMash({age:'teen',radius:50})),false,id);assert.equal(journey.matchesMash(option,journey.normalizeMash({age:'adult',radius:50})),true,id);
 }
});
