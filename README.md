# Date-Night-MASH
Date Night MASH helps couples create a random date plan by choosing dinner, an activity, a treat, and entertainment within their budget.

Group members: Adrainn Coloma, Andrew Russo, Alex Marshall.

Repository: https://github.com/aec9692/Date-Night-MASH. Public Vercel URL: **pending**. Group demo: **pending**.

Submission readiness: [RUBRIC_CHECKLIST.md](RUBRIC_CHECKLIST.md). Three designated advanced features follow the proposed ownership: persistent favorites (Adrainn), server-enforced setting filters (Andrew), and PDF/text downloads (Alex). Confirm actual contributions and instructor acceptance; extras are supplementary. Public deployment, executed deployed tests, screenshots, video and individual reports remain incomplete. See [DEPLOYED_ACCEPTANCE.md](DEPLOYED_ACCEPTANCE.md) and [SUBMISSION_GUIDE.md](SUBMISSION_GUIDE.md).

## Current version

The first MASH plan starts with budget, starting area and date, followed immediately by Play MASH. More options contains setting, audience, radius, spending and reserves, with active settings summarized while collapsed. Food, owned supplies and saved preferences remain available separately; city/ZIP lookup is beside the visible town selector.

Results lead with the planned total, any reserve, a concise estimate/travel/booking notice, and the four selected cards. Each card shows its exact budgeted point estimate for two and whether it is a source-priced example, home/general allowance or personal estimate. Price/source evidence and instructions expand on demand. Route/departure checks, shopping, timing, downloads/calendar and partner choices are grouped below. Closing a section does not remove filters or alter server selection. Hidden invalid fields open before native validation; over-budget reserves reveal their controls. Phone visual/deployed verification remains pending.

Expanded sections keep their full content in labeled blocks: price breakdown, order/admission example, tax/tip assumptions, opening/booking notes, exclusions and source check. Recipes retain all ingredients, quantities and instructions in separate sections; route and shopping details use the same treatment. Price amounts use definition-list rows and optional preferences use small field cards. Blocks stack at phone widths without clipping text or introducing nested scrolling. Existing links, checkboxes, inputs and export data remain intact.

Play MASH is its own four-pick game: enter a total budget for two and draw one dinner, activity, treat and entertainment choice. The default is a flexible $50 draw from local and general ideas for high-school ages 13–17, with a Paterson-area 10-mile town-center radius. Set the scene is a separate custom planner for quick, evening or full-day itineraries, start time and preferences.

The local collection has 209 examples: 50 dinner, 54 activity, 50 treat and 55 entertainment, across 107 venue/route identifiers in 43 towns. All 96 original ideas remain. Another 246 home ideas and 138 general outings bring the total to 689 ideas. Discovery presents places with sample price ranges, addresses and details; checked dishes and ticket bundles remain the evidence for budget arithmetic. Favorites, PDF/text exports, shared-phone preferences and offline saved-date support remain available.

Local entries cite posted prices checked November 19, 2026; [DATA_SOURCES.md](DATA_SOURCES.md) records the evidence and assumptions. Each result separates the posted subtotal from estimated tax, optional tip/donation allowances, and excluded costs. Original ideas remain illustrative estimates. Neither is a live booking quote. Travel, parking, extra orders, unconfirmed fees, schedules, and availability need checking before a visit.

Deployed application URL: pending Vercel import and verification.

## Run locally

Install Node.js 24 LTS, then run:

```bash
npm ci
npm start
```

Open http://localhost:3000, choose a date, budget and setting, then click Play MASH for four picks. Set the scene separately offers timed quick/evening/full plans. Use `npm run dev` to restart after server changes. No environment variables or API keys are required; `PORT` is optional and defaults to 3000. Run `npm test` for automated checks. Deployed manual checks are tracked separately in TESTING.md and DEPLOYED_ACCEPTANCE.md.

## How it works

`public/app.js` loads the combined catalog from the Express server and sends preferences to `POST /api/generate` in `server.js`. The server validates JSON and filters `data/options.json` (original ideas) and `data/local-options.json` (source-linked NJ places). Timed requests use `public/journey.js` to check complete dates against numeric scheduling, distance, budget and venue rules; four-pick requests use sorted pairs grouped by shared supplies and conflicts. New home/outing ideas are in data/home-options.json and data/outing-options.json. Prices are stored and compared as integer cents.

