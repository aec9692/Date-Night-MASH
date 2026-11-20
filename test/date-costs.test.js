const {test}=require('node:test'),assert=require('node:assert/strict');
const planner=require('../public/planner'),costs=require('../public/date-costs'),journey=require('../public/journey');
journey.setTowns(require('../data/towns.json'));
const catalog=['options','local-options','home-options','outing-options'].flatMap(name=>require('../data/'+name+'.json')).map(costs.enrich);
const mash={age:'teen',origin:'Paterson',radius:10};
const sum=picks=>picks.reduce((total,pick)=>total+pick.costCents,0);
test('home dates ignore the NJ-only collection and succeed at affordable budgets for two',()=>{
 for(const budget of [10,20,30,40,50,75,100,250,1000,10000]){
  const plan=planner.prepare({budget,setting:'home',area:'paterson',spending:'flexible',mash},catalog,false,()=>0);
  assert.ok(!plan.error,JSON.stringify(plan));assert.equal(plan.selectedPicks.length,4);
  assert.ok(plan.selectedPicks.every(pick=>pick.settings.includes('home')));
  assert.ok(sum(plan.selectedPicks)<=budget*100);
 }
 const free=planner.prepare({budget:0,setting:'home',area:'paterson',pantry:['groceries'],mash},catalog,false,()=>0);
 assert.equal(sum(free.selectedPicks),0);
 const unavailable=planner.prepare({budget:0,setting:'home',area:'paterson',mash},catalog,false,()=>0);
 assert.equal(unavailable.status,422);assert.ok(unavailable.minimumCents>0);
});
test('owned supplies are explicit and shared grocery packs are charged once across picks',()=>{
 const home=require('../data/home-options.json');
 const selected=[home.find(o=>o.name==='Spaghetti with tomato sauce'),home.find(o=>o.category==='activity'&&!o.costCents&&!o.home.requiresOwned.length),home.find(o=>o.name==='Bake cupcakes'),home.find(o=>o.category==='entertainment'&&!o.costCents&&!o.home.requiresOwned.length)];
 assert.ok(selected.every(Boolean));
 const priced=costs.resolve(selected,[]),owned=costs.resolve(selected,['groceries','seasonings','baking']);
 assert.equal(priced.totalCents,sum(priced.picks));assert.ok(priced.sharedSavingsCents>=300);
 assert.equal(priced.shoppingList.filter(line=>line.key==='pantry-oil').length,1);
 assert.ok(owned.totalCents<priced.totalCents);assert.ok(owned.ownedSavingsCents>0);
 assert.equal(sum(selected)-owned.totalCents,owned.ownedSavingsCents+owned.sharedSavingsCents);
 assert.ok(!owned.shoppingList.some(line=>['groceries','seasonings','baking'].includes(line.ownedBy)));
 assert.equal(costs.available(home.find(o=>o.name==='Netflix movie night'),[]),false);
 assert.equal(costs.available(home.find(o=>o.name==='Netflix movie night'),['streaming']),true);
});
test('steak remains available under $50 and rerolling one category recomputes shared costs',()=>{
 const steak=catalog.find(o=>o.name==='Steak and mashed potatoes');assert.ok(steak);
 const first=planner.prepare({budget:50,setting:'home',area:'paterson',spending:'flexible',locked:{dinner:steak.id},mash},catalog,false,()=>0);
 assert.equal(first.selectedPicks[0].id,steak.id);assert.ok(sum(first.selectedPicks)<=5000);
 const previous=first.selectedPicks.map(p=>p.id),locked=Object.fromEntries(first.selectedPicks.filter(p=>p.category!=='treat').map(p=>[p.category,p.id]));
 const next=planner.prepare({budget:50,setting:'home',area:'paterson',spending:'flexible',previous,locked,mash},catalog,false,()=>0);
 assert.ok(sum(next.selectedPicks)<=5000);for(const pick of next.selectedPicks)if(pick.category!=='treat')assert.equal(pick.id,locked[pick.category]);
 assert.notEqual(next.selectedPicks[2].id,previous[2]);
});
test('exact counting matches independent enumeration with shared supplies, conflicts, ownership and recent dates',()=>{
 const fixture=planner.categories.flatMap((category,index)=>[0,1,2].map(n=>({id:category+n,name:category+n,description:'fixture',category,settings:['indoor','home'],moods:n===1?['cozy']:[],costCents:100+n*100+300,home:{theme:index===1&&n===0||index===2&&n===0?'same-craft':category+n,requiresOwned:[],costs:[{key:category+n,name:category+n,cents:100+n*100},{key:'pantry-oil',name:'Oil',cents:300,ownedBy:'seasonings'}]}})));
 function independent(picks,pantry){const bought=new Set();let total=0;for(const pick of picks)for(const line of pick.home.costs){if(pantry.includes(line.ownedBy)||line.key==='pantry-oil'&&bought.has(line.key))continue;total+=line.cents;bought.add(line.key);}return total;}
 let all=[[]];for(const category of planner.categories)all=all.flatMap(picks=>fixture.filter(o=>o.category===category).map(o=>[...picks,o]));
 all=all.filter(picks=>!(picks[1].id==='activity0'&&picks[2].id==='treat0'));
 const key=picks=>picks.map(o=>o.id).join('|');
 for(const pantry of [[],['seasonings']])for(const budget of [5,8,11,15])for(const spending of ['flexible','treat']){
  const previous=['dinner0','activity1','treat1','entertainment0'],recent=[['dinner0','activity2','treat0','entertainment0']];
  const valid=all.filter(picks=>independent(picks,pantry)<=budget*100);
  const omit=new Set([previous,...recent].map(ids=>ids.join('|'))),fresh=valid.filter(picks=>!omit.has(key(picks))),candidates=fresh.length?fresh:valid;
  const actual=planner.prepare({budget,setting:'home',spending,pantry,previous,recent},fixture);
  if(!valid.length){assert.equal(actual.status,422);continue;}
  const maximum=Math.max(...candidates.map(p=>independent(p,pantry))),target=spending==='flexible'?0:maximum>=budget*90?budget*90:Math.ceil(maximum*.95);
  assert.equal(actual.combinationCount,valid.length);assert.equal(actual.maximumCents,maximum);assert.equal(actual.targetCents,target);
  const expected=candidates.filter(picks=>independent(picks,pantry)>=target).map(key).sort();
  assert.deepEqual(actual.plans.map(key).sort(),expected);
 }
 const input={budget:15,setting:'home',spending:'flexible',mood:'cozy',pantry:[]};
 const expected=planner.prepare(input,fixture).plans,weights=new Map(expected.map(picks=>[key(picks),1+3*picks.filter(o=>o.moods.includes('cozy')).length]));
 const total=[...weights.values()].reduce((a,b)=>a+b,0),observed=new Map();
 for(let ticket=0;ticket<total;ticket++){const result=planner.prepare(input,fixture,false,max=>{assert.equal(max,total);return ticket;});const selected=key(result.selectedPicks);observed.set(selected,(observed.get(selected)||0)+1);}
 assert.deepEqual([...observed].sort(),[...weights].sort());
});
test('mixed plans contain indoor and outdoor outings; recent repeats are skipped until exhausted',()=>{
 const input={budget:50,area:'all',setting:'mixed',spending:'flexible',mash},recent=[];
 for(let i=0;i<8;i++){const result=planner.prepare({...input,recent},catalog,false,()=>0);const picks=result.selectedPicks;
  assert.ok(!result.error);assert.ok(picks.every(o=>!o.settings.includes('home')));
  assert.ok(picks.some(o=>o.settings.includes('indoor')));assert.ok(picks.some(o=>o.settings.includes('outdoor')));
  assert.ok(costs.compatible(picks));assert.ok(!recent.some(ids=>ids.join('|')===picks.map(o=>o.id).join('|')));recent.push(picks.map(o=>o.id));
 }
});
test('pantry, recent and location inputs remain strict; seasonal ideas respect a selected date',()=>{
 for(const extra of [{pantry:['unknown']},{pantry:['art','art']},{recent:[['missing']]},{location:{lat:NaN,lon:0,label:'Nowhere'}},{location:{lat:40,lon:-74,label:'City',extra:true}}])assert.equal(planner.prepare({budget:50,...extra},catalog,false).status,400);
 const seasonal=catalog.find(o=>o.seasons?.length&&o.seasons.length<12);assert.ok(seasonal);
 const off=Array.from({length:12},(_,i)=>i+1).find(month=>!seasonal.seasons.includes(month));assert.equal(planner.eligible(seasonal,'general',`2026-${String(off).padStart(2,'0')}-01`),false);
});

