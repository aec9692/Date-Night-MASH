# Phone and public-site acceptance checks

Status: real iPhone/Android and public deployment testing is pending. The owner will connect the project to Vercel with their professor. Local DOM/API tests and PDF bounds checks are recorded in TESTING.md; they are not physical-device results.

Use the public HTTPS URL after deployment. A localhost share link cannot open this computer's app on someone else's phone.

| ID | On iPhone Safari and Android Chrome | Expected result | Actual |
| --- | --- | --- | --- |
| P01 | Open the homepage in portrait; choose Stay home | Budget is easy to reach; home supplies appear; location search is hidden | Pending |
| P02 | Drag the budget slider repeatedly, then type $37.50 | Amount follows immediately; final count refreshes after pausing; generation uses $37.50 | Pending |
| P03 | Generate a $50 home date; open recipe details | Four picks; total never exceeds $50; quantities, time, equipment and steps are readable | Pending |
| P04 | Check owned groceries and use a $0 budget | A valid no-additional-spend date or a useful explanation; no assumed free purchases | Pending |
| P05 | Use food, beginner, gentle-effort and equipment preferences | Actual selected ideas honor filters; restrictive combinations explain when none fit | Pending |
| P06 | Browse each category; tap Show more; change town/search | Only the chosen category remains visible; all ideas stay available without loading all cards initially | Pending |
| P07 | Hide an idea, reload, restore it | Hidden ideas remain excluded on this device; Suggest again restores them | Pending |
| P08 | Save/revisit; open the companion | Budget, preferences and selections restore; ingredient checklist remains usable | Pending |
| P09 | Search source-priced NJ places, then community map listings | Known NJ results load independently; a live-provider error does not remove them | Pending |
| P10 | Open directions using device origin, then planning-town fallback | Maps handles device location; fallback uses the selected public city/town | Pending |
| P11 | Add to calendar; choose date/time; select Apple Calendar on iPhone | A valid .ics file opens/downloads; confirm Add/Save if offered. If direct import is unavailable, try Apple Mail or desktop import | Pending |
| P12 | Add to calendar; select Google Calendar on Android | A prefilled event opens with four picks, price and correct date/time; save it in Calendar | Pending |
| P13 | Choose the other calendar provider on either phone | Both choices remain available; a provider choice is remembered on this device | Pending |
| P14 | Share date through Messages or another app | Readable note and working public plan link; canceling the share sheet does not show an error | Pending |
| P15 | Open the shared link in another browser/device | Exact current-catalog choices and costs; the recipient's pantry checks are not overwritten | Pending |
| P16 | Share a proposed activity change; open it on the other device | Proposal is visible; applying it keeps the other three picks and respects the budget | Pending |
| P17 | Use Copy link/Copy note; deny clipboard access if prompted | A selectable note remains available; no claim that a message was sent | Pending |
| P18 | Download/share the PDF, rotate phone and use its links | Readable PDF with complete instructions, correctly numbered continuation pages and working links | Pending |

For a failure, record device model, OS/browser versions, public URL, exact steps and observed result. If available, include the browser console error or Vercel function log. Do not replace Pending with Passed until the case is actually executed.

Calendar actions prepare drafts/files. MASH does not have calendar-account write access, and no booking or message is sent automatically. Shared links are snapshots; send a new link after changing a plan.
## Day, reserves and feedback: additional pending checks

| ID | Action on actual iPhone and Android | Expected | Status |
| --- | --- | --- | --- |
| P19 | Choose Tonight, This weekend and a custom MASH date | Visible NY calendar date changes; recorded closed/seasonal ideas excluded; confirmation notice visible | Pending |
| P20 | Set $50 with $5 parking, $7 transport and $3 extras; generate/save/share/export | Picks fit $35; total including $15 reserve fits $50; restored plans retain amounts | Pending |
| P21 | Enter reserve greater than budget; correct it | Readable error preserves values, then generation recovers | Pending |
| P22 | Rate a completed date, edit it, reload, remove and clear reviews | Review persists locally, edits replace it, clearing retains favorites; controls fit the phone | Pending |
