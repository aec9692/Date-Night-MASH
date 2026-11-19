const $ = selector => document.querySelector(selector);
const labels = { dinner: 'Dinner', activity: 'Activity', treat: 'Treat', entertainment: 'Entertainment' };
const settingLabels = { any: 'Any setting', indoor: 'Indoors', outdoor: 'Outdoors', home: 'At home' };
const moodLabels = { surprise: 'A little of everything', cozy: 'Cozy', adventurous: 'Adventurous', romantic: 'Romantic', competitive: 'Competitive' };
const storageKey = 'date-night-mash-favorites-v1';
const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
let catalog = [];
let customOptions = [];
let excluded = new Set();
let locks = {};
let currentPlan = null;
let favorites = [];
let busy = false;

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
function planKey(plan) { return plan.picks.map(pick => pick.id).join('|'); }
function mood() { return $('input[name=mood]:checked').value; }
function preferences(locked = locks) {
  return { budget: $('#budget').value === '' ? null : Number($('#budget').value), setting: $('#setting').value,
    mood: mood(), spending: $('#spending').value, excluded: [...excluded], customOptions, locked };
}

// Saved plans can contain custom ideas. Validate their snapshot as strictly as a request.
function validPlan(plan) {
  if (!plan || !Array.isArray(plan.picks) || plan.picks.length !== 4 || !Object.hasOwn(settingLabels, plan.setting)) return false;
  if (plan.mood !== undefined && !MashPlanner.moods.includes(plan.mood)) return false;
  if (plan.spending !== undefined && !MashPlanner.spendingModes.includes(plan.spending)) return false;
  if (![plan.budgetCents, plan.totalCents, plan.remainingCents].every(Number.isSafeInteger)) return false;
  if (plan.budgetCents < 0 || plan.budgetCents > 1000000 || plan.totalCents < 0 || plan.remainingCents < 0) return false;
  const custom = MashPlanner.customCatalog(plan.customOptions || []);
  if (!custom) return false;
  const knownOptions = [...catalog, ...custom];
  const matching = plan.picks.every((pick, index) => {
    if (!pick || pick.category !== MashPlanner.categories[index]) return false;
    const known = knownOptions.find(option => option.id === pick.id);
    return known && known.category === pick.category && known.name === pick.name && known.description === pick.description &&
      known.costCents === pick.costCents && (plan.setting === 'any' || known.settings.includes(plan.setting));
  });
  return matching && plan.totalCents === plan.picks.reduce((sum, pick) => sum + pick.costCents, 0) &&
    plan.budgetCents - plan.totalCents === plan.remainingCents && typeof plan.notice === 'string' && plan.notice.length <= 300;
}
function hydrate(plan) {
  const known = [...catalog, ...MashPlanner.customCatalog(plan.customOptions || [])];
  const picks = plan.picks.map(pick => known.find(option => option.id === pick.id));
  const chosenMood = plan.mood || 'surprise';
  return { ...plan, picks, mood: chosenMood, spending: plan.spending || 'flexible', title: MashPlanner.title(chosenMood, picks), customOptions: plan.customOptions || [] };
}

