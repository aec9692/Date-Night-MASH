/* Explicit-submit, read-only discovery. Unknown prices never become free options. */
const kinds = ['all', 'dinner', 'activity', 'treat', 'entertainment'];
const radii = [5, 10, 15, 25, 50];
const localLookup = require('../public/location-lookup');
const attribution = {
  geocoding: { label: 'Locations by Open-Meteo / GeoNames', url: 'https://open-meteo.com/en/docs/geocoding-api' },
  places: { label: 'Map data © OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright' }
};
const userAgent = 'DateNightMASH/1.0 (+https://github.com/aec9692/Date-Night-MASH)';

class LocationSearchError extends Error {
  constructor(message, status = 400) { super(message); this.name = 'LocationSearchError'; this.status = status; }
}

const text = (value, maximum = 180) => typeof value === 'string' ? value.trim().slice(0, maximum) : '';
const coordinate = (value, maximum) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= maximum;
function milesBetween(a, b) {
  const radians = value => value * Math.PI / 180;
  const deltaLat = radians(b.lat - a.lat), deltaLon = radians(b.lon - a.lon);
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(deltaLon / 2) ** 2;
  return 3958.7613 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
function safeWebsite(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

// Static tag expressions: no user text is inserted in an Overpass query.
const tagFilters = {
  dinner: ['[amenity~"^(restaurant|fast_food|food_court)$"]'],
  treat: ['[amenity~"^(cafe|ice_cream)$"]', '[shop~"^(bakery|confectionery|chocolate|pastry)$"]'],
  activity: ['[shop~"^(second_hand|charity|antiques|books|records|hobby|craft)$"]', '[leisure~"^(park|garden|bowling_alley|miniature_golf|sports_centre|ice_rink|amusement_arcade)$"]', '[tourism~"^(museum|gallery|aquarium|zoo)$"]'],
  entertainment: ['[amenity~"^(cinema|theatre|arts_centre)$"]', '[leisure~"^(bowling_alley|amusement_arcade|miniature_golf)$"]']
};
function categoryFor(tags, selectedKind) {
  if (selectedKind !== 'all') return selectedKind;
  if (['restaurant', 'fast_food', 'food_court'].includes(tags.amenity)) return 'dinner';
  if (['cafe', 'ice_cream'].includes(tags.amenity) || ['bakery', 'confectionery', 'chocolate', 'pastry'].includes(tags.shop)) return 'treat';
  if (['cinema', 'theatre', 'arts_centre'].includes(tags.amenity)) return 'entertainment';
  return 'activity';
}
function placeFromElement(element, origin, radius, kind) {
  if (!element || !['node', 'way', 'relation'].includes(element.type) || !Number.isSafeInteger(element.id) || element.id <= 0) return null;
  const tags = element.tags || {}, name = text(tags.name);
  const lat = element.lat ?? element.center?.lat, lon = element.lon ?? element.center?.lon;
  if (!name || !coordinate(lat, 90) || !coordinate(lon, 180)) return null;
  const distance = milesBetween(origin, { lat, lon });
  if (distance > radius) return null;
  const street = text(tags['addr:street']), number = text(tags['addr:housenumber'], 30);
  const city = text(tags['addr:city']), state = text(tags['addr:state'], 40), postcode = text(tags['addr:postcode'], 20);
  // Do not manufacture an address from the user's selected city or a nearby POI.
  const address = street && number && (city || postcode) ? [`${number} ${street}`, city, state, postcode].filter(Boolean).join(', ') : null;
  const sourceUrl = `https://www.openstreetmap.org/${element.type}/${element.id}`;
  const map = new URL('https://www.google.com/maps/dir/');
  map.searchParams.set('api', '1'); map.searchParams.set('destination', `${lat},${lon}`);
  return {
    id: `osm-${element.type}-${element.id}`, name, category: categoryFor(tags, kind), address, lat, lon,
    distanceMiles: Math.round(distance * 10) / 10,
    sourceUrl, website: safeWebsite(tags.website || tags['contact:website']), directionsUrl: map.href,
    priceKnown: false, costCents: null, hoursKnown: false, availabilityKnown: false,
    listedType: text(tags.shop || tags.amenity || tags.leisure || tags.tourism, 60).replaceAll('_', ' '),
    verification: 'Community map listing; confirm business details, prices, hours and admission directly.'
  };
}

function createLocationSearch({
  fetch: fetchProvider = globalThis.fetch,
  now = Date.now,
  geocodingUrl = process.env.GEOCODING_URL || 'https://geocoding-api.open-meteo.com/v1/search',
  overpassUrl = process.env.OVERPASS_URL || 'https://overpass.private.coffee/api/interpreter',
  timeoutMs = 15000,
  minimumIntervalMs = 1500,
  localLocations = []
} = {}) {
  if (typeof fetchProvider !== 'function') throw new Error('A fetch implementation is required.');
  for (const endpoint of [geocodingUrl, overpassUrl]) {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Location providers must use HTTPS.');
  }
  const cache = new Map(), pending = new Map(), lastRequest = new Map();
  const maxCacheEntries = 120;
  function remember(key, value, ttl) {
    while (cache.size >= maxCacheEntries) cache.delete(cache.keys().next().value);
    cache.set(key, { value, expires: now() + ttl });
  }
  async function request(provider, url, init, maxBytes) {
    const last = lastRequest.get(provider);
    if (last !== undefined && now() - last < minimumIntervalMs) throw new LocationSearchError('Please wait a moment before searching another location.', 429);
    lastRequest.set(provider, now());
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchProvider(url, { ...init, signal: controller.signal, headers: { Accept: 'application/json', 'User-Agent': userAgent, ...init?.headers }, redirect: 'error' });
      if (!response.ok) {
        await response.body?.cancel();
        throw new LocationSearchError(response.status === 429 ? 'The map provider is busy. Please try again later.' : 'Live place search is temporarily unavailable. Your curated date ideas still work.', response.status === 429 ? 429 : 503);
      }
      if (Number(response.headers.get('content-length')) > maxBytes) {
        await response.body?.cancel();
        throw new LocationSearchError('The map provider returned too much data. Try a smaller radius.', 503);
      }
      // Limit bytes while reading, rather than allocating an unbounded text response.
      if (!response.body?.getReader) throw new LocationSearchError('The map provider returned an unreadable response.', 503);
      const reader = response.body.getReader(), chunks = []; let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > maxBytes) { await reader.cancel(); throw new LocationSearchError('The map provider returned too much data. Try a smaller radius.', 503); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const body = Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8');
      return JSON.parse(body);
    } catch (error) {
      if (error instanceof LocationSearchError) throw error;
      throw new LocationSearchError(controller.signal.aborted ? 'Live place search timed out. Try again or use the curated ideas.' : 'Could not reach live place search. Your curated date ideas still work.', 503);
    } finally { clearTimeout(timer); }
  }
  function cached(key, ttl, get) {
    const stored = cache.get(key);
    if (stored && stored.expires > now()) return Promise.resolve(structuredClone(stored.value));
    if (pending.has(key)) return pending.get(key).then(structuredClone);
    const task = get().then(value => { remember(key, value, ttl); return value; }).finally(() => pending.delete(key));
    pending.set(key, task);
    return task.then(structuredClone);
  }
  async function geocode(query) {
    if (typeof query !== 'string') throw new LocationSearchError('Enter a city and state, or a five-digit US ZIP code.');
    const q = query.trim().replace(/\s+/g, ' ');
    if (q.length < 2 || q.length > 80 || (!/^\d{5}$/.test(q) && !/^[\p{L}\p{M} .,'’\-]+$/u.test(q))) {
      throw new LocationSearchError('Enter a city and state, or a five-digit US ZIP code. Do not enter a street or home address.');
    }
    const local=localLookup.find(q,localLocations);
    if(local.length)return {choices:local,attribution:[attribution.geocoding,{label:'NJ town centers: U.S. Census',url:'https://tigerweb.geo.census.gov/tigerwebmain/Files/acs26/tigerweb_acs26_cousub_2025_acs25_nj.html'}],notice:'These are municipality centers, not ZIP centroids or driving-distance measurements.',source:'local-nj'};
    return cached(`geo:${q.toLocaleLowerCase('en-US')}`, 24 * 60 * 60 * 1000, async () => {
      const url = new URL(geocodingUrl);
      url.searchParams.set('name', q); url.searchParams.set('count', '8'); url.searchParams.set('language', 'en');
      url.searchParams.set('format', 'json'); url.searchParams.set('countryCode', 'US');
      const data = await request('geocoding', url.href, {}, 128000);
      if (!data || typeof data !== 'object' || data.error || (data.results !== undefined && !Array.isArray(data.results))) throw new LocationSearchError('The location provider returned an unexpected response.', 503);
      const seen = new Set();
      const choices = (data.results || []).slice(0, 8).flatMap(result => {
        if (!Number.isSafeInteger(result.id) || !coordinate(result.latitude, 90) || !coordinate(result.longitude, 180) || !text(result.name) || result.country_code !== 'US' || !/^PPL|^ADM1$/.test(result.feature_code || '')) return [];
        const key = `${result.latitude},${result.longitude}`; if (seen.has(key)) return []; seen.add(key);
        return [{ id: result.id, label: [text(result.name), text(result.admin1), 'US'].filter(Boolean).join(', '), lat: result.latitude, lon: result.longitude }];
      });
      return { choices, attribution: [attribution.geocoding], notice: choices.length ? 'Choose the correct town. This is a city/ZIP center, not your device location.' : 'No matching US city or ZIP was found. Try a city and full state name.' };
    });
  }
  async function nearby(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['lat', 'lon', 'radius', 'kind'].includes(key))) throw new LocationSearchError('Send a town location, radius and category only.');
    const { lat, lon, radius = 10, kind = 'all' } = input;
    if (!coordinate(lat, 90) || !coordinate(lon, 180)) throw new LocationSearchError('Choose a valid town location before finding places.');
    if (!radii.includes(radius)) throw new LocationSearchError('Choose a radius of 5, 10, 15, 25 or 50 miles.');
    if (!kinds.includes(kind)) throw new LocationSearchError('Choose all, dinner, activity, treat or entertainment.');
    // Fixed precision matches city-level search while avoiding precision-heavy cache keys.
    const origin = { lat: Math.round(lat * 10000) / 10000, lon: Math.round(lon * 10000) / 10000 };
    const key = `near:${origin.lat}:${origin.lon}:${radius}:${kind}`;
    return cached(key, 6 * 60 * 60 * 1000, async () => {
      const filters = kind === 'all' ? Object.values(tagFilters).flat() : tagFilters[kind];
      const around = `(around:${Math.ceil(radius * 1609.344)},${origin.lat},${origin.lon})`;
      const query = `[out:json][timeout:12][maxsize:33554432];(${[...new Set(filters)].map(filter => `nwr${filter}[name]${around};`).join('')});out tags center 240;`;
      const data = await request('places', overpassUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data: query }).toString() }, 1500000);
      if (!data || !Array.isArray(data.elements) || data.remark) throw new LocationSearchError('The map provider could not finish this search. Try a smaller radius or use curated ideas.', 503);
      const seen = new Set();
      const results = data.elements.slice(0, 240).map(element => placeFromElement(element, origin, radius, kind)).filter(place => {
        if (!place) return false;
        const key = `${place.name.toLocaleLowerCase('en-US')}:${place.lat.toFixed(4)}:${place.lon.toFixed(4)}`;
        if (seen.has(key)) return false; seen.add(key); return true;
      }).sort((a, b) => a.distanceMiles - b.distanceMiles || a.name.localeCompare(b.name)).slice(0, 60);
      return {
        origin, radius, kind, results, attribution: [attribution.places],
        notice: 'A sample of community-listed places within straight-line miles, not driving miles. Prices, hours and availability are unverified. Confirm directly before visiting; these listings are not added to budgeted dates automatically.'
      };
    });
  }
  return { geocode, nearby };
}

module.exports = { createLocationSearch, LocationSearchError, milesBetween, kinds, radii };
