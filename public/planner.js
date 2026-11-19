/* Shared selection rules keep the browser's possibility count in sync with the server. */
(function (root) {
  const categories = ['dinner', 'activity', 'treat', 'entertainment'];
  const settings = ['any', 'indoor', 'outdoor', 'home'];
  const moods = ['surprise', 'cozy', 'adventurous', 'romantic', 'competitive'];
  const spendingModes = ['treat', 'flexible'];
  const fields = ['budget', 'setting', 'mood', 'spending', 'excluded', 'customOptions', 'locked', 'previous'];
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

  function prepare(input, catalog, includePlans = true) {
    if (!object(input) || Object.keys(input).some(key => !fields.includes(key))) return fail('Send a budget and documented date preferences only.');
    const { budget, setting = 'any', mood = 'surprise', spending = 'treat', excluded = [], customOptions = [], locked = {}, previous = [] } = input;
    if (typeof budget !== 'number' || !Number.isFinite(budget) || budget < 0 || budget > 10000 || budget !== Number(budget.toFixed(2))) {
      return fail('Enter a budget from $0 to $10,000 with at most two decimal places.');
    }
    if (!settings.includes(setting)) return fail('Choose any, indoor, outdoor, or home.');
    if (!moods.includes(mood)) return fail('Choose a mood from the available choices.');
    if (!spendingModes.includes(spending)) return fail('Choose treat or flexible for your spending style.');
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
      !excluded.includes(option.id) && (setting === 'any' || option.settings.includes(setting)) &&
      (!locked[category] || option.id === locked[category])));
    const empty = groups.findIndex(group => !group.length);
    if (empty !== -1) return fail(`No ${categories[empty]} ideas match. Include an idea, unlock the pick, or change the setting.`, 422);
    const budgetCents = Math.round(budget * 100);
    const minimumCents = groups.reduce((sum, group) => sum + Math.min(...group.map(option => option.costCents)), 0);
    if (budgetCents < minimumCents) return fail(`These choices need at least $${(minimumCents / 100).toFixed(2)}. Raise the budget, unlock a pick, or change your choices.`, 422, { minimumCents });
    // Enumerate directly with budget pruning. Browser counts need no arrays of every plan.
    let combinationCount = 0, alternativeCount = 0, maximumCents = 0;
    const candidates = [];
    function visit(index, picks, total) {
      if (index === groups.length) {
        combinationCount++;
        const alternative = picks.some((option, i) => option.id !== previous[i]);
        if (alternative) { alternativeCount++; maximumCents = Math.max(maximumCents, total); }
        if (includePlans) candidates.push({ picks: [...picks], total, alternative });
        return;
      }
      for (const option of groups[index]) {
        if (total + option.costCents <= budgetCents) visit(index + 1, [...picks, option], total + option.costCents);
      }
    }
    visit(0, [], 0);
    if (!alternativeCount) maximumCents = groups.reduce((sum, group) => sum + group.find(option => previous.includes(option.id)).costCents, 0);
    // Aim at 90% of the budget when possible; otherwise stay near the best attainable total.
    const nearBudgetCents = Math.ceil(budgetCents * .9);
    const targetCents = spending === 'treat' ? maximumCents >= nearBudgetCents ? nearBudgetCents : Math.ceil(maximumCents * .95) : 0;
    const plans = includePlans ? candidates.filter(candidate => (!alternativeCount || candidate.alternative) && candidate.total >= targetCents).map(candidate => candidate.picks) : [];
    return { plans, combinationCount, maximumCents, targetCents,
      unchanged: previous.length === 4 && !alternativeCount, budgetCents, setting, mood, spending, customOptions };
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
  const api = { categories, settings, moods, spendingModes, customCatalog, prepare, title };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MashPlanner = api;
})(typeof globalThis === 'object' ? globalThis : this);
