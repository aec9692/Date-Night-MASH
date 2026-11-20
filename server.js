const express = require('express');
const path = require('node:path');
const { randomInt } = require('node:crypto');
const options = [...require('./data/options.json'), ...require('./data/local-options.json')];
const planner = require('./public/planner');
const journey = require('./public/journey');
const townData = require('./data/towns.json');
const media = require('./data/place-media.json');
journey.setTowns(townData);
const { categories, settings, moods, spendingModes, areas } = planner;

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
  res.json({ categories, settings, moods, spendingModes, areas, options, towns:townData, media, currency: 'USD', priceBasis: 'Local entries cite posted prices and planning allowances; original ideas are illustrative estimates.' });
});

app.use('/api', express.json({ limit: '8kb' }));

app.post('/api/generate', (req, res) => {
  if (!req.is('application/json')) {
    return res.status(400).json({ error: 'Send a JSON request with Content-Type application/json.' });
  }
  if (Object.keys(req.query).length) return res.status(400).json({ error: 'Send preferences in the JSON body, not query parameters.' });
  const prepared = planner.prepare(req.body, options, false, randomInt);
  if (prepared.error) {
    const { error, minimumCents } = prepared;
    return res.status(prepared.status).json({ error, ...(minimumCents === undefined ? {} : { minimumCents }) });
  }
  // Count weighted candidates, draw once, then find the winner without retaining every plan.
  const picks = prepared.selectedPicks;
  const totalCents = picks.reduce((sum, option) => sum + option.costCents, 0);
  res.json({ picks, setting: prepared.setting, mood: prepared.mood, title: planner.title(prepared.mood, picks),
    budgetCents: prepared.budgetCents, totalCents, remainingCents: prepared.budgetCents - totalCents,
    combinationCount: prepared.combinationCount, unchanged: prepared.unchanged, customOptions: prepared.customOptions,
    spending: prepared.spending, maximumCents: prepared.maximumCents, targetCents: prepared.targetCents,
    area: prepared.area, date: prepared.date,
    ...(prepared.journey ? {journey:prepared.journey,schedule:prepared.selectedSchedule} : {}),
    ...(prepared.mash ? {mash:prepared.mash} : {}),
    notice: 'Estimates for two, not booking quotes. Check full costs, hours, reservations and age/guardian rules. Travel and parking are extra. Suggested timing and town-center distances do not verify traffic, showtimes or availability.' });
});

// Local development serves the same public files Vercel serves through its CDN.
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request is too large. Keep it under 8 KB.' });
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
