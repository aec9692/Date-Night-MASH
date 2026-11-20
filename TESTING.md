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

## Variety and spending local checks — November 19, 2026

`npm test` passed all 51 HTTP tests after expanding to 65 ideas. New checks exercise $1,000 budgets across all settings/moods, near-budget plans from $25 through $10,000, flexible mode retaining cheap/free choices, constrained attainable maxima, memory-efficient preview counts, invalid spending modes, and budget-aware single-category rerolls. A boundary regression verifies that a $100 budget with a $92 attainable total must not fall back to an $88 plan: the 90% target takes priority whenever it is reachable. The request limit is now 4 KB to accommodate expanded exclusions plus custom ideas and locks; an oversized 6 KB payload is rejected and the maximum UI preferences fit under the new bound.

The DOM simulation covers the larger catalog, search, premium-price browsing, the $1,000 quick preset and slider, a generated $900–$1,000 total, flexible-mode feedback, and a constrained $800 maximum under a $1,000 budget. It also retains the existing lock/reroll, favorites, export, network/storage, and reveal checks. These are simulated interactions; real-browser visual checks and all deployed acceptance cases remain pending.

## All-category expansion local checks — November 19, 2026

Expanded to 96 ideas, exactly 24 in each category. All 51 HTTP tests passed with the updated catalog, including maximum request size, $1,000 budget targets, locks/rerolls, custom ideas, and spending modes. The full DOM simulation passed after verifying 24 rendered options in every deck, searching, premium-price browsing, the 97th custom idea, saved dates, exports, reveals, and error handling.

The maximum-budget preview counted 331,776 possible combinations while retaining zero plans, measured once at 35 ms in the local Node runtime. This is local diagnostic evidence, not a browser performance guarantee. Server enumeration now retains only the final spending subset; the client no longer builds every plan again for the reveal. Real-browser visual and deployed-site checks remain pending.

## Paterson places and PDF local checks — November 19, 2026

A clean `npm ci` succeeded, ran the asset-copy postinstall, and reported zero vulnerabilities. All 58 automated HTTP tests passed. New checks cover the 18 source-linked NJ choices, price-component arithmetic, known opening weekdays, calendar/area validation, real local $1,000 estimates, original-deck compatibility, Unicode custom payload bounds, and local PDF-library delivery.

Both original-game and local-place DOM simulations passed. Local checks included default NJ decks, venue/source details, date-specific closures, PDF download MIME/header, native-file-share simulation and download fallback, saved area/date restoration, canonical replacement of tampered source links, and switching original/mixed decks. Native iPhone/Android operation has not been tested.

Phone compatibility uses AbortController-based timeouts instead of requiring AbortSignal.timeout, a custom-ID fallback when crypto.randomUUID is absent, and a classic own-property check. DOM checks exercise missing newer APIs; PDF links open a new context when a browser ignores the download attribute. These checks do not substitute for real iOS/Android testing.

The PDF sample was parsed and rendered to five PNG pages with PDF.js/canvas. All pages were visually inspected; the updated premium-order overview/detail pages were inspected after the final data change. The final file was 9,762 bytes, had five phone-width pages, eight HTTPS source/map links, complete price breakdowns, and no text outside page bounds. A cleanup mismatch in the QA helper was corrected to destroy the loading task; it did not affect the application PDF. Standard-font loading was corrected to use a native filesystem path before final rendering.

