/* Shared selection rules keep the browser's possibility count in sync with the server. */
(function (root) {
  const categories = ['dinner', 'activity', 'treat', 'entertainment'];
  const settings = ['any', 'indoor', 'outdoor', 'home', 'mixed'];
  const moods = ['surprise', 'cozy', 'adventurous', 'romantic', 'competitive'];
  const spendingModes = ['treat', 'flexible'];
  const areas = ['all', 'general', 'paterson'];
  const fields = ['budget', 'setting', 'mood', 'spending', 'area', 'date', 'excluded', 'customOptions', 'locked', 'previous', 'journey', 'mash', 'pantry', 'recent', 'location', 'fit', 'reserve', 'taste'];
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const fail = (error, status = 400, extra = {}) => ({ error, status, ...extra });

  function customCatalog(input = []) {
    if (!Array.isArray(input) || input.length > 4) return null;
    const result = [];
    for (const option of input) {
      if (!object(option) || Object.keys(option).some(key => !['id', 'category', 'name', 'costCents', 'settings', 'place'].includes(key)) ||
          typeof option.id !== 'string' || !/^custom-[a-z0-9-]{1,20}$/.test(option.id) ||
          result.some(item => item.id === option.id) || !categories.includes(option.category) ||
          typeof option.name !== 'string' || !option.name.trim() || option.name.length > 48 || /[\x00-\x1f\x7f]/.test(option.name) ||
          !Number.isSafeInteger(option.costCents) || option.costCents < 0 || option.costCents > 1000000 ||
          !Array.isArray(option.settings) || !option.settings.length || option.settings.length > 3 ||
          new Set(option.settings).size !== option.settings.length || option.settings.some(setting => !['indoor','outdoor','home'].includes(setting))) return null;
      if(option.place){const place=option.place;
        if(!object(place)||Object.keys(place).some(key=>!['name','address','lat','lon','sourceUrl'].includes(key))||typeof place.name!=='string'||!place.name.trim()||place.name.length>180||!(place.address===null||typeof place.address==='string'&&place.address.length<=240)||typeof place.lat!=='number'||!Number.isFinite(place.lat)||Math.abs(place.lat)>90||typeof place.lon!=='number'||!Number.isFinite(place.lon)||Math.abs(place.lon)>180||typeof place.sourceUrl!=='string'||!/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/[1-9]\d*$/.test(place.sourceUrl))return null;
      }
      result.push({ ...option, name: option.name.trim(), description: 'Your own little adventure. Make it a date.', emoji: '✨',
        moods: moods.slice(1), tip: 'Put your own spin on this one.', custom: true });
    }
    return result;
  }

  function prepare(input, catalog, includePlans = true, drawTicket = null) {
    if (!object(input) || Object.keys(input).some(key => !fields.includes(key))) return fail('Send a budget and documented date preferences only.');
    const planning=typeof module==='object'&&module.exports?require('./date-planning'):root.DatePlanning;
    if(input.reserve!==undefined){
      const budgetCents=planning.cents(input.budget);if(budgetCents===null)return fail('Enter a budget from $0 to $10,000 with at most two decimal places.');
      const reserve=planning.reserve(input.reserve,budgetCents);if(!reserve)return fail('Parking, transportation and extra reserves must be valid amounts that fit inside your total budget.');
      const reserveCents=planning.reserveTotal(reserve),{reserve:unused,...base}=input,planningBudgetCents=budgetCents-reserveCents;
      const result=prepare({...base,budget:planningBudgetCents/100},catalog,includePlans,drawTicket);
      if(result.error){if(result.status!==422)return result;const minimumCents=result.minimumCents===undefined?undefined:result.minimumCents+reserveCents;return {...result,...(minimumCents===undefined?{}:{minimumCents}),error:minimumCents===undefined?`After reserving $${(reserveCents/100).toFixed(2)}, $${(planningBudgetCents/100).toFixed(2)} is available for picks. ${result.error}`:`These choices need at least $${(minimumCents/100).toFixed(2)} including your $${(reserveCents/100).toFixed(2)} reserve. Lower the reserve, unlock a pick or change the ideas.`};}
      return {...result,budgetCents,planningBudgetCents,reserve,reserveCents};
    }
    if(input.journey!==undefined&&input.mash!==undefined)return fail('Choose MASH or the custom planner for this request.');
    if (input.journey !== undefined) {
      const journey = typeof module === 'object' && module.exports ? require('./journey') : root.MashJourney;
      if(['home','mixed'].includes(input.setting)){
        if(!journey.normalize(input.journey))return fail('Choose valid date length, time, town, distance and preferences.');
        const {journey:unused,...fourCategory}=input;
        return prepare(fourCategory,catalog,includePlans,drawTicket);
      }
      return journey.prepare(input,catalog,includePlans,drawTicket,api);
    }
    const { budget, setting = 'any', mood = 'surprise', spending = 'treat', area = 'all', date = '', excluded = [], customOptions = [], locked = {}, previous = [], pantry = [], recent = [], location = null } = input;
    const costs=typeof module==='object'&&module.exports?require('./date-costs'):root.DateCosts;
    const fitRules=typeof module==='object'&&module.exports?require('./date-fit'):root.DateFit;
    const fit=fitRules.normalize(input.fit);
    if(!fit)return fail('Choose valid food, effort, cooking and equipment preferences.');
    if(!costs.validPantry(pantry))return fail('Choose only the documented already-owned supplies.');
    if(location!==null&&(!object(location)||Object.keys(location).some(key=>!['lat','lon','label'].includes(key))||typeof location.lat!=='number'||!Number.isFinite(location.lat)||location.lat < -90||location.lat > 90||typeof location.lon!=='number'||!Number.isFinite(location.lon)||location.lon < -180||location.lon > 180||typeof location.label!=='string'||!location.label.trim()||location.label.length>160||/[\x00-\x1f\x7f]/.test(location.label)))return fail('Choose a city or ZIP search result with valid coordinates.');
    const journeyRules=typeof module==='object'&&module.exports?require('./journey'):root.MashJourney;
    const mash=input.mash===undefined?null:journeyRules.normalizeMash(input.mash);
    if(input.mash!==undefined&&!mash)return fail('Choose a supported MASH town, radius and audience.');
    if (typeof budget !== 'number' || !Number.isFinite(budget) || budget < 0 || budget > 10000 || budget !== Number(budget.toFixed(2))) {
      return fail('Enter a budget from $0 to $10,000 with at most two decimal places.');
    }
    if (!settings.includes(setting)) return fail('Choose any, indoor, outdoor, home, or mixed.');
    if (!moods.includes(mood)) return fail('Choose a mood from the available choices.');
    if (!spendingModes.includes(spending)) return fail('Choose treat or flexible for your spending style.');
    if (!areas.includes(area)) return fail('Choose all, general, or paterson for the idea area.');
    if (!validDate(date)) return fail('Choose a valid calendar date, or leave the date empty.');
    const custom = customCatalog(customOptions);
    if (!custom) return fail('Add up to four custom ideas with a name, category, valid cost, and setting.');
    const options = [...catalog, ...custom];
    const taste=planning.taste(input.taste,options);if(!taste)return fail('Rating preferences must contain up to 16 known liked and 16 known less-preferred idea IDs.');
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
    if(!Array.isArray(recent)||recent.length>8||recent.some(ids=>!Array.isArray(ids)||ids.length!==4||ids.some((id,index)=>!known(id)||options.find(option=>option.id===id).category!==categories[index])))return fail('Recent dates must contain up to eight valid four-category combinations.');
    const modernHome=catalog.some(option=>option.home);
    const groups = categories.map(category => options.filter(option => option.category === category &&
      eligible(option, setting==='home'?'general':area, date) && (!mash||journeyRules.matchesMash(option,mash,location)) &&
      costs.available(option,pantry) && fitRules.matches(option,fit) && !(modernHome&&option.settings.includes('home')&&!option.home&&!option.custom) &&
      !excluded.includes(option.id) && (mash||modernHome?costs.settingMatches(option,setting):setting==='any'||option.settings.includes(setting)) &&
      (!locked[category] || option.id === locked[category])));
    const empty = groups.findIndex(group => !group.length);
    if (empty !== -1) return fail(`No ${categories[empty]} ideas match. Unlock a pick or relax food, equipment or source requirements; unknown ingredients/access are not guarantees.`, 422);
    const budgetCents = Math.round(budget * 100);
    if(modernHome||pantry.length||recent.length||setting==='mixed'||mash){
      const combinations=typeof module==='object'&&module.exports?require('./date-combinations'):root.DateCombinations;
      return combinations.prepare(groups,{budgetCents,setting,mood,spending,area,date,customOptions,pantry,recent,previous,fit,taste,...(mash?{mash}:{}),...(location?{location}:{})},includePlans,drawTicket);
    }
    const minimumCents = groups.reduce((sum, group) => sum + Math.min(...group.map(option => option.costCents)), 0);
    if (budgetCents < minimumCents) return fail(`These choices need at least $${(minimumCents / 100).toFixed(2)}. Raise the budget, unlock a pick, or change your choices.`, 422, { minimumCents });
    // Pair dinner/activity and treat/entertainment. Sorted pair costs let us count
    // millions of complete dates with binary searches, without building those dates.
    function pairs(first, second, offset) {
      return first.flatMap(a => second.map(b => ({ picks: [a,b], cost: a.costCents + b.costCents,
        score: (mood === 'surprise' ? 0 : Number(a.moods.includes(mood)) + Number(b.moods.includes(mood)))+planning.preferenceScore(a.id,taste)+planning.preferenceScore(b.id,taste),
        previous: a.id === previous[offset] && b.id === previous[offset+1] })));
    }
    const left = pairs(groups[0], groups[1], 0);
    const right = pairs(groups[2], groups[3], 2).sort((a,b) => a.cost-b.cost);
    function boundary(cost, inclusive) {
      let low = 0, high = right.length;
      while (low < high) {
        const middle = Math.floor((low+high)/2);
        if (right[middle].cost < cost || inclusive && right[middle].cost === cost) low = middle+1;
        else high = middle;
      }
      return low;
    }
    const previousLeft = left.find(pair=>pair.previous), previousRightIndex = right.findIndex(pair=>pair.previous);
    const previousFits = previousLeft && previousRightIndex !== -1 && previousLeft.cost + right[previousRightIndex].cost <= budgetCents;
    let combinationCount = 0, maximumCents = 0;
    for (const pair of left) {
      const end = boundary(budgetCents-pair.cost, true);
      combinationCount += end;
      // Exclude the previous date from the attainable maximum when another date fits.
      let top = end-1;
      if (pair.previous && right[top]?.previous) top--;
      if (top >= 0) maximumCents = Math.max(maximumCents, pair.cost+right[top].cost);
    }
    const alternativeCount = combinationCount - Number(Boolean(previousFits));
    if (!alternativeCount) maximumCents = previousLeft.cost + right[previousRightIndex].cost;
    // Aim at 90% of the budget when possible; otherwise stay near the best attainable total.
    const nearBudgetCents = Math.ceil(budgetCents * .9);
    const targetCents = spending === 'treat' ? maximumCents >= nearBudgetCents ? nearBudgetCents : Math.ceil(maximumCents * .95) : 0;
    const scorePrefix = [0];
    right.forEach(pair => scorePrefix.push(scorePrefix[scorePrefix.length-1]+pair.score));
    const weight = (a,b) => 1+3*(a.score+b.score);
    let weightTotal = 0;
    const bands = left.map(pair => {
      const start = boundary(targetCents-pair.cost, false), end = boundary(budgetCents-pair.cost, true);
      let tickets = (end-start)*(1+3*pair.score)+3*(scorePrefix[end]-scorePrefix[start]);
      const omitPrevious = Boolean(alternativeCount && pair.previous && previousRightIndex >= start && previousRightIndex < end);
      if (omitPrevious) tickets -= weight(pair,right[previousRightIndex]);
      weightTotal += tickets;
      return { pair, start, end, tickets, omitPrevious };
    });
    const plans = [];
    let selectedPicks = null;
    if (drawTicket) {
      let ticket = drawTicket(weightTotal);
      for (const band of bands) {
        if (ticket >= band.tickets) { ticket -= band.tickets; continue; }
        for (let index=band.start; index<band.end; index++) {
          if (band.omitPrevious && index === previousRightIndex) continue;
          ticket -= weight(band.pair,right[index]);
          if (ticket < 0) { selectedPicks = [...band.pair.picks,...right[index].picks]; break; }
        }
        break;
      }
    } else if (includePlans) {
      // Retained complete plans are for small fixtures/tools; production uses drawTicket.
      for (const band of bands) for (let index=band.start; index<band.end; index++) {
        if (!band.omitPrevious || index !== previousRightIndex) plans.push([...band.pair.picks,...right[index].picks]);
      }
    }
    return { plans, selectedPicks, combinationCount, maximumCents, targetCents,
      ...(mash?{mash}:{}),
      unchanged: previous.length === 4 && !alternativeCount, budgetCents, setting, mood, spending, area, date, customOptions,fit };
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
    if(date&&option.seasons&&!option.seasons.includes(Number(date.slice(5,7))))return false;
    if (!date || !option.venue) return true;
    const venue = option.venue;
    return venue.openDays.includes(new Date(`${date}T12:00:00Z`).getUTCDay()) &&
      !(venue.closedDates || []).includes(date) &&
      !(venue.closedDateRanges || []).some(([start,end]) => date >= start && date <= end);
  }
  function validDate(date) {
    return typeof date === 'string' && (!date || /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0,10) === date);
  }
  const api = { categories, settings, moods, spendingModes, areas, customCatalog, prepare, title, eligible, validDate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MashPlanner = api;
})(typeof globalThis === 'object' ? globalThis : this);
