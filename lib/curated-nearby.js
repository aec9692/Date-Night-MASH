/* Fast local discovery from the checked catalog. Never depends on a live maps service. */
const { LocationSearchError, milesBetween, kinds, radii } = require('./location-search');
const day = 86400000;
const coordinate = (value, maximum) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= maximum;
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
}
function sourceUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
function freshnessInfo(checkedOn, now = Date.now()) {
  if (!validDate(checkedOn)) return { checkedOn: null, daysSinceChecked: null, freshnessStatus: 'unknown', freshnessLabel: 'Price check date unavailable; confirm before visiting.' };
  const current = new Date(now);
  if (!Number.isFinite(current.getTime())) throw new TypeError('Choose a valid current time for freshness checks.');
  const daysSinceChecked = Math.floor((Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate()) - Date.parse(checkedOn + 'T00:00:00Z')) / day);
  if (daysSinceChecked < 0) return { checkedOn, daysSinceChecked: null, freshnessStatus: 'future-date', freshnessLabel: 'Recorded check date is in the future; reconfirm this price.' };
  const freshnessStatus = daysSinceChecked > 30 ? 'review-due' : 'recent-check';
  const when = daysSinceChecked === 0 ? 'today' : `${daysSinceChecked} ${daysSinceChecked === 1 ? 'day' : 'days'} ago`;
  return { checkedOn, daysSinceChecked, freshnessStatus, freshnessLabel: `Source checked ${when}${freshnessStatus === 'review-due' ? '; review due' : ''}. Reconfirm before visiting.` };
}
function validExample(option) {
  const p = option?.pricing, v = option?.venue;
  return typeof option?.id === 'string' && option.id && typeof option.name === 'string' && v && typeof v.id === 'string' && typeof v.name === 'string' && v.name.trim() && typeof v.address === 'string' && v.address.trim() &&
    kinds.includes(option.category) && option.category !== 'all' && Number.isSafeInteger(option.costCents) && option.costCents >= 0 &&
    p && sourceUrl(p.sourceUrl) && ['baseCents', 'taxCents', 'tipCents', 'donationCents'].every(key => Number.isSafeInteger(p[key]) && p[key] >= 0) &&
    option.costCents === p.baseCents + p.taxCents + p.tipCents + p.donationCents;
}
function curatedNearby(options, townData, input, { now = Date.now(), limit = 60 } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['lat', 'lon', 'radius', 'kind'].includes(key))) throw new LocationSearchError('Send a town location, radius and category only.');
  const { lat, lon, radius = 10, kind = 'all' } = input;
  if (!coordinate(lat, 90) || !coordinate(lon, 180)) throw new LocationSearchError('Choose a valid town location before finding places.');
  if (!radii.includes(radius)) throw new LocationSearchError('Choose a radius of 5, 10, 15, 25 or 50 miles.');
  if (!kinds.includes(kind)) throw new LocationSearchError('Choose all, dinner, activity, treat or entertainment.');
  if (!Array.isArray(options) || !Number.isInteger(limit) || limit < 1 || limit > 120) throw new TypeError('Choose a valid curated catalog and result limit.');
  const towns = townData?.towns || townData || {}, origin = { lat, lon }, groups = new Map();
  for (const option of options) {
    if (!validExample(option) || kind !== 'all' && option.category !== kind) continue;
    const point = towns[option.venue.city];
    if (!Array.isArray(point) || !coordinate(point[0], 90) || !coordinate(point[1], 180)) continue;
    const distance = milesBetween(origin, { lat: point[0], lon: point[1] });
    if (distance > radius) continue;
    const key = `${option.category}|${option.venue.id}`;
    if (!groups.has(key)) groups.set(key, { options: [], distance, point });
    groups.get(key).options.push(option);
  }
  const results = [...groups.values()].map(group => {
    const variants = group.options.sort((a, b) => a.costCents - b.costCents || a.id.localeCompare(b.id));
    const option = variants[0], venue = option.venue;
    const checkedDates = variants.map(o => o.pricing.checkedOn);
    // A group uses its oldest check, not the most flattering/recent variant.
    const checkedOn = checkedDates.every(validDate) ? checkedDates.sort()[0] : null;
    const minCostCents = variants[0].costCents, maxCostCents = variants.at(-1).costCents;
    const map = new URL('https://www.google.com/maps/dir/');
    map.searchParams.set('api', '1'); map.searchParams.set('destination', venue.address);
    return {
      id: `curated-${option.category}-${venue.id}`, venueId: venue.id, name: venue.name, category: option.category,
      city: venue.city, state: venue.state, address: venue.address,
      lat: group.point[0], lon: group.point[1], coordinateBasis: 'municipality-center', distanceMiles: Math.round(group.distance * 10) / 10,
      source: 'curated', sourceUrl: sourceUrl(option.pricing.sourceUrl), sourceUrls: [...new Set(variants.map(o => sourceUrl(o.pricing.sourceUrl)))],
      directionsUrl: map.href, website: null, listedType: 'source-priced local example',
      priceKnown: true, costCents: minCostCents, minCostCents, maxCostCents,
      priceLabel: 'Checked sample total for two, including listed estimated allowances; not a full-menu range or current quote.',
      hoursKnown: false, availabilityKnown: false, hoursNote: venue.hoursNote || 'Confirm current hours directly.',
      ...freshnessInfo(checkedOn, now),
      verification: 'Name, address and sample price basis come from the source-linked catalog. Reconfirm price, hours, age rules and availability directly.',
      optionIds: variants.map(o => o.id),
      priceExamples: variants.map(o => ({ optionId: o.id, name: o.name, costCents: o.costCents, order: o.pricing.order, ...o.pricing }))
    };
  }).sort((a, b) => a.distanceMiles - b.distanceMiles || a.name.localeCompare(b.name) || a.category.localeCompare(b.category));
  return {
    origin, radius, kind, results: results.slice(0, limit), totalCount: results.length, source: 'curated',
    attribution: [{ label: 'Source-linked North Jersey collection; open each official price source', url: 'https://github.com/aec9692/Date-Night-MASH/blob/main/DATA_SOURCES.md' }],
    notice: 'Curated source-priced examples are available without a live map lookup. Distances use municipality centers, not venue entrances or driving routes. Posted examples and estimated tax/tip/donation allowances are not live quotes; opening hours and availability need confirmation.'
  };
}
module.exports = { curatedNearby, freshnessInfo };
