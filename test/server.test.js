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
