/* Route guidance, departure checklist, indoor backups and a link-based two-person vote. */
window.ReadyNight=(()=>{
 const $=s=>document.querySelector(s),money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,fn)=>{const b=node('button',text,'secondary');b.type='button';b.addEventListener('click',fn);return b;};
 let plan=null,checks=new Set(),checkKey='',ballot=null,pollPlans=[],owner=false,pollBusy=false,sessions=[],storageOK=true;
 const storeKey='mash-votes-v1';
 function read(){try{const raw=localStorage.getItem(storeKey)||'[]';if(raw.length>150000)throw Error();const values=JSON.parse(raw);if(!Array.isArray(values))throw Error();sessions=values.slice(0,5).filter(v=>{try{DateVote.validate(v);DateVote.encode(v);return !v.reply;}catch{return false;}});}catch{sessions=[];storageOK=false;}}
 read();
 function save(){sessions=[ballot,...sessions.filter(v=>v.id!==ballot.id)].slice(0,5);try{localStorage.setItem(storeKey,JSON.stringify(sessions));storageOK=true;}catch{storageOK=false;}}
 function link(token){const url=new URL(location.href);url.hash='vote='+token;return url.href;}
 function source(label,url){const a=node('a',label,'button secondary');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
 function check(text,key){const label=node('label',undefined,'departure-check'),input=node('input');input.type='checkbox';input.checked=checks.has(key);input.addEventListener('change',()=>{if(input.checked)checks.add(key);else checks.delete(key);});label.append(input,node('span',text));return label;}
 function render(value){
  plan=value;const key=JSON.stringify([value.date,value.picks.map(p=>p.id),value.journey?.order,value.budgetCents,value.reserve]);if(key!==checkKey){checks.clear();checkKey=key;}
  const route=DateRoute.analyze(plan),taste=DateFeedback.preferences(allOptions());
  const liked=plan.picks.filter(p=>taste.liked.includes(p.id)).length;
  $('#ready-explanation').textContent=`${money(plan.plannedTotalCents)} planned for two, including ${money(plan.reserveCents)} reserved; ${money(plan.remainingCents)} unallocated.${liked?` ${liked} pick${liked===1?' matches':'s match'} your past positive ratings.`:''}${route.home?' Your at-home preferences apply.':' Nearby places get a gentle preference without changing your filters or budget.'}`;
  const wrap=$('#ready-route');wrap.replaceChildren();
  if(route.home)wrap.append(node('p',route.notice));else{
   const ordered=MashJourney.ordered(plan);
   wrap.append(node('p',`Starting area for estimates: ${plan.location?.label||plan.mash?.origin||plan.journey?.origin||'unverified'}. Maps may use your device location instead, depending on your Directions setting.`,'helper'));
   wrap.append(node('h4',plan.journey?'Your timed stop order':'Suggested stop order — dinner first'),node('p',ordered.map(p=>DatePlaces.title(p)+(p.venue?' ('+p.venue.city+')':'')).join(' → ')));
   if(route.unknown)wrap.append(node('p',`${route.unknown} route leg${route.unknown===1?' has':'s have'} an unverified endpoint. A complete route distance cannot be estimated.`,'route-warning'));
   else wrap.append(node('p',`${route.totalMiles.toFixed(1)} approximate straight-line miles across the listed legs.${route.savedMiles>0?` This order saves about ${route.savedMiles.toFixed(1)} straight-line miles compared with category order.`:''}`));
   if(route.backtracking)wrap.append(node('p',plan.journey?'Possible backtracking: the timed order may involve a detour. Try Earlier/Later only where the schedule still fits.':'Category order involved a sizable detour or reversal. Review this suggested order in Maps.','route-warning'));
   const legs=node('ul');for(const leg of route.legs){const pick=plan.picks.find(p=>p.id===leg.id);legs.append(node('li',`${DatePlaces.title(pick)}: ${leg.miles===null?'endpoint unverified':leg.miles.toFixed(1)+' straight-line mi from the previous point'}`));}wrap.append(legs,node('p',route.notice,'helper'));
   const places=ordered.filter(p=>p.venue||p.place).map(p=>p.venue?.address||`${p.place.lat},${p.place.lon}`);
   if(places.length)wrap.append(source('Review whole route in Maps',DateDirections.to(places.at(-1),{town:plan.mash?.origin||plan.journey?.origin,location:plan.location,waypoints:places.slice(0,-1)})));
  }
  const stops=$('#ready-stops');stops.replaceChildren();
  for(const pick of MashJourney.ordered(plan)){
   const card=node('article',undefined,'ready-stop');card.append(node('h4',DatePlaces.title(pick)),node('p',DateRoute.explain(pick,plan,taste).join(' · '),'helper'));
   if(pick.venue||pick.place){
    const destination=pick.venue?.address||`${pick.place.lat},${pick.place.lon}`;
    card.append(node('p',pick.venue?.address||pick.place.address||'Recorded map pin; address unconfirmed'));
    if(pick.pricing?.sourceUrl)card.append(source(['dinner','treat'].includes(pick.category)?'Official menu & prices':'Official tickets / venue',pick.pricing.sourceUrl));
    else if(pick.place)card.append(source('Community listing — verify details',pick.place.sourceUrl));
    card.append(source('Directions',DateDirections.to(destination,{town:plan.mash?.origin||plan.journey?.origin,location:plan.location})));
    const note=pick.venue?.hoursNote||'Hours, tickets and reservations are not recorded.';
    card.append(node('p',note));
    const booking=/reserv|book|appointment|session|ticket/i.test(note)?'Recorded note mentions tickets, sessions or booking. Confirm the requirement directly; nothing is reserved.':'Reservation requirement is unconfirmed. Check the official venue before leaving.';
    card.append(node('p',booking,'helper'),check('Confirmed hours, booking/tickets and age/guardian rules.',pick.id+':hours'),check('Checked actual price, fees, parking and route.',pick.id+':cost'));
   }else card.append(check(pick.home?'Checked ingredients, equipment and preparation time.':'Chose the actual location/service and confirmed the price.',pick.id+':supplies'));
   if(pick.settings.includes('outdoor')&&!pick.home){const b=button('Find an indoor backup',()=>backup(pick.category));b.dataset.backup=pick.category;b.disabled=busy;card.append(b);}
   stops.append(card);
  }
  $('#compare-dates').disabled=busy||pollBusy;
 }
 async function post(url,body){const response=await request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json();if(!response.ok)throw Error(data.error||'Could not complete this request.');return data;}
 function exclusions(){return [...new Set([...excluded,...DateFitUI.hiddenIDs(allOptions())])];}
 async function backup(category){
  if(busy||!plan)return;const before=plan;setBusy(true);$('#ready-status').textContent='Finding an indoor option while keeping the other stops and reserve…';
  try{const data=await post('/api/backup',{token:DateInvite.encode(DateInvite.snapshot(before)),category,excluded:exclusions(),taste:DateFeedback.preferences(allOptions())});if(!validPlan(data))throw Error('The replacement plan could not be verified.');
   // Restore only after the authoritative server has found a complete valid plan.
   setBusy(false);const held={...locks};restoreDatePlan(hydrate(data));locks=Object.fromEntries(Object.entries(held).filter(([c,id])=>c!==category&&data.picks.some(p=>p.id===id)));renderResult();
   $('#ready-status').textContent=`Indoor ${category} selected. Other stops and expense reserves stayed the same. Overall setting is now Any to allow the retained outdoor stops; confirm the new route and booking.`;
  }catch(error){$('#ready-status').textContent=error.message;}finally{setBusy(false);}
 }
 const panel=node('section',undefined,'date-vote-panel');panel.id='date-vote';panel.hidden=true;panel.setAttribute('aria-labelledby','vote-title');
 const title=node('h2','Choose your next date.');title.id='vote-title';title.tabIndex=-1;
 const help=node('p','One choice per person. This is a link exchange, not a live or authenticated poll. Anyone with the link can read the plans. Your partner sends a reply link back; open it on the creating browser. Costs assume the sender’s checked supplies; review your own before remixing. Up to five comparisons stay on the creating device.');
 const cards=node('div',undefined,'vote-cards'),status=node('p');status.id='vote-status';status.setAttribute('role','status');
 const output=node('input');output.type='text';output.readOnly=true;output.id='vote-link';const outputLabel=node('label','Link to send');outputLabel.htmlFor=output.id;
 const imported=node('input');imported.type='text';imported.maxLength=24500;imported.id='vote-import';const importLabel=node('label','Paste your partner’s reply link');importLabel.htmlFor=imported.id;
 const hostTools=node('div');hostTools.append(importLabel,imported,button('Read reply',()=>loadToken(imported.value)));
 const send=button('Share the three plans',()=>shareVote()),clear=button('Clear saved votes on this device',()=>{if(pollBusy||busy)return;sessions=[];try{localStorage.removeItem(storeKey);}catch{}ballot=null;panel.hidden=true;reopen.hidden=true;history.replaceState(null,'',location.pathname+location.search);});
 panel.append(title,help,cards,status,outputLabel,output,send,button('Copy link',async()=>{try{if(!output.value)throw Error();await navigator.clipboard.writeText(output.value);status.textContent='Copied. Paste this link into your message.';}catch{output.focus();output.select();status.textContent='Select and copy the link above.';}}),hostTools,clear,button('Close comparison',()=>{panel.hidden=true;}));
 $('#result').before(panel);
 const reopen=button('Reopen your latest date comparison',()=>{if(sessions[0])loadToken(DateVote.encode(sessions[0]));});reopen.id='reopen-vote';reopen.hidden=!sessions.length;panel.before(reopen);
 function refreshVote(){
  cards.replaceChildren();hostTools.hidden=!owner;send.textContent=owner?'Share the three plans':'Send my vote back';
  pollPlans.forEach((p,i)=>{
   const card=node('article',undefined,'vote-card');card.append(node('h3',`Plan ${i+1}`),node('p',p.date||'Date not set'),node('strong',`${money(p.plannedTotalCents)} for two · ${money(p.reserveCents)} reserved`));
   const list=node('ul');for(const pick of MashJourney.ordered(p))list.append(node('li',`${pick.category}: ${DatePlaces.title(pick)}${pick.venue?' — '+pick.venue.city:''}`));card.append(list);
   const chosen=(owner?ballot.host:ballot.guest)===i,b=button(chosen?'Your choice':'Choose this plan',()=>{if(pollBusy||busy)return;if(owner){ballot.host=i;save();}else ballot.guest=i;refreshVote();});b.setAttribute('aria-pressed',String(chosen));b.disabled=pollBusy||busy;card.append(b);
   const use=button('Open this date',()=>{if(pollBusy||busy)return;restoreDatePlan(hydrate(p),false);$('#result').scrollIntoView({block:'start'});});use.disabled=pollBusy||busy;card.append(use);cards.append(card);
  });
  output.value=link(DateVote.encode(owner?{...ballot,reply:false}:ballot.guest===null?ballot:{...ballot,reply:true}));
  status.textContent=DateVote.result(ballot)+(owner&&!storageOK?' Device storage is unavailable. Keep this page open to receive the reply.':'')+(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)?' This localhost link works only on this computer; a public deployment is needed for another phone.':'');
  send.disabled=pollBusy||busy||!owner&&ballot.guest===null;
 }
 async function shareVote(){
  if(!ballot||pollBusy||busy)return;try{if(!owner&&ballot.guest===null)throw Error('Choose a plan first.');output.value=link(DateVote.encode(owner?{...ballot,reply:false}:{...ballot,reply:true}));
   if(navigator.share){try{await navigator.share({title:'Choose our date',text:owner?'Which of these three dates would you choose? Send your vote link back.':'Here is my date choice. Open this reply on the browser that created our vote.',url:output.value});return;}catch(error){if(error.name==='AbortError')return;}}
   try{await navigator.clipboard.writeText(output.value);status.textContent='Link copied. Send it to your partner.';}catch{output.focus();output.select();status.textContent='Select and copy the link above, then send it to your partner.';}
  }catch(error){status.textContent=error.message;}
 }
 async function compare(){
  if(busy||pollBusy||!plan)return;setBusy(true);pollBusy=true;$('#ready-status').textContent='Finding three different dates within this budget…';
  try{const data=await post('/api/compare',{token:DateInvite.encode(DateInvite.snapshot(plan)),excluded:exclusions(),locked:locks,taste:DateFeedback.preferences(allOptions())});if(data.plans.length!==3||!data.plans.every(validPlan))throw Error('Could not verify the three plans.');
   ballot={v:1,id:Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''),plans:data.plans.map(p=>DateInvite.encode(DateInvite.snapshot(p))),host:null,guest:null,reply:false};DateVote.encode(ballot);owner=true;pollPlans=data.plans.map(hydrate);save();reopen.hidden=false;panel.hidden=false;$('#ready-status').textContent='Three plans ready. Choose yours and send the link.';
  }catch(error){$('#ready-status').textContent=error.message;}finally{pollBusy=false;setBusy(false);if(ballot&& !panel.hidden){refreshVote();title.focus();panel.scrollIntoView({block:'start'});}}
 }
 async function loadToken(value){
  if(pollBusy||busy)return;panel.hidden=false;pollBusy=true;setBusy(true);status.textContent='Checking all three dates against the current catalog…';
  try{const token=value.startsWith('http')?new URL(value).hash.slice(6):value.startsWith('#vote=')?value.slice(6):value,incoming=DateVote.decode(token);
   const data=await post('/api/compare/restore',{token});if(data.plans.length!==3||!data.plans.every(validPlan))throw Error('These vote plans could not be verified.');
   const saved=sessions.find(v=>v.id===incoming.id&&JSON.stringify(v.plans)===JSON.stringify(incoming.plans));
   if(incoming.reply){if(!saved)throw Error('Open this reply on the browser that created the vote, with its saved votes intact.');ballot=DateVote.accept(saved,incoming);owner=true;save();}
   else{owner=Boolean(saved);ballot=saved||incoming;}
   pollPlans=data.plans.map(hydrate);panel.hidden=false;
  }catch(error){ballot=null;pollPlans=[];owner=false;status.textContent=error.message;cards.replaceChildren();output.value='';hostTools.hidden=true;send.disabled=true;return;}finally{pollBusy=false;setBusy(false);}
  refreshVote();title.focus();panel.scrollIntoView({block:'start'});
 }
 $('#compare-dates').addEventListener('click',compare);
 window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#vote='))loadToken(location.hash.slice(6));});
 function loadVote(){if(location.hash.startsWith('#vote='))return loadToken(location.hash.slice(6));}
 return {render,loadVote};
})();
