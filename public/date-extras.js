/* Explicit household ownership and public-city discovery; no accounts or device GPS. */
window.DateExtras=(()=>{
 const $=selector=>document.querySelector(selector),node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const labels={groceries:'Pasta, rice & basic groceries',seasonings:'Cooking oil & seasonings',baking:'Flour, sugar, eggs & butter',boardGames:'Board games & cards',videoGames:'Video games & a console',art:'Art supplies',streaming:'Streaming access',craft:'Craft supplies'};
 let origin=null,recent=[],pendingPlace=null,searching=false,shoppingKey='',shoppingChecks=new Set(),catalogOptions=[],towns={},locations=[],cityController=null,placeController=null,cityVersion=0,placeVersion=0;
 function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}}
 function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Per-visit choices still work. */}}
 const saved=read('mash-owned-v1',[]),owned=DateCosts.validPantry(saved)?saved:[];
 const field=$('#owned-items');
 for(const key of DateCosts.ownership){const label=node('label'),input=node('input');input.type='checkbox';input.value=key;input.checked=owned.includes(key);label.append(input,document.createTextNode(labels[key]));field.append(label);}
 function pantry(){return [...field.querySelectorAll('input:checked')].map(input=>input.value);}
 field.addEventListener('change',()=>{save('mash-owned-v1',pantry());updatePossibilities();renderCatalog();});
 function restore(plan,{ownership=true}={}){if(ownership){for(const input of field.querySelectorAll('input'))input.checked=(plan.pantry||[]).includes(input.value);save('mash-owned-v1',pantry());}origin=plan.location||null;showOrigin();}
 function remember(plan){if(plan.picks.length!==4)return;const ids=plan.picks.map(pick=>pick.id),key=ids.join('|');recent=[ids,...recent.filter(row=>row.join('|')!==key)].slice(0,8);}
 function recentDates(options){const known=new Set(options.map(option=>option.id));return recent.filter(ids=>ids.every(id=>known.has(id)));}
 function showOrigin(){$('#location-selected').textContent=origin?`MASH starts near ${origin.label}. Radius uses approximate straight-line distance.`:'MASH uses the starting town below. Home dates ignore travel distance.';$('#location-clear').hidden=!origin;}
 function link(text,url){const a=node('a',text);const parsed=new URL(url);if(parsed.protocol!=='https:')return node('span',text);a.href=parsed.href;a.target='_blank';a.rel='noopener noreferrer';return a;}
 async function api(url,controller=new AbortController()){const timer=setTimeout(()=>controller.abort(),20000);try{const response=await fetch(url,{signal:controller.signal}),data=await response.json();if(!response.ok)throw new Error(data.error||'Search unavailable.');return data;}finally{clearTimeout(timer);}}
 function cancelPlaces(){placeVersion++;placeController?.abort();searching=false;$('#live-search').disabled=false;$('#curated-search').disabled=false;}
 function attribution(sources){const container=$('#location-attribution');for(const source of sources||[])if(![...container.querySelectorAll('a')].some(a=>a.href===source.url))container.append(link(source.label,source.url),document.createTextNode(' '));}
 function addEstimate(place){
  document.querySelector('.custom-details').open=true;
  pendingPlace=place;$('#custom-category').value=place.category;$('#custom-name').value=place.name.slice(0,48);$('#custom-cost').value='';$('#custom-setting').value=place.setting||'indoor';
  $('#custom-message').textContent=`Set your own total estimate for two at ${place.name}. This is not a verified price. Up to four personal ideas can be in the mix.`;
  $('#custom-form').scrollIntoView({block:'center'});$('#custom-cost').focus();
 }
 function placeMetadata(){if(!pendingPlace||$('#custom-name').value!==pendingPlace.name.slice(0,48)||!pendingPlace.sourceUrl?.startsWith('https://www.openstreetmap.org/'))return null;return {name:pendingPlace.name,address:pendingPlace.address,lat:pendingPlace.lat,lon:pendingPlace.lon,sourceUrl:pendingPlace.sourceUrl};}
 function center(){const point=towns[$('#mash-town').value];return origin||(point?{lat:point[0],lon:point[1],label:$('#mash-town').value+', NJ'}:null);}
 async function findCurated(){
  const selected=center();if(!selected||searching)return;searching=true;$('#curated-search').disabled=true;$('#location-status').textContent='Finding source-priced NJ choices…';
  const version=++placeVersion;placeController=new AbortController();
  try{
   const data=await api('/api/nearby-curated?'+new URLSearchParams({lat:selected.lat,lon:selected.lon,radius:$('#mash-radius').value,kind:$('#live-kind').value}),placeController);if(version!==placeVersion)return;const list=$('#curated-results');list.replaceChildren();
   for(const place of data.results){const card=node('li',undefined,'live-place');card.append(node('h4',place.name),node('span','Source-priced examples','confidence-badge source'),node('p',place.address),node('p',`$${(place.minCostCents/100).toFixed(2)}–$${(place.maxCostCents/100).toFixed(2)} sample totals for two · about ${place.distanceMiles} miles by town center`),node('p',place.freshnessLabel||`Checked ${place.checkedOn}; reconfirm before visiting.`,'helper'));card.append(link('Official price source',place.sourceUrl),document.createTextNode(' · '),link('Get directions',DateDirections.to(place.address,{town:$('#mash-town').value,location:origin})));
    const option=catalogOptions.find(option=>place.optionIds.includes(option.id));if(option){const b=node('button','Details / build around this','secondary');b.type='button';b.addEventListener('click',event=>previewIdea(option,event.currentTarget));card.append(b);}list.append(card);
   }
   $('#location-status').textContent=data.results.length?`${data.results.length} source-priced choices near ${selected.label}. ${data.notice}`:'No source-priced NJ choices in this radius. Try a wider radius or community map search; unknown prices need your own estimate.';
  }catch(error){if(version===placeVersion)$('#location-status').textContent=error.name==='AbortError'?'NJ search timed out. Try again.':error.message;}
  finally{if(version===placeVersion){searching=false;$('#curated-search').disabled=false;}}
 }
 async function findPlaces(){
  const selected=center();if(!selected||searching)return;searching=true;$('#live-search').disabled=true;$('#location-status').textContent='Looking up community-listed places. Source-priced results stay available below.';
  const version=++placeVersion;placeController=new AbortController();
  try{
   const params=new URLSearchParams({lat:selected.lat,lon:selected.lon,radius:$('#mash-radius').value,kind:$('#live-kind').value});
   const data=await api('/api/nearby?'+params,placeController);if(version!==placeVersion)return;const list=$('#live-results');list.replaceChildren();
   for(const place of data.results){const card=node('li',undefined,'live-place');card.append(node('h4',place.name),node('p',`${place.category} · ${place.distanceMiles} miles · ${place.listedType}`),node('p',place.address||'Street address not recorded. Check the map pin.'),node('p','Price unknown · hours and availability unconfirmed','helper'));
    const links=node('div',undefined,'nearby-actions');links.append(link('Map listing',place.sourceUrl),link('Get directions',place.directionsUrl));if(place.website)links.append(link('Business website',place.website));card.append(links);
    const button=node('button','Add with my own estimate','secondary');button.type='button';button.addEventListener('click',()=>addEstimate(place));card.append(button);list.append(card);
   }
   $('#location-status').textContent=`${data.results.length} map listings. ${data.notice}`;
   attribution(data.attribution);
  }catch(error){if(version===placeVersion)$('#location-status').textContent=error.name==='AbortError'?'Search timed out. Try again; the checked NJ collection still works.':error.message;}
  finally{if(version===placeVersion){searching=false;$('#live-search').disabled=false;}}
 }
 function selectOrigin(choice){
  if(choice.local)attribution([{label:'NJ town centers: U.S. Census',url:'https://tigerweb.geo.census.gov/tigerwebmain/Files/acs26/tigerweb_acs26_cousub_2025_acs25_nj.html'},{label:'ZIP associations: GeoNames / Open-Meteo',url:'https://open-meteo.com/en/docs/geocoding-api'}]);
  cityVersion++;cityController?.abort();$('#location-search').disabled=false;cancelPlaces();
  origin={lat:choice.lat,lon:choice.lon,label:choice.label};if(choice.town&&towns[choice.town])$('#mash-town').value=choice.town;
  $('#location-choices').replaceChildren();$('#curated-results').replaceChildren();$('#live-results').replaceChildren();showOrigin();locks={};updatePossibilities();renderCatalog();$('#live-discovery').hidden=false;
  return findCurated();
 }
 function showChoices(choices){const container=$('#location-choices');container.replaceChildren();for(const choice of choices){const b=node('button','Use '+choice.label,'secondary');b.type='button';b.addEventListener('click',()=>selectOrigin(choice));container.append(b);}}
 async function searchCity(){
  const query=$('#location-query').value.trim();if(!query){$('#location-status').textContent='Enter a city or five-digit ZIP, then press Enter or Find location.';$('#location-query').focus();return;}
  cityController?.abort();cancelPlaces();const version=++cityVersion;cityController=new AbortController();$('#location-search').disabled=true;$('#location-status').textContent='Finding the city or ZIP…';$('#location-choices').replaceChildren();
  try{
   const data=await api('/api/locations?q='+encodeURIComponent(query),cityController);if(version!==cityVersion)return;attribution(data.attribution);
   if(data.choices.length===1){await selectOrigin(data.choices[0]);return;}
   showChoices(data.choices);$('#location-status').textContent=data.choices.length?'Choose the matching town below; nearby choices will load automatically.':'No matching city or ZIP. Try a supported NJ town or a city with its state.';
  }catch(error){if(version===cityVersion)$('#location-status').textContent=error.name==='AbortError'?'City search timed out. Use a local NJ suggestion or try again.':error.message;}
  finally{if(version===cityVersion)$('#location-search').disabled=false;}
 }
 $('#location-search').addEventListener('click',searchCity);
 $('#location-query').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchCity();}});
 $('#location-query').addEventListener('input',()=>{cityVersion++;cityController?.abort();$('#location-search').disabled=false;const matches=LocationLookup.find($('#location-query').value,locations,{prefix:true});showChoices(matches);$('#location-status').textContent=matches.length?'Choose a NJ suggestion below, or press Enter / Find location.':'Type a city or five-digit ZIP, then press Enter / Find location.';});
 $('#location-clear').addEventListener('click',()=>{cityVersion++;cityController?.abort();cancelPlaces();origin=null;$('#location-choices').replaceChildren();$('#curated-results').replaceChildren();$('#live-results').replaceChildren();$('#live-discovery').hidden=false;showOrigin();locks={};updatePossibilities();renderCatalog();findCurated();});
 $('#live-search').addEventListener('click',findPlaces);
 $('#curated-search').addEventListener('click',findCurated);
 $('#mash-town').addEventListener('input',()=>{cityVersion++;cityController?.abort();cancelPlaces();origin=null;$('#location-query').value='';$('#location-choices').replaceChildren();$('#curated-results').replaceChildren();$('#live-results').replaceChildren();showOrigin();if($('#mash-setting').value!=='home'&&document.querySelector('.location-search').open)findCurated();});
 for(const id of ['mash-radius','live-kind'])$('#'+id).addEventListener('input',()=>{cancelPlaces();$('#curated-results').replaceChildren();$('#live-results').replaceChildren();if($('#mash-setting').value!=='home'&&document.querySelector('.location-search').open)findCurated();});
 function homeDetails(pick){
  const data={...(pick.home||pick)};
  if(pick.guide){data.ingredients=pick.guide.ingredients.map(item=>`${item.quantity} ${item.name}`);if(pick.guide.steps?.length)data.instructions=pick.guide.steps;}
  const details=node('details',undefined,'home-details');details.append(node('summary',pick.home?'Ingredients, supplies & how to':'What to bring & try'));
  if(pick.guide)details.append(node('p',`${pick.guide.prepMinutes} min prep · ${pick.guide.activeMinutes} min active · about ${pick.guide.totalMinutes} min elapsed · ${pick.guide.difficulty}`,'guide-times'),node('p',pick.guide.quantityNote,'helper'));
  for(const [key,title]of [['ingredients','Ingredients for two'],['supplies','What you need'],['instructions','Try it together']])if(data[key]?.length){details.append(node('h4',title));const list=node(key==='instructions'?'ol':'ul');data[key].forEach(text=>list.append(node('li',text)));details.append(list);}
  details.append(node('p',pick.costBasis||'Illustrative additional-spend estimate for two. Compare your actual grocery basket before shopping.','helper'));
  if(Number.isSafeInteger(pick.minCostCents)&&Number.isSafeInteger(pick.maxCostCents)&&pick.minCostCents!==pick.maxCostCents)details.append(node('p',`Illustrative range before owned-supply adjustments: $${(pick.minCostCents/100).toFixed(2)}–$${(pick.maxCostCents/100).toFixed(2)} for two. The plan uses the displayed point estimate.`,'helper'));
  if(pick.purchases?.length){details.append(node('h4','Additional shopping allowance'));const list=node('ul');pick.purchases.forEach(line=>list.append(node('li',`${line.name}: $${(line.cents/100).toFixed(2)}`)));details.append(list);}
  return details;
 }
 function shopping(plan){
  const container=$('#shopping-summary');container.replaceChildren();const resolved=DateCosts.resolve(plan.picks,plan.pantry||[]);container.hidden=!plan.picks.some(p=>p.home);
  if(container.hidden)return;
  container.append(node('h3','One shopping list. Shared basics once.'),node('p',`Already-owned allowance saved $${(resolved.ownedSavingsCents/100).toFixed(2)}; shared baskets saved $${(resolved.sharedSavingsCents/100).toFixed(2)}. Your selected items are treated as already available in sufficient quantity.`,'helper'));
  const list=node('ul');resolved.shoppingList.forEach(line=>list.append(node('li',`${line.name} · $${(line.cents/100).toFixed(2)} allowance`)));container.append(list);
  if(!resolved.shoppingList.length)container.append(node('p','No additional home supplies budgeted. Check your selected pantry quantities before starting.'));
  const nextKey=plan.picks.map(p=>p.id).join('|')+'|'+(plan.pantry||[]).join('|');if(nextKey!==shoppingKey){shoppingChecks=new Set();shoppingKey=nextKey;}
  const ingredients=new Map();for(const pick of plan.picks)for(const item of pick.guide?.ingredients||[]){const key=item.name.toLowerCase().trim();if(!ingredients.has(key))ingredients.set(key,{name:item.name,quantities:[],owned:[]});const entry=ingredients.get(key);entry.quantities.push(`${item.quantity} (${pick.category})`);entry.owned.push(Boolean(item.pantryKey&&(plan.pantry||[]).includes(item.pantryKey)));}
  if(ingredients.size){container.append(node('h4','Ingredient checklist'),node('p','Quantities describe each recipe or package yield. Check sufficient amounts; list ticks track shopping only. Change pantry selections to change the budget.','helper'));const list=node('ul');for(const [key,item]of ingredients){const li=node('li'),label=node('label'),input=node('input');input.type='checkbox';input.checked=shoppingChecks.has(key);input.addEventListener('change',()=>{if(input.checked)shoppingChecks.add(key);else shoppingChecks.delete(key);});label.append(input,document.createTextNode(`${item.name}: ${item.quantities.join(' + ')}${item.owned.every(Boolean)?' · assumed already owned in this plan':''}`));li.append(label);list.append(li);}container.append(list);}
 }
 function setup(data){
  catalogOptions=data.options;towns=data.towns.towns;locations=data.locations||[];
  $('#nearby .checked-thrift')?.remove();
  const section=node('details',undefined,'checked-thrift');section.append(node('summary','A few source-checked thrift shops'));
  for(const place of data.unpricedPlaces||[]){const card=node('article',undefined,'live-place');card.append(node('h3',place.name),node('p',place.address),node('p',place.suggestedActivity),node('p','Address checked; purchase prices, hours and admission need confirmation.','helper'),link('Official location source',place.sourceUrl),document.createTextNode(' · '),link('Get directions','https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',destination:place.address})));section.append(card);}
  $('#nearby').append(section);
 }
 showOrigin();
 return {setup,pantry,location:()=>origin,restore,remember,recentDates,homeDetails,shopping,placeMetadata,clearPending:()=>{pendingPlace=null;}};
})();
