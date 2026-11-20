const $ = selector => document.querySelector(selector);
const labels = { dinner: 'Dinner', activity: 'Activity', treat: 'Treat', entertainment: 'Entertainment' };
const settingLabels = { any: 'Surprise me', indoor: 'Indoors', outdoor: 'Outdoors', home: 'At home', mixed:'Indoor & outdoor' };
const moodLabels = { surprise: 'A little of everything', cozy: 'Cozy', adventurous: 'Adventurous', romantic: 'Romantic', competitive: 'Competitive' };
const areaLabels = { paterson: 'Near Paterson, NJ', general: 'Original ideas', all: 'Local & original ideas' };
const storageKey = 'date-night-mash-favorites-v1';
const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
let catalog = [];
let customOptions = [];
let excluded = new Set();
let locks = {};
let currentPlan = null;
let favorites = [];
let busy = false;
let planningMode = 'mash';
let budgetCountTimer = null;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, className, action) {
  const node = element('button', text, className);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}
function message(text, error = false) {
  $('#message').textContent = text;
  $('#message').classList.toggle('error', error);
}
function allOptions() { return [...catalog, ...(MashPlanner.customCatalog(customOptions) || [])]; }
function planKey(plan) { return `${plan.date||''}|${plan.mash?`mash|${plan.mash.origin}|${plan.mash.radius}|${plan.mash.age}`:''}|${plan.journey?`${plan.journey.format}|${plan.journey.start}|${plan.journey.origin}|${plan.journey.order.join(',')}`:''}|${plan.picks.map(pick => pick.id).join('|')}`; }
function mood() { return $('input[name=mood]:checked').value; }
async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}
function preferences(locked = locks) {
  return { budget: $('#budget').value === '' ? null : Number($('#budget').value), setting: $('#setting').value,
    mood: mood(), spending: $('#spending').value, area: $('#area').value, date: $('#visit-date').value, excluded: [...excluded], customOptions, locked,
    pantry:DateExtras.pantry(),
    ...(SmartDate.preferences()&&!['home','mixed'].includes($('#setting').value) ? {journey:SmartDate.preferences()} : {}) };
}
function mashPreferences(locked=locks) {
  return {budget:$('#mash-budget').value===''?null:Number($('#mash-budget').value),area:$('#mash-area').value,
    setting:$('#mash-setting').value,mood:'surprise',spending:$('#mash-spending').value,date:'',excluded:[...excluded],customOptions,locked,
    pantry:DateExtras.pantry(),recent:DateExtras.recentDates(allOptions()),...(DateExtras.location()?{location:DateExtras.location()}:{}),
    mash:{age:$('#mash-age').value,origin:$('#mash-town').value,radius:Number($('#mash-radius').value)}};
}
function activePreferences(){return planningMode==='mash'?mashPreferences():preferences();}
function setPlanningMode(mode,scroll=false){
  if(busy)return;
  planningMode=mode==='scene'?'scene':'mash';
  $('#mash').hidden=planningMode!=='mash';$('#planner').hidden=planningMode!=='scene';
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===planningMode)));
  if(planningMode==='scene')for(const category of Object.keys(locks))if(!MashJourney.formats[$('#date-format').value].categories.includes(category))delete locks[category];
  updatePossibilities();if(catalog.length)renderCatalog();
  if(scroll){const section=planningMode==='mash'?$('#mash'):$('#planner');section.scrollIntoView({block:'start'});}
}

