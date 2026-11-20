const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLocationSearch, LocationSearchError, milesBetween } = require('../lib/location-search');
const json = (value, init) => new Response(JSON.stringify(value), init);
const town = { id: 5102466, name: 'Paterson', admin1: 'New Jersey', country_code: 'US', feature_code: 'PPL', latitude: 40.91677, longitude: -74.17181 };
const origin = { lat: town.latitude, lon: town.longitude };
const business = (id = 1, extra = {}) => ({ type: 'node', id, lat: origin.lat, lon: origin.lon, tags: { name: 'Provider-listed cafe', amenity: 'cafe', ...extra } });
const invalid = status => error => error instanceof LocationSearchError && error.status === status;

test('location search accepts city/state and ZIP only, before making provider calls', async () => {
  let calls = 0;
  const api = createLocationSearch({ fetch: async () => { calls++; return json({ results: [town] }); }, minimumIntervalMs: 0 });
  for (const query of [undefined, null, [], {}, '', 'A', '123 Main St', 'https://example.com', '<script>', '0'.repeat(81)]) {
    await assert.rejects(api.geocode(query), invalid(400));
  }
  assert.equal(calls, 0);
  assert.equal((await api.geocode('Paterson, NJ')).choices[0].label, 'Paterson, New Jersey, US');
  assert.equal((await api.geocode('07501')).choices[0].id, town.id);
});

test('city geocoding preserves ambiguity and supplies attribution without using private addresses', async () => {
  let requested;
  const api = createLocationSearch({ fetch: async (url, init) => {
    requested = new URL(url);
    assert.match(init.headers['User-Agent'], /DateNightMASH/);
    return json({ results: [town, { ...town, id: 2, name: 'Another Paterson', latitude: 41 }, { ...town, id: 3, country_code: 'GB' }, { ...town, id: 4, latitude: 100 }, { ...town, id: 5, name: 'Paterson Park', feature_code: 'PRK' }] });
  } });
  const result = await api.geocode('Paterson, NJ');
  assert.equal(requested.searchParams.get('name'), 'Paterson, NJ');
  assert.equal(requested.searchParams.get('countryCode'), 'US');
  assert.equal(result.choices.length, 2);
  assert.deepEqual(result.choices[0], { id: town.id, label: 'Paterson, New Jersey, US', ...origin });
  assert.match(result.attribution[0].url, /open-meteo/);
});

test('geocoding coalesces duplicate searches and returns isolated cached values', async () => {
  let calls = 0;
  const api = createLocationSearch({ fetch: async () => { calls++; await new Promise(resolve => setTimeout(resolve, 10)); return json({ results: [town] }); } });
  const [first, second] = await Promise.all([api.geocode('Paterson, NJ'), api.geocode('  Paterson,  NJ ')]);
  first.choices[0].label = 'changed';
  assert.equal(second.choices[0].label, 'Paterson, New Jersey, US');
  assert.equal((await api.geocode('PATERSON, NJ')).choices[0].label, 'Paterson, New Jersey, US');
  assert.equal(calls, 1);
});

test('nearby input is strict, bounded and never interpolates user strings', async () => {
  let calls = 0;
  const api = createLocationSearch({ fetch: async () => { calls++; return json({ elements: [] }); } });
  for (const input of [null, [], { ...origin, radius: 1 }, { ...origin, radius: '10' }, { ...origin, kind: 'x";out;' }, { ...origin, lat: Infinity }, { ...origin, lon: 181 }, { ...origin, lat: '40' }, { ...origin, extra: true }]) {
    await assert.rejects(api.nearby(input), invalid(400));
  }
  assert.equal(calls, 0);
});

test('nearby normalizes sourced names/addresses while leaving price and hours unknown', async () => {
  let providerBody;
  const api = createLocationSearch({ fetch: async (url, init) => {
    assert.equal(url, 'https://overpass.private.coffee/api/interpreter');
    providerBody = new URLSearchParams(init.body).get('data');
    return json({ elements: [business(7, { 'addr:housenumber': '12', 'addr:street': 'Market Street', 'addr:city': 'Paterson', 'addr:state': 'NJ', website: 'https://example.org', opening_hours: '24/7', fee: 'no' }), business(8, { name: 'No address', website: 'javascript:alert(1)' })] });
  } });
  const result = await api.nearby({ ...origin, radius: 10, kind: 'treat' });
  assert.match(providerBody, /\[timeout:12\]/);
  assert.match(providerBody, /around:16094/);
  assert.match(providerBody, /out tags center 240/);
  const place = result.results.find(place => place.id === 'osm-node-7');
  assert.equal(place.name, 'Provider-listed cafe');
  assert.equal(place.address, '12 Market Street, Paterson, NJ');
  assert.equal(place.website, 'https://example.org/');
  assert.equal(place.priceKnown, false);
  assert.equal(place.costCents, null);
  assert.equal(place.hoursKnown, false);
  assert.equal(place.availabilityKnown, false);
  assert.equal(place.sourceUrl, 'https://www.openstreetmap.org/node/7');
  const map = new URL(place.directionsUrl);
  assert.equal(map.searchParams.has('origin'), false);
  assert.equal(result.results.find(place => place.id === 'osm-node-8').address, null);
  assert.equal(result.results.find(place => place.id === 'osm-node-8').website, null);
  assert.match(result.notice, /not driving miles/);
});

