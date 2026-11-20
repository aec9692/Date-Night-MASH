/* Local preferences and trip tools: no accounts, GPS, uploads or external APIs. */
window.SmartDate=(()=>{
 const $=s=>document.querySelector(s),node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const historyKey='mash-tried-v1',reasonKey='mash-feedback-v1';
 let media={},options=[],tried=[],feedback=[],partner=null,first=null,coupleStep=0,activePlan=null,worker=null,countId=0,countCallback=null,countTimer=null,stopOrder=null;
 const storageRead=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
 function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{$('#travel-message').textContent='Browser storage is unavailable. Download the plan to keep a copy.';return false;}}
 function setup(data){
  options=data.options;media=data.media||{};MashJourney.setTowns(data.towns);
  $('#start-town').replaceChildren();
  Object.keys(data.towns?.towns||{}).sort().forEach(town=>{const o=node('option',town);o.value=town;$('#start-town').append(o);});$('#start-town').value='Paterson';
  $('#mash-town').replaceChildren(...[...$('#start-town').options].map(o=>o.cloneNode(true)));$('#mash-town').value='Paterson';
  tried=storageRead(historyKey,[]);if(!Array.isArray(tried))tried=[];tried=[...new Set(tried.filter(id=>options.some(o=>o.id===id)))].slice(-40);
  feedback=storageRead(reasonKey,[]);if(!Array.isArray(feedback))feedback=[];
  const spotlight=$('#local-spotlight');spotlight.replaceChildren();
  for(const id of ['falls','liberty','pier-a']){
   const option=options.find(o=>o.venue?.id===id),photo=option&&picture(option);if(!photo)continue;
   const card=node('article',undefined,'spotlight-card'),b=node('button','Explore this place','secondary');b.type='button';
   b.addEventListener('click',e=>previewIdea(option,e.currentTarget));card.append(photo,node('h3',option.venue.name),node('p',option.venue.city+', NJ'),b);spotlight.append(card);
  }
  if(typeof Worker==='function')try{
   worker?.terminate();worker=new Worker('/count-worker.js');worker.postMessage({type:'setup',options,towns:data.towns});
   worker.onmessage=e=>{if(e.data.id===countId)countCallback?.(e.data.result);};
   worker.onerror=()=>{worker.terminate();worker=null;$('#possibility-note').textContent='Live count unavailable. You can still generate a date.';};
  }catch{worker=null;}
 }
 function count(prefs,callback){countCallback=callback;countId++;clearTimeout(countTimer);if(worker){const id=countId;countTimer=setTimeout(()=>worker?.postMessage({type:'count',id,preferences:prefs}),180);}else callback(MashPlanner.prepare(prefs,options,false));}
 function preferences(){
  if(!$('#smart-enabled').checked)return null;
  const format=$('#date-format').value;
  return {format,start:$('#start-time').value,origin:$('#start-town').value,radius:Number($('#trip-radius').value),legMiles:Number($('#leg-limit').value),age:$('#audience').value,cuisine:$('#cuisine').value,vegetarian:$('#vegetarian').checked,lowEffort:$('#low-effort').checked,alcoholFree:$('#alcohol-free').checked,fresh:$('#fresh-ideas').checked,seen:tried,partner,...(stopOrder&&stopOrder.length===MashJourney.formats[format].categories.length?{order:stopOrder}:{})};
 }
 function restore(plan){
  $('#smart-enabled').checked=Boolean(plan.journey);
  if(!plan.journey)return;
  const j=plan.journey;
  for(const [id,key]of [['date-format','format'],['start-time','start'],['start-town','origin'],['trip-radius','radius'],['leg-limit','legMiles'],['audience','age'],['cuisine','cuisine']])$('#'+id).value=String(j[key]);
  for(const [id,key]of [['vegetarian','vegetarian'],['low-effort','lowEffort'],['alcohol-free','alcoholFree'],['fresh-ideas','fresh']])$('#'+id).checked=j[key];
  partner=j.partner;stopOrder=[...j.order];summary();
 }
 function includeCategory(option){
  if(!$('#smart-enabled').checked)return;
  const active=MashJourney.formats[$('#date-format').value].categories;
  if(!active.includes(option.category))$('#date-format').value=option.category==='entertainment'?'full':'evening';
  if(MashJourney.meta(option).window[1]<=17*60&&$('#start-time').value>'13:00')$('#start-time').value='11:00';
 }
 function safeLink(text,url){const a=node('a',text);try{const u=new URL(url);if(u.protocol!=='https:')return node('span',text);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';}catch{return node('span',text);}return a;}
 function picture(o){
  const p=media[o.venue?.id];if(!p)return null;
  const figure=node('figure',undefined,'place-photo'),img=node('img');
  img.src=p.thumbnailUrl||p.url;img.alt=p.alt;img.loading='lazy';img.decoding='async';img.width=640;img.height=360;
  img.addEventListener('error',()=>figure.remove(),{once:true});
  const caption=node('figcaption');caption.append(safeLink(p.author,p.authorUrl),document.createTextNode(' · '),safeLink(p.license,p.licenseUrl),document.createTextNode(` · historical photo (${p.photoDate}), cropped to fit · `),safeLink('Source',p.sourceUrl));
  figure.append(img,caption);return figure;
 }
 function decorate(pick,art,copy,plan){
  const m=MashJourney.meta(pick),badges=node('div',undefined,'experience-badges');
  const time=plan?.schedule?.stops.find(s=>s.id===pick.id);
  if(time)badges.append(node('span',`${time.start}–${time.end} suggested`,'time-badge'));
  (pick.home?['At home · plan together']:m.flags).forEach(flag=>badges.append(node('span',flag)));
  if(plan?.journey?.vegetarian&&pick.category==='dinner')badges.append(node('span','Confirm vegetarian ingredients'));
  copy.prepend(badges);
  const likes=[plan?.mood,plan?.journey?.partner?.mood].filter(v=>v&&v!=='surprise'&&m.moods.includes(v));
  const why=[...new Set(likes)].map(v=>v+' vibe');
  if(plan?.journey&&pick.venue)why.push(`${pick.venue.city} · within your town radius`);
  if(why.length)copy.append(node('p','Why this fits: '+why.join(' · '),'why-fit'));
  const photo=picture(pick);if(photo)(art||copy).append(photo);
 }
 function replaceControl(pick,action){
  const label=node('label',undefined,'replace-label');label.append(document.createTextNode('Change this because…'));
  const select=node('select');select.className='replace-choice';select.setAttribute('aria-label',`Reason to replace ${pick.name}`);
  for(const [v,text]of [['','Choose a reason'],['distance','Too far'],['price','Too expensive'],['tried','Already tried it'],['taste','Not our thing']]){const o=node('option',text);o.value=v;if(v==='distance'&&!preferences())o.disabled=true;select.append(o);}
  select.addEventListener('change',()=>{if(select.value)action(select.value);});label.append(select);return label;
 }
 function rememberReason(pick,reason){
  if(!['distance','price','tried','taste'].includes(reason))return;
  feedback=[...feedback,{id:pick.id,reason}].slice(-40);write(reasonKey,feedback);
  if(reason==='distance'){$('#leg-limit').value='5';$('#trip-radius').value='5';if(activePlan?.mash)$('#mash-radius').value='5';$('#travel-message').textContent='Looking for a closer date within 5 miles. Other stops may change to keep the outing together.';}
  if(reason==='tried'){tried=[...new Set([...tried,pick.id])].slice(-40);write(historyKey,tried);if(pick.venue)options.filter(o=>o.venue?.id===pick.venue.id).forEach(o=>excluded.add(o.id));}
  if(reason==='price'&&activePlan){const limit=Math.max(0,pick.costCents-1);options.filter(o=>o.category===pick.category&&o.costCents>limit).forEach(o=>excluded.add(o.id));$(activePlan.mash?'#mash-spending':'#spending').value='flexible';}
  // Explicit exclusions stay in this visit's mix; no hidden cross-device profile.
 }
 function summary(){
  const p=$('#couple-summary');p.hidden=!partner;
  p.textContent=partner?'Two sets of picks are in the mix. Both vibes get a boost; either food choice can win. Shared comfort rules apply to both.':'';
 }
 function openCouple(){first=null;coupleStep=0;$('#couple-ready')?.remove();$('#couple-form').reset();$('#couple-form').hidden=false;$('#couple-title').textContent='Person one, pick your vibe.';$('#couple-help').textContent='Your choices will be hidden before person two takes a turn. Shared device only; no account or names.';$('#couple-next').textContent='Hide picks & pass the phone';showDialog();}
 function showDialog(){const d=$('#couple-dialog');if(d.showModal)d.showModal();else d.setAttribute('open','');$('#couple-title').tabIndex=-1;$('#couple-title').focus();}
 function closeCouple(){const d=$('#couple-dialog');if(d.close)d.close();else d.removeAttribute('open');first=null;$('#couple-ready')?.remove();$('#couple-form').reset();$('#couple-open').focus();}
 $('#couple-open').addEventListener('click',openCouple);$('#couple-close').addEventListener('click',closeCouple);
 $('#couple-dialog').addEventListener('cancel',()=>{first=null;$('#couple-ready')?.remove();$('#couple-form').reset();});
 $('#couple-form').addEventListener('submit',e=>{
  e.preventDefault();
  if(coupleStep===0){first={mood:$('#couple-mood').value,cuisine:$('#couple-cuisine').value};coupleStep=1;$('#couple-form').reset();$('#couple-form').hidden=true;$('#couple-title').textContent='Your picks are tucked away.';$('#couple-help').textContent='Hand the phone to person two. Tap below when you are ready.';const ready=node('button','I’m person two');ready.type='button';ready.id='couple-ready';ready.addEventListener('click',()=>{ready.remove();$('#couple-form').hidden=false;$('#couple-title').textContent='Person two, your turn.';$('#couple-next').textContent='Mix our picks';$('#couple-mood').focus();});$('#couple-form').after(ready);return;}
  partner={mood:$('#couple-mood').value,cuisine:$('#couple-cuisine').value};
  $(`input[name=mood][value="${first.mood}"]`).checked=true;$('#cuisine').value=first.cuisine;$('#smart-enabled').checked=true;summary();closeCouple();locks={};updatePossibilities();renderCatalog();
 });
 $('#couple-reset').addEventListener('click',()=>{partner=null;first=null;summary();closeCouple();updatePossibilities();});
 $('#date-format').addEventListener('input',()=>{stopOrder=null;$('#start-time').value=$('#date-format').value==='full'?'11:00':'17:00';});
 $('#smart-enabled').addEventListener('input',()=>{$('#start-time').required=$('#smart-enabled').checked;});
 function render(plan,onChange){
  activePlan=plan;changing=onChange;
  const wrap=$('#journey-result');wrap.replaceChildren();wrap.hidden=!plan.journey;
  if(!plan.journey)return;
  if(!plan.schedule){wrap.append(node('p','This saved plan no longer fits the suggested timing. Adjust preferences and generate again.'));return;}
  const j=plan.journey,s=plan.schedule;
  if($('#date-format').value===j.format)stopOrder=[...j.order];
  wrap.append(node('p',`${MashJourney.formats[j.format].label} · ${s.start}–${s.end} · from ${j.origin}`,'trip-heading'),node('p',s.notice,'helper'));
  const list=node('ol',undefined,'timeline');
  MashJourney.ordered(plan).forEach((pick,i)=>{
   const stop=s.stops.find(v=>v.id===pick.id),li=node('li');
   li.append(node('span',stop.start,'timeline-time'),node('strong',pick.name),node('span',`${stop.travelMinutes} min travel allowance${stop.waitingMinutes?` · ${stop.waitingMinutes} min waiting`:''}${stop.unlocated?' · location unverified':''}`,'helper'));
   const controls=node('div',undefined,'order-controls');
   for(const [delta,label]of [[-1,'Earlier'],[1,'Later']]){
    const b=node('button',label,'text-button');b.type='button';b.disabled=i+delta<0||i+delta>=plan.picks.length;
    b.setAttribute('aria-label',`${label}: ${pick.name}`);b.addEventListener('click',()=>{
      const order=[...j.order];[order[i],order[i+delta]]=[order[i+delta],order[i]];
      const nextJourney={...j,order},nextSchedule=MashJourney.schedule(plan.picks,nextJourney);
      if(!nextSchedule){$('#travel-message').textContent='That order conflicts with the suggested time windows or travel limit. Your existing order is kept.';return;}
      $('#travel-message').textContent='Stop order updated. Recheck bookings and actual opening hours.';
      onChange({...plan,journey:nextJourney,schedule:nextSchedule});
    });controls.append(b);
   }li.append(controls);list.append(li);
  });wrap.append(list);
 }
 function saveBlob(blob,name){const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 const escapeICS=v=>String(v).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
 function calendar(plan){
  if(!plan.date||!plan.schedule)throw Error('Choose a date and generate a timed plan before adding it to your calendar.');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Date Night MASH//Date Plan//EN','CALSCALE:GREGORIAN'];
  for(const stop of plan.schedule.stops){const pick=plan.picks.find(o=>o.id===stop.id);const stamp=t=>{
    const nominal=new Date(`${plan.date}T${t}:00Z`),zone=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'shortOffset'}).formatToParts(nominal).find(p=>p.type==='timeZoneName').value;
    const offset=Number(zone.replace('GMT',''));return new Date(nominal.getTime()-offset*3600000).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');
   };
   lines.push('BEGIN:VEVENT',`UID:${plan.date}-${pick.id}-${plan.schedule.start.replace(':','')}@datenightmash.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z')}`,`DTSTART:${stamp(stop.start)}`,`DTEND:${stamp(stop.end)}`,`SUMMARY:${escapeICS(pick.name)}`,`LOCATION:${escapeICS(pick.venue?.address||'Location to be arranged')}`,`DESCRIPTION:${escapeICS('Suggested local NJ time; confirm bookings. '+pick.description+' '+(pick.pricing?.sourceUrl||''))}`,'END:VEVENT');
  }lines.push('END:VCALENDAR');
  // Fold at UTF-8-safe 70-byte boundaries (RFC 5545 limits content lines to 75 octets).
  return lines.map(line=>{let parts=[],piece='';for(const char of line){if(new TextEncoder().encode(piece+char).length>70){parts.push(piece);piece=' '+char;}else piece+=char;}parts.push(piece);return parts.join('\r\n');}).join('\r\n')+'\r\n';
 }
 $('#mark-tried').addEventListener('click',()=>{if(!activePlan)return;tried=[...new Set([...tried,...activePlan.picks.map(o=>o.id)])].slice(-40);if(write(historyKey,tried))$('#travel-message').textContent='Marked as tried on this device. Turn on “Something we haven’t tried” for your next plan.';updatePossibilities();});
 $('#clear-tried').addEventListener('click',()=>{tried=[];feedback=[];write(historyKey,tried);write(reasonKey,feedback);$('#travel-message').textContent='Your tried-place and feedback history is cleared on this device.';updatePossibilities();});
 function online(){const b=$('#connection-note');b.hidden=navigator.onLine!==false;b.textContent='You’re offline. Previously saved dates and downloads remain available after this app has been cached. Reconnect to generate or open directions.';}
 window.addEventListener('online',online);window.addEventListener('offline',online);online();
 if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
 return {setup,preferences,restore,decorate,replaceControl,rememberReason,render,calendar,count,includeCategory};
})();
