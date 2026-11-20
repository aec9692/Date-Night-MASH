window.DateFitUI=(()=>{
 const $=s=>document.querySelector(s),key='mash-fit-v1',hiddenKey='mash-hidden-v1';let catalog=[],hidden=[];
 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
 function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{$('#fit-status').textContent='These preferences work for this visit; browser storage is unavailable.';}}
 function preferences(){return {diet:$('#fit-diet').value,effort:$('#fit-effort').value,cooking:$('#fit-cooking').value,equipment:$('#fit-equipment-enabled').checked?[...document.querySelectorAll('[data-equipment]:checked')].map(n=>n.value):null,accessChecklist:$('#fit-access').checked,verifiedOnly:$('#fit-verified').checked};}
 function restore(plan){const fit=DateFit.normalize(plan.fit||{})||DateFit.defaults;$('#fit-diet').value=fit.diet;$('#fit-effort').value=fit.effort;$('#fit-cooking').value=fit.cooking;$('#fit-equipment-enabled').checked=fit.equipment!==null;$('#fit-access').checked=fit.accessChecklist;$('#fit-verified').checked=fit.verifiedOnly;document.querySelectorAll('[data-equipment]').forEach(n=>n.checked=(fit.equipment||[]).includes(n.value));$('#equipment-choices').hidden=fit.equipment===null;}
 function idFor(option){return option.venue?'venue:'+option.venue.id:'idea:'+option.id;}
 function hiddenIDs(available=catalog){return available.filter(option=>hidden.includes(idFor(option))).map(option=>option.id);}
 function renderHidden(){
  const list=$('#hidden-idea-list');list.replaceChildren();
  for(const id of hidden){const option=catalog.find(option=>idFor(option)===id);if(!option)continue;const li=document.createElement('li'),button=document.createElement('button');button.type='button';button.className='text-button';button.textContent='Suggest again';button.addEventListener('click',()=>{hidden=hidden.filter(value=>value!==id);write(hiddenKey,hidden);renderHidden();updatePossibilities();renderCatalog();});li.append(document.createTextNode((option.venue?.name||option.name)+' '),button);list.append(li);}
  $('#hidden-count').textContent=String(hidden.length);$('#hidden-empty').hidden=hidden.length>0;
 }
 function hide(option){if(!catalog.some(known=>known.id===option.id))catalog.push(option);const id=idFor(option);hidden=[...new Set([...hidden,id])].slice(-200);write(hiddenKey,hidden);renderHidden();}
 function setup(data){catalog=[...data.options];const stored=read(hiddenKey,[]);hidden=Array.isArray(stored)?[...new Set(stored.filter(id=>catalog.some(o=>idFor(o)===id)))].slice(-200):[];const fit=DateFit.normalize(read(key,{}));restore({fit:fit||DateFit.defaults});renderHidden();}
 $('#personal-fit').addEventListener('change',()=>{$('#equipment-choices').hidden=!$('#fit-equipment-enabled').checked;write(key,preferences());locks={};updatePossibilities();renderCatalog();$('#fit-status').textContent='Preferences updated. Food tags need ingredient confirmation; access needs are shown as a checklist.';});
 document.querySelectorAll('[data-start-setting]').forEach(button=>button.addEventListener('click',()=>{
  $('#mash-setting').value=button.dataset.startSetting;locks={};updatePossibilities();renderCatalog();if(button.dataset.startSetting==='home'){$('#home-supplies details').open=true;}else if(button.dataset.startSetting==='indoor'){document.querySelector('.location-search').open=true;}
 }));
 function scene(mode='mash'){const home=$(mode==='mash'?'#mash-setting':'#setting').value==='home';document.querySelector('.location-search').hidden=home;$('#home-supplies').hidden=!home;document.querySelectorAll('[data-start-setting]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.startSetting===$('#mash-setting').value)));}
 function checklist(pick,plan){
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Before you go';details.append(summary);
  const items=pick.venue?['Confirm opening hours and ticket/session availability.','Recheck the full order/admission cost, taxes, fees and tip.','Check parking, route and travel time.']:pick.home?['Check the actual ingredient quantities and prices.','Confirm the required equipment and preparation time.']:['Choose the actual location or service and confirm the full price.'];
  if(plan.fit?.accessChecklist)items.push('Confirm step-free entrance, accessible toilets/seating and any assistance needed with the venue or your own space. Access has not been verified.');
  const list=document.createElement('ul');for(const text of items){const li=document.createElement('li'),label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';label.append(input,document.createTextNode(' '+text));li.append(label);list.append(li);}details.append(list);details.className='before-you-go';return details;
 }
 return {setup,preferences,restore,hiddenIDs,hide,scene,checklist};
})();