test('nearby bounds, deduplicates and sorts a sample by actual straight-line distance', async () => {
  const data = [
    { ...business(1), lat: origin.lat + 0.02 },
    business(2), business(2),
    { ...business(3), lat: origin.lat + 1 },
    { type: 'way', id: 4, center: origin, tags: { name: 'Map-listed park', leisure: 'park' } },
    { ...business(5), lat: undefined },
    ...Array.from({ length: 300 }, (_, index) => business(index + 10, { name: `Named cafe ${index}` }))
  ];
  const api = createLocationSearch({ fetch: async () => json({ elements: data }) });
  const result = await api.nearby({ ...origin, radius: 5 });
  assert.equal(result.results.length, 60);
  assert.equal(new Set(result.results.map(result => result.id)).size, 60);
  assert.ok(!result.results.some(result => result.id === 'osm-node-3'));
  assert.ok(result.results.every(result => result.distanceMiles <= 5));
  assert.equal(milesBetween(origin, origin), 0);
});

test('provider throttling is readable, cached results do not consume a request slot', async () => {
  let clock = 1000, calls = 0;
  const api = createLocationSearch({ fetch: async () => { calls++; return json({ results: [town] }); }, now: () => clock });
  await api.geocode('Paterson, NJ');
  await api.geocode('Paterson, NJ');
  await assert.rejects(api.geocode('Wayne, NJ'), invalid(429));
  clock += 1500;
  await api.geocode('Wayne, NJ');
  assert.equal(calls, 2);
});

test('provider HTTP errors, malformed JSON and incomplete Overpass results never become invented success', async () => {
  for (const response of [new Response('bad JSON'), json({ elements: [], remark: 'runtime error: timeout' }), new Response('Busy', { status: 504 })]) {
    const api = createLocationSearch({ fetch: async () => response });
    await assert.rejects(api.nearby({ ...origin }), invalid(503));
  }
  const limited = createLocationSearch({ fetch: async () => new Response('Rate limit', { status: 429 }) });
  await assert.rejects(limited.geocode('07501'), invalid(429));
});

test('unavailable/timed-out providers leave a readable error and can recover later', async () => {
  let calls = 0;
  const api = createLocationSearch({ minimumIntervalMs: 0, timeoutMs: 5, fetch: async (_url, init) => {
    if (++calls > 1) return json({ results: [town] });
    return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  } });
  await assert.rejects(api.geocode('07501'), error => error.status === 503 && /timed out/.test(error.message));
  assert.equal((await api.geocode('07501')).choices.length, 1);
});

test('oversized provider bodies are rejected based on headers and streamed byte counts', async () => {
  for (const response of [json({ results: [town] }, { headers: { 'content-length': '99999999' } }), new Response('x'.repeat(128001))]) {
    const api = createLocationSearch({ fetch: async () => response });
    await assert.rejects(api.geocode('07501'), error => error.status === 503 && /too much data/.test(error.message));
  }
});

test('empty provider results stay empty and do not claim availability or prices', async () => {
  const api = createLocationSearch({ fetch: async url => json(url.includes('geocoding') ? {} : { elements: [] }) });
  const locations = await api.geocode('Unknown Town, NJ');
  assert.deepEqual(locations.choices, []);
  const places = await api.nearby({ ...origin, radius: 50, kind: 'all' });
  assert.deepEqual(places.results, []);
  assert.match(places.attribution[0].url, /openstreetmap/);
});

test('trusted provider configuration accepts HTTPS only and is not controlled by request input', () => {
  assert.throws(() => createLocationSearch({ overpassUrl: 'http://localhost/' }), /HTTPS/);
  assert.throws(() => createLocationSearch({ geocodingUrl: 'https://user:password@example.org/' }), /HTTPS/);
});
