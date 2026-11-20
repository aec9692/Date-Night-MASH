const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const route=require('../public/date-route'),vote=require('../public/date-vote'),invite=require('../public/date-invite'),planner=require('../public/planner'),journey=require('../public/journey');
const towns=require('../data/towns.json');journey.setTowns(towns);
const stop=(category,city,id=category)=>({id,category,name:id,description:'fixture',moods:[],settings:['indoor'],venue:{id,city,address:city},costCents:100});
test('untimed route keeps dinner first, reduces a known detour and explicitly marks unknown endpoints',()=>{
 const local={towns:{Start:[40,-74],A:[40,-74],B:[40,-73.8],C:[40,-73.99],D:[40,-73.79]}};route.setTowns(local);
 const plan={picks:[stop('dinner','A'),stop('activity','B'),stop('treat','C'),stop('entertainment','D')],mash:{origin:'Start'}};
 const info=route.analyze(plan);assert.equal(info.order[0],'dinner');assert.ok(info.savedMiles>5);assert.equal(info.backtracking,true);assert.equal(info.unknown,0);assert.match(info.notice,/not driving/);
 const unknown=route.analyze({...plan,picks:[...plan.picks.slice(0,3),{...plan.picks[3],venue:undefined}]});assert.ok(unknown.unknown);assert.deepEqual(unknown.order,plan.picks.map(p=>p.category));
 const timed=route.analyze({...plan,journey:{origin:'Start',order:['dinner','activity','treat','entertainment']}});assert.deepEqual(timed.order,plan.picks.map(p=>p.category));assert.equal(timed.savedMiles,0);
 assert.equal(route.analyze({picks:[{id:'home',category:'dinner',home:{},settings:['home']}]}).home,true);route.setTowns(towns);
});
test('nearby weighting preserves exact candidate count, lock and repeat rules',()=>{
 route.setTowns(towns);const categories=planner.categories;
 const options=categories.flatMap(c=>[stop(c,'Paterson',c+'near'),stop(c,'Jersey City',c+'far')]);
 // Force the modern pair-counting path without bringing in the real catalog.
 const input={budget:10,setting:'indoor',spending:'flexible',mash:{age:'adult',origin:'Paterson',radius:50}};
 let tickets=0;const first=planner.prepare(input,options,false,n=>{tickets=n;return 0;});assert.equal(first.combinationCount,16);
 const counts={near:0,far:0};for(let n=0;n<tickets;n++){const p=planner.prepare(input,options,false,()=>n);counts[p.selectedPicks[0].id.endsWith('near')?'near':'far']++;}assert.ok(counts.near>counts.far);
 const previous=first.selectedPicks.map(p=>p.id);for(const n of [0,.25,.5,.99]){const p=planner.prepare({...input,previous},options,false,max=>Math.floor(max*n));assert.notDeepEqual(p.selectedPicks.map(p=>p.id),previous);}
 const locked=planner.prepare({...input,locked:{dinner:'dinnerfar'}},options,false,()=>0);assert.equal(locked.selectedPicks[0].id,'dinnerfar');
});
function snapshots(){return [0,1,2].map(i=>invite.encode({v:1,ids:['dinner'+i,'activity'+i,'treat'+i,'entertainment'+i],budgetCents:5000,setting:'indoor',mood:'surprise',spending:'flexible',area:'all',date:'2026-11-21',pantry:[],customOptions:[],reserve:{parking:5}}));}
test('vote roundtrip, two-person tally, updated reply and mismatched-plan rejection are bounded',()=>{
 const original={v:1,id:'a'.repeat(32),plans:snapshots(),host:1,guest:null,reply:false};assert.deepEqual(vote.decode(vote.encode(original)),original);
 const reply={...original,reply:true,guest:1},accepted=vote.accept(original,reply);assert.match(vote.result(accepted),/both chose Plan 2/);assert.match(vote.result(vote.accept(accepted,{...reply,guest:2})),/tie/);
 assert.throws(()=>vote.accept(original,{...reply,id:'b'.repeat(32)}));assert.throws(()=>vote.validate({...original,host:3}));assert.throws(()=>vote.validate({...original,plans:[original.plans[0],original.plans[0],original.plans[2]]}));assert.throws(()=>vote.decode('x'.repeat(24001)));assert.throws(()=>vote.decode(vote.encode(original)+'='));
 assert.throws(()=>vote.validate({...original,guest:1,reply:true,privateRating:5}));
});
let server,base,catalog;
before(async()=>{server=require('../server').listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;catalog=(await (await fetch(base+'/api/options')).json()).options;});
after(()=>new Promise(resolve=>server.close(resolve)));
async function post(path,body){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
const home={budget:50,setting:'home',area:'all',date:'2026-11-21',spending:'flexible',reserve:{parking:5,transport:7,extras:3},mash:{age:'teen',origin:'Paterson',radius:25}};
test('three-plan comparison and receiving browser revalidate date, reserves and canonical prices',async()=>{
 const g=await post('/api/generate',home);assert.equal(g.status,200);const token=invite.encode(invite.snapshot(g.data));
 const compared=await post('/api/compare',{token,locked:{dinner:g.data.picks[0].id}});assert.equal(compared.status,200,JSON.stringify(compared));assert.equal(compared.data.plans.length,3);assert.equal(new Set(compared.data.plans.map(vote.identity)).size,3);
 for(const p of compared.data.plans){assert.equal(p.reserveCents,1500);assert.ok(p.plannedTotalCents<=5000);assert.equal(p.date,home.date);assert.equal(p.picks[0].id,g.data.picks[0].id);assert.equal(p.route.home,true);}
 const ballot={v:1,id:'c'.repeat(32),plans:compared.data.plans.map(p=>invite.encode(invite.snapshot(p))),host:0,guest:2,reply:true},received=await post('/api/compare/restore',{token:vote.encode(ballot)});assert.equal(received.status,200);assert.deepEqual(received.data.plans.map(p=>p.picks.map(o=>o.id)),compared.data.plans.map(p=>p.picks.map(o=>o.id)));assert.ok(received.data.plans.every(p=>!Object.hasOwn(p,'taste')&&!Object.hasOwn(p,'ratings')));
 const allLocked=await post('/api/compare',{token,locked:Object.fromEntries(g.data.picks.map(p=>[p.category,p.id]))});assert.equal(allLocked.status,422);assert.match(allLocked.data.error,/three different/);
});
test('indoor backup keeps other three canonical IDs, reserve, date and complete budget',async()=>{
 // Use explicit real catalog IDs to guarantee an outdoor original and affordable indoor alternatives.
 const original=catalog.find(o=>o.category==='activity'&&o.settings.includes('outdoor')&&o.venue&&planner.eligible(o,'all','2026-11-21')&&journey.matchesMash(o,{age:'21plus',origin:'Paterson',radius:50}));assert.ok(original);
 const g=await post('/api/generate',{budget:1000,area:'paterson',setting:'any',date:'2026-11-21',spending:'flexible',reserve:{parking:10,extras:20},mash:{age:'21plus',origin:'Paterson',radius:50},locked:{activity:original.id}});assert.equal(g.status,200,JSON.stringify(g));
 const token=invite.encode(invite.snapshot(g.data)),b=await post('/api/backup',{token,category:'activity'});assert.equal(b.status,200,JSON.stringify(b));
 const replacement=b.data.picks.find(p=>p.category==='activity');assert.ok(replacement.settings.includes('indoor'));assert.ok(!replacement.settings.includes('home'));assert.notEqual(replacement.id,original.id);
 for(const p of b.data.picks)if(p.category!=='activity')assert.equal(p.id,g.data.picks.find(o=>o.category===p.category).id);
 assert.equal(b.data.reserveCents,3000);assert.equal(b.data.date,g.data.date);assert.ok(b.data.plannedTotalCents<=100000);
 const restored=await post('/api/restore',{token:invite.encode(invite.snapshot(b.data))});assert.equal(restored.status,200);
 const fail=await post('/api/backup',{token,category:'activity',excluded:catalog.filter(o=>o.category==='activity'&&o.settings.includes('indoor')).map(o=>o.id)});assert.equal(fail.status,422);assert.match(fail.data.error,/keeping your other stops/);
});
test('new endpoints reject wrong fields, tokens, exclusions and malformed JSON without saving ballots',async()=>{
 for(const [path,body]of [['/api/compare',{token:'bad'}],['/api/backup',{token:'bad',category:'activity'}],['/api/compare/restore',{token:'bad'}],['/api/compare/restore',{token:'bad',extra:true}],['/api/compare',null]]){const r=await post(path,body);assert.equal(r.status,400,JSON.stringify(r));assert.equal(typeof r.data.error,'string');}
 const g=await post('/api/generate',home),token=invite.encode(invite.snapshot(g.data));assert.equal((await post('/api/backup',{token,category:'dinner'})).status,400);assert.equal((await post('/api/compare',{token,excluded:['not-known']})).status,400);for(const bad of [null,false,0,'']){assert.equal((await post('/api/compare',{token,excluded:bad})).status,400);assert.equal((await post('/api/compare',{token,locked:bad})).status,400);}
 const malformed=await fetch(base+'/api/compare',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(malformed.status,400);
 const oversized=await post('/api/compare/restore',{token:'x'.repeat(33000)});assert.equal(oversized.status,413);
});
