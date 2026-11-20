# Final-project rubric audit

Repository: https://github.com/aec9692/Date-Night-MASH

Public Vercel URL: **pending**. Group demo URL: **pending**. Deadline: Monday, December 21, 11:59 PM, as supplied in the assignment. Audit date: November 20, 2026.

This is a requirement/evidence checklist, not a claim that the project is ready to submit. Example projects impose no requirements on this approved custom idea. The supplied rubric gives 100 total points but no category weights.

| Requirement | Evidence/status | Remaining action |
| --- | --- | --- |
| Approved idea and one-page proposal | User reported idea approval; AGENTS.md contains the proposal. PROPOSAL.md is a compact source with the missing explicit route/owner structure. | Verify the actual Canvas proposal submission and one-page print layout; do not imply a new proposal was submitted. |
| Interactive HTML/CSS/JS front end | public/index.html, styles.css and plain browser JS; no front-end framework dependencies. | Demonstrate on the public URL. |
| Express server, browser request and displayed response | Root server.js; app.js request() and generate(); POST /api/generate. | Capture the deployed Network request/response for video and reports. |
| Empty, malformed, oversized input rejected; visible errors | planner.js validates input; server JSON limit is 32 KB with 400/413/422 errors; app.js displays failures. Existing local automated/DOM evidence in TESTING.md. | Execute valid/invalid deployed cases; do not count local tests as deployed. |
| Vercel public URL and automatic Git deployment | server.js exports Express, public assets and pinned postinstall PDF copy exist. GitHub audit returned no deployments or repository homepage. This does not prove no external project exists. | Owner/professor completes Vercel import; verify public access and redeployment. Follow PROFESSOR_HANDOFF.md. |
| Phone and laptop usability | Responsive styles, phone navigation and local DOM/PDF checks exist. | Actual phone/laptop browser testing, screenshots and PHONE_QA.md are pending. |
| Public GitHub repository and all teammates added | GitHub API confirmed public repo, main branch, aec9692 admin and ajr243 write access. | Third teammate has not joined; user will add them later. Confirm accepted write access. |
| Three advanced features for three members | Designated features below are implemented and listed in the proposal. Additional polish can remain. | Retain professor acceptance that these qualify; the supplied rubric omits the qualifying-feature list. Confirm actual ownership/contribution with the group. |
| Required AGENTS.md rules | Root server.js, public assets, plain JS, environment-only secrets, ignored .env, commit/push workflow present. | Continue following these rules. |
| Free services, no uploads or sensitive personal data | No file inputs/upload handlers or account/payment forms found in current source; no .env/.vercel or credential-key files tracked. Maps use public venue addresses and public planning towns. Dependencies: Express/jsPDF; optional public geocoding/maps. | No card, paid upgrades or private home-address inputs. This source inspection is not a guarantee about every historical commit. |
| No secrets in repository | .gitignore excludes .env, .env.*, .vercel; optional provider configuration uses environment variables. | Never commit credentials; no credential values included in audit output. |
| Database/account rules | Neither database nor app accounts implemented or required. | Not applicable unless scope changes. Do not add them merely to increase feature count. |
| Build/verify stages on deployed site in order | Deployment was unavailable while implementation proceeded; BUILD_PLAN.md records this deviation. | Cannot retroactively claim the requested sequence. Disclose it; complete deployed checks in foundation → routes → main flow → advanced-feature order. |
| All source, README, AGENTS and TESTING | Present on main; README local commands and source references exist. | Replace pending deployment URL only with verified real URL. |
| At least 12 executed deployed cases covering every input, route, page and advanced feature | Historical local evidence exists; zero executed deployed cases recorded. DEPLOYED_ACCEPTANCE.md maps current controls/routes/actions. | Execute every applicable row, enter actual outcomes, device, URL, date and fixes in TESTING.md. Twelve is a minimum, not sufficient by itself for this expanded app. |
| Every member explains any code | SUBMISSION_GUIDE.md names modules and practice questions. | Each member rehearses the full flow and can explain more than their own feature. |
| Three useful Codex prompts and one detected/fixed error | DEVELOPMENT_NOTES.md records examples and actual mistakes/fixes. | Each student chooses personally used prompts and explains their own experience. |
| Individual reports, no shared prose | SUBMISSION_GUIDE.md provides questions/checklist only, not submission prose. | Each student writes their own report with repo/app/video links first, all required sections and honest contributions. |
| Phone/laptop screenshots and references | Source/library/provider references in README, DATA_SOURCES and LOCATION_SEARCH. | Capture real deployed screenshots; cite actual tools/sources used. |
| One unlisted narrated video; every member speaks | Demo recording checklist prepared in SUBMISSION_GUIDE.md. | Record deployed app, request/response, invalid input, three advanced features and code explanation; upload unlisted and verify link. |
| Individual Canvas submission | No submission attempted. | Each student submits their own final report and verifies the three leading links before the stated deadline. |

## Exactly three designated advanced features

These are the original proposed ownership assignments, not evidence that a person performed every associated code change. Reports must follow actual work.

| Proposed owner | Feature | Demonstration and code |
| --- | --- | --- |
| Adrainn Coloma | Save/remove favorites with persistence | Save, reload, restore, remove; app.js loadFavorites/saveCurrent/writeFavorites, canonical validation and localStorage. |
| Andrew Russo | Indoor/outdoor/at-home setting filtering | Generate under each setting and inspect all picks; planner.js, date-costs.js and journey.js enforce eligibility on the server. |
| Alex Marshall | Readable client-generated downloads | Download PDF and text, open/read, check total and official links; download.js and scripts/prepare-assets.js. |

No extra advanced features are required for a three-person group. Calendar, voting, maps and other additions are supplementary. Advanced-feature acceptance and actual student contributions still need group/instructor confirmation, rather than treating implementation alone as proof of credit.
