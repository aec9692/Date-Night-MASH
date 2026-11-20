# Group demo and individual report preparation

Repository: https://github.com/aec9692/Date-Night-MASH

Public app: pending. Unlisted video: pending. This checklist is preparation, not shared report prose or a claim of submission.

## Record one group demo

Use the deployed HTTPS URL, not localhost. Verify the recording link opens for someone outside your account. Suggested sequence; reassign speaking sections to reflect actual work, and ensure all three members speak:

1. Introduce the purpose and intended users; show the public URL in the address bar.
2. Open DevTools Network. Enter $50, choose a date/setting and generate. Show the POST /api/generate JSON request and response, then the four displayed picks and budget arithmetic.
3. Show rejected input and visible error. A browser may block invalid numeric input before sending it; also show a server-side rejected request with a missing/string budget using the deployed console helper in DEPLOYED_ACCEPTANCE.md. Contrast 400, malformed JSON, 413 and no-plan 422 accurately.
4. Demonstrate designated feature 1: save a favorite, reload, restore and remove it.
5. Demonstrate designated feature 2: generate indoor, outdoor and at-home examples; show that selections respect the server filter. A no-plan response is legitimate for restrictive choices; use known feasible examples established during deployed testing.
6. Demonstrate designated feature 3: download/read the PDF and text, including budget and source links. No upload occurs.
7. Explain actual code: app.js request/generate → server.js POST route → planner.js validation/selection → JSON → app.js renderResult. Include integer cents, finite/bounded selection and readable failures. Show the files, not just a diagram.
8. Briefly explain limitations: estimated prices, approximate town-center routing, unconfirmed bookings/hours, browser-local favorites/reviews/votes. Optional extras can be shown after required features; they do not replace the three designated demonstrations.

No particular video length is specified in the supplied rubric. Each member should answer questions about any module, not only their speaking section.

## Each student writes a separate report

Start with three clickable links: repository, deployed app, group demo. Do not use pending links in the submitted report. Write all prose independently; shared screenshots/diagrams are allowed.

Use these questions to prepare your own sections:

- Description/users: what problem does the app solve, for whom, and how does the main flow help?
- Request flow: what exactly happens for one user action? Name the actual route, files, request fields, validation, selection and rendering. Inspect Network and explain the returned cents/total yourself.
- Testing/results: which deployed cases did you execute, on what device and URL? What failed, how was it fixed, and what passed on retest? Distinguish local automation from manual public-site testing.
- Limitations/future work: what is estimated or unverified, which data is device-local, and what has not been implemented/tested? Explain the deployment-order deviation honestly.
- Codex use: select three specific prompts you actually used, what changed, and one actual Codex mistake you detected and fixed. DEVELOPMENT_NOTES.md supplies factual evidence to consult, not paragraphs to copy.
- Contribution: which commits/PRs, tests, code or research did you personally contribute? Suggested ownership does not establish authorship.
- Screenshots: include readable deployed laptop and phone views, with device/browser/viewport and date recorded. Capture planning, results/error and advanced features as needed. Do not label a simulated view as a physical phone.
- References: cite the assignment, Express, jsPDF, Vercel documentation, actual providers/venue sources, and Codex/other AI tools used. README.md, DATA_SOURCES.md and LOCATION_SEARCH.md provide source links to check.

## Before each individual Canvas submission

- Confirm idea/proposal approval and the earlier proposal submission status.
- Add the third GitHub collaborator and confirm accepted write access.
- Confirm the instructor counts the three designated features as advanced; the pasted rubric does not provide its qualifying list.
- Confirm deployed URL and Git-triggered redeployment evidence, and update README.md.
- Finish every applicable deployed acceptance row and phone case; TESTING.md must contain actual results for at least 12 cases and all required coverage.
- Confirm every member can explain any code section, and every member speaks in the unlisted group video.
- Write and proofread your own report, verify all leading links and screenshots, submit by the stated December 21 11:59 PM deadline, and verify Canvas receipt.
