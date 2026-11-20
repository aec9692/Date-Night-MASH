/* Calendar drafts and portable, account-free plan snapshots. */
window.DateActions=(()=>{
 const $=s=>document.querySelector(s);let plan=null,when=null,options=[],lastKey='',shared=false;
 const key=plan=>JSON.stringify([plan.picks.map(pick=>pick.id),plan.budgetCents,plan.date,plan.schedule?.start,plan.schedule?.end]);
 function status(text){$('#travel-message').textContent=text;}
 function show(dialog){if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');}
 function close(dialog){if(dialog.close)dialog.close();else dialog.removeAttribute('open');}
 function zone(){return plan.journey||plan.picks.some(pick=>pick.venue)?'America/New_York':Intl.DateTimeFormat().resolvedOptions().timeZone||'America/New_York';}
 function selectedWhen(){return DateInvite.normalizeWhen({date:$('#calendar-date').value,start:$('#calendar-start').value,end:$('#calendar-end').value,timeZone:$('#calendar-zone').value});}
 function snapshot(chosen=when,proposal=''){
  const value=DateInvite.snapshot(plan,chosen,proposal);if(chosen)value.date=chosen.date;
  const prefs=DateInvite.preferences(value),prepared=MashPlanner.prepare(prefs,options,false,()=>0);
  if(prepared.error)throw new Error(prepared.error);
  if(chosen&&prepared.journey&&(chosen.timeZone!=='America/New_York'||chosen.start!==prepared.selectedSchedule.start||chosen.end!==prepared.selectedSchedule.end))throw new Error('Timed itineraries use the suggested start/end in New Jersey time. Choose another date or regenerate the timed plan.');
  return value;
 }
 function link(value){const url=new URL(location.href);url.hash='date='+DateInvite.encode(value);return url.href;}
 function localNotice(){return /^(localhost|127\.0\.0\.1)$/.test(location.hostname)?'This preview link works on this computer. A public deployment URL is needed to open it on another phone.':'Anyone with this link can view the plan. Links are snapshots; send a new link after changing it.';}
 function render(value){
  plan=value;if(key(plan)!==lastKey){when=null;lastKey=key(plan);}
  $('#share-local-note').textContent=localNotice();
  const select=$('#partner-change'),selected=select.value;select.replaceChildren();
  for(const category of plan.picks.map(p=>p.category)){const option=document.createElement('option');option.value=category;option.textContent='Suggest another '+category;select.append(option);}if([...select.options].some(o=>o.value===selected))select.value=selected;
 }
 function openCalendar(){
  if(!plan)return;
  const initial=when||{date:plan.date||'',start:plan.schedule?.start||'18:00',end:plan.schedule?.end||'21:00',timeZone:zone()};
  $('#calendar-date').value=initial.date;$('#calendar-start').value=initial.start;$('#calendar-end').value=initial.end;
  const zones=[...new Set([initial.timeZone,zone(),'America/New_York','UTC'])];$('#calendar-zone').replaceChildren(...zones.map(value=>{const option=document.createElement('option');option.value=value;option.textContent=value.replaceAll('_',' ');return option;}));$('#calendar-zone').value=initial.timeZone;
  $('#calendar-start').readOnly=Boolean(plan.journey);$('#calendar-end').readOnly=Boolean(plan.journey);$('#calendar-zone').disabled=Boolean(plan.journey);
  let recommended=DateInvite.recommended(navigator);try{const saved=localStorage.getItem('mash-calendar-v1');if(['apple','google'].includes(saved))recommended=saved;}catch{}
  $('#calendar-apple').textContent='Apple Calendar (.ics)'+(recommended==='apple'?' — recommended':'');$('#calendar-google').textContent='Google Calendar'+(recommended==='google'?' — recommended':'');
  $('#calendar-apple').parentElement.append($('#calendar-'+recommended),$('#calendar-'+(recommended==='apple'?'google':'apple')));
  $('#calendar-status').textContent=plan.journey?'This timed itinerary uses New Jersey time. Choose a date; recorded closures will be checked.':'Choose a date and a time block. MASH has no timed itinerary; confirm that your activities fit.';
  show($('#calendar-dialog'));
 }
 function calendar(provider){
  try{
   if(!$('#calendar-form').reportValidity())return;
   const chosen=selectedWhen(),value=snapshot(chosen),url=link(value);when=chosen;
   try{localStorage.setItem('mash-calendar-v1',provider);}catch{}
   const target=provider==='apple'?'/api/calendar?token='+encodeURIComponent(DateInvite.encode(value)):DateInvite.googleUrl(plan,chosen,url);
   window.open(target,'_blank','noopener');$('#calendar-status').textContent=provider==='apple'?'Open the calendar file and choose Add/Save if your phone offers it. You can also import the .ics file through Apple Mail or a desktop calendar.':'Review the prepared event in Google Calendar and tap Save. It has not been saved by MASH.';
   status('Calendar draft prepared. Review and save it in your calendar.');
  }catch(error){$('#calendar-status').textContent=error.message;}
 }
 async function copy(text){
  try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(text);$('#share-status').textContent='Copied. Paste it into Messages, Notes or another app.';return true;}
  catch{$('#share-note').value=text;$('#share-note').focus();$('#share-note').select();$('#share-status').textContent='Select and copy the text below; clipboard access is unavailable.';return false;}
 }
 let shareLink='',shareNote='';
 function sharePanel(){show($('#share-dialog'));$('#share-note').value=shareNote;$('#share-link').value=shareLink;$('#share-local-note').textContent=localNotice();}
 async function share(proposal=''){
  if(!plan)return;
  try{
   shareLink=link(snapshot(when,proposal));shareNote=DateInvite.summary(plan,when,shareLink,proposal);
   if(navigator.share){try{await navigator.share({title:plan.title,text:DateInvite.summary(plan,when,'',proposal),url:shareLink});return;}catch(error){if(error.name==='AbortError')return;}}
   sharePanel();await copy(shareNote);
  }catch(error){shareLink='';shareNote=DateInvite.summary(plan,when,'',proposal);sharePanel();$('#share-status').textContent=error.message+' You can still copy the note.';}
 }
 $('#add-calendar').addEventListener('click',openCalendar);
 $('#calendar-apple').addEventListener('click',()=>calendar('apple'));$('#calendar-google').addEventListener('click',()=>calendar('google'));
 $('#calendar-close').addEventListener('click',()=>close($('#calendar-dialog')));
 $('#share-invite').addEventListener('click',()=>share());$('#partner-send').addEventListener('click',()=>share($('#partner-change').value));
 $('#share-close').addEventListener('click',()=>close($('#share-dialog')));
 $('#share-copy-link').addEventListener('click',()=>{if(shareLink)copy(shareLink);else $('#share-status').textContent='This plan could not make a link. Copy its note instead.';});
 $('#share-copy-note').addEventListener('click',()=>copy(shareNote));
 $('#share-download-note').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([shareNote],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='our-date-note.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);});
 $('#shared-apply-change').addEventListener('click',()=>{const category=$('#shared-apply-change').dataset.category;if(category)generate(null,category);});
 $('#shared-dismiss').addEventListener('click',()=>{$('#shared-date').hidden=true;shared=false;history.replaceState(null,'',location.pathname+location.search);});
 async function loadShared(){
  if(!location.hash.startsWith('#date='))return;
  $('#shared-date').hidden=false;$('#shared-message').textContent='Checking this shared date against the current catalog…';
  try{
   const token=location.hash.slice(6);DateInvite.decode(token);
   const response=await fetch('/api/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})}),data=await response.json();
   if(!response.ok)throw Error(data.error||'This shared date could not be restored.');
   if(!validPlan(data.plan))throw Error('This shared date has invalid or outdated prices. Ask for a new link.');
   restoreDatePlan(hydrate(data.plan),false);when=data.when||null;shared=true;
   $('#shared-message').textContent='A shared date for two. Its prices use the sender’s selected pantry supplies. Your own pantry checks have been kept; review them before remixing.'+(data.proposal?' Your partner suggests replacing '+data.proposal+'.':'');
   $('#shared-apply-change').hidden=!data.proposal;$('#shared-apply-change').dataset.category=data.proposal||'';
   if(data.proposal)$('#shared-apply-change').textContent='Try another '+data.proposal;
   $('#shared-date').scrollIntoView({block:'nearest'});
  }catch(error){$('#shared-message').textContent=error.message;$('#shared-apply-change').hidden=true;}
 }
 return {render,setup:data=>{options=data.options;},loadShared,share,isShared:()=>shared};
})();
