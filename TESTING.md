# Verification record

Deployed URL: pending. No deployed-site tests have been executed yet.

## Local checks — November 19, 2026

Passed on Node.js 24.22.3: syntax checks for server.js and public/app.js; live HTTP checks for health JSON and its no-store header, landing page, CSS, JavaScript, and an unknown API route returning JSON with HTTP 404. `npm install express` reported zero dependency vulnerabilities. `git diff --check` passed. These checks do not verify browser rendering or Vercel behavior.

Full application: `npm test` passed 23 automated HTTP tests, covering catalog integrity, valid generation, all four settings, budget boundaries, arithmetic, wrong types, missing/extra input, fractional cents, malformed and oversized JSON, unsupported methods, and unknown routes. Browser-script DOM simulation passed catalog rendering, generation, exact $17 outdoor minimum, insufficient budget, input preservation, save/deduplicate/reload/remove, current and saved downloads, network failure, corrupt data, and unavailable storage. The simulation used a temporary jsdom installation under ignored .tools; it is not a manual browser or deployed-site check.

Failure and fix: the first DOM simulation showed a raw network exception message instead of the intended connection guidance when an exception crossed JavaScript realms. The client now recognizes network exceptions by their error name. The complete DOM simulation passed after that change.

## Game upgrade local checks — November 19, 2026

`npm test` passed all 43 HTTP tests. Added checks cover mood preferences, possibility counts, locked picks, changing exactly one category, explicit unchanged results, exclusion failures, custom-idea snapshots, tampered custom data, and the maximum UI request fitting under 2 KB.

The updated jsdom simulation passed slider synchronization, mood selection, exclusions, custom ideas, safe rendering of special characters, locks, rerolls preserving three picks, existing and custom favorites, both download formats, network/storage failures, full reveal completion, skip reveal, reduced-motion bypass, and duplicate-submission prevention. The generated SVG was parsed as XML and checked for escaped user text and absence of scripts. A duplicate SVG namespace caused the first parse to fail; letting XMLSerializer declare the namespace fixed it, and the full simulation passed on rerun.

Real-browser visual checks and manual deployed tests remain pending. Browser control returned a native-pipe-unavailable error; no phone/laptop screenshots or manual rendering results are claimed.

## Deployment foundation checks

Record the URL, date, actual outcome, and any fixes after running these manually on the deployed site. Local checks do not count as deployed results.

| ID | Item | Steps | Expected result | Actual result |
| --- | --- | --- | --- | --- |
| D01 | Landing page | Open the production URL on a laptop. | Hero, mood/budget controls, playable idea decks, and saved dates appear. | Pending deployment |
| D02 | Health route | Open `/api/health`. | HTTP 200; JSON status is ok and app is Date Night MASH. | Pending deployment |
| D03 | Browser request | Enter $50, submit Play MASH, and inspect Network. | POST /api/generate returns 200; four picks and total appear. | Pending deployment |
| D04 | Generate again | Generate, then click Generate again. | Submission buttons disable while loading; a valid plan appears and controls re-enable. | Pending deployment |
| D05 | Network failure | Go offline after loading; generate; restore network and retry. | Readable failure message, preserved inputs, then successful recovery. | Pending deployment |
| D06 | Phone layout | Open `/` at 375px viewport width. | Readable content, no horizontal overflow, usable controls. | Pending deployment |
| D07 | Keyboard | Tab through mood choices, budget, setting, play, skip, lock/reroll, and download controls. | Visible focus and keyboard-operable controls. | Pending deployment |
| D08 | Unknown API | Open `/api/not-a-route`. | HTTP 404 with a JSON error. | Pending deployment |
| D09 | Automatic deployment | Merge a reviewed visible change into main. | New production deployment serves that change. | Pending deployment |

## Application acceptance checks

All actual results below remain pending a public deployment and manual verification.