The web-browser inspection tool failed with `Module not found: @oai/cua/tinyskyAlt`; real browser rendering, manual deployed cases, and actual phone Files/share flows remain pending. No App Store or public Vercel deployment is claimed.

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
| A07 | Oversized request | POST a JSON body over 8 KB. | Readable JSON error, HTTP 413. | Pending deployment |
| A08 | Options validation | GET /api/options, then /api/options?unexpected=true. | Combined catalog has 146 ideas: 96 original and 50 local; query rejected with HTTP 400. | Pending deployment |
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
| G01 | Mood and budget | Choose each mood; move slider; type $2,500 and $35.25 directly. | Mood selects visibly; number and slider stay synchronized within the slider's stated $1,000 range; valid typed budgets are respected. | Pending deployment |
| G02 | Possibility count | Change budget and setting; exclude/restore ideas; lock picks. | Live count matches the current feasible set; empty categories and insufficient budgets explain the issue. | Pending deployment |
| G03 | Reveal | Play, watch all four categories, then play and skip midway. | Nonwinners cross out, winners reveal; skip resolves immediately with the server-selected result; no duplicate request. | Pending deployment |
| G04 | Reduced motion and sound | Enable system reduced motion and play; test Skip the suspense; opt in/out of sound. | Reduced motion bypasses reveal/confetti; sound is off by default and follows the toggle where supported. | Pending deployment |
| G05 | Locks | Lock dinner, regenerate, then unlock. Lock all four and regenerate. | Locked dinner persists; all-four-locked case explicitly explains unchanged result. | Pending deployment |
| G06 | Single-category reroll | Reroll a category with an alternative; constrain the budget to remove alternatives and try again. | Other three picks stay identical and budget holds; unavailable alternative is explained honestly. | Pending deployment |
| G07 | Exclusions | Exclude every dinner; play; restore one or reset. | Helpful no-dinner error; restoring ideas recovers; reset clears locks and exclusions. | Pending deployment |
| G08 | Personal ideas | Add four custom ideas with valid names/costs/settings; attempt fifth and invalid prices. | Four supported; extra/invalid ideas rejected; custom ideas can be excluded and removed. | Pending deployment |
| G09 | Custom favorites | Generate a custom pick, save, reload, revisit, and reroll. | Saved custom snapshot survives; revisit restores personal ideas; validated rerolls work. | Pending deployment |
| G10 | PDF export | Download current and saved PDFs with long/custom text; open in phone Files/PDF viewer. Also download text. | Readable itinerary, correct estimates/budget, clickable local source/map links; text remains available. | Pending deployment |
| V01 | Larger activity catalog | Browse Activity and use search for pottery, kayak, and spa. | 24 varied activity choices; matching search results; no unintended exclusions. | Pending deployment |
| V02 | Premium browsing | Choose Over $200, browse each category, then restore All price ranges. | Premium ideas are easy to find; generation eligibility stays unchanged. | Pending deployment |
| V03 | Treat us | Choose $1,000 and Treat us; generate across moods/settings. | Estimated totals stay at $900–$1,000 when choices allow, never above budget. | Pending deployment |
| V04 | Flexible mode | Switch to Flexible, generate, save, reload, and revisit. | Any affordable total can win; spending style persists; prior saved dates remain compatible. | Pending deployment |
| V05 | Limited spending potential | Lock three free picks, set $1,000, and generate. | Near the highest attainable remaining pick; explanation identifies the maximum without inflated prices. | Pending deployment |
| V06 | Quick budget controls | Use $25/$50/$100/$250/$500/$1,000 buttons, slider, and a typed $2,500. | Values and selected state stay synchronized; slider cap is clearly stated. | Pending deployment |
| NJ01 | Local choices | Load the default Paterson deck and inspect all four categories. | 50 NJ ideas per category, official sources, checked dates, addresses, and explicit price components; original/mixed decks remain available. | Pending deployment |
| NJ02 | Known closed days | Select a Monday or Saturday and try locked venues closed on that day. | Known closed options are not generated; errors explain the constraint; holidays/showtimes still require checking. | Pending deployment |
| NJ03 | Phone sharing | On deployed HTTPS, generate and share/download PDFs on iPhone and Android; test native-share cancellation and unsupported sharing. | PDF opens in a normal viewer, can be saved/shared, cancellation is harmless, and unsupported file sharing downloads instead. | Pending deployment |
| NJ04 | Route/price verification | Open each source and map link for a generated NJ plan before a visit. | Correct public venue addresses and source basis; confirm live traffic, fees, hours, and actual availability separately. | Pending deployment |

## NJ discovery and phone companion — November 19, 2026

Local checks (not deployed acceptance): the 65-test Node suite passed, including weighted streaming selection, large mixed-deck selection without retained candidate arrays, local quantity/closure restrictions, home-screen assets, opt-in rolling notes, mute/skip/page-leave cancellation, and existing route/input/favorite behavior. One parallel run had a transient ECONNRESET in a local HTTP request; the full rerun passed. New static asset assertions also cover the companion script, manifest and PNG icon.

Three jsdom suites passed: original game, local places/PDF/native-share fallback, and the new mobile interactions. The new suite checked town chips, category tabs, official-price previews, build-around locks, an honest minimum-budget message before raising the budget, generated locked picks, date navigation, three-waypoint map links, conversation prompts, four-stop completion/undo, per-visit progress, and favorites. These do not prove mobile rendering or audible playback. Two initial QA assertions had incorrect expectations (Wayne contains seven choices; a locked dinner above the default budget should show the minimum needed); the checks were corrected to match the catalog and expected behavior.

All 50 local PDF detail pages were parsed and checked for text within page bounds. The representative Ice Vault, Gravity Vault, and Luciano pages were rendered and visually inspected without clipping or overlap. The existing five-page premium sample still renders successfully. Home-screen icon was inspected.

Actual iPhone/Android rendering, audible playback, Safari home-screen installation, native PDF share/Files behavior and manual public-site cases remain pending. Browser control still fails with Module not found: @oai/cua/tinyskyAlt. No public Vercel or App Store deployment is claimed.

