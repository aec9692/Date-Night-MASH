const $ = selector => document.querySelector(selector);
const labels = { dinner: 'Dinner', activity: 'Activity', treat: 'Treat', entertainment: 'Entertainment' };
const settingLabels = { any: 'Any setting', indoor: 'Indoors', outdoor: 'Outdoors', home: 'At home' };
const storageKey = 'date-night-mash-favorites-v1';
const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
let catalog = [];
let currentPlan = null;
let favorites = [];
let busy = false;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function message(text, error = false) {
  $('#message').textContent = text;
  $('#message').classList.toggle('error', error);
}

function planKey(plan) { return plan.picks.map(pick => pick.id).join('|'); }

// Stored data is untrusted. Only accept complete plans matching the current catalog.
function validPlan(plan) {
  if (!plan || !Array.isArray(plan.picks) || plan.picks.length !== 4 || !Object.hasOwn(settingLabels, plan.setting)) return false;
  if (![plan.budgetCents, plan.totalCents, plan.remainingCents].every(Number.isSafeInteger)) return false;
  if (plan.budgetCents < 0 || plan.budgetCents > 1000000 || plan.totalCents < 0 || plan.remainingCents < 0) return false;
  const categories = Object.keys(labels);
  const matching = plan.picks.every((pick, index) => {
    if (!pick || pick.category !== categories[index]) return false;
    const known = catalog.find(option => option.id === pick.id);
    return known && known.category === pick.category && known.name === pick.name && known.description === pick.description &&
      known.costCents === pick.costCents && (plan.setting === 'any' || known.settings.includes(plan.setting));
  });
  return matching && plan.totalCents === plan.picks.reduce((sum, pick) => sum + pick.costCents, 0) &&
    plan.budgetCents - plan.totalCents === plan.remainingCents && typeof plan.notice === 'string' && plan.notice.length <= 300;
}

async function loadCatalog() {
  $('#retry').hidden = true;
  $('#play').disabled = true;
  message('Loading date ideas…');
  try {
    const response = await fetch('/api/options', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Could not load ideas.');
    const data = await response.json();
    if (!Array.isArray(data.options) || !data.options.length) throw new Error('No ideas were returned.');
    catalog = data.options;
    renderCatalog();
    loadFavorites();
    $('#play').disabled = false;
    $('#play').textContent = 'Play MASH';
    message('Ready when you are. Choose a budget and let us do the picking.');
  } catch {
    message('Could not load date ideas. Check your connection and try again.', true);
    $('#play').textContent = 'Play MASH';
    $('#retry').hidden = false;
  }
}

function renderCatalog() {
  const setting = $('#setting').value;
  $('#catalog').replaceChildren();
  for (const [category, label] of Object.entries(labels)) {
    const section = element('section', undefined, 'category');
    section.append(element('h3', label));
    const list = element('ul', undefined, 'option-list');
    for (const option of catalog.filter(option => option.category === category)) {
      const eligible = setting === 'any' || option.settings.includes(setting);
      const item = element('li', undefined, eligible ? '' : 'excluded');
      const name = element('span', option.name);
      if (!eligible) name.append(element('span', ' · other setting', 'helper'));
      item.append(name, element('span', money(option.costCents), 'price'));
      list.append(item);
    }
    section.append(list);
    $('#catalog').append(section);
  }
}

async function generate(event) {
  event?.preventDefault();
  if (busy || !catalog.length) return;
  if (!$('#plan-form').reportValidity()) return;
  busy = true;
  $('#play').disabled = true;
  $('#again').disabled = true;
  $('#play').textContent = 'Picking your night…';
  $('#result').hidden = true;
  currentPlan = null;
  message('Finding a date that fits…');
  try {
    const response = await fetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget: Number($('#budget').value), setting: $('#setting').value }),
      signal: AbortSignal.timeout(10000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not generate a plan. Try again.');
    if (!validPlan(data)) throw new Error('The server returned an incomplete plan. Please try again.');
    currentPlan = data;
    renderResult();
    message('A little surprise, within your budget. Your date is ready.');
    $('#result-title').focus({ preventScroll: true });
    $('#result').scrollIntoView({ block: 'nearest' });
  } catch (error) {
    message(['TimeoutError', 'TypeError'].includes(error.name) ? 'Could not reach the server. Check your connection and try again.' : error.message, true);
  } finally {
    busy = false;
    $('#play').disabled = false;
    $('#again').disabled = false;
    $('#play').textContent = 'Play MASH';
  }
}

