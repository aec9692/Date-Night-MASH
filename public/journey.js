/* Shared planning estimates. No live traffic, venue availability or dietary guarantees. */
(function(root){
 const formats={quick:{label:'Quick date',minutes:150,categories:['dinner','treat']},evening:{label:'Evening out',minutes:300,categories:['dinner','activity','treat']},full:{label:'Full-day adventure',minutes:540,categories:['dinner','activity','treat','entertainment']}};
 const cuisines=['any','italian','mexican','asian','peruvian','cafe'];
 let towns={},metadata=new WeakMap(),travelCache=new Map();
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const fail=(error,status=400,extra={})=>({error,status,...extra});
 const routes=typeof module==='object'&&module.exports?require('./date-route'):root.DateRoute;
 function setTowns(data){towns=data?.towns||data||{};travelCache.clear();routes.setTowns(data);}
 function normalizeMash(value){
  if(!object(value)||Object.keys(value).some(k=>!['age','origin','radius'].includes(k)))return null;
  const normalized=normalize({format:'full',...value});
  return normalized?{age:normalized.age,origin:normalized.origin,radius:normalized.radius}:null;
 }
 function matchesMash(option,mash,location=null){
  if(option.place){const center=location?[location.lat,location.lon]:towns[mash.origin];if(miles(center,[option.place.lat,option.place.lon])>mash.radius)return false;}
  if(location&&option.venue){const point=towns[option.venue.city],distance=miles([location.lat,location.lon],point);if(distance===null||distance>mash.radius)return false;}
  return matches(option,{...mash,...(location?{radius:Infinity}:{}),alcoholFree:true,lowEffort:false,vegetarian:false,fresh:false,seen:[],cuisine:'any',partner:null});
 }
 function normalize(value){
  if(!object(value)||Object.keys(value).some(k=>!['format','start','origin','radius','legMiles','age','cuisine','vegetarian','lowEffort','alcoholFree','fresh','seen','partner','order'].includes(k)))return null;
  const j={format:'quick',start:'17:00',origin:'Paterson',radius:10,legMiles:10,age:'teen',cuisine:'any',vegetarian:false,lowEffort:false,alcoholFree:true,fresh:false,seen:[],partner:null,...value};
  if(!Object.hasOwn(formats,j.format)||typeof j.start!=='string'||!/^\d{2}:\d{2}$/.test(j.start)||Number(j.start.slice(0,2))>23||Number(j.start.slice(3))>59||!Object.hasOwn(towns,j.origin)||![5,10,15,25,50].includes(j.radius)||![0,5,10,15,25,50].includes(j.legMiles)||!['teen','adult','21plus'].includes(j.age)||!cuisines.includes(j.cuisine))return null;
  if(['vegetarian','lowEffort','alcoholFree','fresh'].some(k=>typeof j[k]!=='boolean')||!Array.isArray(j.seen)||j.seen.length>40||new Set(j.seen).size!==j.seen.length||j.seen.some(id=>typeof id!=='string'||id.length>100))return null;
  if(j.partner!==null&&(!object(j.partner)||Object.keys(j.partner).some(k=>!['mood','cuisine'].includes(k))||!['surprise','cozy','romantic','competitive','adventurous'].includes(j.partner.mood)||!cuisines.includes(j.partner.cuisine)))return null;
  j.order=j.order||[...formats[j.format].categories];
  if(!Array.isArray(j.order)||j.order.length!==formats[j.format].categories.length||new Set(j.order).size!==j.order.length||j.order.some(c=>!formats[j.format].categories.includes(c)))return null;
  return j;
 }
 function miles(a,b){if(!a||!b)return null;const r=x=>x*Math.PI/180;const n=Math.sin(r(b[0]-a[0])/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(r(b[1]-a[1])/2)**2;return 3958.8*2*Math.asin(Math.sqrt(Math.min(1,n)));}
 function meta(o){
  if(metadata.has(o))return metadata.get(o);
  const text=`${o.name} ${o.description}`.toLowerCase(),v=o.venue?.id||'';
  let cuisine='other';
  if(/pizza|pasta|panini|calzone|parmigiana|linguini|scampi|lumache|pomodoro|risotto|italian/.test(text))cuisine='italian';
  else if(/taco|burrito|mexican|tamale/.test(text)&&v!=='peruanito')cuisine='mexican';
  else if(/sushi|udon|maki|ramen|korean|chinese|hibachi/.test(text))cuisine='asian';
  else if(/peruanito|ceviche517/.test(v)||/peruvian/.test(text))cuisine='peruvian';
  else if(/toast|waffle|breakfast|brunch|sandwich|croissant|cafe|café/.test(text))cuisine='cafe';
  const alcohol=/wine tasting|winery|brewery|beer tasting|cocktail (?:bar|crawl|class)|mixology|champagne|bourbon tasting/.test(text);
  let physical=/climb|boulder|axe|hatchet|hike|hiking|skating|kayak|laser tag|go-kart|race, play|pickleball|dance class/.test(text);
  const massage=/massage|reflexology|spa day/.test(text);
  const vegetarian=o.category!=='dinner'||/vegetarian|veggie|cauliflower.taco|pomodoro|cheese pizza|cheese calzone|eggplant|avocado.toast|waffle|french.toast|breakfast sammie|pasta night|pack a picnic/.test(text)&&!/chicken|beef|ham|pork|bacon|sausage|sandwich/.test(text);
  let duration={dinner:60,activity:60,treat:25,entertainment:75}[o.category];
  if(/walk|stroll|wander|pond|mural|garden|gallery/.test(text))duration=45;
  if(/museum/.test(text))duration=75;
  if(/(?:film|movie|screening|cinema)/.test(text))duration=140;
  if(/ninety|90.minute/.test(text))duration=90;
  else if(/half.hour|30.minute/.test(text))duration=30;
  else if(/two.hour|120.minute/.test(text))duration=120;
  else if(/five.hour/.test(text))duration=300;
  else if(/one.hour|60.minute|one hour|one-hour/.test(text))duration=60;
  if(/all.day|full.day/.test(text))duration=180; // Pass validity is longer; this is a suggested visit.
  if(/two climbs|first.climbs/.test(text))duration=30;
  if(o.category==='treat')duration=25;
  let window=[9*60,21*60],hoursKnown=false;
  if(o.category==='dinner')window=[11*60,21*60];
  if(o.settings.includes('home'))window=[8*60,22*60];
  if(o.settings.length===1&&o.settings[0]==='outdoor')window=[9*60,16*60]; // Conservative daylight planning, not a sunset forecast.
  if(/museum|galler|historic.house|art center/.test(text))window=[10*60,16*60];
  if(/breakfast|brunch|daytime|lunch/.test(text)||/breakfast|daytime|lunch only/i.test(o.venue?.hoursNote||''))window=[9*60,15*60];
  if(v==='imperial'&&/lunch/.test(text)){window=[690,900];hoursKnown=true;}
  if(v==='arca'){window=[17*60,21*60];hoursKnown=true;}
  if(v==='citybistro'){window=[16*60,22*60];hoursKnown=true;}
  const known={
   mam:[660,1020],yogi:[720,1020],paterson:[570,990],
   'newark-art':[720,1020],aviation:[630,960],'njhof':[720,1080],'morris-museum':[660,1020],
   pcarts:[660,1020],arthouse:[780,960],belskie:[840,960],pascack:[780,960],meadowlands:[600,960],
   segal:[720,960],wpu:[600,840],edison:[570,990],stumpys:[17*60,20*60],
   'taiji-fairlawn':[630,1290]
  };
  if(known[v]){window=known[v];hoursKnown=true;}
  if(v==='billy'){window=[17*60,22*60];hoursKnown=true;}
  if(v==='monster-paramus'){window=[14*60,20*60];hoursKnown=true;}
  if(v==='hob-hist'){window=[14*60,17*60];hoursKnown=true;}
  const experience=o.experience||{};
  if(Number.isInteger(experience.durationMinutes)&&experience.durationMinutes>0)duration=experience.durationMinutes;
  if(Array.isArray(experience.planningWindow)){window=experience.planningWindow;hoursKnown=true;}
  if(experience.physicalEffort)physical=experience.physicalEffort!=='low';
  const moods=physical?['adventurous','competitive']:/arcade|bowling|game|golf|racing|escape/.test(text)?['competitive','adventurous']:/museum|gallery|coffee|cappuccino|espresso|bakery|pastry|cookie/.test(text)?['cozy','romantic']:/park|garden|waterfront|skyline|picnic/.test(text)?['romantic','adventurous']:['cozy','romantic'];
  const flags=[`${duration} min planned`,...(hoursKnown?['Check current hours']:['Hours need confirmation']),...(/shared|share|one .*pizza/i.test(o.description)?['Shared order']:[]),...(/reserv|book|appointment|session/i.test(o.venue?.hoursNote||'')?['Check booking']:[])];
  if(physical&&v.includes('gravity'))flags.push('Under 18: guardian waiver');
  if(experience.adultRequiredUnder)flags.push(`Under ${experience.adultRequiredUnder}: adult required`);
  if(experience.guardianWaiverUnder)flags.push(`Under ${experience.guardianWaiverUnder}: guardian waiver`);
  if(experience.participantAgeAtLeast)flags.push(`Group needs someone ${experience.participantAgeAtLeast}+`);
  if(/stairs|no elevator/i.test(o.venue?.hoursNote||''))flags.push('Check stairs / access');
  const result={cuisine,vegetarian,alcohol,physical,minimumAge:Math.max(alcohol?21:massage||/stumpys/.test(v)?18:0,experience.minimumAge||0),partyMinimumAge:experience.participantAgeAtLeast||0,adultRequiredUnder:experience.adultRequiredUnder||0,duration,window,hoursKnown,moods,flags};metadata.set(o,result);return result;
 }
 function matches(o,j){
  const m=meta(o);
  const minimum=j.age==='teen'?13:j.age==='adult'?18:21;
  if(m.minimumAge>minimum||m.partyMinimumAge>minimum||minimum<18&&m.adultRequiredUnder>minimum||j.alcoholFree&&m.alcohol||j.lowEffort&&m.physical||j.vegetarian&&!m.vegetarian||j.fresh&&j.seen.includes(o.id))return false;
  const foodChoices=[j.cuisine,j.partner?.cuisine].filter(c=>c&&c!=='any');
  if(o.category==='dinner'&&foodChoices.length&&!foodChoices.includes(m.cuisine))return false;
  if(o.venue){const distance=miles(towns[j.origin],towns[o.venue.city]);if(distance===null||distance>j.radius)return false;}
  return true;
 }
 function travel(from,to){
  const key=from+'|'+to;if(travelCache.has(key))return travelCache.get(key);
  const distance=miles(towns[from],towns[to]);
  const result=distance===null?{miles:0,minutes:0,unknown:true}:{miles:Math.round(distance*10)/10,minutes:from===to?12:Math.ceil(distance*3)+12,unknown:false};travelCache.set(key,result);return result;
 }
 function minute(value){return Number(value.slice(0,2))*60+Number(value.slice(3));}
 function clock(value){return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;}
 function step(o,j,from,at,first=false){
  const m=meta(o),leg=o.venue?travel(from,o.venue.city):{miles:0,minutes:0,unknown:true};
  if(o.venue&&leg.miles>j.legMiles&&(!first||j.legMiles===0))return null;
  const arrival=at+leg.minutes,start=Math.max(arrival,m.window[0]),end=start+m.duration;
  if(start-arrival>60||end>m.window[1]||end>minute(j.start)+formats[j.format].minutes||end>24*60||j.age==='teen'&&end>21*60)return null;
  return {id:o.id,category:o.category,start:clock(start),end:clock(end),startMinute:start,endMinute:end,travelMinutes:leg.minutes,straightLineMiles:leg.miles,waitingMinutes:start-arrival,hoursKnown:m.hoursKnown,unlocated:leg.unknown};
 }
 function schedule(picks,j){
  let from=j.origin,at=minute(j.start),stops=[];
  for(const category of j.order){const pick=picks.find(o=>o.category===category);if(!pick)return null;const stop=step(pick,j,from,at,stops.length===0);if(!stop)return null;stops.push(stop);at=stop.endMinute;if(pick.venue)from=pick.venue.city;}
  return {stops,start:j.start,end:clock(at),durationMinutes:at-minute(j.start),travelMinutes:stops.reduce((n,s)=>n+s.travelMinutes,0),notice:'Suggested timing; return trip excluded. Distances use town centers, not venue coordinates. Travel allowances are rough, not live drive times. Confirm hours, tickets, age/guardian rules and the route.'};
 }
 function prepare(input,catalog,includePlans,drawTicket,core){
  const j=normalize(input.journey);if(!j)return fail('Choose valid date length, time, town, distance and preferences.');
  const {journey,...base}=input;
  const checked=core.prepare({...base,previous:[]},catalog,false);
  if(checked.status===400)return checked;
  const fitRules=typeof module==='object'&&module.exports?require('./date-fit'):root.DateFit;
  const fit=fitRules.normalize(input.fit);
  const options=[...catalog,...core.customCatalog(input.customOptions||[])],active=formats[j.format].categories;
  if(j.seen.some(id=>!options.some(o=>o.id===id)))return fail('Seen ideas must be IDs from this catalog.');
  if(Object.keys(input.locked||{}).some(c=>!active.includes(c)))return fail('Clear a locked category before choosing a shorter date.',422);
  const previous=input.previous||[];
  if(!Array.isArray(previous)||previous.length&& (previous.length!==active.length||previous.some((id,i)=>!options.some(o=>o.id===id&&o.category===active[i]))))return fail('Previous picks must match the chosen date length.');
  const excluded=new Set(input.excluded||[]),budgetCents=Math.round(input.budget*100);
  const seenVenues=new Set(j.seen.map(id=>options.find(o=>o.id===id)?.venue?.id).filter(Boolean));
  const groups=j.order.map(c=>options.filter(o=>o.category===c&&!o.home&&!o.place&&fitRules.matches(o,fit)&&core.eligible(o,input.area||'all',input.date||'')&&!excluded.has(o.id)&&((input.setting||'any')==='any'||o.settings.includes(input.setting))&&(!input.locked?.[c]||input.locked[c]===o.id)&&matches(o,j)&&(!j.fresh||!o.venue||!seenVenues.has(o.venue.id))));
  const empty=groups.findIndex(g=>!g.length);
  if(empty!==-1)return fail(`No ${j.order[empty]} choices fit these preferences. Try another cuisine, a wider radius, original ideas, or fewer restrictions.`,422);
  const minimumCents=groups.reduce((n,g)=>n+Math.min(...g.map(o=>o.costCents)),0);
  if(budgetCents<minimumCents)return fail(`These choices need at least $${(minimumCents/100).toFixed(2)}. Raise the budget or adjust preferences.`,422,{minimumCents});
  const picks=[],usedVenues=[],plans=[];let combinationCount=0,maximumCents=0,alternativeCount=0,previousTotal=0;
  const rest=groups.map((_,i)=>groups.slice(i+1).reduce((n,g)=>n+Math.min(...g.map(o=>o.costCents)),0));
  const moodList=[input.mood||'surprise',j.partner?.mood].filter(m=>m&&m!=='surprise');
  const planning=typeof module==='object'&&module.exports?require('./date-planning'):root.DatePlanning,taste=planning.taste(input.taste,options);
  const weights=new Map(options.map(o=>[o.id,moodList.reduce((n,m)=>n+(meta(o).moods.includes(m)?3:0),0)+3*planning.preferenceScore(o.id,taste)]));
  // Precompute numeric timing/route data once. Counting millions of dates must
  // not create clock strings, stop objects or complete itineraries per candidate.
  const cities=Object.keys(towns),cityIndex=new Map(cities.map((city,i)=>[city,i]));
  const entries=groups.map((group,index)=>group.map(o=>{
   const m=meta(o),hasVenue=Boolean(o.venue);
   return {o,cost:o.costCents,venue:o.venue?.id,city:hasVenue?cityIndex.get(o.venue.city):-1,
    duration:m.duration,opens:m.window[0],closes:m.window[1],weight:weights.get(o.id),
    changed:o.id!==previous[active.indexOf(o.category)],
    legs:cities.map(city=>hasVenue?travel(city,o.venue.city):{miles:0,minutes:0}),index};
  }));
  const startAt=minute(j.start),originIndex=cityIndex.get(j.origin);
  const latest=Math.min(startAt+formats[j.format].minutes,j.age==='teen'?21*60:24*60);
  let pass=0,targetCents=0,weightTotal=0,ticket=0,selectedPicks=null,selectedSchedule=null;
  function visit(index,total,from,at,changed,score){
   if(selectedPicks)return;
   if(index===groups.length){
    const repeat=!changed;
    if(pass===0){combinationCount++;if(!repeat){alternativeCount++;maximumCents=Math.max(maximumCents,total);}else previousTotal=total;return;}
    if(alternativeCount&&repeat||total<targetCents)return;
    const weight=1+score;
    if(pass===1){weightTotal+=weight;if(includePlans&&!drawTicket)plans.push([...picks].sort((a,b)=>active.indexOf(a.category)-active.indexOf(b.category)));return;}
    ticket-=weight;if(ticket<0)selectedPicks=[...picks].sort((a,b)=>active.indexOf(a.category)-active.indexOf(b.category));return;
   }
   for(const e of entries[index]){
    if(total+e.cost+rest[index]>budgetCents||e.venue&&usedVenues.includes(e.venue))continue;
    const leg=e.legs[from];
    if(e.venue&&leg.miles>j.legMiles&&(index!==0||j.legMiles===0))continue;
    const arrival=at+leg.minutes,start=Math.max(arrival,e.opens),end=start+e.duration;
    if(start-arrival>60||end>e.closes||end>latest)continue;
    picks.push(e.o);usedVenues.push(e.venue);
    visit(index+1,total+e.cost,e.city===-1?from:e.city,end,changed||e.changed,score+e.weight+(e.venue?(leg.miles<=3?3:leg.miles<=7?2:leg.miles<=15?1:0):0));
    picks.pop();usedVenues.pop();
    if(selectedPicks)return;
   }
  }
  visit(0,0,originIndex,startAt,previous.length!==active.length,0);
  if(!combinationCount)return fail('No complete date fits the time, distance and venue rules. Try an earlier start, a shorter date, a different order, or a wider travel limit.',422);
  if(!alternativeCount)maximumCents=previousTotal;
  const near=Math.ceil(budgetCents*.9);targetCents=(input.spending||'treat')==='treat'?(maximumCents>=near?near:Math.ceil(maximumCents*.95)):0;
  pass=1;visit(0,0,originIndex,startAt,previous.length!==active.length,0);
  if(drawTicket){ticket=drawTicket(weightTotal);pass=2;visit(0,0,originIndex,startAt,previous.length!==active.length,0);selectedSchedule=schedule(selectedPicks,j);}
  return {plans,selectedPicks,selectedSchedule,journey:j,fit,combinationCount,maximumCents,targetCents,unchanged:previous.length===active.length&&!alternativeCount,budgetCents,setting:input.setting||'any',mood:input.mood||'surprise',spending:input.spending||'treat',area:input.area||'all',date:input.date||'',customOptions:input.customOptions||[]};
 }
 function ordered(plan){const order=plan.journey?.order||routes.analyze(plan).order;return order.map(c=>plan.picks.find(o=>o.category===c));}
 const api={formats,cuisines,setTowns,normalize,normalizeMash,matchesMash,miles,meta,matches,travel,schedule,prepare,ordered,clock};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.MashJourney=api;
})(typeof globalThis==='object'?globalThis:this);