// Saved plans can contain custom ideas. Validate their snapshot as strictly as a request.
function validPlan(plan) {
  if (!plan || !Array.isArray(plan.picks) || !Object.prototype.hasOwnProperty.call(settingLabels, plan.setting)) return false;
  const journey=plan.journey===undefined?null:MashJourney.normalize(plan.journey);
  if (plan.journey!==undefined&&!journey) return false;
  const mash=plan.mash===undefined?null:MashJourney.normalizeMash(plan.mash);
  if(plan.mash!==undefined&&(!mash||journey))return false;
  const categories=journey?MashJourney.formats[journey.format].categories:MashPlanner.categories;
  if(plan.picks.length!==categories.length) return false;
  if (plan.mood !== undefined && !MashPlanner.moods.includes(plan.mood)) return false;
  if (plan.spending !== undefined && !MashPlanner.spendingModes.includes(plan.spending)) return false;
  if (plan.area !== undefined && !MashPlanner.areas.includes(plan.area)) return false;
  if (plan.date !== undefined && !MashPlanner.validDate(plan.date)) return false;
  if(plan.location&&(typeof plan.location.lat!=='number'||!Number.isFinite(plan.location.lat)||Math.abs(plan.location.lat)>90||typeof plan.location.lon!=='number'||!Number.isFinite(plan.location.lon)||Math.abs(plan.location.lon)>180||typeof plan.location.label!=='string'||plan.location.label.length>160))return false;
  if (![plan.budgetCents, plan.totalCents, plan.remainingCents].every(Number.isSafeInteger)) return false;
  if (plan.budgetCents < 0 || plan.budgetCents > 1000000 || plan.totalCents < 0 || plan.remainingCents < 0) return false;
  const custom = MashPlanner.customCatalog(plan.customOptions || []);
  if (!custom || !DateCosts.validPantry(plan.pantry||[])) return false;
  const knownOptions = [...catalog, ...custom];
  const canonical = plan.picks.map(pick=>knownOptions.find(option=>option.id===pick?.id));
  if(canonical.some(pick=>!pick))return false;
  const priced=DateCosts.resolve(canonical,plan.pantry||[]).picks;
  const matching = plan.picks.every((pick, index) => {
    if (!pick || pick.category !== categories[index]) return false;
    const known = knownOptions.find(option => option.id === pick.id);
    return known && known.category === pick.category && known.name === pick.name && known.description === pick.description &&
      priced[index].costCents === pick.costCents && (plan.setting === 'any' || plan.setting==='mixed'&&!known.settings.includes('home') || known.settings.includes(plan.setting)) &&
      (plan.pantry===undefined||DateCosts.available(known,plan.pantry)) && MashPlanner.eligible(known,plan.setting==='home'?'general':plan.area||'all',plan.date||'');
  });
  if(journey&&(!matching||!plan.picks.every(pick=>MashJourney.matches(knownOptions.find(o=>o.id===pick.id),journey))||!MashJourney.schedule(plan.picks.map(pick=>knownOptions.find(o=>o.id===pick.id)),journey)))return false;
  if(mash&&(!matching||!plan.picks.every(pick=>MashJourney.matchesMash(knownOptions.find(o=>o.id===pick.id),mash,plan.location))))return false;
  return matching && plan.totalCents === plan.picks.reduce((sum, pick) => sum + pick.costCents, 0) &&
    plan.budgetCents - plan.totalCents === plan.remainingCents && typeof plan.notice === 'string' && plan.notice.length <= 300;
}
function hydrate(plan) {
  const known = [...catalog, ...MashPlanner.customCatalog(plan.customOptions || [])];
  const picks = DateCosts.resolve(plan.picks.map(pick => known.find(option => option.id === pick.id)),plan.pantry||[]).picks;
  const chosenMood = plan.mood || 'surprise';
  const legacyOwnership=plan.pantry===undefined&&picks.some(pick=>pick.home?.requiresOwned.length);
  const journey=plan.journey&&MashJourney.normalize(plan.journey);
  return { ...plan, picks, legacyOwnership, ...(journey?{journey,schedule:MashJourney.schedule(picks,journey)}:{}), mood: chosenMood, spending: plan.spending || 'flexible', area: plan.area || 'general', date: plan.date || '', title: MashPlanner.title(chosenMood, picks), customOptions: plan.customOptions || [] };
}

async function loadCatalog() {
  $('#retry').hidden = true;
  $('#play').disabled = true;
  $('#mash-play').disabled=true;
  message('Loading the good ideas…');
  try {
    const response = await request('/api/options');
    if (!response.ok) throw new Error('Could not load ideas.');
    const data = await response.json();
    if (!Array.isArray(data.options) || !data.options.length) throw new Error('No ideas were returned.');
    catalog = data.options;
    SmartDate.setup(data);
    DateExtras.setup(data);
    populateTowns();
    renderCatalog();
    loadFavorites();
    updatePossibilities();
    $('#play').disabled = false;
    $('#mash-play').disabled=false;
    message('Your next “remember when” is one click away.');
  } catch {
    message('Could not load date ideas. Check your connection and try again.', true);
    $('#retry').hidden = false;
    $('#possibility-count').textContent = 'The ideas are taking a little longer.';
  }
}

