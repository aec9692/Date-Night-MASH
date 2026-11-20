const express = require('express');
const path = require('node:path');
const { randomInt } = require('node:crypto');
const costs = require('./public/date-costs');
const guides = require('./data/home-guides.json');
const options = [...require('./data/options.json'), ...require('./data/local-options.json'), ...require('./data/home-options.json'), ...require('./data/outing-options.json')].map(costs.enrich).map(option=>guides[option.id]?{...option,guide:guides[option.id]}:option);
const { curatedNearby } = require('./lib/curated-nearby');
const { createLocationSearch, LocationSearchError } = require('./lib/location-search');
const locationIndex = require('./data/location-index.json');
const locationSearch = createLocationSearch({localLocations:locationIndex.locations});
const planner = require('./public/planner');
const invite = require('./public/date-invite');
const vote = require('./public/date-vote');
const routes = require('./public/date-route');
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
  res.json({ categories, settings, moods, spendingModes, areas, options, towns:townData, locations:locationIndex.locations.map(({name,lat,lon,postcodes})=>({name,lat,lon,postcodes})), media, unpricedPlaces:require('./data/thrift-places.json'), currency: 'USD', priceBasis: 'All totals are for two. Source-linked NJ orders retain posted prices and allowances. Home and general ideas are illustrative shopping allowances, not store quotes. Owned supplies are explicit; shared baskets count once.' });
});

app.get('/api/locations', async (req,res,next)=>{
  try {
    if(Object.keys(req.query).some(key=>key!=='q'))return res.status(400).json({error:'Search using a city/state or ZIP in q only.'});
    res.json(await locationSearch.geocode(req.query.q));
  } catch(error){if(error instanceof LocationSearchError)return res.status(error.status).json({error:error.message});next(error);}
});
app.get('/api/nearby-curated',(req,res)=>{
  if(Object.keys(req.query).some(key=>!['lat','lon','radius','kind'].includes(key))||['lat','lon','radius'].some(key=>typeof req.query[key]!=='string'||!req.query[key].trim())||req.query.kind!==undefined&&typeof req.query.kind!=='string')return res.status(400).json({error:'Choose a city center, radius and category.'});
  try{res.json(curatedNearby(options,townData,{lat:Number(req.query.lat),lon:Number(req.query.lon),radius:Number(req.query.radius),kind:req.query.kind||'all'}));}catch(error){res.status(400).json({error:error.message});}
});
app.get('/api/nearby', async (req,res,next)=>{
  try {
    if(Object.keys(req.query).some(key=>!['lat','lon','radius','kind'].includes(key))||['lat','lon','radius'].some(key=>typeof req.query[key]!=='string'||!req.query[key].trim())||req.query.kind!==undefined&&typeof req.query.kind!=='string')return res.status(400).json({error:'Choose coordinates, a radius and a documented place category.'});
    res.json(await locationSearch.nearby({lat:Number(req.query.lat),lon:Number(req.query.lon),radius:Number(req.query.radius),kind:req.query.kind||'all'}));
  } catch(error){if(error instanceof LocationSearchError)return res.status(error.status).json({error:error.message});next(error);}
});

app.use('/api', express.json({ limit: '32kb' }));

