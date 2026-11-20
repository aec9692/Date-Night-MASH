const {test}=require('node:test');
const assert=require('node:assert/strict');
const planner=require('../public/planner');
const local=require('../data/local-options.json');
const general=require('../data/options.json');

test('NJ deck has fifty choices per category, requested towns and substantial inexpensive coverage',()=>{
 assert.deepEqual(planner.categories.map(c=>local.filter(o=>o.category===c).length),[50,54,50,55]);
 assert.deepEqual(planner.categories.map(c=>general.filter(o=>o.category===c).length),[24,24,24,24]);
 const towns=new Set(local.map(o=>o.venue.city));
 for(const town of ['Paramus','Parsippany','Lincoln Park','Caldwell','Fair Lawn','Woodland Park','Fairfield','Lyndhurst','East Rutherford','Secaucus','Jersey City','Hoboken','Bergenfield','Garfield','Passaic'])assert.ok(towns.has(town),town);
 for(const [i,category]of planner.categories.entries()){
  const options=local.filter(o=>o.category===category);
  assert.ok(options.filter(o=>o.costCents<3000).length>=[15,25,40,30][i],category+' affordable coverage');
  assert.ok(new Set(options.map(o=>o.costCents)).size>=10,category+' price variety');
 }
 assert.equal(new Set(local.map(o=>o.id)).size,209);
 assert.equal(new Set(local.map(o=>o.venue.id)).size,107);
});

test('known holiday closures, winter intervals and corrected weekday offers affect actual eligibility',()=>{
 const option=id=>local.find(o=>o.venue.id===id);
 for(const id of ['dekorte','njhof','aviation','newark-art','visual-arts','billy','edison'])assert.equal(planner.eligible(option(id),'paterson','2026-11-26'),false,id);
 assert.equal(planner.eligible(option('aviation'),'paterson','2026-12-23'),false);
 assert.equal(planner.eligible(option('aviation'),'paterson','2027-01-05'),false);
 assert.equal(planner.eligible(option('aviation'),'paterson','2027-01-06'),true);
 assert.equal(planner.eligible(option('edison'),'paterson','2027-02-04'),false);
 assert.equal(planner.eligible(option('edison'),'paterson','2027-03-11'),true);
 for(const o of local.filter(o=>o.venue.id==='imperial')){
  assert.equal(planner.eligible(o,'paterson','2026-11-23'),false);
  assert.match(o.venue.address,/1570/);
 }
 assert.match(option('bellarosa').venue.address,/3835/);
 assert.doesNotMatch(option('elcid').venue.hoursNote,/Breakfast/);
});

// Independent complete enumeration on small fixtures guards the optimized pair
// counter and spending band against omissions, repeats and incorrect maxima.
function brute(input,options){
 const groups=planner.categories.map(category=>options.filter(o=>o.category===category &&
  !(input.excluded||[]).includes(o.id) && (!input.locked?.[category]||input.locked[category]===o.id)));
 let plans=[[]];
 for(const group of groups)plans=plans.flatMap(p=>group.map(o=>[...p,o]));
 const sum=p=>p.reduce((n,o)=>n+o.costCents,0);
 plans=plans.filter(p=>sum(p)<=Math.round(input.budget*100));
 const count=plans.length;
 if(!count)return {count};
 const changed=plans.filter(p=>p.some((o,i)=>o.id!==input.previous?.[i]));
 if(changed.length)plans=changed;
 const maximum=Math.max(...plans.map(sum));
 const near=Math.ceil(input.budget*100*.9);
 const target=input.spending==='flexible'?0:maximum>=near?near:Math.ceil(maximum*.95);
 return {count,maximum,target,plans:plans.filter(p=>sum(p)>=target)};
}
const signature=p=>p.map(o=>o.id).join(',');
test('pair selection matches brute-force counts, maxima and candidates across small constrained decks',()=>{
 let seed=23971;
 const next=max=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%max;};
 for(let trial=0;trial<120;trial++){
  const options=planner.categories.flatMap(category=>[0,1,2].map(i=>({id:category+i,category,costCents:next(700),settings:['indoor'],moods:i%2?['cozy']:[]})));
  const input={budget:next(3000)/100,spending:trial%2?'treat':'flexible',mood:'cozy'};
  if(trial%3===0)input.previous=planner.categories.map(c=>c+next(3));
  if(trial%4===0)input.locked={activity:'activity'+next(3)};
  if(trial%5===0)input.excluded=['dinner'+next(3)];
  const expected=brute(input,options),actual=planner.prepare(input,options);
  if(!expected.count){assert.equal(actual.status,422);continue;}
  assert.equal(actual.combinationCount,expected.count);
  assert.equal(actual.maximumCents,expected.maximum);
  assert.equal(actual.targetCents,expected.target);
  assert.deepEqual(actual.plans.map(signature).sort(),expected.plans.map(signature).sort());
 }
});

test('every weighted ticket represents the expected candidate probability after pairing and previous exclusion',()=>{
 const options=planner.categories.flatMap(category=>[0,1].map(i=>({id:category+i,category,costCents:50+i*25,settings:['indoor'],moods:i?['cozy']:[]})));
 const input={budget:10,spending:'flexible',mood:'cozy',previous:planner.categories.map(c=>c+'1')};
 const expected=brute(input,options).plans;
 const weights=Object.fromEntries(expected.map(p=>[signature(p),1+3*p.filter(o=>o.moods.includes('cozy')).length]));
 const count=Object.values(weights).reduce((a,b)=>a+b,0),observed={};
 for(let ticket=0;ticket<count;ticket++){
  const result=planner.prepare(input,options,false,total=>{assert.equal(total,count);return ticket;});
  assert.deepEqual(result.plans,[]);
  const key=signature(result.selectedPicks);observed[key]=(observed[key]||0)+1;
 }
 assert.deepEqual(observed,weights);
});
