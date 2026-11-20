const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const planning=require('../public/date-planning'),planner=require('../public/planner'),invite=require('../public/date-invite');
const categories=planner.categories,fixture=categories.map((category,index)=>({id:category+'-base',name:category,description:'fixture',category,costCents:[1000,0,500,0][index],settings:['indoor'],moods:[]}));
test('Tonight and weekend use New Jersey civil dates across weekends and year boundaries',()=>{
 assert.deepEqual(planning.presets(new Date('2026-11-21T01:00:00Z')),{tonight:'2026-11-20',weekend:'2026-11-21'});
 assert.deepEqual(planning.presets(new Date('2026-11-22T18:00:00Z')),{tonight:'2026-11-22',weekend:'2026-11-22'});
 assert.deepEqual(planning.presets(new Date('2027-12-31T18:00:00Z')),{tonight:'2027-12-31',weekend:'2028-01-01'});
});
test('reserves reduce the actual picker budget once and remain integer cents',()=>{
 const result=planner.prepare({budget:50,reserve:{parking:5,transport:7.25,extras:2.75}},fixture,false,()=>0);
 assert.equal(result.budgetCents,5000);assert.equal(result.reserveCents,1500);assert.equal(result.planningBudgetCents,3500);assert.equal(result.selectedPicks.reduce((n,p)=>n+p.costCents,0),1500);
 assert.equal(planning.reserveTotal(planning.reserve({parking:.1,transport:.2},5000)),30);
 const impossible=planner.prepare({budget:50,reserve:{parking:40}},fixture,false,()=>0);assert.equal(impossible.status,422);assert.equal(impossible.minimumCents,5500);assert.match(impossible.error,/including.*reserve/);
 for(const reserve of [null,[],{parking:-1},{parking:'5'},{extras:1.001},{transport:51},{other:0}])assert.equal(planner.prepare({budget:50,reserve},fixture,false).status,400);
});
test('rating records reject malformed data and derive bounded signals only for currently known IDs',()=>{
 const record={ids:fixture.map(p=>p.id),date:'2026-11-20',rating:5,wouldAgain:'yes'};
 assert.ok(planning.rating(record));assert.deepEqual(planning.signals([record],fixture).liked,fixture.map(p=>p.id));
 assert.deepEqual(planning.signals([{...record,rating:1,wouldAgain:'no'}],fixture).less,fixture.map(p=>p.id));
 assert.deepEqual(planning.signals([{...record,rating:3,wouldAgain:'unsure'}],fixture),{liked:[],less:[]});
 assert.deepEqual(planning.signals([record],[]),{liked:[],less:[]});
 for(const change of [{rating:0},{rating:6},{rating:1.5},{rating:'5'},{wouldAgain:'maybe'},{date:'2026-02-30'},{ids:[record.ids[0],record.ids[0]]},{note:'private text'}])assert.equal(planning.rating({...record,...change}),null);
 const many=Array.from({length:50},(_,i)=>({id:'idea-'+i})),records=Array.from({length:25},(_,i)=>({ids:['idea-'+i,'idea-'+(i+25)],date:'2026-11-20',rating:i%2?1:5,wouldAgain:i%2?'no':'yes'}));
 const signals=planning.signals(records,many);assert.equal(signals.liked.length,16);assert.equal(signals.less.length,16);
});
test('ratings change weighted draws without changing affordable candidates or bypassing locks',()=>{
 const options=categories.flatMap(category=>[0,1].map(index=>({id:category+index,name:category+index,description:'fixture',category,costCents:100,settings:['indoor'],moods:[]})));
 const taste={liked:['dinner1'],less:['activity1']},input={budget:10,spending:'flexible',taste};let total=0;
 const first=planner.prepare(input,options,false,max=>{total=max;return 0;});assert.equal(first.combinationCount,16);
 const counts={dinner0:0,dinner1:0};for(let ticket=0;ticket<total;ticket++){const plan=planner.prepare(input,options,false,()=>ticket);counts[plan.selectedPicks[0].id]++;}
 assert.ok(counts.dinner1>counts.dinner0);
 const locked=planner.prepare({...input,locked:{dinner:'dinner0'}},options,false,()=>0);assert.equal(locked.selectedPicks[0].id,'dinner0');
 assert.equal(planner.prepare({...input,taste:{liked:['missing']}},options,false).status,400);assert.equal(planner.prepare({...input,taste:{liked:['dinner1'],less:['dinner1']}},options,false).status,400);
});
let server,base;
before(async()=>{server=require('../server').listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;});
after(()=>new Promise(resolve=>server.close(resolve)));
async function generate(extra={}){const response=await fetch(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({budget:50,setting:'home',area:'paterson',spending:'flexible',mash:{age:'teen',origin:'Paterson',radius:10},...extra})});return {status:response.status,plan:await response.json()};}
test('HTTP plans, rerolls and shared restores keep the complete spending ledger within budget',async()=>{
 const {status,plan}=await generate({date:'2026-11-21',reserve:{parking:5,transport:7,extras:3}});assert.equal(status,200,JSON.stringify(plan));assert.equal(plan.planningBudgetCents,3500);assert.equal(plan.reserveCents,1500);assert.ok(plan.totalCents<=3500);assert.equal(plan.plannedTotalCents,plan.totalCents+1500);assert.equal(plan.remainingCents,5000-plan.plannedTotalCents);
 const previous=plan.picks.map(p=>p.id),locked=Object.fromEntries(plan.picks.filter(p=>p.category!=='activity').map(p=>[p.category,p.id]));const reroll=await generate({date:plan.date,reserve:plan.reserve,previous,locked});assert.equal(reroll.status,200);assert.ok(reroll.plan.plannedTotalCents<=5000);for(const p of reroll.plan.picks)if(p.category!=='activity')assert.equal(p.id,locked[p.category]);
 const snapshot=invite.snapshot(plan),token=invite.encode(snapshot);assert.deepEqual(snapshot.reserve,plan.reserve);assert.ok(!JSON.stringify(snapshot).includes('taste'));
 const response=await fetch(base+'/api/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})}),restored=await response.json();assert.equal(response.status,200,JSON.stringify(restored));assert.equal(restored.plan.reserveCents,1500);assert.equal(restored.plan.remainingCents,plan.remainingCents);assert.match(invite.summary(restored.plan),/including reserve/);
 const zero=await generate({budget:15,pantry:['groceries'],reserve:{extras:15}});assert.equal(zero.status,200,JSON.stringify(zero));assert.equal(zero.plan.totalCents,0);assert.equal(zero.plan.remainingCents,0);
});
test('date filtering excludes recorded closures and out-of-season ideas before generating',async()=>{
 const closed=await generate({budget:200,area:'paterson',setting:'any',date:'2026-11-19',locked:{activity:'nj-mam'}});assert.equal(closed.status,422);
 const catalog=(await (await fetch(base+'/api/options')).json()).options,seasonal=catalog.find(o=>o.category==='activity'&&o.seasons?.length&&o.seasons.length<12);assert.ok(seasonal);
 const month=Array.from({length:12},(_,i)=>i+1).find(month=>!seasonal.seasons.includes(month));const result=await generate({budget:200,area:'all',setting:'any',date:`2026-${String(month).padStart(2,'0')}-01`,locked:{activity:seasonal.id}});assert.equal(result.status,422);
});
test('timed plans reserve money once and never return stored rating details',async()=>{
 const {status,plan}=await generate({budget:100,mash:undefined,journey:{format:'quick',start:'17:00'},setting:'any',area:'paterson',date:'2026-11-20',reserve:{parking:10,transport:5,extras:5},taste:{liked:['nj-mam'],less:[]}});
 assert.equal(status,200,JSON.stringify(plan));assert.equal(plan.picks.length,2);assert.equal(plan.planningBudgetCents,8000);assert.equal(plan.reserveCents,2000);assert.ok(plan.plannedTotalCents<=10000);assert.equal(plan.taste,undefined);assert.equal(plan.ratings,undefined);
});
test('expanded exclusions, reviews, reserves and personal ideas fit the bounded request',async()=>{
 const options=(await (await fetch(base+'/api/options')).json()).options,ids=options.map(o=>o.id).sort((a,b)=>b.length-a.length);
 const customOptions=categories.map((category,index)=>({id:'custom-fixture-'+index,name:'語'.repeat(48),category,costCents:0,settings:['home']}));
 const body={budget:10000,setting:'home',area:'all',date:'2026-11-21',reserve:{parking:100,transport:100,extras:100},pantry:['groceries','seasonings','baking','boardGames','videoGames','art','streaming','craft'],taste:{liked:ids.slice(0,16),less:ids.slice(16,32)},excluded:ids,customOptions,locked:Object.fromEntries(customOptions.map(o=>[o.category,o.id])),recent:Array.from({length:8},()=>ids.filter(id=>options.find(o=>o.id===id).category==='dinner').slice(0,1).concat(['activity-games','treat-pantry','entertainment-movie']))};
 assert.ok(Buffer.byteLength(JSON.stringify(body))<32768);const response=await fetch(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),plan=await response.json();assert.equal(response.status,200,JSON.stringify(plan));assert.equal(plan.plannedTotalCents,30000);
});
