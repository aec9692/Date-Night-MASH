# Date Night MASH

Detail blocks: preserve complete source notes, price assumptions, ingredients/instructions, route disclaimers, links and control behavior when regrouping expandable content. Use DateLayout.block/facts/group and safe DOM movement, with real headings and definition lists. Do not truncate, line-clamp, hide important confirmations or put rich HTML inside native select options. Form field cards and summary chips are presentational. Offline cache v13 includes the block styling and date-layout.js.

First-plan layout: keep budget, starting area and date visible above Play MASH. Use progressive disclosure for optional controls and supporting results. Preserve every existing input/action ID, shared Scene/MASH preferences, canonical costs and features. Show exact selected point estimates and source/allowance labels; never imply current prices, live drive times or a booking. Show total/picks before route/evidence/checklists. date-layout.js opens invalid hidden controls during native invalid capture and explicit validation; retain lightweight slider handling. Offline cache v13 includes date-layout.js.

Submission audit: RUBRIC_CHECKLIST.md maps the supplied requirements. Use DEPLOYED_ACCEPTANCE.md for current manual coverage and SUBMISSION_GUIDE.md for group demo/individual-report preparation. Keep exactly three designated advanced features for this three-member group; extra features are supplementary. Suggested ownership does not prove contribution or instructor credit. Never mark deployed tests, screenshots, video, approval, collaborator acceptance or Canvas submission complete without evidence. Preserve independently written report prose.

## Approved project proposal

Group members: Adrainn Coloma, Andrew Russo, Alex Marshall.

Date Night MASH helps couples create a random date plan by choosing dinner, an activity, a treat, and entertainment within their budget. Intended users are couples and college students who currently brainstorm over text, search social media, or write paper options.

Main flow:
1. Enter a total budget for two people.
2. Review preset options and optionally select a setting filter.
3. Click Play MASH.
4. View four selections and their estimated total cost.
5. Generate another plan, save a favorite, or download the plan.

Minimum version: one responsive page with a budget field, four categories of preset options, a generate button, and a results section. The browser sends a request to an Express server, which validates it and returns an affordable combination. All prices are estimates for two people. Deploy publicly on Vercel.

Server routes:
- GET /api/options: returns the preset options, categories, prices, and setting tags.
- POST /api/generate: receives a JSON budget and optional setting filter; returns four selections, estimated total, and remaining budget. Rejects invalid input and explains when no combination fits.

Approved advanced features, in priority order (suggested ownership; group may reassign):
1. Adrainn: save and remove favorite plans using localStorage, preserved between visits.
2. Andrew: filter by indoor, outdoor, or at-home setting.
3. Alex: download a readable date plan as a text file.

Optional polish: a MASH crossing-out reveal animation. Choose a valid result before animating; support reduced motion.

Screen sketch: title; budget and setting controls; a two-column grid of Dinner, Activity, Treat, and Entertainment options; Play MASH button; results with estimated total; Generate Again, Save Plan, Download, and Saved Plans controls. Stack sections on narrow screens.

Main risk: a budget or filter leaves no affordable combination. Keep the preset list small, include free choices, enumerate valid combinations on the server, and return a helpful explanation and minimum required budget when no plan fits.

## Required implementation rules

- The server entry point is server.js in the repository root. Static files are in public.
- The front end uses plain HTML, CSS and JavaScript. No frameworks.
- Keys and passwords are read from environment variables and are never written in the code. The .env file is never committed.
- Start each task on a branch from the latest `origin/main`. Use a name like `andrew/setting-filter` so teammates can see who is working on what.
- Each task ends with a commit and a push to its task branch. Open a pull request into `main` and ask a teammate to review it before merging. Keep direct pushes off `main`, the Vercel production branch.
- Use free plans only. Never enter a credit card or add paid APIs or services.
- No file uploads. Reference images by URL. Do not collect sensitive personal data.
- No database or user accounts are planned. Favorites stay on the current browser/device.
- If a database or accounts are later approved: read the database connection string from process.env.DATABASE_URL; parameterize all SQL queries; hash passwords with bcrypt; store sessions in the database, never server memory.
- Build in this order: deployment, server route, application features, advanced features. Verify each stage on the deployed site before starting the next.
- Keep code small and understandable so every member can explain it.

## Application behavior

