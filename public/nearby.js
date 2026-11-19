(() => {
  // Representative municipality points from the U.S. Census TIGERweb ACS25 NJ subdivisions.
  // https://tigerweb.geo.census.gov/tigerwebmain/Files/acs26/tigerweb_acs26_cousub_2025_acs25_nj.html
  const towns = new Map(Object.entries({
    Clifton: [40.86303, -74.15753],
    'Elmwood Park': [40.90494, -74.12005],
    Fairfield: [40.88282, -74.30415],
    Hackensack: [40.88904, -74.04617],
    Hawthorne: [40.95796, -74.15816],
    Hoboken: [40.74521, -74.02811],
    'Jersey City': [40.71163, -74.06490],
    'Little Falls': [40.87620, -74.21806],
    Montclair: [40.82535, -74.21105],
    Morristown: [40.79667, -74.47721],
    Newark: [40.72447, -74.17254],
    Paramus: [40.94555, -74.07117],
    Paterson: [40.91469, -74.16237],
    Ridgewood: [40.98213, -74.11272],
    Ringwood: [41.10649, -74.27488],
    'Saddle River': [41.02729, -74.09558],
    Totowa: [40.90391, -74.22140],
    Wayne: [40.94810, -74.24527],
    Westfield: [40.65155, -74.34322]
  }));
  const form = document.querySelector('#nearby-form');
  const town = document.querySelector('#nearby-town');
  const radius = document.querySelector('#nearby-radius');
  const search = document.querySelector('#nearby-search');
  const status = document.querySelector('#nearby-status');
  const results = document.querySelector('#nearby-results');
  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  let options;

  for (const name of towns.keys()) town.add(new Option(name, name));

  function distanceMiles([fromLat, fromLon], [toLat, toLon]) {
    const radians = degrees => degrees * Math.PI / 180;
    const a = Math.sin(radians(toLat - fromLat) / 2) ** 2
      + Math.cos(radians(fromLat)) * Math.cos(radians(toLat))
      * Math.sin(radians(toLon - fromLon) / 2) ** 2;
    return 3958.8 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
  }

  function resultItem(option, miles, origin) {
    const item = document.createElement('li');
    const name = document.createElement('h3');
    name.textContent = option.name;
    const location = document.createElement('p');
    location.textContent = option.venue.address;
    const summary = document.createElement('p');
    const distance = miles === 0 ? 'Same town' : `About ${miles.toFixed(1)} mi`;
    summary.textContent = `${distance} · ${currency.format(option.costCents / 100)} estimated for two`;
    const link = document.createElement('a');
    const query = new URLSearchParams({
      api: '1', origin: `${origin}, NJ`, destination: option.venue.address, travelmode: 'driving'
    });
    link.href = `https://www.google.com/maps/dir/?${query}`;
    link.textContent = 'Open driving directions';
    link.setAttribute('aria-label', `Open driving directions to ${option.venue.name}`);
    item.append(name, location, summary, link);
    return item;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (search.disabled) return;
    const origin = town.value;
    const center = towns.get(origin);
    const limit = Number(radius.value);
    if (!center) return;

    results.hidden = true;
    results.replaceChildren();
    search.disabled = town.disabled = radius.disabled = true;
    status.textContent = 'Looking for nearby date ideas…';
    try {
      if (!options) {
        const response = await fetch('/api/options', { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('Could not load options');
        const catalog = await response.json();
        options = catalog.options.filter(option => option.venue?.state === 'NJ' && towns.has(option.venue.city));
      }
      const matches = options
        .map(option => ({ option, miles: distanceMiles(center, towns.get(option.venue.city)) }))
        .filter(({ miles }) => miles <= limit)
        .sort((a, b) => a.miles - b.miles || a.option.name.localeCompare(b.option.name));

      status.textContent = matches.length
        ? `${matches.length} ${matches.length === 1 ? 'idea' : 'ideas'} within ${limit} miles of ${origin}, NJ.`
        : `No catalog ideas within ${limit} miles of ${origin}, NJ. Try a wider radius or a different town.`;
      results.append(...matches.map(({ option, miles }) => resultItem(option, miles, origin)));
      results.hidden = matches.length === 0;
    } catch {
      status.textContent = 'Nearby ideas could not load. Please try again.';
    } finally {
      search.disabled = town.disabled = radius.disabled = false;
    }
  });
})();
