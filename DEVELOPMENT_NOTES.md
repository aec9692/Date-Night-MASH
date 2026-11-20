# Development notes for individual reports

These are implementation notes, not shared report prose. Each student writes their own report and explains their own contribution.

## Three useful Codex prompts

1. “Expand the New Jersey catalog to fifty choices in each category. Preserve the original ideas, verify explicit prices for two against official sources, and include inexpensive choices.”
2. “Build quick, evening and full-day dates with a starting town, start time, nearby stops, shared preferences, phone-friendly exports and no paid APIs. Treat high-school students as a primary audience.”
3. “Check the optimized itinerary search against independent complete enumeration on small fixtures, including time windows, order changes, distance limits, previous picks and weighted selection.”

## An error, detection and fix

The first timed-search implementation created formatted clock strings and stop objects while counting every possible itinerary. A stress check of the widest mixed deck took about 17.47 seconds, exceeding the browser’s ten-second request timeout. Precomputing numeric route/timing data and creating the detailed schedule only for the selected itinerary reduced the same search to about 0.94 seconds on the development computer. The valid-combination count remained 17,966,394. Independent small-fixture enumeration and the existing route/input tests checked correctness after the change. This timing is a local measurement, not a phone or production performance guarantee.

Visual PDF review also caught category colors being assigned by stop position: the second stop in a quick date is a treat, which needs the treat color. PDF colors now follow the actual category. Three-, four- and five-page exports were rendered again and inspected.

## Scope and verification

The implementation uses plain JavaScript and Express, retains all 296 ideas, and adds no accounts, database, uploads or paid services. Location points are Census municipality representative points, not venue geocodes. Scheduling and travel are estimates; live availability, traffic, guardian policies and booking times still need confirmation. Actual phone rendering, native sharing, installed offline behavior and public Vercel deployment remain separate acceptance checks.

## November 19 expanded planner implementation notes

Useful prompts for individual reflection (not shared report prose):
1. Fix Night at Home being filtered out by the NJ-only collection; prove $10-$100 dates fit and $0 requires existing food.
2. Count complete dates exactly with shared grocery baskets, theme conflicts, locked rerolls and eight recent combinations, without retaining all dates.
3. Keep unknown business prices separate from verified NJ orders, and verify the ownership/custom-place/favorite/PDF flows together.

Detected error: a new regression fixture looked for an activity that purchased cooking oil, but this catalog had no such activity. The shared-basket assertion failed before testing the cost logic. Changing the fixture to a pasta dinner and cake treat, which both buy oil, exercised the actual shared basket; the test then passed. Independent small-deck enumeration also checks totals, conflicts, candidates and weighted draws, so the optimized selector is not validated solely against itself. An early test suite also exposed obsolete assumptions about 305 entries and local home plans failing; those assertions now cover the expanded catalog and intended home behavior.

Local DOM/API and PDF bounds checks are not phone frame-rate or deployed-site evidence. Browser automation could not connect to its native pipe; real phone/laptop rendering and production verification remain pending.


## November 20 practical-date prompts and review note

Useful prompts: (1) make home ideas actionable with quantities/time/equipment without changing price evidence; (2) create portable canonical plan links and timezone-safe calendar drafts without accounts; (3) test partner suggestions with independent browser storage so the sender's groceries do not become free groceries for the recipient.

A review caught the hidden-idea UI holding the same options array as the canonical catalog. Adding a personal idea to the UI's hidden-item lookup could mutate that shared array. The UI now takes its own array copy; canonical catalog data remains the source for validation. A separate DOM-test assertion initially compared arrays from different JavaScript realms using strict prototype equality; normalizing the expected array fixed the harness without changing valid reroll behavior. No physical-phone or deployed result is inferred from either check.