- All costs are USD estimates for two people. Store and compare money as integer cents.
- Accept a finite numeric budget from $0 to $10,000 with at most two decimal places. Reject missing, negative, oversized, malformed, and unexpected input.
- Limit JSON bodies to 32 KB; return readable JSON errors for malformed JSON and oversized bodies. This accommodates exclusions from the expanded catalog plus custom ideas and locks.
- Accept only documented setting values: any, indoor, outdoor, home, mixed. Every selected option must support the selected setting. Timed formats may select two, three or four categories; legacy requests still select all four.
- Select one option per category, then choose randomly among complete combinations at or below budget. Never rely on an unbounded random retry loop.
- Distinguish invalid requests (400), oversized bodies (413), no affordable combination (422), and unexpected server failures (500).
- Preserve form values on errors. Show loading, success, empty, and failure states; prevent duplicate submissions.
- Render data using safe DOM APIs. Validate stored favorites when loading and handle unavailable browser storage gracefully.
- Generate PDF and text downloads in the browser; do not introduce uploads or server file storage. Copy the pinned jsPDF asset and license with scripts/prepare-assets.js during npm installation.

## Delivery and verification

The owner requested an interactive game upgrade and authorized Codex to handle merges in this session. Preserve the default task-branch/PR workflow for collaboration.

Upgrade behavior:
- Shared validation and combination enumeration live in public/planner.js. The server remains authoritative; browser counts are a preview.
- Generation may also receive mood, spending, area, date, excluded, customOptions, locked, previous, a strictly validated journey object, or a mutually exclusive mash object. Validate every field and reject undocumented fields. Keep JSON requests bounded to 32 KB.
- Spending defaults to treat: select estimated totals at 90–100% of budget when available, otherwise at least 95% of the highest attainable total. Flexible allows any affordable total. Apply mood weighting after spending selection. Explain unattainable budgets honestly and never inflate catalog prices.
- Preserve the 96 original ideas and the separately maintained source-linked NJ catalog in data/local-options.json. MASH defaults to local plus general ideas; Scene defaults to the Paterson-area deck; all/general/paterson are valid area values. A valid optional calendar date filters known regular weekdays and recorded closedDates/closedDateRanges, not live availability or unrecorded holidays. Do not promise a timed itinerary or a measured one-hour driving radius.
- Each local price needs an official source URL, checked date, explicit order/admission basis for two, and separate base/tax/tip/donation components. See DATA_SOURCES.md. Never invent a local price or copy a third-party estimate as a verified menu quote. Unknown fees and travel/parking exclusions must remain visible. Review sources periodically; checked dates are not automatic live updates.
- Browser search/town/price/category browsing changes visibility, not inclusion. Details previews can lock a specific choice for generation. Keep counts memory-efficient without retaining every plan in the browser, and build reveal candidates from the selected plan instead of enumerating all plans again.
- Mood values are surprise, cozy, adventurous, romantic, and competitive. Mood weights valid combinations; it must not bypass budget, setting, exclusion, or lock constraints.
- Support at most four custom ideas with names up to 48 characters and integer estimated prices. Saved custom ideas require the same validation as incoming requests.
- Keep explicit locks during full regeneration. A single-category reroll fixes the other three picks and returns a different complete combination when one exists. Explain unchanged results when no alternative fits.
- Select the result before animating. Reveals must be skippable, respect reduced motion, and prevent overlapping submissions. Sound is opt-in. Rolling/reveal audio must stop on mute, skip, pagehide or hidden document.
- Date companion progress is per visit, reset for a different combination/date. Maps use public venue addresses and Paterson as origin; never collect a home address or imply live travel estimates. Preserve the manifest/icons and phone navigation. Home-screen use is not native App Store approval.
- Server winner selection must remain bounded in memory: count weighted candidates with sorted category pairs/binary searches and draw without retaining every feasible combination. Preserve the minimum 50 NJ choices per category, inexpensive coverage, distinct IDs and all 96 original ideas. Menu orders and duration variants are choices, not new businesses.
- Support phone-readable PDF and plain-text downloads, with source/map links for local stops. Use native PDF file sharing where supported and download otherwise. Preserve existing favorites; validate and replace saved venue/source metadata with canonical data before export. This remains a web app; do not claim App Store publishing or real-device verification without evidence.

- See BUILD_PLAN.md for milestones, acceptance criteria, and setup steps.
- Use the connected GitHub repository and Vercel Git integration. Production branch: main. Do not claim a push or deployment succeeded without evidence.
- Verify all behavior manually on the deployed site at phone and laptop sizes. If direct access is unavailable, ask for browser console errors, Vercel logs, and observed results; leave verification pending.
- Maintain TESTING.md with at least 12 executed deployed-site cases: ID, item, steps, expected result, actual result. Cover every input and server route with valid/invalid data, each advanced feature, and every page on a phone. Never invent results.
- README.md must include description, members, deployed URL, and local run instructions.
- Record three useful Codex prompts and one Codex error with its detection and fix for individual reports.
- Each student writes their own report. Reports begin with repository, deployment, and shared demo-video links. Do not write shared report prose for submission by multiple students.
- The group demo must show the deployed app, main flow, request/response in developer tools, rejected input, all advanced features, a code explanation, and every member speaking.

