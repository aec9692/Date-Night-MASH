const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const app=require('../server'),invite=require('../public/date-invite'),fitRules=require('../public/date-fit');
const guides=require('../data/home-guides.json'),home=require('../data/home-options.json');
let server,base,catalog;
before(async()=>{server=app.listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;catalog=(await (await fetch(base+'/api/options')).json()).options;});
after(()=>new Promise(resolve=>server.close(resolve)));
async function post(path,body){return fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}
async function generate(extra={}){const response=await post('/api/generate',{budget:50,setting:'home',area:'paterson',spending:'flexible',mash:{age:'teen',origin:'Paterson',radius:10},...extra});const data=await response.json();return {response,data};}
const when={date:'2026-11-21',start:'18:00',end:'21:00',timeZone:'America/New_York'};
test('all new home ideas have quantities, equipment, difficulty and honest preparation estimates',()=>{
 assert.equal(Object.keys(guides).length,246);
 for(const option of home){const guide=guides[option.id];assert.ok(guide,option.id);for(const field of ['prepMinutes','activeMinutes','totalMinutes'])assert.ok(Number.isInteger(guide[field])&&guide[field]>=0,option.id+' '+field);
  assert.ok(['beginner','moderate','project'].includes(guide.difficulty));assert.ok(Array.isArray(guide.equipment));assert.equal(typeof guide.quantityNote,'string');
  assert.deepEqual(guide.ingredients.map(item=>item.name),option.home.ingredients);for(const item of guide.ingredients)assert.ok(typeof item.quantity==='string'&&item.quantity.trim());
 }
});
test('food, beginner, effort and equipment preferences change actual affordable home selections',async()=>{
 for(const diet of ['vegetarian','vegan','dairyFree','glutenFree']){
  const {response,data}=await generate({fit:{diet}});assert.equal(response.status,200,JSON.stringify(data));assert.ok(data.totalCents<=5000);
  for(const pick of data.picks)if(['dinner','treat'].includes(pick.category)||pick.home?.ingredients?.length)assert.ok(pick.guide.dietary.includes(diet),pick.name);
 }
 const {response,data}=await generate({fit:{cooking:'beginner',effort:'gentle',equipment:fitRules.equipment,accessChecklist:true}});
 assert.equal(response.status,200,JSON.stringify(data));assert.equal(data.fit.accessChecklist,true);
 for(const pick of data.picks){assert.ok(fitRules.matches(pick,data.fit));if(['dinner','treat'].includes(pick.category))assert.equal(pick.guide.difficulty,'beginner');}
});
test('source-only outings retain actual checked venues and personal estimates cannot bypass that preference',async()=>{
 const {response,data}=await generate({budget:150,setting:'indoor',area:'all',fit:{verifiedOnly:true}});assert.equal(response.status,200,JSON.stringify(data));assert.ok(data.picks.every(p=>p.venue&&p.pricing.sourceUrl));
 const personal={id:'custom-test',name:'Our own place',category:'dinner',costCents:1000,settings:['indoor']};
 const blocked=await generate({setting:'indoor',fit:{verifiedOnly:true},customOptions:[personal],locked:{dinner:personal.id}});assert.equal(blocked.response.status,422);
});
test('malformed personal-fit input is rejected before selection',async()=>{
 for(const fit of [null,[],{diet:'allergy'},{effort:'extreme'},{cooking:'chef'},{equipment:['oven','oven']},{equipment:['unknown']},{verifiedOnly:'yes'},{unknown:true}])assert.equal((await generate({fit})).response.status,400);
});
test('curated nearby route works independently of map providers and rejects malformed query input',async()=>{
 const response=await fetch(base+'/api/nearby-curated?lat=40.9168&lon=-74.1718&radius=10&kind=all'),data=await response.json();
 assert.equal(response.status,200);assert.ok(data.results.length>0);assert.equal(data.source,'curated');assert.ok(data.results.every(p=>p.priceKnown&&p.sourceUrl&&p.optionIds.length));
 for(const query of ['lat=NaN&lon=0&radius=10','lat=40&lon=-74&radius=11','lat=&lon=-74&radius=10','lat=40&lat=41&lon=-74&radius=10','lat=40&lon=-74&radius=10&other=1'])assert.equal((await fetch(base+'/api/nearby-curated?'+query)).status,400);
});
test('portable links restore exact picks, canonical costs, fit and partner suggestions',async()=>{
 const first=await generate({fit:{cooking:'beginner'}});assert.equal(first.response.status,200);const snapshot=invite.snapshot(first.data,when,'activity'),token=invite.encode(snapshot);
 const response=await post('/api/restore',{token}),data=await response.json();assert.equal(response.status,200,JSON.stringify(data));
 assert.deepEqual(data.plan.picks.map(p=>p.id),first.data.picks.map(p=>p.id));assert.equal(data.plan.totalCents,first.data.totalCents);assert.equal(data.plan.remainingCents,first.data.remainingCents);assert.equal(data.plan.fit.cooking,'beginner');assert.deepEqual(data.when,when);assert.equal(data.proposal,'activity');
 assert.ok(!JSON.stringify(snapshot).includes('costBasis'));assert.ok(!JSON.stringify(snapshot).includes('description'));
});
test('calendar HTTP response is a one-event import with the complete plan and correct UTC times',async()=>{
 const {data:plan}=await generate(),token=invite.encode(invite.snapshot(plan,when));const response=await fetch(base+'/api/calendar?token='+encodeURIComponent(token)),text=await response.text();
 assert.equal(response.status,200,text);assert.match(response.headers.get('content-type'),/text\/calendar/);assert.match(response.headers.get('content-disposition'),/date-night-mash\.ics/);assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal((text.match(/BEGIN:VEVENT/g)||[]).length,1);assert.match(text,/DTSTART:20261121T230000Z/);assert.match(text,/DTEND:20261122T020000Z/);assert.match(text,/STATUS:TENTATIVE/);assert.doesNotMatch(text,/ATTENDEE|ORGANIZER/);
 const unfolded=text.replace(/\r\n /g,'');for(const pick of plan.picks)assert.ok(unfolded.includes(pick.name));assert.ok(unfolded.includes('Estimated total'));
});
test('shared-date and calendar routes reject tampering, missing dates and impossible budgets',async()=>{
 const {data:plan}=await generate(),snapshot=invite.snapshot(plan),token=invite.encode(snapshot);
 assert.equal((await fetch(base+'/api/calendar?token='+token)).status,400);
 for(const broken of [{...snapshot,v:2},{...snapshot,picks:[{costCents:0}]},{...snapshot,when:{...when,start:'99:00'}}]){
  const bad=Buffer.from(JSON.stringify(broken)).toString('base64url');assert.equal((await post('/api/restore',{token:bad})).status,400);
 }
 assert.equal((await post('/api/restore',{token:invite.encode({...snapshot,budgetCents:0})})).status,422);
 assert.equal((await post('/api/restore',{token,extra:true})).status,400);assert.equal((await post('/api/restore',{token:'bad'})).status,400);
 assert.equal((await fetch(base+'/api/calendar?token='+token+'&other=1')).status,400);
});
test('calendar import rechecks recorded closures for the chosen date',async()=>{
 const {response,data}=await generate({budget:200,setting:'any',area:'paterson',date:'2026-11-20',locked:{activity:'nj-mam'}});assert.equal(response.status,200,JSON.stringify(data));
 const token=invite.encode(invite.snapshot(data,{...when,date:'2026-11-19'}));const result=await fetch(base+'/api/calendar?token='+token);assert.equal(result.status,422);assert.match((await result.json()).error,/activity/);
});
