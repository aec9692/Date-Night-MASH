/* Explicit household ownership and public-city discovery; no accounts or device GPS. */
window.DateExtras=(()=>{
 const $=selector=>document.querySelector(selector),node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const labels={groceries:'Pasta, rice & basic groceries',seasonings:'Cooking oil & seasonings',baking:'Flour, sugar, eggs & butter',boardGames:'Board games & cards',videoGames:'Video games & a console',art:'Art supplies',streaming:'Streaming access',craft:'Craft supplies'};
 let origin=null,recent=[],pendingPlace=null,searching=false;
 function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}}
 function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Per-visit choices still work. */}}
 const saved=read('mash-owned-v1',[]),owned=DateCosts.validPantry(saved)?saved:[];
 const field=$('#owned-items');
 for(const key of DateCosts.ownership){const label=node('label'),input=node('input');input.type='checkbox';input.value=key;input.checked=owned.includes(key);label.append(input,document.createTextNode(labels[key]));field.append(label);}
 function pantry(){return [...field.querySelectorAll('input:checked')].map(input=>input.value);}
 field.addEventListener('change',()=>{save('mash-owned-v1',pantry());updatePossibilities();renderCatalog();});
 function restore(plan){for(const input of field.querySelectorAll('input'))input.checked=(plan.pantry||[]).includes(input.value);save('mash-owned-v1',pantry());origin=plan.location||null;showOrigin();}
 function remember(plan){if(plan.picks.length!==4)return;const ids=plan.picks.map(pick=>pick.id),key=ids.join('|');recent=[ids,...recent.filter(row=>row.join('|')!==key)].slice(0,8);}
 function recentDates(options){const known=new Set(options.map(option=>option.id));return recent.filter(ids=>ids.every(id=>known.has(id)));}
 function showOrigin(){$('#location-selected').textContent=origin?`MASH starts near ${origin.label}. Radius uses approximate straight-line distance.`:'MASH uses the starting town below. Home dates ignore travel distance.';$('#location-clear').hidden=!origin;}
 function link(text,url){const a=node('a',text);const parsed=new URL(url);if(parsed.protocol!=='https:')return node('span',text);a.href=parsed.href;a.target='_blank';a.rel='noopener noreferrer';return a;}
 async function api(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{const response=await fetch(url,{signal:controller.signal}),data=await response.json();if(!response.ok)throw new Error(data.error||'Search unavailable.');return data;}finally{clearTimeout(timer);}}
 function addEstimate(place){
  document.querySelector('.custom-details').open=true;
  pendingPlace=place;$('#custom-category').value=place.category;$('#custom-name').value=place.name.slice(0,48);$('#custom-cost').value='';$('#custom-setting').value=place.setting||'indoor';
  $('#custom-message').textContent=`Set your own total estimate for two at ${place.name}. This is not a verified price. Up to four personal ideas can be in the mix.`;
  $('#custom-form').scrollIntoView({block:'center'});$('#custom-cost').focus();
 }
 function placeMetadata(){if(!pendingPlace||$('#custom-name').value!==pendingPlace.name.slice(0,48)||!pendingPlace.sourceUrl?.startsWith('https://www.openstreetmap.org/'))return null;return {name:pendingPlace.name,address:pendingPlace.address,lat:pendingPlace.lat,lon:pendingPlace.lon,sourceUrl:pendingPlace.sourceUrl};}
 async function findPlaces(){
  if(!origin||searching)return;searching=true;$('#live-search').disabled=true;$('#location-status').textContent='Looking up community-listed places. Prices and availability need confirmation…';
  try{
   const params=new URLSearchParams({lat:origin.lat,lon:origin.lon,radius:$('#mash-radius').value,kind:$('#live-kind').value});
   const data=await api('/api/nearby?'+params);const list=$('#live-results');list.replaceChildren();
   for(const place of data.results){const card=node('li',undefined,'live-place');card.append(node('h4',place.name),node('p',`${place.category} · ${place.distanceMiles} miles · ${place.listedType}`),node('p',place.address||'Street address not recorded. Check the map pin.'),node('p','Price unknown · hours and availability unconfirmed','helper'));
    const links=node('div',undefined,'nearby-actions');links.append(link('Map listing',place.sourceUrl),link('Get directions',place.directionsUrl));if(place.website)links.append(link('Business website',place.website));card.append(links);
    const button=node('button','Add with my own estimate','secondary');button.type='button';button.addEventListener('click',()=>addEstimate(place));card.append(button);list.append(card);
   }
   $('#location-status').textContent=`${data.results.length} map listings. ${data.notice}`;
   const attribution=$('#location-attribution');attribution.replaceChildren();for(const source of data.attribution)attribution.append(link(source.label,source.url),document.createTextNode(' '));
  }catch(error){$('#location-status').textContent=error.name==='AbortError'?'Search timed out. Try again; the checked NJ collection still works.':error.message;}
  finally{searching=false;$('#live-search').disabled=false;}
 }
 async function searchCity(){
  if(searching)return;searching=true;$('#location-search').disabled=true;$('#location-status').textContent='Finding the city or ZIP…';
  try{
   const data=await api('/api/locations?q='+encodeURIComponent($('#location-query').value));const choices=$('#location-choices');choices.replaceChildren();
   for(const choice of data.choices){const b=node('button',choice.label,'secondary');b.type='button';b.addEventListener('click',()=>{origin={lat:choice.lat,lon:choice.lon,label:choice.label};choices.replaceChildren();showOrigin();locks={};updatePossibilities();renderCatalog();$('#live-discovery').hidden=false;$('#location-status').textContent='Location selected. Search real map listings below, or Play MASH using priced choices within this radius.';});choices.append(b);}
   $('#location-status').textContent=data.choices.length?'Choose the matching location. '+data.notice:'No matching city or ZIP. Try a city and state, such as Paterson, NJ.';
  }catch(error){$('#location-status').textContent=error.name==='AbortError'?'City search timed out. Try again or use the town list.':error.message;}
  finally{searching=false;$('#location-search').disabled=false;}
 }
 $('#location-search').addEventListener('click',searchCity);
 $('#location-query').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchCity();}});
 $('#location-clear').addEventListener('click',()=>{origin=null;$('#live-discovery').hidden=true;showOrigin();locks={};updatePossibilities();renderCatalog();});
 $('#live-search').addEventListener('click',findPlaces);
 function homeDetails(pick){
  const data=pick.home||pick;
  const details=node('details',undefined,'home-details');details.append(node('summary',pick.home?'Ingredients, supplies & how to':'What to bring & try'));
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
 }
 function setup(data){
  $('#nearby .checked-thrift')?.remove();
  const section=node('details',undefined,'checked-thrift');section.append(node('summary','A few source-checked thrift shops'));
  for(const place of data.unpricedPlaces||[]){const card=node('article',undefined,'live-place');card.append(node('h3',place.name),node('p',place.address),node('p',place.suggestedActivity),node('p','Address checked; purchase prices, hours and admission need confirmation.','helper'),link('Official location source',place.sourceUrl),document.createTextNode(' · '),link('Get directions','https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',destination:place.address})));section.append(card);}
  $('#nearby').append(section);
 }
 showOrigin();
 return {setup,pantry,location:()=>origin,restore,remember,recentDates,homeDetails,shopping,placeMetadata,clearPending:()=>{pendingPlace=null;}};
})();