## Student and couple planning upgrade

- Preserve the legacy four-category API when journey is absent. With journey, quick uses dinner/treat (150 minutes), evening dinner/activity/treat (300), full all four (540). Validate nested fields and keep requests bounded to 32 KB.
- public/journey.js owns shared numeric time/distance/preference rules; public/count-worker.js keeps counts off the main thread. Preserve equality with independent itinerary enumeration and never retain all complete dates in production.
- Default to the separate $50 four-category MASH game; Set the scene retains timed quick/evening/full formats. Teen means the broad high-school 13–17 profile; ideas requiring an adult companion or an older participant must be excluded unless the selected profile guarantees eligibility. Age groups are preferences, not identity verification; never collect DOB. Timed teen plans finish by 21:00, exclude adult-only activities, and still require venue/guardian checks. Both-18+ does not qualify for 21+ experiences.
- Census representative points are approximate municipality locations, not venue geocodes or live travel estimates. All local stops must fit the radius; later legs must fit the leg limit. Unknown locations must remain explicit. Return travel is excluded.
- Timing windows, visit lengths, food tags and effort classifications are planning guidance. Do not claim live reservations, showtimes, ingredient guarantees, walking accessibility or a traffic-verified itinerary. Keep known dated closures and conservative published-hour restrictions.
- Exclude repeated venue IDs within timed dates. Apply both people’s moods without bypassing hard constraints; either cuisine may win. Shared-phone inputs are hidden/reset between turns and need no account.
- Keep edited stop order in the screen, companion, favorites, PDF/text and calendar exports. Revalidate ordering; reset positional progress when order changes. Save canonical catalog metadata, not untrusted stored source links.
- Photo records require verified source, author, license and historical/crop notes. Prefer verified small renditions; lazy-load and remove failed images. Group venue variants without pretending they are different businesses.
- Service workers may cache this app’s public shell and read-only catalog only. Never cache generated POST requests or remove unrelated caches. Update the owned cache version when offline assets change in a future release. Offline/native-phone behavior needs real-device verification.
- Calendar exports escape and fold RFC 5545 content lines and convert America/New_York civil times to UTC; exports are suggestions, not bookings. No uploads, accounts, paid services or new runtime dependencies.

## Place browsing and MASH separation

- Keep MASH and Set the scene in distinct sections/forms. MASH always returns all four categories for a budget; timed format controls apply only to Set the scene. Validate mash fields age/origin/radius and reject combined mash/journey requests.
- Use explicit hidden state for category panels; CSS must never hide the active category. Preserve selected category after browsing filters change.
- Present venues/ranges/locations in discovery, not a list of dishes. Price ranges must be labeled as checked sample totals for two, never all-menu bounds. Keep the actual sample basis in expandable details and exports. Preserve canonical IDs/prices/favorites.
- Prefer paid outings first in discovery while retaining free choices and explicit paid/free admission filters. Browsing does not silently exclude ideas from generation.
- Map URLs default to Maps resolving device location; allow planning-town fallback. Do not request/store/transmit GPS coordinates. Keep card, nearby, companion and PDF routes consistent. Offline shell v3 includes places.js, place-ui.js and directions.js.


## Expanded home and location planning

- Keep all 96 original IDs and prices plus 209 source-priced NJ entries; enrich legacy home ideas with explicit owned-access requirements. data/home-options.json adds 246 home ideas and data/outing-options.json adds 138 general allowances. Do not turn illustrative allowances into verified store quotes.
- At home always draws all four categories, bypassing NJ-only area and travel filters. Home and mixed requests bypass timed itinerary constraints after validating their journey input. Indoor and outdoor MASH mean outings; mixed requires indoor and outdoor picks.
- Accept pantry (up to eight documented ownership keys), recent (up to eight four-ID combinations), and location (public city/ZIP label plus finite coordinates). Never collect a home address or device GPS. Radius values are 5, 10, 15, 25 and 50 straight-line miles.
- date-costs.js and date-combinations.js share integer-cent prices, ownership, shared-basket deduplication and exact pair counting across server/worker. No repeated theme or venue in a four-pick date. Deduct owned items explicitly; charge shared oil, seasonings, baking basics, bread, pasta and rice once. Rerolls recalculate the entire basket and preserve other IDs.
- Default UI spending is flexible; Treat us remains available. A free food plan requires sufficient already-owned groceries. Explain a real minimum rather than silently assigning free ingredients. Never require spending exactly the budget.
- Preserve old favorites with an ownership confirmation note where necessary; canonicalize all new home costs and metadata on restore/export. The per-visit recent list avoids eight recent dates when alternatives exist.
- Live locations use explicit-submit free city geocoding and community map discovery; see LOCATION_SEARCH.md. Unknown prices stay null, not zero. Only personal estimates may add a live listing to the mix, clearly labeled. Official thrift addresses without prices remain discovery-only.
- Keep slider updates immediate; never rebuild the catalog or count combinations in its input handler. Count after input settles and use the existing worker when supported. Keep offline cache v8 synchronized with the new shared modules.


