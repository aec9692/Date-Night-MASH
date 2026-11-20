/* A small, private companion for taking a generated itinerary out with you. */
window.DateCompanion = (() => {
  const $ = selector => document.querySelector(selector);
  const sparks = [
    'If we could repeat one day together, which would you pick?',
    'What is one tiny thing that made you happy this week?',
    'What is something you would love for us to learn together?',
    'Which song belongs on the soundtrack of tonight?',
    'What would our dream weekend look like with no schedule?',
    'What was your first impression of me?',
    'Pick a new tradition for our next date.',
    'What is a place nearby you have always wanted to explore?',
    'What would you order if we swapped meals for a night?',
    'Which moment tonight deserves a photo?',
    'What is something you are looking forward to?',
    'Plan a ridiculous dream date with an unlimited budget.'
  ];
  let plan, key = '', selected = 0, done = new Set(), spark = 0;
  function node(tag, text, className) {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  }
  function mapLink(label, destination, waypoints = []) {
    const url = DateDirections.to(destination,{town:plan?.mash?.origin||plan?.journey?.origin||'Paterson',location:plan?.location,waypoints});
    const link = node('a', label, 'button secondary');
    link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    return link;
  }
  function render(value) {
    plan = value;
    const nextKey = `${value.date}|${(window.MashJourney?MashJourney.ordered(value):value.picks).map(pick=>pick.id).join('|')}`;
    if (key !== nextKey) { key = nextKey; done = new Set(); selected = 0; spark = 0; }
    const picks=window.MashJourney?MashJourney.ordered(plan):plan.picks;
    $('#date-summary').textContent = `${done.size}/${picks.length} stops enjoyed · ${plan.date || 'Your next adventure'}`;
    $('#date-budget').textContent=`Selected picks $${(plan.totalCents/100).toFixed(2)} + reserve $${((plan.reserveCents||0)/100).toFixed(2)} = planned $${((plan.totalCents+(plan.reserveCents||0))/100).toFixed(2)} of $${(plan.budgetCents/100).toFixed(2)}. $${(plan.remainingCents/100).toFixed(2)} unallocated.`;
    $('#date-progress').max=picks.length;
    $('#date-progress').value = done.size;
    $('#stop-tabs').replaceChildren();
    picks.forEach((pick,index) => {
      const tab = node('button', `${done.has(index) ? '✓' : index+1} ${pick.category}`, 'stop-tab');
      tab.type = 'button'; tab.setAttribute('aria-pressed',String(index===selected));
      tab.addEventListener('click',()=>{selected=index;render(plan);});
      $('#stop-tabs').append(tab);
    });
    const pick = picks[selected];
    const card = $('#current-stop'); card.className = `current-stop ${pick.category}`; card.replaceChildren();
    card.append(node('span',`STOP ${selected+1} / ${picks.length}`, 'eyebrow'),node('h3',DatePlaces.title(pick)),node('p',pick.venue&&['dinner','treat'].includes(pick.category)?`Your ${pick.category} stop in ${pick.venue.city}. Choose from their menu; the saved cost is a budget example.`:pick.description));
    const stop=plan.schedule?.stops.find(s=>s.id===pick.id);if(stop)card.append(node('p',`${stop.start}–${stop.end} suggested visit`,'time-badge'));
    if (pick.venue) card.append(node('p',pick.venue.address,'venue-address'),node('p',pick.venue.hoursNote,'helper'),mapLink('Directions to this stop ↗',pick.venue.address));
    else card.append(node('p',pick.tip,'helper'));
    if(pick.home||pick.instructions?.length)card.append(DateExtras.homeDetails(pick));
    if(pick.place)card.append(node('p',pick.place.address||'Use the recorded map pin.'),mapLink('Directions to this stop',`${pick.place.lat},${pick.place.lon}`));
    const mark = node('button',done.has(selected)?'✓ Enjoyed · undo':'We did this! ✓','stop-done'); mark.type='button';
    mark.addEventListener('click',()=>{
      if(done.has(selected)) done.delete(selected);
      else { done.add(selected); const next=picks.findIndex((_,i)=>!done.has(i)); if(next!==-1)selected=next; }
      render(plan); $('#current-stop').focus({preventScroll:true});
    });
    card.append(mark);
    $('#date-complete').hidden = done.size !== picks.length;
    $('#full-route').replaceChildren();
    const addresses = picks.filter(pick=>pick.venue||pick.place).map(pick=>pick.venue?.address||`${pick.place.lat},${pick.place.lon}`);
    if(addresses.length) $('#full-route').append(mapLink('Check the whole route ↗',addresses[addresses.length-1],addresses.slice(0,-1)));
    $('#spark-question').textContent = sparks[spark];
  }
  $('#date-start').addEventListener('click',()=>{
    if(!plan) return;
    $('#date-mode').hidden=false; $('#date-mode').scrollIntoView({block:'start'}); $('#date-mode-title').focus({preventScroll:true});
  });
  $('#date-close').addEventListener('click',()=>{ $('#date-mode').hidden=true; $('#date-start').focus(); });
  $('#next-spark').addEventListener('click',()=>{ spark=(spark+1)%sparks.length; $('#spark-question').textContent=sparks[spark]; });
  return {render};
})();
