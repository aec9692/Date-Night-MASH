const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const invite=require('../public/date-invite');
const plan={title:'Our cozy date',picks:['dinner','activity','treat','entertainment'].map((category,index)=>({id:'fixture-'+category,category,name:'Our '+category,costCents:(index+1)*100,description:'A planning idea.'})),budgetCents:5000,totalCents:1000,remainingCents:4000,setting:'home',mood:'cozy',spending:'flexible',area:'general',date:'',pantry:[],customOptions:[]};
const when={date:'2026-11-19',start:'18:00',end:'21:00',timeZone:'America/New_York'};
const unfolded=ics=>ics.replace(/\r\n /g,'');
test('compact links round-trip Unicode personal choices without copying prices or venue metadata',()=>{
 const custom={id:'custom-a',name:'Crêpes 💛',category:'dinner',costCents:1000,settings:['home']};
 const snapshot=invite.snapshot({...plan,customOptions:[custom]},when,'activity');
 const encoded=invite.encode(snapshot),decoded=invite.decode(encoded);
 assert.deepEqual(decoded,snapshot);assert.match(encoded,/^[A-Za-z0-9_-]+$/);
 assert.equal(decoded.customOptions[0].name,'Crêpes 💛');
 assert.equal('picks'in decoded,false);assert.equal('totalCents'in decoded,false);assert.equal('title'in decoded,false);
 assert.equal(decoded.proposal,'activity');assert.deepEqual(decoded.when,when);
});
test('browser UTF-8 codec agrees with Node without a Buffer global',()=>{
 const context=vm.createContext({TextEncoder,TextDecoder,Intl,URL,URLSearchParams,Date,btoa:value=>Buffer.from(value,'binary').toString('base64'),atob:value=>Buffer.from(value,'base64').toString('binary')});
 vm.runInContext(fs.readFileSync('public/date-invite.js','utf8'),context);
 const snapshot=invite.snapshot(plan,when),encoded=context.DateInvite.encode(snapshot);
 assert.equal(encoded,invite.encode(snapshot));assert.deepEqual(JSON.parse(JSON.stringify(context.DateInvite.decode(encoded))),snapshot);
});
test('link shape, versions, malformed encodings and size limits reject readable errors',()=>{
 const snapshot=invite.snapshot(plan);
 for(const value of [{...snapshot,v:2},{...snapshot,extra:true},{...snapshot,budgetCents:1.5},{...snapshot,budgetCents:-1},{...snapshot,budgetCents:1000001},{...snapshot,ids:['a','a','b','c']},{...snapshot,ids:['bad id','b','c','d']},{...snapshot,setting:'beach'},{...snapshot,pantry:['unknown']},{...snapshot,pantry:['art','art']},{...snapshot,customOptions:Array(5).fill({})},{...snapshot,proposal:'other'},{...snapshot,mash:{},journey:{}},{...snapshot,journey:{format:'quick'}}])assert.throws(()=>invite.encode(value),Error);
 for(const token of ['',null,'!','a','a'.repeat(12001),'e30','_w'])assert.throws(()=>invite.decode(token),Error);
 const special=Buffer.from(JSON.stringify({...snapshot,fit:JSON.parse('{"__proto__":{}}')})).toString('base64url');assert.throws(()=>invite.decode(special),/unsupported/);
 assert.throws(()=>invite.encode({...snapshot,customOptions:[{name:'x'.repeat(9000)}]}),/too large/);
 const json=JSON.stringify(snapshot),pretty=Buffer.from(JSON.stringify(snapshot,null,2)).toString('base64url');assert.throws(()=>invite.decode(pretty),/malformed/);assert.ok(json.length<9000);
});
test('preferences lock canonical categories while leaving source data to server validation',()=>{
 const snapshot=invite.snapshot(plan,when),prefs=invite.preferences(snapshot);
 assert.equal(prefs.budget,50);assert.deepEqual(prefs.locked,{dinner:'fixture-dinner',activity:'fixture-activity',treat:'fixture-treat',entertainment:'fixture-entertainment'});
 assert.equal('previous'in prefs,false);assert.equal('recent'in prefs,false);assert.equal('when'in prefs,false);
 const quick={...plan,picks:[plan.picks[0],plan.picks[2]],journey:{format:'quick',origin:'Paterson',seen:['hidden-private-history'],fresh:true}};
 const short=invite.snapshot(quick);assert.equal('seen'in short.journey,false);assert.equal(short.journey.fresh,false);
 assert.deepEqual(invite.preferences(short).locked,{dinner:'fixture-dinner',treat:'fixture-treat'});
 prefs.locked.dinner='changed';assert.equal(snapshot.ids[0],'fixture-dinner');
});
test('calendar requires an explicit valid date, later same-day end and supported zone',()=>{
 assert.deepEqual(invite.normalizeWhen(when),when);
 for(const value of [null,{}, {...when,date:'2026-02-30'},{...when,date:'2026-13-01'},{...when,start:'24:00'},{...when,end:'18:00'},{...when,end:'17:59'},{...when,timeZone:'Not/AZone'},{...when,extra:true}])assert.throws(()=>invite.normalizeWhen(value),Error);
 assert.throws(()=>invite.normalizeWhen({...when,date:'2026-03-08',start:'02:15',end:'03:30'}),/does not exist/);
 assert.throws(()=>invite.normalizeWhen({...when,date:'2026-03-08',start:'01:15',end:'02:30'}),/does not exist/);
});
test('Google drafts use official event-edit template with UTC instants and IANA zones',()=>{
 const url=new URL(invite.googleUrl(plan,when,'https://example.com/#date=abc'));
 assert.equal(url.origin,'https://calendar.google.com');assert.equal(url.pathname,'/calendar/r/eventedit');
 assert.equal(url.searchParams.get('action'),'TEMPLATE');assert.equal(url.searchParams.get('dates'),'20261119T230000Z/20261120T020000Z');
 assert.equal(url.searchParams.get('stz'),'America/New_York');assert.equal(url.searchParams.get('etz'),'America/New_York');
 assert.match(url.searchParams.get('details'),/Estimated total: \$10.00/);assert.match(url.searchParams.get('details'),/https:\/\/example.com\/#date=abc/);
 const summer=new URL(invite.googleUrl(plan,{...when,date:'2026-07-10'}));assert.equal(summer.searchParams.get('dates'),'20260710T220000Z/20260711T010000Z');
 const quarter=new URL(invite.googleUrl(plan,{...when,timeZone:'Asia/Kathmandu'}));assert.equal(quarter.searchParams.get('dates'),'20261119T121500Z/20261119T151500Z');
 const ambiguous=new URL(invite.googleUrl(plan,{...when,date:'2026-11-01',start:'01:15',end:'01:45'}));assert.equal(ambiguous.searchParams.get('dates'),'20261101T051500Z/20261101T054500Z');
});
test('ICS is a single escaped UTF-8 folded tentative event, without invitations or calendar account writes',()=>{
 const hostile={...plan,title:'Cake; movie, night\\\nBEGIN:VEVENT',picks:plan.picks.map((pick,index)=>({...pick,name:index?'Café 💛 '.repeat(35):'Dinner\nEND:VEVENT'}))};
 const text=invite.ics(hostile,when,'https://example.com/#date=abc'),flat=unfolded(text);
 assert.ok(text.endsWith('\r\n'));assert.equal((text.match(/(?:^|\r\n)BEGIN:VEVENT\r\n/g)||[]).length,1);
 assert.match(flat,/DTSTART:20261119T230000Z/);assert.match(flat,/DTEND:20261120T020000Z/);assert.match(flat,/SUMMARY:Cake\\; movie\\, night\\\\\\nBEGIN:VEVENT/);
 assert.match(flat,/STATUS:TENTATIVE/);assert.doesNotMatch(flat,/\r\n(?:ORGANIZER|ATTENDEE):/);
 assert.ok(flat.includes('Café 💛'));for(const line of text.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75,line);
 const one=invite.ics(plan,when).match(/UID:([^\r\n]+)/)[1],two=invite.ics(plan,when).match(/UID:([^\r\n]+)/)[1];assert.equal(one,two);
});
test('summary is a useful note and omits unsafe links',()=>{
 const note=invite.summary(plan,when,'https://example.com/#date=abc','treat');
 for(const category of ['Dinner','Activity','Treat','Entertainment'])assert.match(note,new RegExp(category+':'));
 assert.match(note,/A date for two/);assert.match(note,/Remaining: \$40.00/);assert.match(note,/replace treat/);
 assert.doesNotMatch(invite.summary(plan,null,'javascript:alert(1)'),/javascript:/);
 assert.throws(()=>invite.summary({...plan,totalCents:9999999}),/affordable/);
});
test('platform recommendation covers iPhone, iPad desktop mode, Android and desktop',()=>{
 assert.equal(invite.recommended({userAgent:'Mozilla iPhone OS 26',platform:'iPhone'}),'apple');
 assert.equal(invite.recommended({userAgent:'Mozilla Macintosh',platform:'MacIntel',maxTouchPoints:5}),'apple');
 assert.equal(invite.recommended({userAgentData:{platform:'Android'},userAgent:'Android'}),'google');
 assert.equal(invite.recommended({platform:'MacIntel',maxTouchPoints:0}),'google');assert.equal(invite.recommended({}),'google');
});
