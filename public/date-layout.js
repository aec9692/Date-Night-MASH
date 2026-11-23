/* Progressive disclosure only; selection and canonical price rules stay on the server. */
window.DateLayout=(()=>{
 const $=s=>document.querySelector(s);
 function block(title,...children){
  const section=document.createElement('section'),heading=document.createElement('h4');section.className='detail-block';heading.textContent=title;section.append(heading,...children);return section;
 }
 function facts(entries){
  const list=document.createElement('dl');list.className='detail-facts';for(const [label,value]of entries){const row=document.createElement('div'),term=document.createElement('dt'),definition=document.createElement('dd');term.textContent=label;definition.textContent=value;row.append(term,definition);list.append(row);}return list;
 }
 // Move existing nodes, retaining full text, checkboxes, links and event handlers.
 function group(container,lead='About this choice'){
  if(container.querySelector(':scope > .detail-grid'))return;
  const grid=document.createElement('div');grid.className='detail-grid';let current=null;
  for(const child of [...container.childNodes]){
   if(child.nodeType===3&&!child.textContent.trim())continue;
   if(child.nodeName==='SUMMARY')continue;
   if(child.classList?.contains('detail-block')){grid.append(child);current=null;continue;}
   if(child.classList?.contains('experience-badges')){grid.append(block('At a glance',child));current=null;continue;}
   if(child.nodeName==='H3'||child.nodeName==='H4'){current=document.createElement('section');current.className='detail-block';current.append(child);grid.append(current);continue;}
   if(!current){current=block(lead);grid.append(current);}current.append(child);
  }
  if(grid.children.length)container.append(grid);
 }
 function reveal(node){for(let parent=node?.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;}
 // Native submit validation happens before the submit handler; reveal invalid controls in capture phase.
 document.addEventListener('invalid',event=>reveal(event.target),true);
 function validate(form){const invalid=[...form.elements].find(node=>node.willValidate&&!node.validity.valid);if(invalid)reveal(invalid);return form.reportValidity();}
 function summary(){
  const setting={any:'Any setting',indoor:'Go out, indoors',outdoor:'Outdoors',home:'Stay home',mixed:'Indoor + outdoor'}[$('#mash-setting').value],age={teen:'Ages 13–17',adult:'Both 18+', '21plus':'Both 21+'}[$('#mash-age').value];
  const extra=[];if($('#mash-spending').value==='treat')extra.push('Treat us');
  const reserve=DatePlanningUI.values('mash');if(Object.values(reserve).some(n=>n>0))extra.push('expense reserve');
  if($('#fit-diet').value!=='any'||$('#fit-effort').value!=='any'||$('#fit-cooking').value!=='any'||$('#fit-equipment-enabled').checked)extra.push('food/comfort filters');
  if($('#fit-verified').checked)extra.push('source-priced only');
  if(DateExtras.pantry().length)extra.push('owned supplies');
  if($('#mash-area').value!=='all')extra.push($('#mash-area').selectedOptions[0].textContent);
  const summary=$('#mash-more-summary'),title=document.createElement('span'),chips=document.createElement('span');title.className='disclosure-title';title.textContent='More options';chips.className='summary-chips';
  for(const value of [setting,age,...($('#mash-setting').value==='home'?[]:[$('#mash-radius').value+' mi radius']),...extra]){const chip=document.createElement('span');chip.className='summary-chip';chip.textContent=' '+value;chips.append(chip);}summary.replaceChildren(title,chips);
  $('#shared-preferences').querySelector('summary').textContent='Food, supplies & saved preferences'+(extra.some(v=>['food/comfort filters','source-priced only','owned supplies'].includes(v))?' · selections active':'');
 }
 function showBudgetError(mode){const values=DatePlanningUI.values(mode),prefix=mode==='mash'?'mash-':'',budget=DatePlanning.cents(Number($('#'+prefix+'budget').value));if(!DatePlanning.reserve(values,budget??0))reveal($('#'+prefix+'reserve-parking'));}
 function capture(){return new Set([...document.querySelectorAll('#result-picks details[open][data-disclosure]')].map(n=>n.closest('[data-pick-id]').dataset.pickId+'|'+n.dataset.disclosure));}
 function restore(open){for(const n of document.querySelectorAll('#result-picks details[data-disclosure]'))n.open=open.has(n.closest('[data-pick-id]').dataset.pickId+'|'+n.dataset.disclosure);}
 function result(plan){
  const home=plan.picks.every(p=>p.home||p.settings.includes('home'))&&!plan.picks.some(p=>p.venue||p.place);
  $('#result-trust').textContent=home?'Prices are shopping estimates for two. Check quantities, owned supplies and the actual checkout total.':
   'Prices are estimates for two, not final quotes. Travel uses town centers or map pins, not live drive times. Hours, tickets and reservations need confirmation; nothing is booked.';
  $('#result-timing-details').hidden=!plan.journey;$('#result-shopping-details').hidden=!plan.picks.some(p=>p.home);
  const reserveBlock=$('#reserve-breakdown').closest('.detail-block');if(reserveBlock)reserveBlock.hidden=!plan.reserveCents;
  // Important feedback stays visible even when the supporting details are collapsed.
  if(plan.legacyOwnership){$('#result-budget-details').open=true;$('#result-notice').hidden=false;}
 }
 return {validate,reveal,summary,showBudgetError,capture,restore,result,block,facts,group};
})();
