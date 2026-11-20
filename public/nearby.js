/* Use the same supported towns and coordinates as the date planner. */
(() => {
  const $ = selector => document.querySelector(selector);
  const form = $('#nearby-form'), town = $('#nearby-town'), radius = $('#nearby-radius');
  const search = $('#nearby-search'), status = $('#nearby-status'), results = $('#nearby-results'), retry = $('#nearby-retry');
  if (!form || !town || !radius || !search || !status || !results || !retry) return;
  const currency = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' });
  let towns = new Map(), options = [], loading = false;

  function node(tag, text) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function disabled(value) { town.disabled = radius.disabled = search.disabled = value; }

  async function load() {
    if (loading) return;
    loading = true;
    disabled(true);
    retry.hidden = true;
    status.textContent = 'Loading North Jersey towns…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('/api/options', { signal:controller.signal });
      if (!response.ok) throw new Error('Catalog unavailable');
      const catalog = await response.json();
      if (!Array.isArray(catalog.options) || !catalog.towns?.towns) throw new Error('Town data unavailable');
      const entries = Object.entries(catalog.towns.towns).filter(([,point]) =>
        Array.isArray(point) && point.length === 2 && point.every(Number.isFinite));
      if (!entries.length) throw new Error('No towns returned');
      towns = new Map(entries.sort(([a],[b]) => a.localeCompare(b)));
      options = catalog.options.filter(option => option.venue?.state === 'NJ' && towns.has(option.venue.city));
      const selected = town.value;
      const placeholder = node('option', 'Choose a town');
      placeholder.value = '';
      town.replaceChildren(placeholder);
      for (const name of towns.keys()) {
        const option = node('option', name);
        option.value = name;
        town.append(option);
      }
      town.value = towns.has(selected) ? selected : '';
      disabled(false);
      status.textContent = `${towns.size} North Jersey towns ready. Choose your starting town.`;
    } catch {
      status.textContent = 'Could not load towns. Check your connection and tap Retry loading towns.';
      retry.hidden = false;
    } finally {
      clearTimeout(timeout);
      loading = false;
    }
  }

  function distanceMiles([aLat,aLon], [bLat,bLon]) {
    const radians = degrees => degrees * Math.PI / 180;
    const value = Math.sin(radians(bLat-aLat)/2)**2 +
      Math.cos(radians(aLat))*Math.cos(radians(bLat))*Math.sin(radians(bLon-aLon)/2)**2;
    return 3958.8 * 2 * Math.asin(Math.sqrt(Math.min(1,value)));
  }
  function resultItem(group, miles, origin) {
    const option=group.options[0];
    const item = node('li');
    item.append(node('h3',option.venue.name),node('p',option.venue.address),
      node('p',`${miles === 0 ? 'Same town' : `About ${miles.toFixed(1)} mi`} · ${group.category} · ${DatePlaces.range(group)} sample totals for two`));
    const link = node('a','Open driving directions');
    link.href = DateDirections.to(option.venue.address,{town:origin});
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label',`Open driving directions to ${option.venue.name}`);
    item.append(link);
    return item;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (search.disabled) return;
    const center = towns.get(town.value), limit = Number(radius.value);
    if (!center || ![5,10,25,50].includes(limit)) {
      status.textContent = 'Choose a starting town and a supported radius.';
      return;
    }
    const matches = DatePlaces.group(options).map(group => ({group,miles:distanceMiles(center,towns.get(group.venue.city))}))
      .filter(({miles}) => miles <= limit)
      .sort((a,b) => a.miles-b.miles || a.group.venue.name.localeCompare(b.group.venue.name));
    results.replaceChildren(...matches.map(({group,miles}) => resultItem(group,miles,town.value)));
    results.hidden = matches.length === 0;
    status.textContent = matches.length
      ? `${matches.length} ${matches.length === 1 ? 'idea' : 'ideas'} within ${limit} miles of ${town.value}, NJ.`
      : `No catalog ideas within ${limit} miles of ${town.value}, NJ. Try a wider radius or a different town.`;
  });
  retry.addEventListener('click',load);
  document.addEventListener('mash:directions-change',()=>{if(!results.hidden)form.dispatchEvent(new Event('submit',{cancelable:true}));});
  load();
})();