function syncBudgetControls(mode = planningMode) {
  const prefix = mode === 'mash' ? 'mash-' : '';
  const input = $(`#${prefix}budget`);
  const budget = Number(input.value);
  $(`#${prefix}budget-slider`).value = Math.min(1000, Math.max(0, budget));
  $(`#${prefix}budget-caption`).textContent = budget === 0 ? 'The best things can be free.' : budget <= 25 ? 'Small budget. Big possibilities.' : budget <= 100 ? 'A lovely little night out.' : budget <= 300 ? 'Make a whole occasion of it.' : 'Time to really treat each other.';
  document.querySelectorAll(`[data-${prefix}budget]`).forEach(node => {
    const selected = input.value !== '' && Number(node.getAttribute(`data-${prefix}budget`)) === budget;
    node.classList.toggle('is-selected', selected);
    node.setAttribute('aria-pressed', String(selected));
  });
}
function updateBudget(event, mode) {
  const prefix = mode === 'mash' ? 'mash-' : '';
  if (![`${prefix}budget`, `${prefix}budget-slider`].includes(event.target.id)) return false;
  if (event.target.id === `${prefix}budget-slider`) $(`#${prefix}budget`).value = event.target.value;
  syncBudgetControls(mode);
  clearTimeout(budgetCountTimer);
  budgetCountTimer = setTimeout(updatePossibilities, 180);
  return true;
}
function updatePossibilities() {
  clearTimeout(budgetCountTimer);
  syncBudgetControls();
  if(planningMode==='mash'){
    SmartDate.count(mashPreferences(),result=>{
    $('#mash-count').textContent=`${(result.combinationCount||0).toLocaleString()} four-pick dates`;
    $('#mash-note').textContent=result.error||($('#mash-spending').value==='treat'?'Four picks near your budget when possible, all matching your setting.':'Four picks matching your setting; any affordable total can win.');
    $('#mash-note').classList.toggle('error',Boolean(result.error));
    });
    return;
  }
  SmartDate.count(preferences(),analysis=>{
  const count = analysis.combinationCount || 0;
  $('#possibility-count').textContent = `${count.toLocaleString()} affordable ${count === 1 ? 'date' : 'dates'}`;
  const lockedCount = Object.keys(locks).length;
  const spendingNote = $('#spending').value === 'treat' ? 'Treat us picks near-budget dates from this mix.' : 'Any affordable total can be picked.';
  $('#possibility-note').textContent = analysis.error || `${lockedCount ? `${lockedCount} ${lockedCount === 1 ? 'pick' : 'picks'} locked. ` : ''}${spendingNote}`;
  $('#possibility-note').classList.toggle('error', Boolean(analysis.error));
  });
}

function renderCatalog() {
  const active=activePreferences();
  const home=active.setting==='home';
  const options=allOptions().filter(option=>DateCosts.available(option,active.pantry||[])&&(!home||option.home||option.custom&&option.settings.includes('home')))
    .map(option=>DateCosts.resolve([option],active.pantry||[]).picks[0]);
  DatePlaceUI.render({options,area:home?'general':active.area,setting:active.setting,date:active.date,
    deck:$('#catalog').dataset.deck||'all',query:$('#idea-search').value,town:$('#idea-town').value,tier:$('#idea-tier').value,kind:$('#idea-cost').value,
    excluded,busy,
    onToggle(group){
      if(busy)return;
      const remove=group.options.every(o=>!excluded.has(o.id));
      for(const option of group.options){if(remove)excluded.add(option.id);else excluded.delete(option.id);if(remove&&locks[option.category]===option.id)delete locks[option.category];}
      renderCatalog();updatePossibilities();if(currentPlan)renderResult();
    },
    onPreview(group,trigger){
      const example=group.options.filter(o=>!excluded.has(o.id)&&MashPlanner.eligible(o,active.area,active.date)).sort((a,b)=>a.costCents-b.costCents)[0]||group.options[0];
      previewIdea(example,trigger);
    },
    onRemove(option){customOptions=customOptions.filter(o=>o.id!==option.id);excluded.delete(option.id);if(locks[option.category]===option.id)delete locks[option.category];renderCatalog();updatePossibilities();},
    onLock(option){if(busy)return;locks[option.category]=option.id;excluded.delete(option.id);message(`${option.name} is locked for ${labels[option.category].toLowerCase()}. Your total must still fit the budget.`);updatePossibilities();}
  });
}
function setBusy(value) {
  busy = value;
  document.body.classList.toggle('is-busy', value);
  document.querySelectorAll('#owned-items input, .saved-card button, .place-card button, #plan-form input, #plan-form select, #plan-form button, #mash-form input, #mash-form select, #mash-form button, [data-mode], #custom-form input, #custom-form select, #custom-form button, #idea-search, #idea-tier, #idea-cost, #idea-town, #town-chips button, [data-deck], .idea-details, .option-choice, .remove-custom, .pick-controls button, .replace-choice, .order-controls button, #again, #reset-ideas, #date-start, #add-calendar, #share-invite, #mark-tried, #clear-tried').forEach(node => { node.disabled = value; });
  if (!value && currentPlan) renderResult();
}