function renderResult() {
  $('#result-picks').replaceChildren();
  for (const pick of currentPlan.picks) {
    const card = element('article', undefined, 'pick');
    card.append(element('p', labels[pick.category], 'eyebrow'), element('h3', pick.name), element('p', pick.description), element('p', money(pick.costCents), 'price'));
    $('#result-picks').append(card);
  }
  $('#result-setting').textContent = settingLabels[currentPlan.setting];
  $('#result-total').textContent = money(currentPlan.totalCents);
  $('#remaining').textContent = `${money(currentPlan.remainingCents)} left in your budget`;
  $('#result-notice').textContent = currentPlan.notice;
  $('#save').textContent = favorites.some(plan => planKey(plan) === planKey(currentPlan)) ? 'Already saved' : 'Save this plan';
  $('#result').hidden = false;
}

function loadFavorites() {
  $('#storage-message').textContent = '';
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(stored)) throw new Error('Invalid saved plans');
    favorites = stored.slice(0, 50).filter(validPlan).filter((plan, index, all) => all.findIndex(other => planKey(other) === planKey(plan)) === index);
    if (favorites.length !== stored.length) $('#storage-message').textContent = 'Some outdated or unreadable saved plans could not be loaded.';
  } catch {
    favorites = [];
    $('#storage-message').textContent = 'Saved plans could not be loaded. You can still generate and download a date.';
  }
  renderFavorites();
}

function writeFavorites(next) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
    favorites = next;
    $('#storage-message').textContent = '';
    renderFavorites();
    return true;
  } catch {
    $('#storage-message').textContent = 'Your browser could not save this change. Check storage permissions or download the plan instead.';
    return false;
  }
}

function saveCurrent() {
  if (!currentPlan) return;
  if (favorites.some(plan => planKey(plan) === planKey(currentPlan))) {
    message('This combination is already in your saved plans.');
    return;
  }
  if (favorites.length >= 50) { message('You have 50 saved plans. Remove one before saving another.', true); return; }
  if (writeFavorites([...favorites, currentPlan])) { $('#save').textContent = 'Already saved'; message('Saved on this device. Find it below for another night.'); }
}

function renderFavorites() {
  $('#saved-count').textContent = favorites.length;
  $('#saved-plans').replaceChildren();
  if (!favorites.length) $('#saved-plans').append(element('p', 'No plans tucked away yet. Generate a date and save one you love.', 'empty'));
  for (const plan of favorites) {
    const card = element('article', undefined, 'saved-card');
    card.append(element('h3', `${money(plan.totalCents)} · ${settingLabels[plan.setting]}`));
    const list = element('ul');
    for (const pick of plan.picks) list.append(element('li', `${labels[pick.category]}: ${pick.name} (${money(pick.costCents)})`));
    const actions = element('div', undefined, 'actions');
    const download = element('button', 'Download', 'secondary');
    download.type = 'button';
    download.addEventListener('click', () => downloadPlan(plan));
    const remove = element('button', 'Remove', 'text-button');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove saved plan: ${plan.picks[0].name}`);
    remove.addEventListener('click', () => {
      if (writeFavorites(favorites.filter(saved => planKey(saved) !== planKey(plan)))) {
        $('#storage-message').textContent = 'Plan removed from this device.';
        if (currentPlan) renderResult();
        $('#saved-title').focus();
      }
    });
    actions.append(download, remove);
    card.append(list, element('p', `Budget: ${money(plan.budgetCents)} · Remaining: ${money(plan.remainingCents)}`, 'helper'), actions);
    $('#saved-plans').append(card);
  }
}

function downloadPlan(plan) {
  if (!plan) return;
  const lines = ['DATE NIGHT MASH', `Setting: ${settingLabels[plan.setting]}`, `Budget for two: ${money(plan.budgetCents)}`, '',
    ...plan.picks.flatMap(pick => [`${labels[pick.category]}: ${pick.name} — ${money(pick.costCents)}`, pick.description, '']),
    `Estimated total: ${money(plan.totalCents)}`, `Remaining budget: ${money(plan.remainingCents)}`, '', plan.notice];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
  const link = element('a');
  link.href = url;
  link.download = 'date-night-mash-plan.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$('#plan-form').addEventListener('submit', generate);
$('#again').addEventListener('click', generate);
$('#setting').addEventListener('change', renderCatalog);
$('#save').addEventListener('click', saveCurrent);
$('#download').addEventListener('click', () => downloadPlan(currentPlan));
$('#retry').addEventListener('click', loadCatalog);
window.addEventListener('storage', event => { if (event.key === storageKey || event.key === null) loadFavorites(); });
loadCatalog();