function restoreInvite(token){
  let snapshot,preferences;
  try{snapshot=invite.decode(token);preferences=invite.preferences(snapshot);}catch(error){error.status=400;throw error;}
  if(snapshot.when)preferences.date=snapshot.when.date;
  const prepared=planner.prepare(preferences,options,false,()=>0);
  if(prepared.error){const error=new Error('This shared date no longer fits: '+prepared.error);error.status=prepared.status;throw error;}
  if(snapshot.when&&prepared.journey&&(snapshot.when.timeZone!=='America/New_York'||snapshot.when.start!==prepared.selectedSchedule.start||snapshot.when.end!==prepared.selectedSchedule.end)){const error=Error('Timed calendar drafts must keep the itinerary times in America/New_York.');error.status=400;throw error;}
  return {plan:planResult(prepared),when:snapshot.when||null,proposal:snapshot.proposal||''};
}
app.post('/api/restore',(req,res,next)=>{
  if(!req.is('application/json')||Object.keys(req.query).length||!req.body||Array.isArray(req.body)||Object.keys(req.body).some(key=>key!=='token')||typeof req.body.token!=='string')return res.status(400).json({error:'Send only a shared-date token as JSON.'});
  try{res.json(restoreInvite(req.body.token));}catch(error){if([400,422].includes(error.status))return res.status(error.status).json({error:error.message});next(error);}
});
app.get('/api/calendar',(req,res,next)=>{
  if(Object.keys(req.query).some(key=>key!=='token')||typeof req.query.token!=='string')return res.status(400).json({error:'Choose a valid calendar draft.'});
  try{
    const restored=restoreInvite(req.query.token);
    if(!restored.when)return res.status(400).json({error:'Choose a date and start/end times before opening your calendar.'});
    res.set({'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="date-night-mash.ics"','X-Content-Type-Options':'nosniff'});
    res.send(invite.ics(restored.plan,restored.when));
  }catch(error){if([400,422].includes(error.status))return res.status(error.status).json({error:error.message});next(error);}
});

function planResult(prepared) {
  const priced = costs.resolve(prepared.selectedPicks,prepared.pantry||[]);
  const {picks,totalCents} = priced;
  const reserveCents=prepared.reserveCents||0;
  return { picks, setting: prepared.setting, mood: prepared.mood, title: planner.title(prepared.mood, picks),
    budgetCents: prepared.budgetCents, totalCents, remainingCents: prepared.budgetCents - totalCents - reserveCents,
    reserve:prepared.reserve||{parking:0,transport:0,extras:0},reserveCents,planningBudgetCents:prepared.planningBudgetCents??prepared.budgetCents,plannedTotalCents:totalCents+reserveCents,
    combinationCount: prepared.combinationCount, unchanged: prepared.unchanged, customOptions: prepared.customOptions,
    spending: prepared.spending, maximumCents: prepared.maximumCents, targetCents: prepared.targetCents,
    area: prepared.area, date: prepared.date,
    ...(prepared.journey ? {journey:prepared.journey,schedule:prepared.selectedSchedule} : {}),
    ...(prepared.mash ? {mash:prepared.mash} : {}),
    pantry:prepared.pantry||[], fit:prepared.fit,settingLabel:costs.settingLabel(picks,prepared.setting),
    ...(prepared.location?{location:prepared.location}:{}),
    shoppingList:priced.shoppingList,ownedSavingsCents:priced.ownedSavingsCents,sharedSavingsCents:priced.sharedSavingsCents,recentExhausted:Boolean(prepared.recentExhausted),
    route:routes.analyze({picks,journey:prepared.journey,mash:prepared.mash,location:prepared.location}),
    notice: 'Budget includes the displayed picks and any reserve you entered. Confirm actual prices, fees, travel, parking, hours and availability. Estimates are for two, not bookings; suggested timing and town-center distances do not verify traffic.' };
}

