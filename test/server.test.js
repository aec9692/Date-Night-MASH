const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const app = require('../server');
const catalog = require('../data/options.json');
const localCatalog = require('../data/local-options.json');
const planner = require('../public/planner');
let server;
let base;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

async function generate(body, raw = false) {
  if (!raw && body && typeof body === 'object' && !Array.isArray(body)) body = { area:'general', ...body };
  return fetch(`${base}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ? body : JSON.stringify(body) });
}

test('health and static assets are available', async () => {
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok', app: 'Date Night MASH' });
  assert.equal(health.headers.get('cache-control'), 'no-store');
  for (const [path, type] of [['/', 'text/html'], ['/styles.css', 'text/css'], ['/app.js', 'javascript'], ['/nearby.js','javascript'], ['/companion.js','javascript'], ['/manifest.webmanifest','manifest+json'], ['/icons/icon-192.png','image/png']]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type').includes(type));
  }
});

test('catalog contains unique IDs, four categories, integer prices, and documented tags', async () => {
  const response = await fetch(`${base}/api/options`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.options.length, 305);
  assert.equal(new Set(data.options.map(option => option.id)).size, 305);
  assert.deepEqual(data.categories.map(category => data.options.filter(option => option.category === category && !option.venue).length), [24,24,24,24]);
  assert.deepEqual(data.categories.map(category => data.options.filter(option => option.category === category && option.venue).length), [50,54,50,55]);
  for (const option of data.options) {
    assert.ok(Number.isSafeInteger(option.costCents) && option.costCents >= 0);
    assert.ok(option.settings.length && option.settings.every(setting => ['indoor', 'outdoor', 'home'].includes(setting)));
  }
});

test('options rejects unexpected query input', async () => {
  const response = await fetch(`${base}/api/options?unexpected=value`);
  assert.equal(response.status, 400);
  assert.ok((await response.json()).error);
});

test('plans honor budgets, category order, setting eligibility, and arithmetic across boundary cases', async () => {
  for (const setting of ['any', 'indoor', 'outdoor', 'home']) {
    for (const budget of [0, 0.01, 0.29, 4.99, 5, 16.25, 50, 10000]) {
      const groups = ['dinner', 'activity', 'treat', 'entertainment'].map(category => catalog.filter(option => option.category === category && (setting === 'any' || option.settings.includes(setting))));
      const minimum = groups.reduce((sum, group) => sum + Math.min(...group.map(option => option.costCents)), 0);
      const response = await generate({ budget, setting });
      const plan = await response.json();
      if (Math.round(budget * 100) < minimum) {
        assert.equal(response.status, 422);
        assert.equal(plan.minimumCents, minimum);
        continue;
      }
      assert.equal(response.status, 200);
      assert.deepEqual(plan.picks.map(pick => pick.category), ['dinner', 'activity', 'treat', 'entertainment']);
      assert.ok(plan.picks.every(pick => setting === 'any' || pick.settings.includes(setting)));
      assert.equal(plan.totalCents, plan.picks.reduce((sum, pick) => sum + pick.costCents, 0));
      assert.ok(plan.totalCents <= Math.round(budget * 100));
      assert.equal(plan.remainingCents, plan.budgetCents - plan.totalCents);
    }
  }
});

test('setting is optional', async () => {
  const response = await generate({ budget: 50 });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).setting, 'any');
});

for (const [name, body] of [
  ['missing budget', {}], ['empty string', { budget: '' }], ['numeric string', { budget: '50' }],
  ['null budget', { budget: null }], ['boolean budget', { budget: true }], ['negative budget', { budget: -1 }],
  ['over maximum', { budget: 10000.01 }], ['too many decimals', { budget: 1.234 }],
  ['tiny fractional cent', { budget: 0.000000001 }], ['array body', []], ['wrong type', { budget: {} }],
  ['unknown field', { budget: 50, ignore: true }], ['unknown setting', { budget: 50, setting: 'beach' }],
  ['null setting', { budget: 50, setting: null }]
]) {
  test(`rejects ${name} with readable JSON`, async () => {
    const response = await generate(body);
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, 'string');
  });
}

test('rejects missing body, malformed JSON, primitive JSON, and non-finite JSON numbers', async () => {
  for (const raw of ['', '{', 'null', '50', '{"budget":1e400}']) {
    const response = await generate(raw, true);
    assert.equal(response.status, 400);
    assert.ok((await response.json()).error);
  }
});

test('rejects oversized JSON with 413', async () => {
  const response = await generate({ budget: 50, extra: 'x'.repeat(10000) });
  assert.equal(response.status, 413);
  assert.ok((await response.json()).error);
});

test('rejects unexpected query input and wrong content type', async () => {
  const query = await fetch(`${base}/api/generate?budget=5`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"budget":50}' });
  assert.equal(query.status, 400);
  const text = await fetch(`${base}/api/generate`, { method: 'POST', body: 'budget=50' });
  assert.equal(text.status, 400);
  assert.ok((await text.json()).error);
});

test('unknown routes and unsupported methods return JSON 404', async () => {
  for (const [path, method] of [['/api/unknown', 'GET'], ['/api/generate', 'GET'], ['/api/options', 'POST'], ['/api/health', 'POST']]) {
    const response = await fetch(base + path, { method });
    assert.equal(response.status, 404);
    assert.ok((await response.json()).error);
  }
});

test('moods remain preferences and possibility counts match the full feasible set', async () => {
  for (const mood of ['surprise', 'cozy', 'adventurous', 'romantic', 'competitive']) {
    const response = await generate({ budget: 10000, mood });
    const plan = await response.json();
    assert.equal(response.status, 200);
    assert.equal(plan.mood, mood);
    assert.equal(plan.combinationCount, 24 ** 4);
    assert.equal(typeof plan.title, 'string');
  }
  const free = await (await generate({ budget: 0 })).json();
  const freeCount = planner.categories.reduce((count, category) => count * catalog.filter(option => option.category === category && option.costCents === 0).length, 1);
  assert.equal(free.combinationCount, freeCount);
  const home = await (await generate({ budget: 10000, setting: 'home' })).json();
  const homeCount = planner.categories.reduce((count, category) => count * catalog.filter(option => option.category === category && option.settings.includes('home')).length, 1);
  assert.equal(home.combinationCount, homeCount);
});

test('locks are preserved and a single-category reroll changes only that category', async () => {
  const locked = { dinner: 'dinner-pantry', treat: 'treat-pantry', entertainment: 'entertainment-movie' };
  const previous = ['dinner-pantry', 'activity-games', 'treat-pantry', 'entertainment-movie'];
  const response = await generate({ budget: 50, locked, previous });
  const plan = await response.json();
  assert.equal(response.status, 200);
  for (const pick of plan.picks) if (pick.category !== 'activity') assert.equal(pick.id, locked[pick.category]);
  assert.notEqual(plan.picks[1].id, 'activity-games');
  assert.ok(plan.totalCents <= 5000);
  assert.equal(plan.unchanged, false);
});

test('an exhausted reroll reports unchanged instead of pretending to change the result', async () => {
  const previous = ['dinner-pantry', 'activity-games', 'treat-pantry', 'entertainment-movie'];
  const locked = Object.fromEntries(['dinner', 'activity', 'treat', 'entertainment'].map((category, index) => [category, previous[index]]));
  const response = await generate({ budget: 0, locked, previous });
  const plan = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(plan.picks.map(pick => pick.id), previous);
  assert.equal(plan.unchanged, true);
  assert.equal(plan.combinationCount, 1);
});

test('excluding an entire category and incompatible locks produce useful errors', async () => {
  const excluded = catalog.filter(option => option.category === 'dinner').map(option => option.id);
  const response = await generate({ budget: 50, excluded });
  assert.equal(response.status, 422);
  assert.match((await response.json()).error, /dinner/);
  assert.equal((await generate({ budget: 50, setting: 'outdoor', locked: { dinner: 'dinner-pasta' } })).status, 422);
  assert.equal((await generate({ budget: 0, locked: { dinner: 'dinner-pasta' } })).status, 422);
});

test('custom ideas are validated, included, costed, and kept as a saved-plan snapshot', async () => {
  const categories = ['dinner', 'activity', 'treat', 'entertainment'];
  const customOptions = categories.map((category, index) => ({ id: `custom-${index}`, category, name: `Our ${category}`, costCents: 500, settings: ['home'] }));
  const response = await generate({ budget: 20, setting: 'home', customOptions, excluded: catalog.map(option => option.id) });
  const plan = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(plan.picks.map(pick => pick.id), customOptions.map(option => option.id));
  assert.equal(plan.totalCents, 2000);
  assert.deepEqual(plan.customOptions, customOptions);
  assert.equal(plan.combinationCount, 1);
});

for (const [name, extra] of [
  ['unknown mood', { mood: 'chaotic' }], ['null mood', { mood: null }],
  ['unknown excluded ID', { excluded: ['missing'] }], ['duplicate exclusions', { excluded: ['dinner-pasta', 'dinner-pasta'] }],
  ['wrong exclusion shape', { excluded: {} }], ['unknown lock category', { locked: { other: 'dinner-pasta' } }],
  ['wrong lock category', { locked: { dinner: 'activity-games' } }], ['array locks', { locked: [] }],
  ['invalid previous plan', { previous: ['dinner-pasta'] }], ['wrong previous categories', { previous: ['activity-games', 'dinner-pasta', 'treat-pantry', 'entertainment-movie'] }],
  ['custom not array', { customOptions: {} }], ['malformed custom idea', { customOptions: [{}] }],
  ['too many custom ideas', { customOptions: [{}, {}, {}, {}, {}] }]
]) {
  test(`rejects ${name}`, async () => {
    const response = await generate({ budget: 50, ...extra });
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, 'string');
  });
}

test('rejects tampered custom prices, IDs, settings, names, fields, and duplicates', async () => {
  const valid = { id: 'custom-test', category: 'dinner', name: 'Our favorite spot', costCents: 1000, settings: ['indoor'] };
  for (const change of [{ costCents: -1 }, { costCents: 1.5 }, { costCents: 1000001 }, { id: 'dinner-pasta' },
    { settings: ['any'] }, { settings: [] }, { name: ' ' }, { name: 'x'.repeat(49) }, { extra: true }]) {
    const response = await generate({ budget: 50, customOptions: [{ ...valid, ...change }] });
    assert.equal(response.status, 400);
  }
  assert.equal((await generate({ budget: 50, customOptions: [valid, valid] })).status, 400);
});

test('the maximum UI preferences fit within the bounded request body', async () => {
  const customOptions = ['dinner', 'activity', 'treat', 'entertainment'].map((category, index) => ({ id: `custom-1234567${index}`, category, name: 'x'.repeat(48), costCents: 1000000, settings: ['indoor', 'outdoor', 'home'] }));
  const previous = customOptions.map(option => option.id);
  const body = { budget: 10000, setting: 'any', mood: 'surprise', customOptions, excluded: catalog.map(option => option.id),
    locked: Object.fromEntries(customOptions.map(option => [option.category, option.id])), previous };
  assert.ok(Buffer.byteLength(JSON.stringify(body)) < 4096);
  // Four $10,000 ideas exceed the total budget, but the request itself is valid.
  assert.equal((await generate(body)).status, 422);
});

test('treat mode uses 90–100% of a $1,000 budget without overspending, across settings and moods', async () => {
  for (const setting of planner.settings) {
    for (const mood of planner.moods) {
      const response = await generate({ budget: 1000, setting, mood });
      const plan = await response.json();
      assert.equal(response.status, 200);
      assert.equal(plan.spending, 'treat');
      assert.ok(plan.totalCents >= 90000 && plan.totalCents <= 100000, `${setting}/${mood}: ${plan.totalCents}`);
      assert.ok(plan.picks.every(pick => setting === 'any' || pick.settings.includes(setting)));
    }
  }
});

test('treat mode scales from affordable dates through premium $10,000 occasions', async () => {
  for (const budget of [25, 50, 100, 250, 500, 1000, 2500, 10000]) {
    const response = await generate({ budget, spending: 'treat' });
    const plan = await response.json();
    assert.equal(response.status, 200);
    assert.ok(plan.totalCents >= budget * 90 && plan.totalCents <= budget * 100);
    assert.equal(plan.remainingCents, budget * 100 - plan.totalCents);
  }
});

test('flexible mode still includes inexpensive choices and treat mode prefers near-budget choices', () => {
  const flexible = planner.prepare({ budget: 1000, spending: 'flexible' }, catalog);
  const treat = planner.prepare({ budget: 1000, spending: 'treat' }, catalog);
  assert.equal(flexible.combinationCount, treat.combinationCount);
  assert.ok(flexible.plans.some(picks => picks.reduce((sum, pick) => sum + pick.costCents, 0) === 0));
  assert.ok(treat.plans.every(picks => picks.reduce((sum, pick) => sum + pick.costCents, 0) >= 90000));
  assert.ok(flexible.plans.length > treat.plans.length);
});

test('when constraints cannot spend the budget, treat mode aims near the attainable maximum', async () => {
  const locked = { dinner: 'dinner-pantry', treat: 'treat-pantry', entertainment: 'entertainment-movie' };
  const response = await generate({ budget: 1000, setting: 'home', locked });
  const plan = await response.json();
  assert.equal(response.status, 200);
  assert.equal(plan.maximumCents, 50000);
  assert.ok(plan.totalCents >= 47500 && plan.totalCents <= 50000);
  assert.ok(plan.totalCents < plan.budgetCents * .9);
  for (const pick of plan.picks) if (pick.category !== 'activity') assert.equal(pick.id, locked[pick.category]);
});

test('preview counts match full selection without retaining every combination', () => {
  for (const body of [{ budget: 0 }, { budget: 1000 }, { budget: 10000, spending: 'flexible' },
    { budget: 1000, locked: { dinner: 'dinner-pantry' } },
    { budget: 0, locked: { dinner: 'dinner-pantry', activity: 'activity-games', treat: 'treat-pantry', entertainment: 'entertainment-movie' }, previous: ['dinner-pantry', 'activity-games', 'treat-pantry', 'entertainment-movie'] }]) {
    const full = planner.prepare(body, catalog);
    const preview = planner.prepare(body, catalog, false);
    assert.equal(full.combinationCount, preview.combinationCount);
    assert.equal(full.maximumCents, preview.maximumCents);
    assert.deepEqual(preview.plans, []);
  }
});

test('unknown, null, and wrongly typed spending modes are rejected', async () => {
  for (const spending of ['spend-it-all', null, true, []]) assert.equal((await generate({ budget: 1000, spending })).status, 400);
});

test('near-budget rerolls preserve other picks and return an honest attainable maximum', async () => {
  const first = await (await generate({ budget: 1000 })).json();
  const locked = Object.fromEntries(first.picks.filter(pick => pick.category !== 'activity').map(pick => [pick.category, pick.id]));
  const response = await generate({ budget: 1000, locked, previous: first.picks.map(pick => pick.id) });
  const second = await response.json();
  assert.equal(response.status, 200);
  for (const pick of second.picks) if (pick.category !== 'activity') assert.equal(pick.id, locked[pick.category]);
  assert.ok(second.totalCents <= 100000);
  const expectedTarget = second.maximumCents >= 90000 ? 90000 : Math.ceil(second.maximumCents * .95);
  assert.equal(second.targetCents, expectedTarget);
  assert.ok(second.totalCents >= expectedTarget);
  assert.ok(second.picks[1].id !== first.picks[1].id || second.unchanged);
});

test('an attainable 90% target takes priority over the fallback band near the maximum', () => {
  const fixture = [
    { id: 'd', category: 'dinner', costCents: 8800, settings: ['home'] },
    { id: 'a-free', category: 'activity', costCents: 0, settings: ['home'] },
    { id: 'a-upgrade', category: 'activity', costCents: 400, settings: ['home'] },
    { id: 't', category: 'treat', costCents: 0, settings: ['home'] },
    { id: 'e', category: 'entertainment', costCents: 0, settings: ['home'] }
  ];
  const prepared = planner.prepare({ budget: 100 }, fixture);
  assert.equal(prepared.maximumCents, 9200);
  assert.equal(prepared.targetCents, 9000);
  assert.equal(prepared.plans.length, 1);
  assert.equal(prepared.plans[0].reduce((sum, pick) => sum + pick.costCents, 0), 9200);
});

test('local catalog has official price provenance and transparent arithmetic for every NJ stop', () => {
  assert.equal(localCatalog.length,209);
  assert.equal(new Set(localCatalog.map(option=>option.venue.id)).size,107);
  for (const option of localCatalog) {
    const {pricing:p,venue:v}=option;
    assert.equal(v.state,'NJ');
    assert.equal(v.area,'paterson');
    assert.ok(v.address.includes('NJ'));
    assert.ok(p.sourceUrl.startsWith('https://'));
    assert.equal(p.checkedOn,'2026-11-19');
    assert.equal(option.costCents,p.baseCents+p.taxCents+p.tipCents+p.donationCents);
    assert.ok(p.order.length && p.exclusions.length && v.hoursNote.length);
    assert.ok(v.openDays.every(day=>Number.isInteger(day)&&day>=0&&day<=6));
  }
  assert.equal(localCatalog.find(option=>option.id==='nj-neo-panini').costCents,3799);
  assert.equal(localCatalog.find(option=>option.id==='nj-sook-sandwich').pricing.baseCents,2400);
  assert.equal(localCatalog.find(option=>option.id==='nj-sook-chocolate').pricing.baseCents,870);
  assert.equal(localCatalog.find(option=>option.id==='nj-saddle-splurge').pricing.baseCents,11800*2+33000+4500*2);
});

test('local generation uses only NJ venues and respects regular opening weekdays', async () => {
  for (const date of ['2026-11-19','2026-11-20','2026-11-21']) {
    const response=await generate({budget:200,area:'paterson',date});
    const plan=await response.json();
    assert.equal(response.status,200);
    assert.equal(plan.area,'paterson');
    assert.equal(plan.date,date);
    assert.ok(plan.picks.every(pick=>pick.venue?.state==='NJ' && pick.venue.openDays.includes(new Date(`${date}T12:00:00Z`).getUTCDay())));
    assert.ok(plan.totalCents<=20000);
  }
});

test('local $1,000 treat-us dates use sourced menu items without inflating their prices', async () => {
  for (const date of ['2026-11-19','2026-11-20','2026-11-21']) {
    const response=await generate({budget:1000,area:'paterson',date,setting:'indoor'});
    const plan=await response.json();
    assert.equal(response.status,200);
    assert.ok(plan.totalCents>=90000 && plan.totalCents<=100000);
    for (const pick of plan.picks) assert.equal(pick.costCents,localCatalog.find(option=>option.id===pick.id).costCents);
  }
});

test('known closed days and unavailable local home plans are rejected honestly', async () => {
  assert.equal((await generate({budget:100,area:'paterson',date:'2026-11-19',locked:{activity:'nj-mam'}})).status,422);
  assert.equal((await generate({budget:100,area:'paterson',date:'2026-11-21',locked:{entertainment:'nj-paterson-museum'}})).status,422);
  assert.equal((await generate({budget:1000,area:'paterson',date:'2026-11-23',locked:{dinner:'nj-saddle-splurge'}})).status,422);
  assert.equal((await generate({budget:100,area:'paterson',setting:'home'})).status,422);
  const response=await generate({budget:100,area:'general',setting:'home'});
  assert.equal(response.status,200);
  assert.ok((await response.json()).picks.every(pick=>!pick.venue));
});

test('wrong area types and malformed calendar dates are rejected', async () => {
  for (const area of ['NYC',null,[]]) assert.equal((await generate({budget:100,area})).status,400);
  for (const date of [null,42,'tomorrow','2026-02-30','2026-13-01','2026-1-1']) assert.equal((await generate({budget:100,date})).status,400);
  assert.equal((await generate({budget:100,date:'2028-02-29'})).status,200);
});

test('all catalog exclusions and custom Unicode names fit within the bounded body', async () => {
  const customOptions=planner.categories.map((category,index)=>({id:`custom-1234567${index}`,category,name:'語'.repeat(48),costCents:0,settings:['indoor','home','outdoor']}));
  const body={budget:0,area:'paterson',date:'2026-11-20',customOptions,excluded:[...catalog,...localCatalog].map(option=>option.id),
    locked:Object.fromEntries(customOptions.map(option=>[option.category,option.id])),previous:customOptions.map(option=>option.id)};
  assert.ok(Buffer.byteLength(JSON.stringify(body))<8192);
  const response=await generate(body);
  assert.equal(response.status,200);
  assert.equal((await response.json()).totalCents,0);
});

test('the locally served PDF library is available without a third-party CDN', async () => {
  const response=await fetch(`${base}/vendor/jspdf.umd.min.js`);
  assert.equal(response.status,200);
  assert.ok((await response.text()).includes('jsPDF'));
});
