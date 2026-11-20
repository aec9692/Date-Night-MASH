const express = require('express');
const path = require('node:path');
const { randomInt } = require('node:crypto');
const costs = require('./public/date-costs');
const options = [...require('./data/options.json'), ...require('./data/local-options.json'), ...require('./data/home-options.json'), ...require('./data/outing-options.json')].map(costs.enrich);
const { createLocationSearch, LocationSearchError } = require('./lib/location-search');
const locationSearch = createLocationSearch();
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
  res.json({ categories, settings, moods, spendingModes, areas, options, towns:townData, media, unpricedPlaces:require('./data/thrift-places.json'), currency: 'USD', priceBasis: 'All totals are for two. Source-linked NJ orders retain posted prices and allowances. Home and general ideas are illustrative shopping allowances, not store quotes. Owned supplies are explicit; shared baskets count once.' });
});

app.get('/api/locations', async (req,res,next)=>{
  try {
    if(Object.keys(req.query).some(key=>key!=='q'))return res.status(400).json({error:'Search using a city/state or ZIP in q only.'});
    res.json(await locationSearch.geocode(req.query.q));
  } catch(error){if(error instanceof LocationSearchError)return res.status(error.status).json({error:error.message});next(error);}
});
app.get('/api/nearby', async (req,res,next)=>{
  try {
    if(Object.keys(req.query).some(key=>!['lat','lon','radius','kind'].includes(key))||['lat','lon','radius'].some(key=>typeof req.query[key]!=='string'||!req.query[key].trim())||req.query.kind!==undefined&&typeof req.query.kind!=='string')return res.status(400).json({error:'Choose coordinates, a radius and a documented place category.'});
    res.json(await locationSearch.nearby({lat:Number(req.query.lat),lon:Number(req.query.lon),radius:Number(req.query.radius),kind:req.query.kind||'all'}));
  } catch(error){if(error instanceof LocationSearchError)return res.status(error.status).json({error:error.message});next(error);}
});

app.use('/api', express.json({ limit: '32kb' }));

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
  const priced = costs.resolve(prepared.selectedPicks,prepared.pantry||[]);
  const {picks,totalCents} = priced;
  res.json({ picks, setting: prepared.setting, mood: prepared.mood, title: planner.title(prepared.mood, picks),
    budgetCents: prepared.budgetCents, totalCents, remainingCents: prepared.budgetCents - totalCents,
    combinationCount: prepared.combinationCount, unchanged: prepared.unchanged, customOptions: prepared.customOptions,
    spending: prepared.spending, maximumCents: prepared.maximumCents, targetCents: prepared.targetCents,
    area: prepared.area, date: prepared.date,
    ...(prepared.journey ? {journey:prepared.journey,schedule:prepared.selectedSchedule} : {}),
    ...(prepared.mash ? {mash:prepared.mash} : {}),
    pantry:prepared.pantry||[], settingLabel:costs.settingLabel(picks,prepared.setting),
    ...(prepared.location?{location:prepared.location}:{}),
    shoppingList:priced.shoppingList,ownedSavingsCents:priced.ownedSavingsCents,sharedSavingsCents:priced.sharedSavingsCents,recentExhausted:Boolean(prepared.recentExhausted),
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
    return res.status(413).json({ error: 'Request is too large. Keep it under 32 KB.' });
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
