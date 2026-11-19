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
    const url = new URL('https://www.google.com/maps/dir/');
    url.search = new URLSearchParams({ api:'1', origin:'Paterson, NJ', destination, travelmode:'driving', ...(waypoints.length ? {waypoints:waypoints.join('|')} : {}) });
    const link = node('a', label, 'button secondary');
    link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
    return link;
  }
  function render(value) {
    plan = value;
    const nextKey = `${value.date}|${value.picks.map(pick=>pick.id).join('|')}`;
    if (key !== nextKey) { key = nextKey; done = new Set(); selected = 0; spark = 0; }
    $('#date-summary').textContent = `${done.size}/4 stops enjoyed · ${plan.date || 'Your next adventure'}`;
    $('#date-progress').value = done.size;
    $('#stop-tabs').replaceChildren();
    plan.picks.forEach((pick,index) => {
      const tab = node('button', `${done.has(index) ? '✓' : index+1} ${pick.category}`, 'stop-tab');
      tab.type = 'button'; tab.setAttribute('aria-pressed',String(index===selected));
      tab.addEventListener('click',()=>{selected=index;render(plan);});
      $('#stop-tabs').append(tab);
    });
    const pick = plan.picks[selected];
    const card = $('#current-stop'); card.className = `current-stop ${pick.category}`; card.replaceChildren();
    card.append(node('span',`STOP ${selected+1} / 4`, 'eyebrow'),node('h3',pick.name),node('p',pick.description));
    if (pick.venue) card.append(node('p',pick.venue.address,'venue-address'),node('p',pick.venue.hoursNote,'helper'),mapLink('Directions to this stop ↗',pick.venue.address));
    else card.append(node('p',pick.tip,'helper'));
    const mark = node('button',done.has(selected)?'✓ Enjoyed · undo':'We did this! ✓','stop-done'); mark.type='button';
    mark.addEventListener('click',()=>{
      if(done.has(selected)) done.delete(selected);
      else { done.add(selected); const next=plan.picks.findIndex((_,i)=>!done.has(i)); if(next!==-1)selected=next; }
      render(plan); $('#current-stop').focus({preventScroll:true});
    });
    card.append(mark);
    $('#date-complete').hidden = done.size !== 4;
    $('#full-route').replaceChildren();
    const addresses = plan.picks.filter(pick=>pick.venue).map(pick=>pick.venue.address);
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
