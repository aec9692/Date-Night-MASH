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
- Each task ends with a commit and a push.
- Use free plans only. Never enter a credit card or add paid APIs or services.
- No file uploads. Reference images by URL. Do not collect sensitive personal data.
- No database or user accounts are planned. Favorites stay on the current browser/device.
- If a database or accounts are later approved: read the database connection string from process.env.DATABASE_URL; parameterize all SQL queries; hash passwords with bcrypt; store sessions in the database, never server memory.
- Build in this order: deployment, server route, application features, advanced features. Verify each stage on the deployed site before starting the next.
- Keep code small and understandable so every member can explain it.

## Application behavior

- All costs are USD estimates for two people. Store and compare money as integer cents.
- Accept a finite numeric budget from $0 to $10,000 with at most two decimal places. Reject missing, negative, oversized, malformed, and unexpected input.
- Limit JSON bodies (for example, 2 KB); return readable JSON errors for malformed JSON and oversized bodies.
- Accept only documented setting values: any, indoor, outdoor, home. A plan's four options must each support the selected setting.
- Select one option per category, then choose randomly among complete combinations at or below budget. Never rely on an unbounded random retry loop.
- Distinguish invalid requests (400), oversized bodies (413), no affordable combination (422), and unexpected server failures (500).
- Preserve form values on errors. Show loading, success, empty, and failure states; prevent duplicate submissions.
- Render data using safe DOM APIs. Validate stored favorites when loading and handle unavailable browser storage gracefully.
- Download client-generated text; do not introduce server file storage.

## Delivery and verification

- See BUILD_PLAN.md for milestones, acceptance criteria, and setup steps.
- Use the connected GitHub repository and Vercel Git integration. Production branch: main. Do not claim a push or deployment succeeded without evidence.
- Verify all behavior manually on the deployed site at phone and laptop sizes. If direct access is unavailable, ask for browser console errors, Vercel logs, and observed results; leave verification pending.
- Maintain TESTING.md with at least 12 executed deployed-site cases: ID, item, steps, expected result, actual result. Cover every input and server route with valid/invalid data, each advanced feature, and every page on a phone. Never invent results.
- README.md must include description, members, deployed URL, and local run instructions.
- Record three useful Codex prompts and one Codex error with its detection and fix for individual reports.
- Each student writes their own report. Reports begin with repository, deployment, and shared demo-video links. Do not write shared report prose for submission by multiple students.
- The group demo must show the deployed app, main flow, request/response in developer tools, rejected input, all advanced features, a code explanation, and every member speaking.
