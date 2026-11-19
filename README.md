# Date-Night-MASH
Date Night MASH helps couples create a random date plan by choosing dinner, an activity, a treat, and entertainment within their budget.

Group members: Adrainn Coloma, Andrew Russo, Alex Marshall.

## Current version

An interactive MASH game generates a four-part date within a total budget for two. Browse 65 ideas (16 dinners, 24 activities, 12 treats, and 13 entertainment options), spanning free outings through premium experiences. Set the mood, budget, setting, and spending style; watch ideas get crossed out before your named date is revealed. Lock the picks you love, reroll one category, exclude ideas, or add up to four personal ideas. Save dates in this browser and download an illustrated SVG date card or a plain-text itinerary. Costs are illustrative USD estimates, not real venue quotes or booking offers. Confirm full prices, taxes, fees, and availability. No accounts, database, API keys, or paid services are used.

Deployed application URL: pending Vercel import and verification.

## Run locally

Install Node.js 24 LTS, then run:

```bash
npm ci
npm start
```

Open http://localhost:3000, enter a budget, choose a setting, and click Play MASH. Use `npm run dev` to restart the server automatically after server file changes. No environment variables or API keys are required; `PORT` is optional and defaults to 3000. Run `npm test` for the automated HTTP tests. Deployed manual checks are tracked separately in TESTING.md.

## How it works

`public/app.js` loads the preset catalog from the Express server and sends the budget and setting to `POST /api/generate` in `server.js`. The server validates the JSON, filters options in `data/options.json`, enumerates affordable combinations, and randomly returns one. The browser displays the picks and totals. Prices are stored and compared as integer cents.

`public/planner.js` shares validation and enumeration rules between the client (for live possibility counts) and server (for authoritative selection). `public/show.js` handles the short elimination reveal, optional sound, and confetti. The server chooses the result before the animation begins. Reduced-motion preferences and Skip reveal bypass the suspense. `public/download.js` creates text itineraries and self-contained vector date cards using safe DOM APIs.

The slider covers $0–$1,000, with quick budget buttons; direct typing supports up to $10,000. Treat us is the default spending style: it chooses totals at 90–100% of budget when available. If the current constraints cannot get that high, it chooses within the top 5% of the highest attainable total and explains the limit. Flexible keeps every affordable total in the mix. Mood weights candidates within the chosen spending style; it never overrides budget or other constraints. Changes to the setting clear existing locks. A single-category reroll fixes the other three picks and checks the entire budget again. When there is no different valid plan, the server returns the same result with `unchanged: true`, and the interface explains how to open up more choices. Previous plans are excluded before computing the attainable maximum when a different plan is available.

Search and price-range browsing help explore the larger decks; they only change what is visible. Inclusion/exclusion remains an explicit idea toggle. The displayed affordable count includes all feasible totals, while Treat us selects from the near-budget subset. Preview counts enumerate with budget pruning without keeping an array of every plan.

| Route | Input | Response |
| --- | --- | --- |
| GET /api/health | None | Application name and status |
| GET /api/options | None; query parameters rejected | Categories, settings, moods, spending modes, 65 options, and price basis |
| POST /api/generate | JSON such as `{"budget":1000,"setting":"outdoor","mood":"romantic","spending":"treat"}` | Four picks, title, mood, setting, spending, budgetCents, totalCents, remainingCents, maximumCents, targetCents, combinationCount, unchanged, customOptions, and estimate notice |

Budget must be a number from 0 through 10000, with at most two decimal places. Setting is optional (defaults to `any`); accepted values are `any`, `indoor`, `outdoor`, and `home`. Each pick supports the selected setting; indoor choices can include at-home ideas. Unknown fields and query parameters are rejected. Errors are JSON with an `error` message: 400 for invalid input, 413 for a body over 4 KB, 422 for no complete affordable plan (with minimumCents when available), and 500 for an unexpected failure. The 4 KB bound accommodates expanded exclusions plus personal ideas and locks.

Additional optional generation fields:

| Field | Format |
| --- | --- |
| mood | `surprise` (default), `cozy`, `adventurous`, `romantic`, or `competitive` |
| spending | `treat` (default) or `flexible`; recorded in saved dates and exports. Older saved dates restore as flexible. |
| excluded | Unique IDs to omit from the current preset/custom catalog |
| locked | Category-to-ID object, e.g. `{"dinner":"dinner-pasta"}` |
| previous | Previous four IDs in dinner/activity/treat/entertainment order; avoids a repeat when alternatives fit |
| customOptions | Up to four objects with id, category, name, costCents, and settings. IDs use `custom-` plus 1–20 lowercase letters/digits/hyphens; names have 1–48 characters; costs are integer cents from 0 to 1000000. Settings are a nonempty unique subset of indoor/outdoor/home. |

Custom ideas are kept for the current visit; saved dates retain a validated copy. Revisit a saved date to restore its custom ideas and remix it. Exclusions and locks reset when revisiting. Reset ideas & locks clears exclusions and locks without deleting custom ideas.

Favorites use the `date-night-mash-favorites-v1` localStorage key on this device and browser. They do not sync across devices or preview/production domains, and clearing site data removes them. Up to 50 distinct combinations can be saved. Original saved plans remain compatible. Corrupt or outdated entries are ignored with a message. Downloads are generated in the browser as SVG cards or plain text; no files are uploaded or stored on the server.

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