async function generate(event, rerollCategory = null, requestedMode = null) {
  event?.preventDefault();
  const mode=requestedMode||(rerollCategory&&currentPlan?(currentPlan.mash?'mash':'scene'):planningMode);
  if (busy || !catalog.length || !$(mode==='mash'?'#mash-form':'#plan-form').reportValidity()) return;
  MashShow.primeSound();
  const known = allOptions();
  if (rerollCategory && currentPlan.picks.some(pick => !known.some(option => option.id === pick.id))) {
    message('This date includes a custom idea you removed. Play MASH for a fresh plan, or add the idea back.', true);
    return;
  }
  const requestLocks = rerollCategory ? Object.fromEntries(currentPlan.picks.filter(pick => pick.category !== rerollCategory).map(pick => [pick.category, pick.id])) : locks;
  const payload = mode==='mash'?mashPreferences(requestLocks):preferences(requestLocks);
  if (currentPlan && currentPlan.picks.every(pick => known.some(option => option.id === pick.id)) &&
    (payload.journey?currentPlan.journey?.format===payload.journey.format:currentPlan.picks.length===4)) payload.previous = currentPlan.picks.map(pick => pick.id);
  setBusy(true);
  message(rerollCategory ? `Giving ${labels[rerollCategory].toLowerCase()} a little plot twist…` : 'Finding the magic in your mix…');
  try {
    const response = await request('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not generate a plan. Try again.');
    if (!validPlan(data)) throw new Error('The server returned an incomplete plan. Please try again.');
    if (!data.unchanged) {
      // Reveal only ideas that can replace their category in the chosen plan without overspending.
      // This avoids enumerating hundreds of thousands of plans again in the browser.
      const pool = allOptions().filter(option => !payload.excluded.includes(option.id) &&
        MashPlanner.eligible(option,payload.setting==='home'?'general':payload.area,payload.date) &&
        DateCosts.available(option,payload.pantry||[]) && DateCosts.settingMatches(option,payload.setting) &&
        (!payload.locked[option.category] || payload.locked[option.category] === option.id) &&
        DateCosts.compatible(data.picks.map(pick=>pick.category===option.category?option:pick)) &&
        DateCosts.resolve(data.picks.map(pick=>pick.category===option.category?option:pick),payload.pantry||[]).totalCents<=data.budgetCents);
      await MashShow.reveal(data, pool, $(mode==='mash'?'#mash-instant':'#instant').checked || Boolean(rerollCategory));
    }
    currentPlan = hydrate(data);
    DateExtras.remember(currentPlan);
    planningMode=mode;
    renderResult();
    message(data.unchanged ? 'This is the only combination that fits these choices. Unlock a pick, include more ideas, or adjust your plan.' : rerollCategory ? `${labels[rerollCategory]} remixed. Your other picks stayed put, and the total still fits.` : 'It’s a date! Keep the picks you love, remix the rest.');
    $('#result-title').focus({ preventScroll: true });
    $('#result').scrollIntoView({ block: 'nearest' });
    if (!data.unchanged && !rerollCategory) MashShow.celebrate();
  } catch (error) {
    message(['TimeoutError', 'AbortError', 'TypeError'].includes(error.name) ? 'Could not reach the server. Check your connection and try again.' : error.message, true);
  } finally { setBusy(false); }
}

