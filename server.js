const express = require('express');
const path = require('node:path');
const { randomInt } = require('node:crypto');
const options = require('./data/options.json');
const categories = ['dinner', 'activity', 'treat', 'entertainment'];
const settings = ['any', 'indoor', 'outdoor', 'home'];

const app = express();
app.disable('x-powered-by');

// A small, read-only route for checking that the deployed server responds.
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'ok', app: 'Date Night MASH' });
});

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/api/options', (req, res) => {
  if (Object.keys(req.query).length) {
    return res.status(400).json({ error: 'This route does not accept query parameters.' });
  }
  res.json({ categories, settings, options, currency: 'USD', priceBasis: 'Estimates for two people' });
});

app.use('/api', express.json({ limit: '2kb' }));

app.post('/api/generate', (req, res) => {
  if (!req.is('application/json')) {
    return res.status(400).json({ error: 'Send a JSON request with Content-Type application/json.' });
  }
  const body = req.body;
  if (!body || Array.isArray(body) || typeof body !== 'object' ||
      Object.keys(req.query).length || Object.keys(body).some(key => !['budget', 'setting'].includes(key))) {
    return res.status(400).json({ error: 'Send only a budget and an optional setting.' });
  }
  const { budget, setting = 'any' } = body;
  if (typeof budget !== 'number' || !Number.isFinite(budget) || budget < 0 || budget > 10000 ||
      budget !== Number(budget.toFixed(2))) {
    return res.status(400).json({ error: 'Enter a budget from $0 to $10,000 with at most two decimal places.' });
  }
  if (!settings.includes(setting)) {
    return res.status(400).json({ error: 'Choose any, indoor, outdoor, or home.' });
  }
  const budgetCents = Math.round(budget * 100);
  const groups = categories.map(category => options.filter(option =>
    option.category === category && (setting === 'any' || option.settings.includes(setting))));
  if (groups.some(group => group.length === 0)) {
    return res.status(422).json({ error: 'There is no complete plan for that setting. Try another setting.' });
  }
  const minimumCents = groups.reduce((sum, group) => sum + Math.min(...group.map(option => option.costCents)), 0);
  if (budgetCents < minimumCents) {
    return res.status(422).json({
      error: `A complete plan for this setting needs at least $${(minimumCents / 100).toFixed(2)}. Increase your budget or change the setting.`,
      minimumCents
    });
  }
  // The small catalog has at most 6^4 combinations. Enumerate once, then choose fairly.
  let combinations = [[]];
  for (const group of groups) {
    combinations = combinations.flatMap(picks => group.map(option => [...picks, option]));
  }
  const affordable = combinations.filter(picks => picks.reduce((sum, option) => sum + option.costCents, 0) <= budgetCents);
  const picks = affordable[randomInt(affordable.length)];
  const totalCents = picks.reduce((sum, option) => sum + option.costCents, 0);
  res.json({ picks, setting, budgetCents, totalCents, remainingCents: budgetCents - totalCents,
    notice: 'USD estimates for two people. Prices vary by location. Free ideas use items or access you already have.' });
});

// Local development serves the same public files Vercel serves through its CDN.
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request is too large. Keep it under 2 KB.' });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request contains malformed JSON.' });
  }
  if (error.status >= 400 && error.status < 500) {
    return res.status(400).json({ error: 'The request could not be read. Send valid JSON.' });
  }
  console.error(error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

// Exporting the app lets Vercel run it as a function without starting a local listener.
module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Date Night MASH is running at http://localhost:${port}`);
  });
}