async function loadCatalog() {
  $('#retry').hidden = true;
  $('#play').disabled = true;
  message('Loading the good ideas…');
  try {
    const response = await fetch('/api/options', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Could not load ideas.');
    const data = await response.json();
    if (!Array.isArray(data.options) || !data.options.length) throw new Error('No ideas were returned.');
    catalog = data.options;
    renderCatalog();
    loadFavorites();
    updatePossibilities();
    $('#play').disabled = false;
    message('Your next “remember when” is one click away.');
  } catch {
    message('Could not load date ideas. Check your connection and try again.', true);
    $('#retry').hidden = false;
    $('#possibility-count').textContent = 'The ideas are taking a little longer.';
  }
}

function updatePossibilities() {
  const analysis = MashPlanner.prepare(preferences(), catalog, false);
  const count = analysis.combinationCount || 0;
  $('#possibility-count').textContent = `${count.toLocaleString()} affordable ${count === 1 ? 'date' : 'dates'}`;
  const lockedCount = Object.keys(locks).length;
  const spendingNote = $('#spending').value === 'treat' ? 'Treat us picks near-budget dates from this mix.' : 'Any affordable total can be picked.';
  $('#possibility-note').textContent = analysis.error || `${lockedCount ? `${lockedCount} ${lockedCount === 1 ? 'pick' : 'picks'} locked. ` : ''}${spendingNote}`;
  $('#possibility-note').classList.toggle('error', Boolean(analysis.error));
  const budget = Number($('#budget').value);
  $('#budget-caption').textContent = budget === 0 ? 'The best things can be free.' : budget <= 25 ? 'Small budget. Big possibilities.' : budget <= 100 ? 'A lovely little night out.' : budget <= 300 ? 'Make a whole occasion of it.' : 'Time to really treat each other.';
  $('#budget-slider').value = Math.min(1000, Math.max(0, budget));
  document.querySelectorAll('[data-budget]').forEach(node => {
    const selected = $('#budget').value !== '' && Number(node.dataset.budget) === budget;
    node.classList.toggle('is-selected', selected);
    node.setAttribute('aria-pressed', String(selected));
  });
}

function renderCatalog() {
  const setting = $('#setting').value;
  $('#catalog').replaceChildren();
  for (const [category, label] of Object.entries(labels)) {
    const section = element('section', undefined, `category ${category}`);
    const head = element('div', undefined, 'category-head');
    const options = allOptions().filter(option => option.category === category);
    const active = options.filter(option => !excluded.has(option.id) && (setting === 'any' || option.settings.includes(setting))).length;
    const query = $('#idea-search').value.trim().toLowerCase();
    const tier = $('#idea-tier').value;
    const visible = options.filter(option => `${option.name} ${option.description}`.toLowerCase().includes(query) &&
      (tier === 'all' || tier === 'low' && option.costCents < 5000 || tier === 'mid' && option.costCents >= 5000 && option.costCents <= 20000 || tier === 'high' && option.costCents > 20000)).sort((a, b) => a.costCents - b.costCents);
    head.append(element('h3', label), element('p', `${active} in the mix · ${visible.length} shown`));
    const list = element('ul', undefined, 'option-list');
    list.tabIndex = 0;
    list.setAttribute('aria-label', `${label} ideas. Scroll to explore.`);
    if (!visible.length) list.append(element('li', 'No matches to browse. Try another search or price range.', 'empty-category'));
    for (const option of visible) {
      const eligible = setting === 'any' || option.settings.includes(setting);
      const item = element('li');
      const choice = button('', `option-choice${eligible ? '' : ' unavailable'}`, () => {
        if (busy) return;
        if (excluded.has(option.id)) excluded.delete(option.id);
        else { excluded.add(option.id); if (locks[category] === option.id) delete locks[category]; }
        renderCatalog();
        updatePossibilities();
        if (currentPlan) renderResult();
        // Preserve focus when the deck is rebuilt after this toggle.
        [...document.querySelectorAll('.option-choice')].find(node => node.dataset.id === option.id)?.focus({ preventScroll: true });
      });
      choice.dataset.id = option.id;
      choice.setAttribute('aria-pressed', String(!excluded.has(option.id)));
      choice.setAttribute('aria-label', `${option.name}, ${money(option.costCents)}${eligible ? '' : ', other setting'}. Include in mix`);
      const copy = element('span');
      copy.append(element('span', option.name, 'option-name'), element('span', `${money(option.costCents)}${eligible ? '' : ' · other setting'}`, 'option-price'));
      const emoji = element('span', option.emoji || '✨', 'option-emoji');
      emoji.setAttribute('aria-hidden', 'true');
      choice.append(emoji, copy);
      item.append(choice);
      if (option.custom) item.append(button('Remove custom idea', 'text-button remove-custom', () => {
        if (busy) return;
        customOptions = customOptions.filter(custom => custom.id !== option.id);
        excluded.delete(option.id);
        if (locks[category] === option.id) delete locks[category];
        renderCatalog();
        updatePossibilities();
        if (currentPlan) renderResult();
      }));
      list.append(item);
    }
    section.append(head, list);
    $('#catalog').append(section);
  }
}

function setBusy(value) {
  busy = value;
  document.body.classList.toggle('is-busy', value);
  document.querySelectorAll('#plan-form input, #plan-form select, #plan-form button, #custom-form input, #custom-form select, #custom-form button, #idea-search, #idea-tier, .option-choice, .remove-custom, .pick-controls button, #again, #reset-ideas').forEach(node => { node.disabled = value; });
  if (!value && currentPlan) renderResult();
}

async function generate(event, rerollCategory = null) {
  event?.preventDefault();
  if (busy || !catalog.length || !$('#plan-form').reportValidity()) return;
  const known = allOptions();
  if (rerollCategory && currentPlan.picks.some(pick => !known.some(option => option.id === pick.id))) {
    message('This date includes a custom idea you removed. Play MASH for a fresh plan, or add the idea back.', true);
    return;
  }
  const requestLocks = rerollCategory ? Object.fromEntries(currentPlan.picks.filter(pick => pick.category !== rerollCategory).map(pick => [pick.category, pick.id])) : locks;
  const payload = preferences(requestLocks);
  if (currentPlan && currentPlan.picks.every(pick => known.some(option => option.id === pick.id))) payload.previous = currentPlan.picks.map(pick => pick.id);
  setBusy(true);
  message(rerollCategory ? `Giving ${labels[rerollCategory].toLowerCase()} a little plot twist…` : 'Finding the magic in your mix…');
  try {
    const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not generate a plan. Try again.');
    if (!validPlan(data)) throw new Error('The server returned an incomplete plan. Please try again.');
    if (!data.unchanged) {
      const prepared = MashPlanner.prepare(payload, catalog);
      const pool = [...new Map(prepared.plans.flat().map(option => [option.id, option])).values()];
      await MashShow.reveal(data, pool, $('#instant').checked || Boolean(rerollCategory));
    }
    currentPlan = hydrate(data);
    renderResult();
    message(data.unchanged ? 'This is the only combination that fits these choices. Unlock a pick, include more ideas, or raise your budget to change it.' : rerollCategory ? `${labels[rerollCategory]} remixed. The other three picks stayed put, and the total still fits.` : 'It’s a date! Keep the picks you love, remix the rest.');
    $('#result-title').focus({ preventScroll: true });
    $('#result').scrollIntoView({ block: 'nearest' });
    if (!data.unchanged && !rerollCategory) MashShow.celebrate();
  } catch (error) {
    message(['TimeoutError', 'TypeError'].includes(error.name) ? 'Could not reach the server. Check your connection and try again.' : error.message, true);
  } finally { setBusy(false); }
}

function renderResult() {
  $('#result-picks').replaceChildren();
  currentPlan.picks.forEach((pick, index) => {
    const locked = locks[pick.category] === pick.id;
    const card = element('article', undefined, `pick ${pick.category}${locked ? ' is-locked' : ''}`);
    card.dataset.pickId = pick.id;
    const art = element('div', undefined, 'pick-art');
    const emoji = element('span', pick.emoji || '✨', 'emoji');
    emoji.setAttribute('aria-hidden', 'true');
    art.append(element('span', `0${index + 1} / ${labels[pick.category].toUpperCase()}`, 'step-label'), emoji);
    const copy = element('div', undefined, 'pick-body');
    copy.append(element('h3', pick.name), element('p', pick.description, 'pick-description'), element('p', pick.tip || 'Make this one your own.', 'pick-tip'), element('span', money(pick.costCents), 'pick-price'));
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
    card.append(art, copy, controls);
    $('#result-picks').append(card);
  });
  $('#result-title').textContent = currentPlan.title;
  $('#result-setting').textContent = `${moodLabels[currentPlan.mood]} · ${settingLabels[currentPlan.setting]}`;
  $('#result-total').textContent = money(currentPlan.totalCents);
  $('#remaining').textContent = `${money(currentPlan.remainingCents)} left for little extras`;
  const max = currentPlan.maximumCents;
  $('#spend-explanation').textContent = currentPlan.spending === 'flexible' ? 'Flexible mode: your budget is a ceiling, and any affordable combination can win.' :
    Number.isSafeInteger(max) && max < currentPlan.budgetCents * .9 ? `Treat us: these choices top out at ${money(max)}. We aimed near that amount. Change the setting, unlock picks, or add an idea to go bigger.` :
    'Treat us: this plan aims to use 90–100% of your budget while staying within your limit.';
  $('#budget-used').style.width = `${currentPlan.budgetCents ? Math.min(100, currentPlan.totalCents / currentPlan.budgetCents * 100) : 0}%`;
  $('#result-notice').textContent = currentPlan.notice;
  $('#save').textContent = favorites.some(plan => planKey(plan) === planKey(currentPlan)) ? '♡ Date saved' : '♡ Save this date';
  $('#result').hidden = false;
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
    for (const pick of plan.picks) list.append(element('li', `${pick.name} · ${money(pick.costCents)}`));
    const actions = element('div', undefined, 'actions');
    actions.append(button('Date card', 'secondary saved-download', () => DateCard.download(plan)), button('Revisit', 'secondary', () => {
      if (busy) return;
      customOptions = plan.customOptions || [];
      excluded = new Set();
      locks = {};
      $('#budget').value = plan.budgetCents / 100;
      $('#setting').value = plan.setting;
      $('#spending').value = plan.spending;
      $(`input[name=mood][value="${plan.mood}"]`).checked = true;
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
  const option = { id: `custom-${crypto.randomUUID().slice(0, 8)}`, category: $('#custom-category').value,
    name: $('#custom-name').value.trim(), costCents: Math.round(Number($('#custom-cost').value) * 100),
    settings: setting === 'any' ? ['indoor', 'outdoor', 'home'] : setting === 'home' ? ['indoor', 'home'] : [setting] };
  if (!MashPlanner.customCatalog([option])) { $('#custom-message').textContent = 'Add a name, a setting, and a valid cost.'; return; }
  customOptions.push(option);
  $('#custom-form').reset();
  $('#custom-message').textContent = `${option.name} is in the mix.`;
  renderCatalog();
  updatePossibilities();
}

$('#plan-form').addEventListener('submit', generate);
document.querySelectorAll('[data-budget]').forEach(node => node.addEventListener('click', () => {
  $('#budget').value = node.dataset.budget;
  updatePossibilities();
}));
$('#idea-search').addEventListener('input', renderCatalog);
$('#idea-tier').addEventListener('change', renderCatalog);
$('#again').addEventListener('click', generate);
$('#plan-form').addEventListener('input', event => {
  if (event.target.id === 'budget-slider') $('#budget').value = event.target.value;
  if (event.target.id === 'setting') {
    locks = {};
    renderCatalog();
  }
  updatePossibilities();
});
$('#save').addEventListener('click', saveCurrent);
$('#download').addEventListener('click', () => { if (currentPlan) DateCard.download(currentPlan); });
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
