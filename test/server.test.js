const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const app = require('../server');
const catalog = require('../data/options.json');
let server;
let base;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

async function generate(body, raw = false) {
  return fetch(`${base}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ? body : JSON.stringify(body) });
}

test('health and static assets are available', async () => {
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok', app: 'Date Night MASH' });
  assert.equal(health.headers.get('cache-control'), 'no-store');
  for (const [path, type] of [['/', 'text/html'], ['/styles.css', 'text/css'], ['/app.js', 'javascript']]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type').includes(type));
  }
});

test('catalog contains unique IDs, four categories, integer prices, and documented tags', async () => {
  const response = await fetch(`${base}/api/options`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.options.length, 24);
  assert.equal(new Set(data.options.map(option => option.id)).size, 24);
  for (const category of data.categories) assert.equal(data.options.filter(option => option.category === category).length, 6);
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
  const response = await generate({ budget: 50, extra: 'x'.repeat(3000) });
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
    assert.equal(plan.combinationCount, 1296);
    assert.equal(typeof plan.title, 'string');
  }
  const free = await (await generate({ budget: 0 })).json();
  assert.equal(free.combinationCount, 15);
  const home = await (await generate({ budget: 10000, setting: 'home' })).json();
  assert.equal(home.combinationCount, 36);
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
  assert.ok(Buffer.byteLength(JSON.stringify(body)) < 2048);
  // Four $10,000 ideas exceed the total budget, but the request itself is valid.
  assert.equal((await generate(body)).status, 422);
});