// Every link is revalidated against canonical prices and restrictions. No ballots are stored here.
app.post('/api/compare/restore',(req,res,next)=>{
  try{
    if(!req.is('application/json')||Object.keys(req.query).length||!req.body||Array.isArray(req.body)||Object.keys(req.body).some(k=>k!=='token'))return res.status(400).json({error:'Send only a vote token as JSON.'});
    let ballot;try{ballot=vote.decode(req.body.token);}catch(error){error.status=400;throw error;}
    const plans=ballot.plans.map(token=>restoreInvite(token).plan);
    if(new Set(plans.map(vote.identity)).size!==3)return res.status(422).json({error:'These plans no longer offer three different choices. Ask for a new vote.'});
    res.json({plans});
  }catch(error){if([400,422].includes(error.status))return res.status(error.status).json({error:error.message});next(error);}
});
function changeRequest(req,res){
  if(!req.is('application/json')||Object.keys(req.query).length||!req.body||Array.isArray(req.body)||Object.keys(req.body).some(k=>!['token','category','excluded','taste','locked'].includes(k))||typeof req.body.token!=='string'){
    res.status(400).json({error:'Send a plan token and documented change preferences as JSON.'});return null;
  }
  try{return invite.preferences(invite.decode(req.body.token));}catch(error){error.status=400;throw error;}
}
app.post('/api/backup',(req,res,next)=>{
  try{
    const prefs=changeRequest(req,res);if(!prefs)return;
    if(req.body.locked!==undefined)return res.status(400).json({error:'Backup locks come from the original plan.'});
    const original=restoreInvite(req.body.token).plan,category=req.body.category,pick=original.picks.find(p=>p.category===category);
    if(!pick||!pick.settings.includes('outdoor')||pick.home)return res.status(400).json({error:'Choose an outdoor stop from this date to replace.'});
    const custom=planner.customCatalog(prefs.customOptions),all=[...options,...custom];
    const excluded=req.body.excluded===undefined?[]:req.body.excluded;
    if(!Array.isArray(excluded)||excluded.length>all.length||new Set(excluded).size!==excluded.length||excluded.some(id=>!all.some(o=>o.id===id)))return res.status(400).json({error:'Excluded ideas must be unique current idea IDs.'});
    prefs.excluded=[...new Set([...excluded,pick.id,...all.filter(o=>o.category===category&&(!o.settings.includes('indoor')||o.settings.includes('home'))).map(o=>o.id)])];
    delete prefs.locked[category];prefs.setting='any';prefs.spending='flexible';prefs.taste=req.body.taste;
    const prepared=planner.prepare(prefs,options,false,randomInt);
    if(prepared.error)return res.status(prepared.status).json({error:'No indoor backup could be selected while keeping your other stops and reserve. '+prepared.error});
    res.json(planResult(prepared));
  }catch(error){if([400,422].includes(error.status))return res.status(error.status).json({error:error.message});next(error);}
});
app.post('/api/compare',(req,res,next)=>{
  try{
    const prefs=changeRequest(req,res);if(!prefs)return;
    if(req.body.category!==undefined)return res.status(400).json({error:'A comparison does not accept a category.'});
    const original=restoreInvite(req.body.token).plan;
    prefs.locked=req.body.locked===undefined?{}:req.body.locked;prefs.excluded=req.body.excluded===undefined?[]:req.body.excluded;prefs.taste=req.body.taste;
    // Validate all preferences before counting. Explicit user locks remain in place.
    const checked=planner.prepare(prefs,options,false);if(checked.error)return res.status(checked.status).json({error:checked.error});
    if(original.picks.some(p=>prefs.excluded.includes(p.id)||prefs.locked[p.category]&&prefs.locked[p.category]!==p.id))return res.status(422).json({error:'The current date no longer matches your locks or hidden ideas. Generate a fresh date before comparing.'});
    const plans=[original],identities=new Set([vote.identity(original)]);
    for(let attempt=0;attempt<6&&plans.length<3;attempt++){
      prefs.previous=plans.at(-1).picks.map(p=>p.id);if(!prefs.journey)prefs.recent=plans.map(p=>p.picks.map(o=>o.id));
      const prepared=planner.prepare(prefs,options,false,randomInt);if(prepared.error)break;
      const plan=planResult(prepared),identity=vote.identity(plan);if(!identities.has(identity)){identities.add(identity);plans.push(plan);}
    }
    if(plans.length!==3)return res.status(422).json({error:'Could not find three different dates in this mix. Include more ideas, unlock a pick or use Flexible spending, then try again.'});
    res.json({plans});
  }catch(error){if([400,422].includes(error.status))return res.status(error.status).json({error:error.message});next(error);}
});

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
  res.json(planResult(prepared));
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
