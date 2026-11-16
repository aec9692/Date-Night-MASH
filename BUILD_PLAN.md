# Date Night MASH build plan

Repository: https://github.com/aec9692/Date-Night-MASH

Target: a publicly deployed, responsive HTML/CSS/JavaScript application backed by Express. No database, accounts, paid services, or external APIs are needed.

## Milestone 1: deployment foundation — November 16–20

1. Confirm the repository is public and all three members are collaborators.
2. Install Node.js LTS if unavailable; initialize package.json and install Express. Commit the generated lockfile.
3. Add root server.js, public/index.html, a start script, and .gitignore entries for node_modules, .env files, and .vercel.
4. Create a minimal landing page and GET /api/health returning a simple success response. Keep this route read-only and input-free.
5. Push to main. In Vercel, sign in with the repository owner's GitHub account, select the free Hobby plan, and import this repository. Use the repository root and the documented Express configuration; do not add legacy routing configuration unless needed.
6. Confirm the production branch is main and Git deployments are enabled. Record the public URL in README.md.
7. Push a visible small change and confirm a new deployment appears and the public page updates.

Exit check: public page and health response work; a Git push triggers deployment. Verify before adding the application routes.

Vercel setup requires the owner's authenticated account and any GitHub authorization presented during import. Never request or commit account tokens. If access is unavailable, leave setup explicitly pending.

## Milestone 2: server contract and selection — November 21–25

- Add data/options.json with approximately six entries per category. Each has a stable ID, category, display name, estimated cost in cents, and supported setting tags. Include useful free options and review prices for two people.
- GET /api/options returns the catalog.
- POST /api/generate accepts, for example, {"budget":50,"setting":"any"}. It returns one option per category, totalCents, remainingCents, and an estimate notice.
- Parse and validate input; restrict body size and allowed fields. Translate dollars to integer cents after validating decimal precision.
- Filter by setting, enumerate complete combinations, keep those within budget, and randomly choose one.
- Return helpful JSON errors for invalid input, malformed JSON, oversized bodies, and impossible budgets. If a filtered category is empty, explain that the selected setting has no complete plan.

Exit check: use browser developer tools on the deployed site to demonstrate valid and invalid requests and a result that never exceeds budget.

## Milestone 3: usable minimum application — November 26–December 2

- Build public/styles.css and public/app.js with accessible labels, budget input, catalog grid, generation controls, and results.
- Fetch options from the server and submit generation requests using fetch.
- Show loading and readable server/network errors. Keep budget input when requests fail.
- Display the four picks, estimated total for two, and budget remaining. Allow Generate Again.
- Use a responsive grid, visible keyboard focus, readable contrast, and touch-friendly buttons.

Exit check: complete the main flow on the deployed site at phone and laptop sizes; invalid input has a visible error.

## Milestone 4: three approved advanced features — December 3–10

Suggested owners, subject to reassignment:

| Owner | Feature | Acceptance criteria |
| --- | --- | --- |
| Adrainn | Favorites | Save, view, and remove plans; survive reload; handle duplicate saves and unavailable/corrupt storage; clearly say saved on this device. |
| Andrew | Setting filters | Any, indoor, outdoor, and at-home controls; server validates filter; every returned pick supports it; empty results explain the issue. |
| Alex | Download | Download a text file containing all four picks, item estimates, total, and estimate notice; works for current and saved plans. |

Exit check: each feature is manually demonstrated on the deployed site. Each member can explain its browser/server behavior.

## Milestone 5: testing and polish — December 11–16

Create TESTING.md and execute at least these cases on the deployed site. Add cases as needed so every input, route, page, and advanced feature is covered. Record actual results and fixes, then rerun failures.

1. Public landing page and health route load.
2. Options route returns all four categories and correct price units.
3. Valid budget returns four picks within the limit.
4. Exact minimum budget and a $0 budget behave correctly.
5. Empty budget is rejected.
6. Negative budget is rejected.
7. Text, wrong types, null, missing fields, and excessive decimal precision are rejected.
8. Budget above $10,000 is rejected.
9. Malformed JSON is rejected with a readable error.
10. Oversized JSON body is rejected.
11. Each supported setting returns matching picks; unsupported values are rejected.
12. No affordable combination gives a helpful message.
13. Save, reload, view, duplicate-save, and remove favorites.
14. Corrupt/unavailable browser storage does not break generation.
15. Download current and saved plans and inspect their text.
16. Every screen works at phone and laptop sizes and with keyboard navigation.
17. Network failure and repeated clicks produce usable states.
18. A push to main produces a new production deployment.

Optional only after required work passes: a MASH crossing-out animation, with reduced-motion support and an immediate-result alternative.

## Milestone 6: submission — December 17–21

- Complete README.md, AGENTS.md, and TESTING.md; confirm repository and deployment URLs work publicly.
- Record one narrated group demo with every member speaking and all required demonstrations.
- Each member writes their own report with repository, app, and video links first; request flow naming files; testing and fixes; limitations; individual contribution; phone/laptop screenshots; references; and three useful Codex prompts plus one error and its fix.
- Recheck the deployed site and submit individual reports by Monday, December 21 at 11:59 PM (course deadline).

## Proposed file layout

```text
server.js
package.json
package-lock.json
data/options.json
public/index.html
public/styles.css
public/app.js
.gitignore
README.md
AGENTS.md
BUILD_PLAN.md
TESTING.md
```

## Current setup status

- Existing repository remote: aec9692/Date-Night-MASH, branch main.
- Initial repository contains only README.md; this task adds planning documents.
- Node.js, npm, GitHub CLI, and Vercel CLI were not found on the current shell PATH during initial inspection.
- Vercel account connection, project import, deployment, and automatic redeployment remain unverified. Do not treat this plan as a deployed application.

## Deployment references

- Express on Vercel: https://vercel.com/docs/frameworks/backend/express
- Git integration and automatic deployments: https://vercel.com/docs/git
- Collaboration and commit-author restrictions: https://vercel.com/docs/deployments/troubleshoot-project-collaboration

Check current Hobby collaboration rules when connecting the three-person repository. Do not alter commit authorship to bypass restrictions or upgrade to a paid plan. Verify the expected deployment behavior for each member's contribution.