function renderResult() {
  $('#result-picks').replaceChildren();
  MashJourney.ordered(currentPlan).forEach((pick, index) => {
    const locked = locks[pick.category] === pick.id;
    const card = element('article', undefined, `pick ${pick.category}${locked ? ' is-locked' : ''}`);
    card.dataset.pickId = pick.id;
    const art = element('div', undefined, 'pick-art');
    const emoji = element('span', pick.emoji || '✨', 'emoji');
    emoji.setAttribute('aria-hidden', 'true');
    art.append(element('span', `0${index + 1} / ${labels[pick.category].toUpperCase()}`, 'step-label'), emoji);
    const copy = element('div', undefined, 'pick-body');
    const food=pick.venue&&['dinner','treat'].includes(pick.category);
    const group=food?DatePlaces.group(catalog.filter(o=>o.venue?.id===pick.venue.id&&o.category===pick.category))[0]:null;
    copy.append(element('h3',DatePlaces.title(pick)),element('p',food?`${labels[pick.category]} in ${pick.venue.city}. Explore the menu and choose what sounds good.`:pick.description,'pick-description'),
      element('span',group?`${DatePlaces.range(group)} · sample range for two`:money(pick.costCents),'pick-price'));
    if(food)copy.append(element('p',`Budgeted example: ${money(pick.costCents)}. Actual dishes and final bill are your choice.`,'helper'));
    else copy.append(element('p',pick.tip||'Make this one your own.','pick-tip'));
    if (pick.venue) copy.append(venueDetails(pick,currentPlan.mash?.origin||currentPlan.journey?.origin||'Paterson',currentPlan.location));
    if(pick.place){
      copy.append(element('p',pick.place.address||'Street address not recorded; use the map pin.','helper'),element('p','Your personal price estimate. Community map details need confirmation.','helper'));
      const link=element('a','Get directions');link.href=DateDirections.to(`${pick.place.lat},${pick.place.lon}`,{town:currentPlan.mash?.origin,location:currentPlan.location});link.target='_blank';link.rel='noopener noreferrer';copy.append(link);
    }
    if(pick.home||pick.instructions?.length)copy.append(DateExtras.homeDetails(pick));
    SmartDate.decorate(pick,art,copy,currentPlan);
    const controls = element('div', undefined, 'pick-controls');
    const lock = button(locked ? '🔒 Locked in' : '♡ Keep this', 'lock-button', () => {
      if (busy) return;
      if (locked) delete locks[pick.category];
      else {
        if (!allOptions().some(option => option.id === pick.id)) { message('This idea was removed from your mix. Generate another plan before locking it.', true); return; }
        locks[pick.category] = pick.id;
        excluded.delete(pick.id);
      }
      renderResult();
      renderCatalog();
      updatePossibilities();
      $(`#result-picks [data-lock="${pick.category}"]`).focus({ preventScroll: true });
    });
    lock.dataset.lock = pick.category;
    lock.setAttribute('aria-pressed', String(locked));
    lock.setAttribute('aria-label', `${locked ? 'Unlock' : 'Lock'} ${labels[pick.category]}: ${pick.name}`);
    const reroll = button('↻ Reroll', 'reroll-button', () => generate(null, pick.category));
    reroll.setAttribute('aria-label', `Reroll ${labels[pick.category]} only`);
    reroll.dataset.reroll = pick.category;
    lock.disabled = busy;
    reroll.disabled = busy || locked;
    controls.append(lock, reroll);
    controls.append(SmartDate.replaceControl(pick,reason=>{
      if(busy)return;
      SmartDate.rememberReason(pick,reason);
      if(locks[pick.category]===pick.id)delete locks[pick.category];
      excluded.add(pick.id);
      if(reason==='distance'&&SmartDate.preferences())for(const [category,id]of Object.entries(locks)){
        const option=allOptions().find(o=>o.id===id);if(!option||!MashJourney.matches(option,SmartDate.preferences()))delete locks[category];
      }
      updatePossibilities();renderCatalog();generate(null,reason==='distance'?null:pick.category);
    }));
    card.append(art, copy, controls);
    $('#result-picks').append(card);
  });
  $('#result-title').textContent = currentPlan.title;
  $('#result-subtitle').textContent=currentPlan.mash?'Your MASH draw: one pick from each of the four categories. Confirm opening times and arrange your stops.':'Your custom plan. Check bookings and opening times before heading out.';
  $('#result-setting').textContent = `${DateCosts.settingLabel(currentPlan.picks,currentPlan.setting)} · ${moodLabels[currentPlan.mood]}${currentPlan.location?' · '+currentPlan.location.label:currentPlan.setting==='home'?' · Your place':' · '+areaLabels[currentPlan.area]}${currentPlan.date ? ` · ${currentPlan.date}` : ''}`;
  $('#result-total').textContent = money(currentPlan.totalCents);
  $('#remaining').textContent = `${money(currentPlan.remainingCents)} left for little extras`;
  const max = currentPlan.maximumCents;
  $('#spend-explanation').textContent = currentPlan.spending === 'flexible' ? 'Flexible mode: your budget is a ceiling, and any affordable combination can win.' :
    Number.isSafeInteger(max) && max < currentPlan.budgetCents * .9 ? `Treat us: these choices top out at ${money(max)}. We aimed near that amount. Change the setting, unlock picks, or add an idea to go bigger.` :
    'Treat us: this plan aims to use 90–100% of your budget while staying within your limit.';
  $('#budget-used').style.width = `${currentPlan.budgetCents ? Math.min(100, currentPlan.totalCents / currentPlan.budgetCents * 100) : 0}%`;
  $('#result-notice').textContent = currentPlan.legacyOwnership?'Older saved date: confirm already-owned food, games or streaming before treating its $0 picks as free. '+currentPlan.notice:currentPlan.notice;
  $('#save').textContent = favorites.some(plan => planKey(plan) === planKey(currentPlan)) ? '♡ Date saved' : '♡ Save this date';
  $('#result').hidden = false;
  $('#phone-date').removeAttribute('aria-disabled');
  $('#date-start').disabled = busy;
  DateCompanion.render(currentPlan);
  DateExtras.shopping(currentPlan);
  SmartDate.render(currentPlan,next=>{currentPlan=next;renderResult();},()=>generate());
}