`public/planner.js` shares validation and enumeration rules between the client (for live possibility counts) and server (for authoritative selection). `public/show.js` handles the skippable/reduced-motion reveal and opt-in sound. `public/download.js` uses jsPDF to generate a phone-size PDF: one overview plus readable detail pages per selected stop, continuing long instructions onto another page, with clickable official-price/map links. A plain-text version remains available. `npm ci` runs `scripts/prepare-assets.js` to copy the pinned PDF library and its MIT license into ignored `public/vendor/`; there is no runtime CDN dependency or document upload.

The Share PDF button appears when the browser exposes native sharing and falls back to downloading if PDF file sharing is unavailable. This normally needs a secure deployed URL on a real phone. PDF text uses standard Latin fonts with normalized accents; Text version preserves Unicode. Real iPhone/Android sharing still needs device testing. This is a responsive web app, not a native App Store package or submission.

Local coverage is a North Jersey shortlist intended for trips of roughly an hour or less from Paterson in ordinary traffic, not a measured travel-time radius. Maps resolves device origin by default; a starting-town fallback is optional. The app does not request a home address or device GPS. Traffic can exceed an hour, and the four-stop route can take longer. Date filtering checks known regular weekdays and recorded closure dates/ranges; it does not verify unrecorded holiday closures, actual showtimes, reservation availability, or a feasible timed itinerary. Some local settings/budgets/dates cannot produce four stops; switch to original/mixed ideas or adjust preferences rather than inventing prices.

The slider covers $0–$1,000, with quick budget buttons; direct typing supports up to $10,000. MASH defaults to Flexible. Optional Treat us chooses totals at 90–100% of budget when available. If the current constraints cannot get that high, it chooses within the top 5% of the highest attainable total and explains the limit. Flexible keeps every affordable total in the mix. Mood weights candidates within the chosen spending style; it never overrides budget or other constraints. Changes to the setting clear existing locks. A single-category reroll fixes the other three picks and checks the entire budget again. When there is no different valid plan, the server returns the same result with `unchanged: true`, and the interface explains how to open up more choices. Previous plans are excluded before computing the attainable maximum when a different plan is available.

Search, town/category browsing, and Free/Under $15/Under $30/Under $50 price filters help explore the larger decks; they only change what is visible. Inclusion/exclusion remains an explicit idea toggle. The displayed affordable count includes all feasible totals, while Treat us selects from the near-budget subset. Preview counts and weighted server draws use sorted category pairs and binary searches, without retaining complete candidate plans. Pair storage grows with two category sizes rather than all four; this keeps the 305-option mixed deck manageable. The browser builds reveal candidates as affordable replacements within the selected plan, avoiding a second bulk enumeration.

| Route | Input | Response |
| --- | --- | --- |
| GET /api/health | None | Application name and status |
| GET /api/locations | Public town/ZIP query q | Validated geocoding choices; local NJ lookup before optional free provider |
| GET /api/nearby-curated | lat, lon, radius, kind | Source-priced NJ ideas near planning center |
| GET /api/nearby | lat, lon, radius, kind | Community listings with unknown prices or readable provider failure |
| POST /api/restore | Shared-plan token | Canonically revalidated plan |
| GET /api/calendar | Calendar draft token | Validated .ics draft; user imports/saves |
| POST /api/backup | Plan token, category; optional excluded/taste | Indoor replacement retaining other picks and reserve, or helpful error |
| POST /api/compare | Plan token; optional locked/excluded/taste | Three distinct affordable alternatives or helpful error |
| POST /api/compare/restore | Vote token | Three canonically revalidated candidate plans; no server tally |
| GET /api/options | None; query parameters rejected | Categories, settings, moods, spending modes, areas, 689 options, and price basis |
| POST /api/generate | JSON such as `{"budget":1000,"area":"paterson","date":"2026-11-20","mood":"romantic","spending":"treat"}` | Four picks including local price/source metadata when applicable, title, preferences, integer-cent totals, combinationCount, unchanged, customOptions, and estimate notice |

