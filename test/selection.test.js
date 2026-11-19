const {test}=require('node:test');
const assert=require('node:assert/strict');
const planner=require('../public/planner');
const local=require('../data/local-options.json');
const general=require('../data/options.json');

test('streaming selection covers every weighted ticket without retaining candidates',()=>{
 const catalog=[
  {id:'d1',category:'dinner',costCents:100,settings:['indoor'],moods:['cozy']},
  {id:'d2',category:'dinner',costCents:200,settings:['indoor'],moods:[]},
  ...['activity','treat','entertainment'].map(category=>({id:category,category,costCents:0,settings:['indoor'],moods:[]}))
 ];
 const totals={d1:0,d2:0};
 for(let ticket=0;ticket<5;ticket++){
  const result=planner.prepare({budget:10,spending:'flexible',mood:'cozy'},catalog,false,total=>{assert.equal(total,5);return ticket;});
  assert.deepEqual(result.plans,[]);totals[result.selectedPicks[0].id]++;
 }
 assert.deepEqual(totals,{d1:4,d2:1});
 const first=planner.prepare({budget:10,spending:'flexible'},catalog,false,()=>0);
 const next=planner.prepare({budget:10,spending:'flexible',previous:first.selectedPicks.map(pick=>pick.id)},catalog,false,()=>0);
 assert.notEqual(next.selectedPicks[0].id,first.selectedPicks[0].id);
});

test('expanded mixed deck selects high-budget flexible plans with bounded retained memory',()=>{
 const result=planner.prepare({budget:10000,spending:'flexible',area:'all'},[...general,...local],false,total=>total-1);
 assert.ok(result.combinationCount>1000000);
 assert.equal(result.selectedPicks.length,4);assert.deepEqual(result.plans,[]);
 assert.ok(result.selectedPicks.reduce((sum,pick)=>sum+pick.costCents,0)<=1000000);
});

test('new local quantities, closure rules, and explicitly restricted offers are preserved',()=>{
 const byId=id=>local.find(option=>option.id===`nj-${id}`);
 assert.equal(byId('ice-vault').pricing.baseCents,5000);
 assert.match(byId('ice-vault').description,/rental included/);
 assert.equal(byId('gravity-boulder').pricing.baseCents,2*(2800+600+300));
 assert.equal(byId('nj-rock-gym').pricing.baseCents,2*(2400+1000));
 assert.deepEqual(byId('fusion-thursday').venue.openDays,[4]);
 assert.deepEqual(byId('viaggio-steak').venue.openDays,[0,3,4,5,6]);
 assert.equal(byId('luciano-vodka').pricing.baseCents,5190);
 assert.match(byId('luciano-vodka').venue.hoursNote,/3.75%/);
 assert.equal(byId('applegate-cups').pricing.baseCents,1734);
 assert.ok(['Wayne','Montclair','Totowa'].every(city=>new Set(local.filter(option=>option.venue.city===city).map(option=>option.venue.id)).size>=4));
});

test('home-screen manifest points to locally served icons with safe standalone configuration',()=>{
 const fs=require('node:fs');const manifest=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));
 assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/');
 for(const icon of manifest.icons){assert.ok(fs.existsSync(`public${icon.src}`));assert.ok([192,512].includes(Number(icon.sizes.split('x')[0])));}
});
