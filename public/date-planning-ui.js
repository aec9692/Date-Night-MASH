window.DatePlanningUI=(()=>{
 const $=s=>document.querySelector(s),money=value=>'$'+(value/100).toFixed(2);
 function values(mode){const prefix=mode==='mash'?'mash-':'';return Object.fromEntries(['parking','transport','extras'].map(key=>[key,$('#'+prefix+'reserve-'+key).value===''?0:Number($('#'+prefix+'reserve-'+key).value)]));}
 function sync(mode){const prefix=mode==='mash'?'mash-':'',budget=DatePlanning.cents(Number($('#'+prefix+'budget').value)),value=DatePlanning.reserve(values(mode),budget??0),summary=$('#'+prefix+'reserve-summary');
  summary.classList.toggle('error',!value);summary.textContent=value?`${money(DatePlanning.reserveTotal(value))} set aside; ${money((budget??0)-DatePlanning.reserveTotal(value))} available for your picks.`:'The reserve must fit inside your total budget. Lower the amounts or increase the budget.';
 }
 function syncDate(){const dates=DatePlanning.presets();document.querySelectorAll('[data-date-preset]').forEach(button=>{const date=dates[button.dataset.datePreset];button.setAttribute('aria-pressed',String($('#mash-date').value===date));});}
 function restore(plan,mode){const prefix=mode==='mash'?'mash-':'',reserve=DatePlanning.reserve(plan.reserve||{},plan.budgetCents)||{parking:0,transport:0,extras:0};for(const key of Object.keys(reserve))$('#'+prefix+'reserve-'+key).value=reserve[key];if(mode==='mash'){$('#mash-date').value=plan.date||'';syncDate();}sync(mode);}
 document.querySelectorAll('[data-date-preset]').forEach(button=>button.addEventListener('click',()=>{$('#mash-date').value=DatePlanning.presets()[button.dataset.datePreset];$('#mash-date').dispatchEvent(new Event('input',{bubbles:true}));}));
 $('#mash-date').addEventListener('input',()=>{syncDate();for(const [category,id]of Object.entries(locks)){const option=allOptions().find(o=>o.id===id);if(option&&!MashPlanner.eligible(option,$('#mash-setting').value==='home'?'general':$('#mash-area').value,$('#mash-date').value))delete locks[category];}});
 $('#mash-date').value=DatePlanning.presets().tonight;syncDate();
 return {values,sync,restore};
})();