## Practical-date and sharing rules

- Keep data/home-guides.json separate from base prices. Server and browser receive canonical guide metadata; dietary/time/quantity estimates are not tested recipes, allergy guarantees or live venue information.
- fit accepts only diet, effort, cooking, equipment, accessChecklist and verifiedOnly through date-fit.js. Apply filters in both four-pick and timed selection. Never suggest again uses device-local venue/idea keys converted to current known exclusion IDs. Keep local state arrays separate from the canonical catalog.
- Curated source-priced nearby results must remain usable if live providers fail. Preserve check dates and label old checks for review rather than inventing fresh prices.
- Share snapshots contain minimal IDs/preferences, not trusted price/source metadata. Decode and revalidate on the server before restore or calendar generation. Never restore the sender's pantry choices over a recipient's choices. Reject malformed, oversized, incompatible and over-budget snapshots.
- Calendar UI supports MASH without a timed itinerary, asks for a date/time block, recommends Apple on iOS and Google on Android, and keeps both choices available. Preserve the selected provider on this device. The user saves the draft/import; do not claim silent calendar insertion or a booking.
- Keep .ics escaping, UTF-8 folding, timezone/DST validation and source-day rechecking. Calendar/restore routes are stateless, bounded and uncached, with no OAuth, database, account, file upload or invitation sending.
- Maintain progressive catalog rendering and quick start controls. Never reintroduce heavy work into budget slider input. Verify category visibility and personal idea visibility after paging/filtering.
- Public deployment and actual phone checks remain pending the professor-assisted setup. Use PHONE_QA.md and PROFESSOR_HANDOFF.md and record only executed results.


- City/ZIP search uses data/location-index.json and public/location-lookup.js for source-backed NJ suggestions and exact matches before explicit external lookup. Preserve leading-zero ZIPs and multi-town ambiguity; these coordinates are municipality centers. Never use network autocomplete, silently turn a prefix into an exact town, or strip City from a proper municipality name. Cancel/version old city/place requests so stale results cannot override the latest selected origin. Offline shell v9 includes location-lookup.js.
## Day, reserves and completed-date feedback

- MASH selects a visible date upfront. Tonight/weekend use America/New_York calendar days; enforce recorded day/season restrictions, while clearly requiring confirmation of live hours and availability.
- Reserve parking/transport/extras inside the total budget, in cents, exactly once before selection. Keep totalCents as the picks subtotal; plannedTotalCents includes reserve and remainingCents subtracts it. Restore and export this ledger consistently for old and new plans.
- Completed-date reviews remain device-local, validated and bounded to 100. Send only derived liked/less known IDs (maximum 16 each) to influence selection softly. Never expose reviews in sharing or store them on the server. Budget, locks and availability always take precedence. Clear reviews independently of favorites.
- Offline cache v10 includes date-planning.js, date-planning-ui.js and date-feedback.js. Keep worker/server/browser selection logic aligned and slider handlers light.
## Route guidance, indoor backups and portable votes

- date-route.js owns bounded untimed route ordering and approximate town-center/map-pin distances. Keep dinner first; keep validated timed orders intact. Unknown endpoints cannot imply a complete mileage total. No live driving times, bookings or exact venue-coordinate claims for municipality centers.
- Geographic weights are soft preferences; retain exact candidate counts, budget rules, recent-date subtraction and hard filters in worker/server. Per-pick explanations describe observable matches, not invented selection reasons or live availability.
- /api/backup locks all other IDs, preserves date/age/fit/radius/reserves and selects a non-home indoor replacement. Overall setting becomes any and spending flexible. A failure keeps the existing plan. Revalidate snapshots and keep canonical costs authoritative.
- Three-plan comparisons use bounded draws and distinct venue/idea combinations. Portable votes exchange invite/reply links and store at most five creator comparisons locally. One host and one guest choice; a new reply replaces the guest choice. No live/authenticated tally, server ballot storage, accounts, database or paid service. Keep ratings out of tokens, enforce size bounds, recheck every candidate on restore, and preserve recipient pantry state.
- Offline shell v11 includes date-route.js, date-vote.js and ready-night.js. Keep route ordering aligned across results, companion, sharing and downloads. Physical-phone and deployed checks remain pending until actually executed.