| ID | Item | Steps | Expected result | Actual result |
| --- | --- | --- | --- | --- |
| A01 | Budget input | Submit empty, negative, non-number, $10,000.01, and 1.234 values; then submit $50. | Invalid values rejected visibly; $50 succeeds. | Pending deployment |
| A02 | Budget boundaries | Submit $0 with Any, Indoor, and Home; then $10,000. | Four affordable picks; correct totals and remaining budget. | Pending deployment |
| A03 | Minimum affordable outdoor plan | Submit Outdoor with $16.99, then $17. | Helpful $17 minimum error, then successful plan totaling $17. | Pending deployment |
| A04 | Filters | Generate with every setting. | Every pick supports the selected setting; catalog eligibility updates. | Pending deployment |
| A05 | Server input validation | In developer tools send missing budget, string budget, unknown field, and unsupported setting to POST /api/generate. | Each returns JSON error with HTTP 400. | Pending deployment |
| A06 | Malformed request | POST malformed JSON with application/json content type. | Readable JSON error, HTTP 400. | Pending deployment |
| A07 | Oversized request | POST a JSON body over 2 KB. | Readable JSON error, HTTP 413. | Pending deployment |
| A08 | Options validation | GET /api/options, then /api/options?unexpected=true. | Valid catalog with 24 options; query rejected with HTTP 400. | Pending deployment |
| A09 | Unsupported methods | POST /api/health and GET /api/generate. | JSON error, HTTP 404. | Pending deployment |
| A10 | Favorites | Save a result twice; reload; remove it. | One entry persists after reload; removal persists. | Pending deployment |
| A11 | Storage failure | Set favorites key to invalid JSON; reload. Block browser storage; generate and attempt save. | Helpful messages; generation and downloading still work. | Pending deployment |
| A12 | Download | Download current and saved plans; open the text files. | Four picks, item estimates, budget, total, remainder, and estimate notice match. | Pending deployment |
| A13 | Mobile screens | At 375px, generate a plan and save it; inspect form, results, catalog, and favorites. | No horizontal overflow; readable and operable controls throughout. | Pending deployment |
| A14 | Keyboard | Complete the flow using Tab, Shift+Tab, Enter, and Space. | Visible focus, working controls, accessible status messages. | Pending deployment |
| A15 | Initial load failure | Block /api/options and reload; unblock and click Retry loading ideas. | Helpful error followed by recovery; no broken generation controls. | Pending deployment |

Add the remaining application, input-validation, and advanced-feature cases as those milestones are implemented. The final record must contain at least 12 executed deployed-site cases with actual results; see BUILD_PLAN.md.

## Game upgrade manual acceptance checks

| ID | Item | Steps | Expected result | Actual result |
| --- | --- | --- | --- | --- |
| G01 | Mood and budget | Choose each mood; move slider; type $250 and $35.25 directly. | Mood selects visibly; number and slider stay synchronized within the slider's stated $200 range; valid typed budgets are respected. | Pending deployment |
| G02 | Possibility count | Change budget and setting; exclude/restore ideas; lock picks. | Live count matches the current feasible set; empty categories and insufficient budgets explain the issue. | Pending deployment |
| G03 | Reveal | Play, watch all four categories, then play and skip midway. | Nonwinners cross out, winners reveal; skip resolves immediately with the server-selected result; no duplicate request. | Pending deployment |
| G04 | Reduced motion and sound | Enable system reduced motion and play; test Skip the suspense; opt in/out of sound. | Reduced motion bypasses reveal/confetti; sound is off by default and follows the toggle where supported. | Pending deployment |
| G05 | Locks | Lock dinner, regenerate, then unlock. Lock all four and regenerate. | Locked dinner persists; all-four-locked case explicitly explains unchanged result. | Pending deployment |
| G06 | Single-category reroll | Reroll a category with an alternative; constrain the budget to remove alternatives and try again. | Other three picks stay identical and budget holds; unavailable alternative is explained honestly. | Pending deployment |
| G07 | Exclusions | Exclude every dinner; play; restore one or reset. | Helpful no-dinner error; restoring ideas recovers; reset clears locks and exclusions. | Pending deployment |
| G08 | Personal ideas | Add four custom ideas with valid names/costs/settings; attempt fifth and invalid prices. | Four supported; extra/invalid ideas rejected; custom ideas can be excluded and removed. | Pending deployment |
| G09 | Custom favorites | Generate a custom pick, save, reload, revisit, and reroll. | Saved custom snapshot survives; revisit restores personal ideas; validated rerolls work. | Pending deployment |
| G10 | Date-card export | Download current and saved SVG cards with long/custom text; open in browser and print preview. Also download text. | Well-formed readable cards with correct names, estimates, total, and budget; text version remains available. | Pending deployment |
