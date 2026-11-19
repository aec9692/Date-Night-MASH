# Date-Night-MASH
Date Night MASH helps couples create a random date plan by choosing dinner, an activity, a treat, and entertainment within their budget.

Group members: Adrainn Coloma, Andrew Russo, Alex Marshall.

## Current version

The application generates a four-part date within a total budget for two. It includes 24 curated ideas, setting filters, favorites saved in this browser, and downloadable text plans. All costs are USD estimates; free ideas rely on items or access you already have. No accounts, database, API keys, or paid services are used.

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

| Route | Input | Response |
| --- | --- | --- |
| GET /api/health | None | Application name and status |
| GET /api/options | None; query parameters rejected | Categories, setting values, 24 options, and price basis |
| POST /api/generate | JSON such as `{"budget":50,"setting":"outdoor"}` | Four picks, setting, budgetCents, totalCents, remainingCents, and estimate notice |

Budget must be a number from 0 through 10000, with at most two decimal places. Setting is optional (defaults to `any`); accepted values are `any`, `indoor`, `outdoor`, and `home`. Each pick supports the selected setting; indoor choices can include at-home ideas. Unknown fields and query parameters are rejected. Errors are JSON with an `error` message: 400 for invalid input, 413 for a body over 2 KB, 422 for no complete affordable plan (with minimumCents when available), and 500 for an unexpected failure.

Favorites use the `date-night-mash-favorites-v1` localStorage key on this device and browser. They do not sync across devices or preview/production domains, and clearing site data removes them. Up to 50 distinct combinations can be saved. Corrupt or outdated entries are ignored with a message. Downloads are generated in the browser as plain text; no files are uploaded or stored on the server.

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