Budget must be a number from 0 through 10000, with at most two decimal places. Setting is optional (defaults to `any`); accepted values are `any`, `indoor`, `outdoor`, `home`, and `mixed`. Indoor and outdoor MASH are outings; mixed includes both. Home bypasses local collection and distance filters, always choosing all four categories. Unknown fields and query parameters are rejected. Errors are JSON with an `error` message: 400 for invalid input, 413 for a body over 32 KB, 422 for no complete affordable plan (with minimumCents when available), and 500 for an unexpected failure. The 32 KB bound accommodates expanded exclusions plus personal ideas and locks.

Additional optional generation fields:

| Field | Format |
| --- | --- |
| mood | `surprise` (default), `cozy`, `adventurous`, `romantic`, or `competitive` |
| spending | `treat` (default) or `flexible`; recorded in saved dates and exports. Older saved dates restore as flexible. |
| area | `all` (API default), `general`, or `paterson`. MASH defaults to all; the timed Scene planner defaults to paterson; personal ideas remain eligible in every area. |
| date | Empty string (default, no weekday filtering) or valid YYYY-MM-DD. Preserved in favorites and downloads. |
| excluded | Unique IDs to omit from the current preset/custom catalog |
| locked | Category-to-ID object, e.g. `{"dinner":"dinner-pasta"}` |
| previous | Previous four IDs in dinner/activity/treat/entertainment order; avoids a repeat when alternatives fit |
| customOptions | Up to four objects with id, category, name, costCents, and settings. IDs use `custom-` plus 1–20 lowercase letters/digits/hyphens; names have 1–48 characters; costs are integer cents from 0 to 1000000. Settings are a nonempty unique subset of indoor/outdoor/home. |

Custom ideas are kept for the current visit; saved dates retain a validated copy. Revisit a saved date to restore its custom ideas and remix it. Exclusions and locks reset when revisiting. Reset ideas & locks clears exclusions and locks without deleting custom ideas.

Favorites use the `date-night-mash-favorites-v1` localStorage key on this device and browser. They do not sync across devices or preview/production domains, and clearing site data removes them. Up to 50 distinct combinations can be saved. Original saved plans remain compatible and restore to the original deck when no area is recorded. Saved source/venue metadata is replaced by the canonical catalog before display/export; outdated prices are rejected with a message. PDFs and text files are generated in the browser; no files are uploaded or stored on the server.

## Deploy on Vercel

After review and merge into `main`, the repository owner should:

1. Sign in to Vercel using GitHub, select the free personal Hobby plan, and import `aec9692/Date-Night-MASH`.
2. Keep the root directory at the repository root. Use the Express framework preset (normally detected automatically), Node.js 24, and the default install settings. There is no build script or generated output directory; do not set a custom output directory. No environment variables are required.
3. Deploy and check both `/` and `/api/health` at the provided public URL. Generate a plan and check the `/api/generate` response in browser developer tools.
4. Confirm the connected Git repository and production branch `main` in project settings. Merge a second reviewed visible change and verify that it triggers a new production deployment.
5. Replace the pending URL above and record actual deployed results in TESTING.md.