Additional deployed cases to execute:

| ID | Item | Steps | Expected result | Actual result |
| --- | --- | --- | --- | --- |
| A20 | Town/category browsing | On a phone choose Wayne, then Activity, then Every town. | Relevant visible choices and pressed states; generation mix unchanged. | Pending deployment |
| A21 | Build around a venue | Open Nicola’s details, keep it, raise budget to $200 and generate. | Source visible; selected dinner preserved; total fits. | Pending deployment |
| A22 | Rolling sound | Enable sound, generate, mute during roll; repeat and skip. | Rolling ticks and reveal notes only when enabled; mute/skip stops sound promptly. | Pending deployment |
| A23 | Date companion | Generate; Take this date out; complete/undo four stops; switch a stop and prompt. | Accessible stop navigation, correct progress, route and conversation text. | Pending deployment |
| A24 | Phone safe areas | At 320/390/430px and landscape, open result, preview and keyboard. | Readable single-column cards; no clipped controls or bottom-nav overlap; keyboard usable. | Pending deployment |
| A25 | Home-screen launch | Add from Safari/phone browser and launch icon. | Correct icon and standalone website; live generation requires connection. | Pending deployment |

## Fifty-per-category expansion — November 19, 2026

Executed locally in the isolated north-jersey-catalog checkout: 69 Node tests passed. New coverage checks exactly 50 NJ ideas in each category, all fifteen requested towns, 99 venue/route identifiers, inexpensive price coverage, known holiday/winter restrictions, corrected addresses and lunch weekdays, 120 independently brute-forced constrained fixtures, and every weighted ticket in a small fixture. Existing input/route, 8 KB payload, budget, locks, rerolls, original-catalog, sound and PDF-library tests passed.

Executed three jsdom interaction suites against this checkout’s Express app: original game; local catalog/source/favorites/PDF/share fallback; town/category/preview/lock/date-companion interactions. New Free/Under $15/Under $30 controls showed only matching prices and did not alter inclusion. Local/mixed counts were 200/296. These are simulated interactions, not rendered real-phone tests.

Generated and parsed all 200 local PDF detail pages: all text stayed within the page bounds. Five representative new pages (dinner, pastry, mini-golf, VR and a public waterfront visit) were rendered and visually inspected with readable text and no clipping/overlap. Visual review caught a shared builder-object mistake that copied a breakfast-hours note into other meals; independent row configuration corrected it, and catalog coverage now checks the dinner note.

| ID | Item | Steps | Expected | Actual |
| --- | --- | --- | --- | --- |
| X01 | Expanded catalog | GET /api/options and inspect category/town counts. | 200 NJ ideas, 50 per category; original 96 preserved; all requested towns. | Passed locally, 69-test suite. |
| X02 | Affordable browsing | In DOM simulation select Free, Under $15 and Under $30. | Every visible option fits the chosen tier; restore All. | Passed locally. |
| X03 | Picker equivalence | Compare 120 small constrained fixtures to independent complete enumeration; inspect weighted-ticket frequencies. | Same counts, maxima, spending bands and candidate weights. | Passed locally. |
| X04 | Closure dates | Check Thanksgiving, aviation winter endpoints, Edison winter and Imperial Monday. | Known closed options excluded on both sides. | Passed locally. |
| X05 | Full PDF deck | Generate one PDF detail page for every NJ entry; parse bounds; render representative pages. | Readable text within page bounds and correct source links. | All 200 passed; five rendered and inspected. |

Public-site checks, actual iPhone/Android rendering, audible playback and native sharing remain pending. The browser-control runtime is unavailable; no Vercel deployment is claimed.

## Practical date planning upgrade — November 19, 2026

Executed locally in the isolated smart-date-planning checkout: **83 Node tests passed**. This includes the previous 69 tests, ten new itinerary/data/input cases, three service-worker simulations and a background-count equivalence case. The numeric itinerary search matched independent complete enumeration across 48 small cases with different formats, start times, orders, distances, budgets and previous picks. The maximum documented Unicode/custom/exclusion/journey request fit the unchanged 8 KB parser. No local catalog prices or original ideas were changed.

Four jsdom suites passed: the new student/couple flow, original game, legacy local-place/PDF/native-share fallback, and existing phone-companion interactions. The new flow exercised default teen/alcohol-free quick planning; 43 town choices; grouped variants and attributed photo cards; two/three/four-stop generation; PDF, invitation and calendar downloads; New Jersey daylight-saving conversion; private shared-phone turns and cuisine compromise; reasoned rerolls; tried history; dynamic companion completion; stop-order validation; saved short-date restoration and canonical source/address replacement. An initial legacy-suite assertion used the new two-stop default while expecting an old four-stop $1,000 plan; that regression fixture was explicitly set to legacy mode and passed. These checks do not establish real browser rendering.