function loadFavorites() {
  $('#storage-message').textContent = '';
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(stored)) throw new Error('Invalid saved dates');
    favorites = stored.slice(0, 50).filter(validPlan).filter((plan, index, all) => all.findIndex(other => planKey(other) === planKey(plan)) === index).map(hydrate);
    if (favorites.length !== stored.length) $('#storage-message').textContent = 'Some outdated or unreadable saved dates could not be loaded.';
  } catch {
    favorites = [];
    $('#storage-message').textContent = 'Saved dates could not be loaded. You can still generate and download a date.';
  }
  renderFavorites();
  if (currentPlan) renderResult();
}
function writeFavorites(next) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
    favorites = next;
    $('#storage-message').textContent = '';
    renderFavorites();
    return true;
  } catch {
    $('#storage-message').textContent = 'Your browser could not save this change. Download your date card to keep a copy instead.';
    return false;
  }
}
function saveCurrent() {
  if (!currentPlan || busy) return;
  if (favorites.some(plan => planKey(plan) === planKey(currentPlan))) { message('This combination is already tucked away in your saved dates.'); return; }
  if (favorites.length >= 50) { message('You have 50 saved dates. Remove one before saving another.', true); return; }
  if (writeFavorites([...favorites, currentPlan])) { renderResult(); message('Saved for another night, on this device.'); }
}
function renderFavorites() {
  $('#saved-count').textContent = favorites.length;
  $('#saved-plans').replaceChildren();
  if (!favorites.length) {
    const empty = element('div', undefined, 'empty');
    empty.append(element('span', '♡', 'empty-symbol'), element('strong', 'A little collection of “let’s do that.”'), element('p', 'Play a round, find a spark, and save it here for another night.'));
    $('#saved-plans').append(empty);
  }
  for (const plan of favorites) {
    const card = element('article', undefined, 'saved-card');
    card.append(element('h3', plan.title), element('p', plan.picks.map(pick => pick.emoji || '✳').join(' '), 'saved-emoji'));
    const list = element('ul');
    for (const pick of plan.picks) list.append(element('li', `${DatePlaces.title(pick)} · ${money(pick.costCents)}`));
    const actions = element('div', undefined, 'actions');
    actions.append(button('PDF', 'secondary saved-download', () => downloadPlan(plan)), button('Revisit', 'secondary', () => {
      if (busy) return;
      customOptions = plan.customOptions || [];
      DateExtras.restore(plan);
      excluded = new Set();
      locks = {};
      if(plan.mash){
        $('#mash-budget').value=plan.budgetCents/100;$('#mash-setting').value=plan.setting;$('#mash-spending').value=plan.spending;
        $('#mash-area').value=plan.area;$('#mash-town').value=plan.mash.origin;$('#mash-radius').value=String(plan.mash.radius);$('#mash-age').value=plan.mash.age;
      }else{
        $('#budget').value=plan.budgetCents/100;$('#setting').value=plan.setting;$('#spending').value=plan.spending;
        $('#area').value=plan.area;$('#visit-date').value=plan.date;SmartDate.restore(plan);
        $(`input[name=mood][value="${plan.mood}"]`).checked=true;
      }
      setPlanningMode(plan.mash?'mash':'scene');
      currentPlan = plan;
      renderResult();
      renderCatalog();
      updatePossibilities();
      $('#result-title').focus({ preventScroll: true });
      $('#result').scrollIntoView({ block: 'nearest' });
    }), button('Remove', 'text-button saved-remove', () => {
      if (writeFavorites(favorites.filter(saved => planKey(saved) !== planKey(plan)))) {
        $('#storage-message').textContent = 'Date removed from this device.';
        if (currentPlan) renderResult();
        $('#saved-title').focus({ preventScroll: true });
      }
    }));
    card.append(list, element('strong', `${money(plan.totalCents)} for two`), element('p', `${moodLabels[plan.mood]} · ${settingLabels[plan.setting]}`, 'helper'), actions);
    $('#saved-plans').append(card);
  }
}

function addCustom(event) {
  event.preventDefault();
  if (busy || !$('#custom-form').reportValidity()) return;
  if (customOptions.length >= 4) { $('#custom-message').textContent = 'Four personal favorites are in the mix. Remove one to add another.'; return; }
  const setting = $('#custom-setting').value;
  const suffix = typeof crypto.randomUUID === 'function' ? crypto.randomUUID().slice(0, 8) :
    Array.from(crypto.getRandomValues(new Uint8Array(4)), byte => byte.toString(16).padStart(2, '0')).join('');
  const option = { id: `custom-${suffix}`, category: $('#custom-category').value,
    name: $('#custom-name').value.trim(), costCents: Math.round(Number($('#custom-cost').value) * 100),
    settings: setting === 'any' ? ['indoor', 'outdoor', 'home'] : setting === 'home' ? ['indoor', 'home'] : [setting],
    ...(DateExtras.placeMetadata()?{place:DateExtras.placeMetadata()}:{} ) };
  if (!MashPlanner.customCatalog([option])) { $('#custom-message').textContent = 'Add a name, a setting, and a valid cost.'; return; }
  customOptions.push(option);
  DateExtras.clearPending();
  $('#custom-form').reset();
  $('#custom-message').textContent = `${option.name} is in the mix.`;
  renderCatalog();
  updatePossibilities();
}

