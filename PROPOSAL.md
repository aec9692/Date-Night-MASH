# Date Night MASH — proposal

**Adrainn Coloma, Andrew Russo, Alex Marshall**

Date Night MASH helps two people randomly choose dinner, an activity, a treat and entertainment within a combined budget. Intended users are high-school students, college students and couples who currently brainstorm over text, search social media or write paper options.

**Main flow:** (1) Enter a total budget for two. (2) Review preset ideas and optionally choose a setting. (3) Click Play MASH. (4) View four selections and their estimated total. (5) Generate another plan, save a favorite or download the date.

**Server routes:** GET /api/options receives no input and returns categories, ideas, estimated prices and setting tags. POST /api/generate receives a JSON budget and optional setting; the Express server validates the input and returns one selection per category, the estimated total and remaining money, or a readable error.

**Minimum version:** One responsive HTML/CSS/JavaScript page with a budget field, four categories, generate button and results. Root server.js serves an Express API; static files are in public. The app runs at a public Vercel URL and redeploys from GitHub. All prices are labeled USD estimates for two.

**Additional/advanced features, in priority order:**

1. Adrainn: save and remove favorite plans with localStorage persistence between visits.
2. Andrew: filter suggestions by indoor, outdoor or at-home setting.
3. Alex: download a readable date plan as text, with PDF as additional polish.

These three designated advanced features correspond to the three group members. Confirm instructor acceptance and actual member ownership. Optional polish is a skippable MASH crossing-out animation with reduced-motion support.

**Main screen sketch:**

| Date Night MASH | Controls/results |
| --- | --- |
| Budget for two | Enter amount; optional setting |
| Dinner / Activity | Review preset choices |
| Treat / Entertainment | Review preset choices |
| Play MASH / Saved Plans | Generate or revisit |
| Your date plan | Four picks, estimated total, remaining money |
| Generate Again / Save / Download | Plan actions |

**Risk and fallback:** A low budget or restrictive setting can leave no valid combination. The server checks bounded combinations, includes genuinely free choices, and explains when none fit, including a minimum budget where available. Free food is not assumed without owned supplies.

Proposal source reconstructed from the group’s supplied proposal; this file is not proof of Canvas submission or instructor acceptance. Check that the exported/printed proposal fits one page.
