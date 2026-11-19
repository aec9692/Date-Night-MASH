# Verification record

Deployed URL: pending. No deployed-site tests have been executed yet.

## Local checks — November 19, 2026

Passed on Node.js 24.22.3: syntax checks for server.js and public/app.js; live HTTP checks for health JSON and its no-store header, landing page, CSS, JavaScript, and an unknown API route returning JSON with HTTP 404. `npm install express` reported zero dependency vulnerabilities. `git diff --check` passed. These checks do not verify browser rendering or Vercel behavior.

## Deployment foundation checks

Record the URL, date, actual outcome, and any fixes after running these manually on the deployed site. Local checks do not count as deployed results.

| ID | Item | Steps | Expected result | Actual result |
| --- | --- | --- | --- | --- |
| D01 | Landing page | Open the production URL on a laptop. | Title, categories, and connection check appear. | Pending deployment |
| D02 | Health route | Open `/api/health`. | HTTP 200; JSON status is ok and app is Date Night MASH. | Pending deployment |
| D03 | Browser request | Reload `/`; inspect Network for `/api/health`. | GET returns 200; page says server is connected. | Pending deployment |
| D04 | Recheck | Click Check again. | Button disables while loading, then connection result appears and button re-enables. | Pending deployment |
| D05 | Network failure | Use browser developer tools to go offline after loading; click Check again; restore network and retry. | Readable failure message, followed by successful recovery. | Pending deployment |
| D06 | Phone layout | Open `/` at 375px viewport width. | Readable content, no horizontal overflow, usable controls. | Pending deployment |
| D07 | Keyboard | Tab through controls and activate the check button. | Visible focus and keyboard-operable controls. | Pending deployment |
| D08 | Unknown API | Open `/api/not-a-route`. | HTTP 404 with a JSON error. | Pending deployment |
| D09 | Automatic deployment | Merge a reviewed visible change into main. | New production deployment serves that change. | Pending deployment |

Add the remaining application, input-validation, and advanced-feature cases as those milestones are implemented. The final record must contain at least 12 executed deployed-site cases with actual results; see BUILD_PLAN.md.
