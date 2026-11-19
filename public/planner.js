/* Shared selection rules keep the browser's possibility count in sync with the server. */
(function (root) {
  const categories = ['dinner', 'activity', 'treat', 'entertainment'];
  const settings = ['any', 'indoor', 'outdoor', 'home'];
  const moods = ['surprise', 'cozy', 'adventurous', 'romantic', 'competitive'];
  const spendingModes = ['treat', 'flexible'];
  const areas = ['all', 'general', 'paterson'];
  const fields = ['budget', 'setting', 'mood', 'spending', 'area', 'date', 'excluded', 'customOptions', 'locked', 'previous'];
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const fail = (error, status = 400, extra = {}) => ({ error, status, ...extra });

  function customCatalog(input = []) {
    if (!Array.isArray(input) || input.length > 4) return null;
    const result = [];
    for (const option of input) {
      if (!object(option) || Object.keys(option).some(key => !['id', 'category', 'name', 'costCents', 'settings'].includes(key)) ||
          typeof option.id !== 'string' || !/^custom-[a-z0-9-]{1,20}$/.test(option.id) ||
          result.some(item => item.id === option.id) || !categories.includes(option.category) ||
          typeof option.name !== 'string' || !option.name.trim() || option.name.length > 48 || /[\x00-\x1f\x7f]/.test(option.name) ||
          !Number.isSafeInteger(option.costCents) || option.costCents < 0 || option.costCents > 1000000 ||
          !Array.isArray(option.settings) || !option.settings.length || option.settings.length > 3 ||
          new Set(option.settings).size !== option.settings.length || option.settings.some(setting => !settings.slice(1).includes(setting))) return null;
      result.push({ ...option, name: option.name.trim(), description: 'Your own little adventure. Make it a date.', emoji: '✨',
        moods: moods.slice(1), tip: 'Put your own spin on this one.', custom: true });
    }
    return result;
  }

  function prepare(input, catalog, includePlans = true, drawTicket = null) {
    if (!object(input) || Object.keys(input).some(key => !fields.includes(key))) return fail('Send a budget and documented date preferences only.');
    const { budget, setting = 'any', mood = 'surprise', spending = 'treat', area = 'all', date = '', excluded = [], customOptions = [], locked = {}, previous = [] } = input;
    if (typeof budget !== 'number' || !Number.isFinite(budget) || budget < 0 || budget > 10000 || budget !== Number(budget.toFixed(2))) {
      return fail('Enter a budget from $0 to $10,000 with at most two decimal places.');
    }
    if (!settings.includes(setting)) return fail('Choose any, indoor, outdoor, or home.');
    if (!moods.includes(mood)) return fail('Choose a mood from the available choices.');
    if (!spendingModes.includes(spending)) return fail('Choose treat or flexible for your spending style.');
    if (!areas.includes(area)) return fail('Choose all, general, or paterson for the idea area.');
    if (!validDate(date)) return fail('Choose a valid calendar date, or leave the date empty.');
    const custom = customCatalog(customOptions);
    if (!custom) return fail('Add up to four custom ideas with a name, category, valid cost, and setting.');
    const options = [...catalog, ...custom];
    const known = id => typeof id === 'string' && options.some(option => option.id === id);
    if (!Array.isArray(excluded) || excluded.length > options.length || new Set(excluded).size !== excluded.length || !excluded.every(known)) {
      return fail('Excluded ideas must be unique IDs from the current options.');
    }
    if (!object(locked) || Object.keys(locked).some(category => !categories.includes(category)) ||
        Object.entries(locked).some(([category, id]) => !known(id) || options.find(option => option.id === id).category !== category)) {
      return fail('Each lock must identify an idea in its own category.');
    }
    if (!Array.isArray(previous) || (previous.length !== 0 && (previous.length !== 4 || previous.some((id, index) => !known(id) || options.find(option => option.id === id).category !== categories[index])))) {
      return fail('The previous plan must contain one valid idea per category.');
    }
    const groups = categories.map(category => options.filter(option => option.category === category &&
      eligible(option, area, date) &&
      !excluded.includes(option.id) && (setting === 'any' || option.settings.includes(setting)) &&
      (!locked[category] || option.id === locked[category])));
    const empty = groups.findIndex(group => !group.length);
    if (empty !== -1) return fail(`No ${categories[empty]} ideas match. Include an idea, unlock the pick, or change the setting.`, 422);
    const budgetCents = Math.round(budget * 100);
    const minimumCents = groups.reduce((sum, group) => sum + Math.min(...group.map(option => option.costCents)), 0);
    if (budgetCents < minimumCents) return fail(`These choices need at least $${(minimumCents / 100).toFixed(2)}. Raise the budget, unlock a pick, or change your choices.`, 422, { minimumCents });
    // Enumerate directly with budget pruning. Browser counts need no arrays of every plan.
    let combinationCount = 0, alternativeCount = 0, maximumCents = 0;
    const picks = [];
    let weightTotal = 0, ticket = null, selectedPicks = null;
    function visit(index, total, collect) {
      if (selectedPicks) return;
      if (index === groups.length) {
        const alternative = picks.some((option, i) => option.id !== previous[i]);
        if (collect) {
          if ((!alternativeCount || alternative) && total >= targetCents) {
            if (drawTicket) {
              const weight = mood === 'surprise' ? 1 : 1 + 3 * picks.filter(pick => pick.moods.includes(mood)).length;
              if (ticket === null) weightTotal += weight;
              else if ((ticket -= weight) < 0) selectedPicks = [...picks];
            } else plans.push([...picks]);
          }
        } else {
          combinationCount++;
          if (alternative) { alternativeCount++; maximumCents = Math.max(maximumCents, total); }
        }
        return;
      }
      for (const option of groups[index]) {
        if (total + option.costCents > budgetCents) continue;
        picks.push(option);
        visit(index + 1, total + option.costCents, collect);
        picks.pop();
      }
    }
    visit(0, 0, false);
    if (!alternativeCount) maximumCents = groups.reduce((sum, group) => sum + group.find(option => previous.includes(option.id)).costCents, 0);
    // Aim at 90% of the budget when possible; otherwise stay near the best attainable total.
    const nearBudgetCents = Math.ceil(budgetCents * .9);
    const targetCents = spending === 'treat' ? maximumCents >= nearBudgetCents ? nearBudgetCents : Math.ceil(maximumCents * .95) : 0;
    // Only retain the final spending band, rather than materializing every feasible plan first.
    const plans = [];
    if (includePlans || drawTicket) visit(0, 0, true);
    if (drawTicket) { ticket = drawTicket(weightTotal); visit(0, 0, true); }
    return { plans, selectedPicks, combinationCount, maximumCents, targetCents,
      unchanged: previous.length === 4 && !alternativeCount, budgetCents, setting, mood, spending, area, date, customOptions };
  }

  const names = {
    surprise: ['The Happy Accident', 'A Little Plot Twist', 'The Just-Us Adventure'],
    cozy: ['The Cozy Chapter', 'A Soft Landing', 'The Slow-Down Date'],
    adventurous: ['The Scenic Detour', 'A Little Out of the Ordinary', 'The Why-Not Night'],
    romantic: ['The Meet-Cute, Again', 'Our Kind of Magic', 'The Just-Because Date'],
    competitive: ['The Friendly Rivalry', 'The Winner Picks', 'The Rematch Date']
  };
  function title(mood, picks) {
    const choices = names[mood] || names.surprise;
    return choices[picks.map(pick => pick.id).join('').length % choices.length];
  }
  function eligible(option, area, date) {
    if (!option.custom && (area === 'paterson' && !option.venue || area === 'general' && option.venue)) return false;
    return !date || !option.venue || option.venue.openDays.includes(new Date(`${date}T12:00:00Z`).getUTCDay());
  }
  function validDate(date) {
    return typeof date === 'string' && (!date || /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0,10) === date);
  }
  const api = { categories, settings, moods, spendingModes, areas, customCatalog, prepare, title, eligible, validDate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MashPlanner = api;
})(typeof globalThis === 'object' ? globalThis : this);
