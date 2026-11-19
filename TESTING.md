# Deployed-site testing

Start with Milestone 1. For each run, record the date, tester, deployment URL or commit, and browser and viewport where relevant. Replace `Pending` with the observed result and pass or fail. Record fixes and retain the results of reruns. Complete at least 12 deployed cases and cover every input, route, page, and advanced feature.

Fill in the catalog-dependent settings, budgets, and expected totals for API-04 through API-06 once the catalog is finalized. Use a setting with a positive minimum for API-06 and enter one cent below that minimum.

| ID | Item | Steps | Expected result | Actual result |
| --- | --- | --- | --- | --- |
| DEP-01 | First public deployment | Open the production URL and `GET /api/health`. | The landing page loads and health returns `200` with a JSON success response. | Pending |
| DEP-02 | Teammate contribution | Have a non-owner teammate author a visible change. Merge the reviewed PR, then open production and record the PR and deployment links. | A new production deployment serves the merged change. | Pending |
| API-01 | Options catalog | Request `GET /api/options`. | `200` with four categories, stable IDs, integer-cent prices, and supported setting tags. | Pending |
| API-02 | Valid budget and default setting | POST `{"budget":10000}`. | `200` with one pick per category, a total within budget, and the correct remaining cents. | Pending |
| API-03 | Explicit settings | Send an affordable request for `any`, `indoor`, `outdoor`, and `home`. Repeat with an unsupported setting and with `null`. | Supported settings return valid picks. Every pick supports the selected setting unless it is `any`. Invalid values return `400`. | Pending |
| API-04 | Exact minimum | POST the calculated minimum budget in dollars for the chosen setting. | `200` with an exact total and zero remaining cents. | Pending |
| API-05 | Zero budget | POST `{"budget":0,"setting":"any"}`. | The catalog determines the expected outcome. A free plan returns `200` with zero total and remaining cents. Otherwise expect `422` with the catalog minimum. | Pending |
| API-06 | Below minimum | POST one cent below the chosen setting's positive minimum. | `422` with `NO_AFFORDABLE_PLAN` and the exact `minimumBudgetCents`. | Pending |
| API-07 | Invalid budget or fields | Try an omitted budget, negative amount, string, `null`, excessive decimal precision, budget above $10,000, and unexpected field. | Each returns `400` with `INVALID_REQUEST` and a readable message. | Pending |
| API-08 | Invalid JSON body | Send truncated JSON, then a valid JSON body over 2 KB. | `400` with `MALFORMED_JSON`, then `413` with `BODY_TOO_LARGE`. | Pending |
| UI-01 | Main flow on phone and laptop | Load the page, enter a budget, generate, generate again, and navigate by keyboard. | The catalog and results fit and are usable at both sizes. Controls show focus and results include the four picks and totals. | Pending |
| UI-02 | Form errors and request state | Submit an empty or invalid budget, simulate a network failure, and click generate repeatedly during a pending request. | Errors are visible, form values are preserved, and only one request is in flight. | Pending |
| UI-03 | Setting filter | Generate with each setting from the UI, then try an unaffordable budget. | Results respect the setting and an unaffordable request gives a readable explanation. | Pending |
| UI-04 | Favorites | Save a plan twice, reload, view it, then remove it and reload again. Repeat with corrupt or unavailable storage. | Favorites persist, duplicate saves and removal are handled, and storage failures leave generation usable. | Pending |
| UI-05 | Text download | Download a current plan and a saved plan. Open both files. | Each contains all four picks, their estimates, the total, and the estimate notice. | Pending |

Run the advanced-feature checks on a phone and laptop. If the final catalog deliberately has no complete plan for a supported setting, test that setting separately and expect `422` with `NO_COMPLETE_PLAN` and no `minimumBudgetCents`.
