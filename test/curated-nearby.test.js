const { test } = require('node:test');
const assert = require('node:assert/strict');
const { curatedNearby, freshnessInfo } = require('../lib/curated-nearby');
const local = require('../data/local-options.json'), towns = require('../data/towns.json');
const today = Date.UTC(2026, 10, 19, 16);
const input = { lat: 40.9168, lon: -74.1718, radius: 10, kind: 'all' };

test('curated results are immediate, source-priced, grouped local places with honest ranges', () => {
  const result = curatedNearby(local, towns, input, { now: today });
  assert.ok(result.results.length > 20);
  assert.equal(new Set(result.results.map(place => place.id)).size, result.results.length);
  for (const place of result.results) {
    const options = local.filter(o => o.venue.id === place.venueId && o.category === place.category);
    assert.deepEqual(place.optionIds.slice().sort(), options.map(o => o.id).sort());
    assert.equal(place.name, options[0].venue.name);
    assert.equal(place.address, options[0].venue.address);
    assert.equal(place.minCostCents, Math.min(...options.map(o => o.costCents)));
    assert.equal(place.maxCostCents, Math.max(...options.map(o => o.costCents)));
    assert.equal(place.coordinateBasis, 'municipality-center');
    assert.equal(place.priceKnown, true); assert.equal(place.hoursKnown, false); assert.equal(place.availabilityKnown, false);
    assert.equal(new URL(place.directionsUrl).searchParams.get('destination'), place.address);
    assert.equal(new URL(place.directionsUrl).searchParams.has('origin'), false);
    assert.ok(place.sourceUrls.every(url => url.startsWith('https://')));
    for (const example of place.priceExamples) assert.equal(example.costCents, example.baseCents + example.taxCents + example.tipCents + example.donationCents);
  }
  assert.match(result.notice, /not live quotes/);
});

test('category/radius filters and result limit never invent or expand coverage', () => {
  const small = curatedNearby(local, towns, { ...input, radius: 5, kind: 'treat' }, { now: today, limit: 3 });
  assert.ok(small.results.length > 0 && small.results.length <= 3);
  assert.ok(small.results.every(place => place.category === 'treat' && place.distanceMiles <= 5));
  assert.ok(small.totalCount >= small.results.length);
  const distant = curatedNearby(local, towns, { lat: 34.05, lon: -118.24, radius: 50, kind: 'all' }, { now: today });
  assert.deepEqual(distant.results, []); assert.equal(distant.totalCount, 0);
  assert.ok(curatedNearby(local, towns, { ...input, radius: 15 }, { now: today }).results.length > 0);
});

test('curated discovery validates the same finite coordinates, radii and kinds as live discovery', () => {
  for (const value of [null, [], {}, { ...input, extra: true }, { ...input, lat: '40' }, { ...input, lon: Infinity }, { ...input, lat: 91 }, { ...input, lon: -181 }, { ...input, radius: 11 }, { ...input, kind: 'bar' }]) {
    assert.throws(() => curatedNearby(local, towns, value), error => error.status === 400);
  }
  assert.throws(() => curatedNearby(local, towns, input, { limit: 1000 }), TypeError);
});

test('freshness is computed from recorded dates without refreshing them or promising live prices', () => {
  assert.equal(freshnessInfo('2026-11-19', today).freshnessStatus, 'recent-check');
  assert.equal(freshnessInfo('2026-11-18', today).daysSinceChecked, 1);
  assert.match(freshnessInfo('2026-11-18', today).freshnessLabel, /1 day ago/);
  const old = freshnessInfo('2026-10-01', today);
  assert.equal(old.checkedOn, '2026-10-01'); assert.equal(old.daysSinceChecked, 49); assert.equal(old.freshnessStatus, 'review-due');
  assert.match(old.freshnessLabel, /Reconfirm/);
  assert.equal(freshnessInfo('2026-11-20', today).freshnessStatus, 'future-date');
  for (const bad of [undefined, '', '2026-02-30', 'today', '2026-1-1']) assert.equal(freshnessInfo(bad, today).freshnessStatus, 'unknown');
});

test('group freshness uses the oldest variant and dates/prices in the catalog remain unchanged', () => {
  const first = structuredClone(local[0]), second = structuredClone(local[0]); second.id += '-older'; second.pricing.checkedOn = '2026-09-01';
  second.costCents += 100; second.pricing.baseCents += 100;
  const options = [first, second], before = structuredClone(options);
  const result = curatedNearby(options, towns, { lat: 40.9168, lon: -74.1718, radius: 50, kind: 'all' }, { now: today });
  assert.equal(result.results.length, 1); assert.equal(result.results[0].checkedOn, '2026-09-01');
  assert.equal(result.results[0].freshnessStatus, 'review-due'); assert.deepEqual(options, before);
});

test('unknown, malformed and source-less entries never become a zero-dollar checked place', () => {
  const base = structuredClone(local[0]);
  const cases = [
    { ...base, venue: undefined }, { ...base, costCents: null }, { ...base, costCents: -1 },
    { ...base, pricing: { ...base.pricing, sourceUrl: 'javascript:alert(1)' } },
    { ...base, pricing: { ...base.pricing, sourceUrl: 'https://user:pass@example.com' } },
    { ...base, pricing: { ...base.pricing, baseCents: 0 } }, { ...base, category: 'unknown' }
  ];
  assert.deepEqual(curatedNearby(cases, towns, { ...input, radius: 50 }, { now: today }).results, []);
  const invalidTown = { towns: { [base.venue.city]: [NaN, 0] } };
  assert.deepEqual(curatedNearby([base], invalidTown, { ...input, radius: 50 }, { now: today }).results, []);
});
