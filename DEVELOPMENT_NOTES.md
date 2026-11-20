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
