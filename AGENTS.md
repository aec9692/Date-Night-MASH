# Date Night MASH

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
- Limit JSON bodies to 4 KB; return readable JSON errors for malformed JSON and oversized bodies. This accommodates exclusions from the expanded catalog plus custom ideas and locks.
- Accept only documented setting values: any, indoor, outdoor, home. A plan's four options must each support the selected setting.
- Select one option per category, then choose randomly among complete combinations at or below budget. Never rely on an unbounded random retry loop.
- Distinguish invalid requests (400), oversized bodies (413), no affordable combination (422), and unexpected server failures (500).
- Preserve form values on errors. Show loading, success, empty, and failure states; prevent duplicate submissions.
- Render data using safe DOM APIs. Validate stored favorites when loading and handle unavailable browser storage gracefully.
- Generate PDF and text downloads in the browser; do not introduce uploads or server file storage. Copy the pinned jsPDF asset and license with scripts/prepare-assets.js during npm installation.

## Delivery and verification

The owner requested an interactive game upgrade and authorized Codex to handle merges in this session. Preserve the default task-branch/PR workflow for collaboration.

Upgrade behavior:
- Shared validation and combination enumeration live in public/planner.js. The server remains authoritative; browser counts are a preview.
- Generation may also receive mood, spending, area, date, excluded, customOptions, locked, and previous. Validate every field and reject undocumented fields. Keep JSON requests bounded to 4 KB.
- Spending defaults to treat: select estimated totals at 90–100% of budget when available, otherwise at least 95% of the highest attainable total. Flexible allows any affordable total. Apply mood weighting after spending selection. Explain unattainable budgets honestly and never inflate catalog prices.
- Preserve the 96 original ideas and the separately maintained source-linked NJ catalog in data/local-options.json. The UI defaults to the Paterson-area deck; all/general/paterson are valid area values. A valid optional calendar date filters known regular weekdays, not live availability or holidays. Do not promise a timed itinerary or a measured one-hour driving radius.
- Each local price needs an official source URL, checked date, explicit order/admission basis for two, and separate base/tax/tip/donation components. See DATA_SOURCES.md. Never invent a local price or copy a third-party estimate as a verified menu quote. Unknown fees and travel/parking exclusions must remain visible. Review sources periodically; checked dates are not automatic live updates.
- Browser search/price browsing changes visibility, not inclusion. Keep counts memory-efficient without retaining every plan in the browser, and build reveal candidates from the selected plan instead of enumerating all plans again.
- Mood values are surprise, cozy, adventurous, romantic, and competitive. Mood weights valid combinations; it must not bypass budget, setting, exclusion, or lock constraints.
- Support at most four custom ideas with names up to 48 characters and integer estimated prices. Saved custom ideas require the same validation as incoming requests.
- Keep explicit locks during full regeneration. A single-category reroll fixes the other three picks and returns a different complete combination when one exists. Explain unchanged results when no alternative fits.
- Select the result before animating. Reveals must be skippable, respect reduced motion, and prevent overlapping submissions. Sound is opt-in.
- Support phone-readable PDF and plain-text downloads, with source/map links for local stops. Use native PDF file sharing where supported and download otherwise. Preserve existing favorites; validate and replace saved venue/source metadata with canonical data before export. This remains a web app; do not claim App Store publishing or real-device verification without evidence.

- See BUILD_PLAN.md for milestones, acceptance criteria, and setup steps.
- Use the connected GitHub repository and Vercel Git integration. Production branch: main. Do not claim a push or deployment succeeded without evidence.
- Verify all behavior manually on the deployed site at phone and laptop sizes. If direct access is unavailable, ask for browser console errors, Vercel logs, and observed results; leave verification pending.
- Maintain TESTING.md with at least 12 executed deployed-site cases: ID, item, steps, expected result, actual result. Cover every input and server route with valid/invalid data, each advanced feature, and every page on a phone. Never invent results.
- README.md must include description, members, deployed URL, and local run instructions.
- Record three useful Codex prompts and one Codex error with its detection and fix for individual reports.
- Each student writes their own report. Reports begin with repository, deployment, and shared demo-video links. Do not write shared report prose for submission by multiple students.
- The group demo must show the deployed app, main flow, request/response in developer tools, rejected input, all advanced features, a code explanation, and every member speaking.