Root `server.js` exports the Express application for Vercel and starts a listener when run locally. Vercel serves `public/` through its CDN; local Express serves that directory itself. No legacy rewrites or `vercel.json` are needed for this foundation. See [Express on Vercel](https://vercel.com/docs/frameworks/backend/express).

## Working together

Start each task from the latest `main`. Replace `andrew/setting-filter` with your name and a short description of your task.

```bash
git fetch origin
git switch -c andrew/setting-filter origin/main
```

After committing your changes, publish your branch with `git push -u origin HEAD`. Open a GitHub pull request into `main` and have a teammate review it before merging. Vercel uses `main` for production.

The owner explicitly authorized Codex to handle the merges for the initial full build. The teammate-review workflow remains the default for later tasks. Do not start a duplicate implementation on another computer: pull the latest main first and agree on the next change.

## Exploring and taking your date out

Browse by town (including Wayne, Montclair and Totowa), category, price, or text. Browsing changes visibility only. Open Details / choose this for source-linked prices and directions; Build around this locks that category for the next roll. A locked option still has to fit the selected date, setting and budget.

Take this date out opens a companion for the chosen two, three or four stops, with directions and a whole-route link from the selected starting town, completion/undo controls, and conversation prompts. Progress stays only for the current visit and resets for a different plan or date. It follows the edited stop order. Suggested timing does not constitute a reservation or live route optimization. Whole-route links use at most three waypoints for phone-browser compatibility.

Phone layouts use single-column result cards, larger tap targets, category tabs, safe-area spacing and bottom navigation. The manifest and local icons support adding the website to a phone home screen; Safari instructions follow [Apple’s web-app guide](https://support.apple.com/guide/iphone/turn-a-website-into-an-app-iphea86e5236/ios). Generating new plans needs a network connection. After a successful initial cache, a network-first service worker can reopen the app and public catalog offline so local favorites and downloads remain usable. Remote photos, map links and booking pages still need a connection. Actual installed-phone offline behavior needs device testing. Home-screen use is separate from native App Store publication.

Sound is off until enabled. The reveal uses synthesized slowing ticks, cross-out taps and layered winner notes. Muting, skipping or leaving the page stops scheduled sound. Reduced motion and Skip the suspense bypass the rolling animation.

Server selection counts weighted candidates and draws a winner without retaining the full combination list. The original enumeration remains available to small fixtures; browser previews retain no candidates. No paid APIs or new runtime dependencies were added.

## Thoughtful date planning

The optional journey object enables the new flow. Requests without it keep the original four-category contract. Quick dates use dinner/treat; evenings add activity; full days include entertainment. Every chosen category must fit the budget, setting, date and preferences. Repeated venue IDs are excluded from the same timed plan. The browser performs live counting in a debounced Web Worker; it ignores stale replies and falls back to main-thread counting where workers are unavailable. The server remains authoritative.

The new controls include a starting town, radius, between-stop limit, age group (under 18 / both 18+ / both 21+), cuisine, vegetarian-oriented meals, low physical effort, alcohol-free ideas and tried-place avoidance. Diet and effort tags are conservative heuristics, not ingredient or accessibility guarantees. Under-18 planning excludes adult-only candidates and ends by 21:00; this is an app preference, not a statement about legal curfews. Guardian waivers and supervision still need checking.

Both pick a vibe passes one phone between two people, hiding/resetting the first input form before the second turn. Both moods influence the weighted draw; either chosen cuisine can win. Shared dietary/comfort settings apply to both people. There is no remote pairing, account or shared backend session.

Nearby limits use Census municipality representative points from data/towns.json. They do not measure venue distances, roads, walking access, traffic or driving time. Travel allowances use a labeled planning model: 12 minutes within a town, otherwise three minutes per straight-line mile plus 12 minutes. The radius applies to all local stops, and the between-stop limit applies after the first stop; “Stay in one town” also constrains the first stop to the origin town. Original/custom ideas have unverified locations and are labeled. Return travel is excluded.

Visit lengths are planning estimates; explicit ticket durations take precedence where identifiable. Known source-based windows use conservative common hours; unknown venues use clearly labeled planning windows, and outdoor visits use a conservative 09:00–16:00 window. Calendar dates also check recorded weekdays/closures. None of this verifies a live movie time, skating session, table, ticket or sunset forecast. Confirm the source before going.

The itinerary shows suggested visits/travel, explains matching preferences, and supports earlier/later ordering only when the new order still fits. A reasoned replacement keeps other stops when possible; “Too far” tightens the radius and leg limit to five miles and regenerates the outing, clearing incompatible locks. “Too expensive” excludes same-category choices at or above that pick’s cost for this visit and uses Flexible mode. “Already tried” avoids the venue’s other variants. “Not our thing” excludes that idea for this visit. Tried history (up to 40 IDs) stays locally and has a clear control.

Calendar export creates an .ics event for each stop, escapes/folds content lines and converts New Jersey civil times to UTC, including daylight saving. It needs a selected date and timed plan; imports do not make reservations. Invitation sharing uses native sharing, clipboard or a plain-text download. PDFs/text preserve the edited order and suggested times. Saved-plan identity includes date, start, origin and order, and canonical catalog data replaces stored venue metadata before display/export.

Six licensed historical venue photos include author/source/license links and crop notices; small Wikimedia renditions are lazy-loaded. Missing photos fall back to the existing category art. Catalog rows group menu/ticket variants under their venue while retaining individual inclusion controls.

Example timed request:

```json
{"budget":75,"area":"paterson","date":"2026-11-21","journey":{"format":"quick","start":"17:00","origin":"Paterson","radius":10,"legMiles":5,"age":"teen","cuisine":"any","vegetarian":false,"lowEffort":false,"alcoholFree":true,"fresh":false,"seen":[],"partner":null}}
```

Journey fields are strictly validated. Formats: quick/evening/full; radius: 5/10/15/25/50; legMiles: 0/5/10/15/25/50; cuisine: any/italian/mexican/asian/peruvian/cafe. Optional partner contains only a documented mood and cuisine. Optional order must contain each active category once; previous picks remain in canonical category order. Unknown fields, malformed times, unavailable towns and unknown seen IDs are rejected. The body limit remains 32 KB.

## Place discovery and separate MASH mode

Category buttons explicitly show the matching panel; All four restores every panel. Venue cards group examples by category and place, so restaurants appear once with their name, location and a range derived from checked examples. This is not a full-menu minimum/maximum or a promise that any order fits the budget. Selected food results, reveal labels, favorites and PDF headings use the venue name; expandable price proof retains the sample order and exact allowances.

Paid experiences appear first in activity/entertainment discovery. Paid/free admission filters change browsing, not the generation mix. Optional museum donations do not turn free admission into a paid attraction. New paid choices include Humdingers, Bury The Hatchet Bloomfield, Glassworks, EscapeRoomNJ Englewood, The Pixel Lab, Turtle Back Zoo, Power Up Arena and The Other Tales. Source prices, party/guardian restrictions and dated closures are in DATA_SOURCES.md and the catalog. The broad 13–17 profile conservatively excludes options requiring an accompanying adult or an older participant not guaranteed by that age group.

MASH requests use a strictly validated mash object containing only age (teen/adult/21plus), origin (supported town) and radius (5/10/25/50). The server always returns all four categories, honors the budget and source collection, and applies age/radius filtering. It does not create a timed schedule. Requests may use mash or journey, never both; requests using neither retain the legacy four-category behavior. Example: {"budget":100,"area":"paterson","mash":{"age":"teen","origin":"Paterson","radius":10}}.

Directions now default to omitting a fixed origin so Google Maps can resolve the device location or ask for a starting point. The Directions start from selector can instead use the selected planning town. The same setting applies to place details, generated cards, nearby results, companion routes and PDF links. MASH does not call geolocation or receive/store GPS coordinates. This follows [Google Maps URL documentation](https://developers.google.com/maps/documentation/urls/get-started#directions); live/device behavior still needs phone testing.

Play MASH has its own copy of the Scene budget controls: a synchronized amount/slider/presets, the same setting choices, and Treat us/Flexible spending. Direct entry supports $0-$10,000; the slider stops at $1,000. These controls use the existing validated setting and spending API fields and preserve the four-category MASH contract. Saved MASH dates restore their own preferences without overwriting the separate Scene form.

## At home, shared supplies and live discovery

Choose Night at Home with any collection: the server draws dinner, activity, treat and entertainment without town/radius restrictions. The budget is a ceiling for both people together. Flexible allows any affordable complete date; Treat us still targets the top of the attainable range. The catalog includes basic meals, steak dinners, creative games, baking and free entertainment.

Use what we already have is an explicit checklist. The optional pantry array accepts groceries, seasonings, baking, boardGames, videoGames, art, streaming and craft. Ingredients not covered by a selection retain their purchase allowance. Oil, seasonings, baking basics, bread, pasta and rice shared across selected recipes are charged once. A combined shopping list, ingredients and instructions appear on results, in the companion and in PDF/text exports. These are illustrative additional-spend allowances, not guaranteed checkout prices; equipment, utilities and delivery are excluded. A zero-dollar dinner needs food already available.

The optional recent array holds up to eight recent four-ID dates; new draws avoid them when other complete dates fit. A single reroll locks the other IDs and recomputes the basket, so a shared cost may move between categories. Favorites restore pantry and public starting-area preferences. Older saved dates are retained with an ownership reminder when their free food/game assumptions need checking.

Search a city/state or US ZIP from the MASH section, choose a matching city and select 5, 10, 15, 25 or 50 miles. A location object contains lat, lon and label. Known NJ venue distances still use town centers, while map listings use recorded coordinates; neither is a driving distance. GET /api/locations?q=Paterson%2C%20NJ geocodes; GET /api/nearby?lat=40.9168&lon=-74.1718&radius=10&kind=activity returns sourced community map listings. Kind is all, dinner, activity, treat or entertainment. Listings with unknown prices remain discovery-only until a visitor supplies a personal estimate. A custom idea can carry a validated place object with name, address (or null), lat, lon and an OpenStreetMap sourceUrl; it is not promoted to a verified-price venue.

See [LOCATION_SEARCH.md](LOCATION_SEARCH.md) for the free providers, attribution, limits, caching and commercial-use constraints. Search requires an explicit submission, transmits only a public city/ZIP or search-center coordinates, and adds no account or paid API. Provider outages display readable errors while the curated collection remains usable. The three additional official-source thrift addresses have no invented admission or merchandise prices. Native App Store publishing, commercial provider suitability, real-phone behavior and a public Vercel deployment still require their own verification.


## Ready-to-use dates, calendars and sharing

Start with Stay home, Go out or Surprise me, then set the combined budget. Extra preferences remain optional. The catalog initially renders 12 cards per category, with Show more retaining every idea and the selected category. On narrow screens the decorative collage is hidden to bring the controls closer.

All 246 newer home ideas now have guide metadata: preparation/active/elapsed time, difficulty, equipment, recipe or package quantities, and practical instructions. Ingredient ticks track shopping progress for the current plan; pantry selections control its estimated cost. The guide quantities are planning amounts for two portions or a package yield with leftovers, not a complete tested recipe. No prices or original source-check dates were changed.

Make it fit you applies food, gentle-effort, beginner-cooking and equipment preferences to the actual server selection. Food tags describe listed ingredients and still require product/venue confirmation; they are not allergy guarantees. Optional access checklists help confirm facilities rather than pretending access has been verified. Never suggest again persists on this browser/device and can be reversed. Going-out choices can be restricted to source-priced venues.

Source-priced NJ discovery uses GET /api/nearby-curated and works independently of the community-map provider. Cards distinguish checked sample prices, home/general allowances, personal estimates and unknown live prices. A 30-day source-review reminder does not update a check date or promise current availability.

Add to calendar opens date/time controls for both MASH and timed plans. iPhone/iPad recommend Apple-compatible .ics; Android recommends Google Calendar. Both choices stay available and the selected provider is remembered. Timed itineraries keep New Jersey time; calendar exports recheck recorded closures for the selected day. The user must review and Add/Save in their calendar. No calendar account, OAuth access, invitation email or booking is created by MASH. See [CALENDAR_SHARING.md](CALENDAR_SHARING.md).

Share date sends a readable note and plan link through the native share sheet when available, with Copy link, Copy note, selectable text and downloadable-note fallbacks. A partner can open the exact plan and share a suggested category replacement. Links are bounded URL-fragment snapshots, not synchronized accounts; send a new link after changing a plan. The server restores canonical IDs/costs before showing it. A recipient's own pantry checks are kept. Anyone holding the link can read its encoded plan details. A localhost link only works on the same computer; cross-phone sharing needs the public deployment URL.

New stateless routes: POST /api/restore accepts only a JSON token; GET /api/calendar?token=... returns a validated calendar file. These routes store no uploaded files or shared-plan database records. Service-worker cache v8 includes the new client modules; calendar files and restore/generation requests are not cached.

Public deployment is still pending the owner's professor-assisted Vercel setup. Use [PROFESSOR_HANDOFF.md](PROFESSOR_HANDOFF.md) and [PHONE_QA.md](PHONE_QA.md); do not claim a physical-device test or deployment from local DOM/API checks.


City/ZIP search now suggests supported NJ towns locally as you type. Choose a suggestion, or press Enter / Find location. A unique city/ZIP match automatically loads nearby source-priced choices; shared ZIPs ask for the town. The 43-town/102-ZIP local index works without the live geocoder. Coordinates remain town centers, not precise ZIP centers. Outside that index, explicit searches still use the external geocoder.
## Day, feedback and spending reserves

Play MASH starts with Tonight, This weekend or an editable date. Presets use New Jersey calendar dates (America/New_York); weekend means the coming Saturday, or today on Saturday/Sunday. Generation checks recorded closures, weekdays and seasonal restrictions for that date. This is a day-level check, not live evening hours, ticket availability or a reservation; confirm each source before going.

Both MASH and Scene let you reserve parking, transportation and unexpected costs inside the combined budget. For example, a $50 budget with $15 reserved leaves $35 for selected ideas. These amounts are your allowances, not quotes. Results, favorites, sharing, companion view and PDF/text exports include the reserve and remaining money.

The optional API field `reserve` accepts only numeric dollar amounts `parking`, `transport` and `extras`, each with at most two decimals; their sum cannot exceed budget. Money is compared in cents. Responses retain `totalCents` for selected ideas and add `reserveCents`, `planningBudgetCents` and `plannedTotalCents`; remaining money subtracts both selected ideas and reserves. Omitted reserves default to zero, preserving older plans.

After completing a date, give it 1–5 stars and answer Would you do this again? Up to 100 validated reviews stay on this browser/device. You can edit, remove or clear reviews independently of favorites. They gently weight future selections without overriding budget, date, exclusions, locks or other filters. Generation sends only derived idea IDs in optional `taste: {liked: [], less: []}` (at most 16 known IDs each, no overlap); full reviews are never saved on the server or included in shared links/exports. Clearing reviews removes this preference signal. No cross-device sync or account is provided.
## Ready for your date: routes, backups and two-person choices

The result’s Ready for your date section puts the suggested route, directions, official menu/ticket sources, recorded booking notes and departure checklist together. Checkboxes last for the current visit/plan; they never mean MASH verified a booking. Unknown reservation requirements are explicitly unconfirmed.

MASH gently favors ideas near the planning area and nearby pairs. After selection, it evaluates at most six orders of the remaining three stops while keeping dinner first. Timed Scene plans retain their validated order. Route estimates use Census municipality centers or recorded community-map pins, never actual road distances or live traffic. Unverified endpoints prevent a complete route estimate. The result flags sizable category-order detours/reversals and explains any suggested distance reduction; return travel is excluded. Directions may start from the device’s location according to the existing Directions setting. PDF/text, sharing, companion and cards use the same suggested order.

Find an indoor backup replaces one outdoor stop with a non-home indoor option. POST /api/backup accepts a canonical shared-plan `token`, `category`, optional current `excluded` IDs and derived `taste`. The server locks all other stops, retains the date, age, radius, fit preferences, budget and reserves, and rechecks costs and timed windows. It changes overall setting to Any and spending to Flexible so retained outdoor stops and affordable indoor alternatives can coexist. It reports failure without changing the current date when no replacement fits.

Choose together: compare 3 dates uses POST /api/compare with the current `token`, optional `locked`, `excluded` and `taste`. The current plan must match those locks/exclusions. At most six bounded additional draws seek three distinct combinations (venue menu variants alone do not count as distinct). If three cannot be found, the app asks users to expand their mix rather than inventing results. Every candidate keeps the same date, total budget and reserves.

Two-person voting exchanges self-contained `#vote=` links. The creator and partner each select one of three plans; the partner shares a reply link back. The creator opens/pastes it in the original browser. A reply replaces that partner’s one choice, and different choices produce an explicit tie. Up to five comparisons stay locally; Reopen your latest date comparison and Clear saved votes support returning and removal. POST /api/compare/restore rechecks all three snapshots against the canonical catalog before they display. Links are bounded, not live or authenticated polls; anyone with a link can read/alter it. There is no database, account, server-side tally, automatic message sending or cross-device storage. Full ratings are excluded. Recipients retain their own pantry selections when opening a candidate; displayed costs initially assume the sender’s checked supplies. Localhost links require a public deployment to work on another phone.
