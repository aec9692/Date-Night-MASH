const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const lookup=require('../public/location-lookup'),index=require('../data/location-index.json'),towns=require('../data/towns.json').towns;
const {createLocationSearch}=require('../lib/location-search');
test('local NJ index covers every supported town with source-backed ZIPs and unchanged town centers',()=>{
 assert.equal(index.locations.length,43);assert.deepEqual(index.locations.map(l=>l.name).sort(),Object.keys(towns).sort());
 for(const location of index.locations){assert.deepEqual([location.lat,location.lon],towns[location.name]);for(const zip of location.postcodes){assert.match(zip,/^\d{5}$/);assert.ok(location.postalEvidence.some(e=>e.postcode===zip&&e.sourceUrl.startsWith('https://')));}}
});
test('common city formats, compact names and leading-zero ZIPs resolve locally',()=>{
 for(const [query,town]of [['Paterson','Paterson'],['wayne nj','Wayne'],['Wayne, New Jersey','Wayne'],['FAIRLAWN','Fair Lawn'],['Parsippany-Troy Hills Township, NJ','Parsippany'],['07501','Paterson'],['07470','Wayne'],['07652','Paramus'],['07054','Parsippany']]){
  const matches=lookup.find(query,index.locations);assert.equal(matches.length,1,query);assert.equal(matches[0].town,town,query);assert.equal(matches[0].local,true);assert.match(matches[0].label,/town center/);
 }
});
test('shared ZIPs preserve town choices and other-state or malformed searches are not guessed as NJ',()=>{
 assert.deepEqual(lookup.find('07424',index.locations).map(c=>c.town).sort(),['Little Falls','Woodland Park']);
 for(const query of ['Wayne, PA','Fair Lawn, NY','Union, NJ','Jersey','123 Main St','0750','<script>',''])assert.deepEqual(lookup.find(query,index.locations),[]);
 assert.equal(lookup.find('Jersey City, NJ',index.locations)[0].town,'Jersey City');assert.equal(lookup.find('Paramus',index.locations)[0].town,'Paramus');assert.ok(lookup.find('Mont',index.locations,{prefix:true}).some(choice=>choice.town==='Montclair'));
});
test('all bundled cities and ZIP associations work even when the live geocoder is unavailable',async()=>{
 let calls=0;const api=createLocationSearch({localLocations:index.locations,fetch:async()=>{calls++;throw Error('Provider unavailable');}});
 for(const town of index.locations){const response=await api.geocode(town.name);assert.ok(response.choices.some(c=>c.town===town.name));for(const zip of town.postcodes)assert.ok((await api.geocode(zip)).choices.some(c=>c.town===town.name));}
 assert.equal(calls,0);await assert.rejects(api.geocode('Unknownville, Oregon'));assert.equal(calls,1);
});
let server,base;
before(async()=>{server=require('../server').listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;});
after(()=>new Promise(resolve=>server.close(resolve)));
test('actual location route returns local city/ZIP matches that immediately find curated nearby places',async()=>{
 for(const query of ['Paterson','07501','Wayne NJ','07470','Montclair','Paramus']){
  const response=await fetch(base+'/api/locations?q='+encodeURIComponent(query)),data=await response.json();assert.equal(response.status,200);assert.equal(data.source,'local-nj');assert.equal(data.choices.length,1,query);
  const choice=data.choices[0],near=await (await fetch(base+'/api/nearby-curated?'+new URLSearchParams({lat:choice.lat,lon:choice.lon,radius:10,kind:'all'}))).json();assert.ok(near.results.length>0,query);
 }
 assert.equal((await (await fetch(base+'/api/options')).json()).locations.length,43);
});
