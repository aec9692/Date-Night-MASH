# Date-Night-MASH
Date Night MASH helps couples create a random date plan by choosing dinner, an activity, a treat, and entertainment within their budget.

Group members: Adrainn Coloma, Andrew Russo, Alex Marshall.

## Current version

Deployment foundation: a responsive landing page and a browser check of `GET /api/health`. Date generation, filters, favorites, and downloads are planned features, not yet implemented.

Deployed application URL: pending Vercel import and verification.

## Run locally

Install Node.js 24 LTS, then run:

```bash
npm ci
npm start
```

Open http://localhost:3000. The landing page should display "Connected. The server is ready." The health route at http://localhost:3000/api/health returns `{"status":"ok","app":"Date Night MASH"}`. Use `npm run dev` to restart the server automatically after server file changes. No environment variables or API keys are required; `PORT` is optional and defaults to 3000.

## Deploy on Vercel

After review and merge into `main`, the repository owner should:

1. Sign in to Vercel using GitHub, select the free personal Hobby plan, and import `aec9692/Date-Night-MASH`.
2. Keep the root directory at the repository root. Use the Express framework preset (normally detected automatically), Node.js 24, and the default install settings. There is no build script or generated output directory; do not set a custom output directory. No environment variables are required.
3. Deploy and check both `/` and `/api/health` at the provided public URL. Confirm the page displays the successful server response.
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