$('#plan-form').addEventListener('submit',event=>generate(event,null,'scene'));
$('#mash-form').addEventListener('submit',event=>generate(event,null,'mash'));
$('#mash-form').addEventListener('input',event=>{
  if(event.target.closest('.location-search'))return;
  if(updateBudget(event,'mash'))return;
  if(event.target.id==='mash-setting'){locks={};if(currentPlan)renderResult();}
  updatePossibilities();renderCatalog();
});
document.querySelectorAll('[data-mash-budget]').forEach(b=>b.addEventListener('click',()=>{$('#mash-budget').value=b.dataset.mashBudget;updatePossibilities();}));
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setPlanningMode(b.dataset.mode)));
document.querySelectorAll('[data-open-mode]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();setPlanningMode(link.dataset.openMode,true);}));
document.querySelectorAll('[data-budget]').forEach(node => node.addEventListener('click', () => {
  $('#budget').value = node.dataset.budget;
  updatePossibilities();
}));
$('#idea-search').addEventListener('input', renderCatalog);
$('#idea-town').addEventListener('change', () => { syncTownChips(); renderCatalog(); });
document.querySelectorAll('[data-deck]').forEach(tab => tab.addEventListener('click', () => {
  $('#catalog').dataset.deck = tab.dataset.deck;
  document.querySelectorAll('#catalog .category').forEach(section=>{section.hidden=tab.dataset.deck!=='all'&&section.dataset.category!==tab.dataset.deck;});
  document.querySelectorAll('[data-deck]').forEach(other=>other.setAttribute('aria-pressed', String(other===tab)));
}));
$('#idea-tier').addEventListener('change', renderCatalog);
$('#idea-cost').addEventListener('change',renderCatalog);
$('#drive-origin').addEventListener('change',()=>{if(currentPlan)renderResult();document.dispatchEvent(new Event('mash:directions-change'));});
$('#again').addEventListener('click', generate);
$('#plan-form').addEventListener('input', event => {
  if (updateBudget(event, 'scene')) return;
  if (['setting', 'area', 'visit-date','date-format','start-town','trip-radius','leg-limit','audience','cuisine','vegetarian','low-effort','alcohol-free','fresh-ideas','smart-enabled'].includes(event.target.id)) {
    locks = {};
    renderCatalog();
  }
  updatePossibilities();
});
$('#save').addEventListener('click', saveCurrent);
$('#download').addEventListener('click', () => { if (currentPlan) downloadPlan(currentPlan); });
$('#share-pdf').hidden = !(typeof navigator.share === 'function' && typeof navigator.canShare === 'function');
$('#share-pdf').addEventListener('click', async () => {
  if (!currentPlan) return;
  try { await DateCard.share(currentPlan); } catch (error) {
    if (error.name !== 'AbortError') message('Could not share this PDF. Use Download PDF or Text version instead.', true);
  }
});
$('#download-text').addEventListener('click', () => { if (currentPlan) DateCard.download(currentPlan, 'txt'); });
$('#custom-form').addEventListener('submit', addCustom);
$('#reset-ideas').addEventListener('click', () => {
  if (busy) return;
  excluded.clear(); locks = {}; renderCatalog(); updatePossibilities();
  if (currentPlan) renderResult();
  message('All ideas are back in the mix. Your locks are cleared.');
});
$('#sound').addEventListener('click', () => {
  const enabled = MashShow.toggleSound();
  $('#sound').textContent = enabled ? 'Sound on' : 'Sound off';
  $('#sound').setAttribute('aria-pressed', String(enabled));
});
$('#retry').addEventListener('click', loadCatalog);
window.addEventListener('storage', event => { if (event.key === storageKey || event.key === null) loadFavorites(); });
loadCatalog();

function downloadPlan(plan) {
  try { DateCard.download(plan); } catch { message('Could not create the PDF. Try the Text version or reload the page.', true); }
}
function externalLink(label, href) {
  const link = element('a', label);
  const url = new URL(href);
  if (url.protocol !== 'https:') throw new Error('Unsupported venue link');
  link.href = url.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}
function venueDetails(pick, origin = activePreferences().mash?.origin||activePreferences().journey?.origin||'Paterson', location=activePreferences().location) {
  const wrap = element('div', undefined, 'venue-details');
  wrap.append(element('p', pick.venue.address, 'venue-address'));
  const links = element('div', undefined, 'venue-links');
    links.append(externalLink('Official menu / tickets', pick.pricing.sourceUrl), externalLink('Check drive', DateDirections.to(pick.venue.address,{town:origin,location})));
  wrap.append(links);
  const details = element('details', undefined, 'price-proof');
  const p = pick.pricing;
  details.append(element('summary', 'How the budget example was calculated'), element('p', p.order),
    element('p', `Posted subtotal ${money(p.baseCents)} · tax reserve ${money(p.taxCents)} · optional tip ${money(p.tipCents)}${p.donationCents ? ` · optional donation ${money(p.donationCents)}` : ''}`),
    element('p', p.taxNote), element('p', p.tipNote), element('p', pick.venue.hoursNote), element('p', p.exclusions), element('p', `Source checked ${p.checkedOn}. Prices can change.`));
  wrap.append(details);
  return wrap;
}

function populateTowns() {
  const local = catalog.filter(option=>option.venue);
  const towns = [...new Set(local.map(option=>option.venue.city))].sort();
  $('#idea-town').replaceChildren(element('option','Every town'));
  $('#idea-town').firstChild.value = 'all';
  towns.forEach(town=>{ const option=element('option',town); option.value=town; $('#idea-town').append(option); });
  $('#town-chips').replaceChildren();
  ['all','Wayne','Montclair','Totowa','Paterson','Paramus','Parsippany','Fair Lawn','Fairfield','Hoboken','Jersey City'].filter(town=>town==='all'||towns.includes(town)).forEach(town=>{
    const chip=button(town==='all'?'Every town':town,'town-chip',()=>{ $('#idea-town').value=town;syncTownChips();renderCatalog(); });
    chip.dataset.town=town; $('#town-chips').append(chip);
  });
  $('#local-stats').textContent = `${catalog.length} ideas · ${local.length} NJ examples · ${new Set(local.map(option=>option.venue.id)).size} places · ${towns.length} towns`;
  syncTownChips();
}
function syncTownChips() {
  $('#town-chips').querySelectorAll('button').forEach(chip=>chip.setAttribute('aria-pressed',String(chip.dataset.town===$('#idea-town').value)));
}
let previewTrigger;
function previewIdea(option, trigger) {
  if(busy) return;
  previewTrigger=trigger;
  const content=$('#preview-content'); content.replaceChildren();
  const group=DatePlaces.group(catalog.filter(o=>o.venue?.id===option.venue.id&&o.category===option.category))[0];
  const title=element('h2',option.venue.name); title.id='preview-title';
  content.append(element('p',`${labels[option.category]} · ${option.venue.city}, NJ`,'eyebrow'),title,element('strong',`${DatePlaces.range(group)} · sample totals for two`),element('p','Range based on checked examples, including the listed planning allowances. Your order and final bill can differ.'),venueDetails(option));
  SmartDate.decorate(option,null,content,null);
  const choose=button('Build around this ♡','',()=>{
    if(busy)return;
    if(planningMode==='scene')SmartDate.includeCategory(option);
    locks[option.category]=option.id;excluded.delete(option.id);
    if(planningMode==='mash'&&$('#mash-area').value==='general')$('#mash-area').value='paterson';
    if($('#area').value==='general')$('#area').value='paterson';
    const settingControl=$(planningMode==='mash'?'#mash-setting':'#setting');
    if(settingControl.value!=='any'&&!option.settings.includes(settingControl.value))settingControl.value='any';
    closePreview();renderCatalog();updatePossibilities();if(currentPlan)renderResult();
    message(`${option.venue.name} is kept with a ${money(option.costCents)} budget example. Check your budget, then generate.`);
    $(planningMode==='mash'?'#mash':'#planner').scrollIntoView({block:'start'});$(planningMode==='mash'?'#mash-play':'#play').focus({preventScroll:true});
  });
  content.append(choose);
  const dialog=$('#idea-preview');
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  $('#preview-close').focus();
}
function closePreview() {
  const dialog=$('#idea-preview');
  if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');
  if(previewTrigger?.isConnected)previewTrigger.focus({preventScroll:true});
}
$('#preview-close').addEventListener('click',closePreview);
$('#idea-preview').addEventListener('cancel',()=>{ if(previewTrigger?.isConnected)previewTrigger.focus({preventScroll:true}); });
$('#phone-date').addEventListener('click',event=>{ if(!currentPlan){event.preventDefault();setPlanningMode(planningMode,true);} });