PDF checks: all 200 existing local detail pages passed text bounds. Timed quick/evening/full exports produced three/four/five pages; all twelve pages passed bounds, and six overview/detail pages were rendered and visually inspected. Category colors were corrected to follow the category rather than position, then re-rendered. No clipping/overlap was observed in the inspected pages.

Offline simulations verified shell/catalog cache hits after installation, network refresh, deletion limited to owned old caches, uncached-catalog JSON 503, and exclusion of generated POSTs/external URLs. Real Safari/Android installation, airplane-mode reload and native file handling remain pending.

All six small photo renditions returned HTTP 200 image/jpeg in source research. Attribution/license URLs and all town coordinates passed structural checks. The preview at http://localhost:3002 returned 200 for /, /api/health, /api/options, the new journey/UI/count-worker/service-worker scripts and local PDF library. A live local $50 quick request returned two NJ picks, teen preferences and a suggested 17:00–19:23 itinerary at $48.33; this is one observed randomized result, not a fixed expected price.

The widest $10,000 mixed full-day search counted 17,966,394 valid combinations. The first implementation took about 17.47 seconds locally; numeric precomputation reduced it to about 0.94 seconds with the same count and zero retained complete candidate plans. This is a development-computer measurement, not a production/phone guarantee.

| ID | Item | Steps | Expected | Actual |
| --- | --- | --- | --- | --- |
| S01 | Quick date | Generate default $50 quick plan. | Dinner/treat, total within budget, suggested visits. | Passed local HTTP and DOM. |
| S02 | Evening/full | Select each format and suitable start. | Three/four categories and matching companion/PDF length. | Passed local HTTP and DOM. |
| S03 | Nearby coherence | Set origin/radius/leg limits; inspect selected stops. | All local stops within representative-point radius; later legs respect limit. | Passed automated local checks. |
| S04 | Time constraints | Try late start and daytime-menu locks. | Incompatible plans rejected without inventing availability. | Passed local 422/eligibility cases. |
| S05 | Preferences | Select cuisine, vegetarian-oriented meals and low effort. | Matching tagged candidates only; ingredient/policy caveats remain. | Passed local tests. |
| S06 | Audience | Compare teen, 18+ and 21+ preferences. | Adult-only ideas excluded for teens; 18+ does not qualify for 21+; teen finish by 21:00. | Passed local tests. |
| S07 | Both pick | Complete both shared-phone turns. | First form hidden/reset; both mood weights/either cuisine considered. | Passed DOM and weighted-fixture checks. |
| S08 | Place discovery | Browse venue groups and spotlight cards. | Variants grouped, individual controls retained, source/license visible. | Passed DOM/structural checks; real rendering pending. |
| S09 | Ordering | Move a stop earlier/later. | Valid order accepted; incompatible order leaves prior plan intact. | Passed DOM and independent enumeration. |
| S10 | Replacement reason | Select Not our thing; inspect returned picks. | Target changes, other picks remain when valid. | Passed DOM. Other reasons use documented local filters. |
| S11 | Tried places | Mark plan tried; enable novelty preference. | Venue variants excluded; local history can be cleared. | Passed DOM and engine tests. |
| S12 | Calendar | Download quick/full .ics; compare winter/summer. | One event per stop, UTC timestamps reflect NJ DST. | Passed DOM/file-content checks; phone import pending. |
| S13 | Invitation | Share without native share/clipboard support. | Readable text file fallback. | Passed DOM. Native share remains a device case. |
| S14 | Saved short plan | Save, revisit after format change, tamper stored source/address. | Correct format restored; canonical catalog metadata used. | Passed DOM. |
| S15 | Offline shell | Simulate install, offline fetch and update. | Cached public shell/catalog; no POST caching; owned-cache cleanup. | Passed service-worker model; installed-phone case pending. |
| S16 | Background count | Compare worker and server preview. | Same counts/errors, request IDs retained for stale-reply rejection. | Passed VM worker test. |
| S17 | Existing behavior | Run existing routes/input/game/price/sound/favorite checks. | Existing catalog and legacy four-category API preserved. | Passed Node and legacy DOM suites. |
| S18 | PDF readability | Export every local detail plus timed 3/4/5-page samples. | Text within bounds; readable inspected pages. | 200 detail pages and 12 timed pages passed; six timed pages inspected. |

Public Vercel deployment, real iPhone/Android rendering, native calendar/share behavior, audible playback and installed offline behavior remain pending. Browser preview control failed with Module not found: @oai/cua/tinyskyAlt. No public deployment or App Store approval is claimed.