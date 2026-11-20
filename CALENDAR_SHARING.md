# Calendar drafts and share links

`public/date-invite.js` is a pure browser/Node helper. It never writes to a calendar, opens a window, sends a message, or makes a network request. UI actions choose when to open the prepared draft or share sheet.

## Calendar behavior

The phone recommendation is Apple on iPhone/iPad (including iPad desktop mode) and Google on Android. Both choices must remain visible because the phone model does not tell the app which calendar service a person uses.

Google uses its [official prefilled event-link format](https://developers.google.com/workspace/calendar/api/concepts/inviting-attendees-to-events#provide_a_link_for_users_to_add_the_event): a one-off draft with UTC start/end, IANA time zones, location and the complete date note. The visitor saves it in Google Calendar; this is not OAuth or a background calendar write. The app cannot update the saved event afterward.

Apple receives a standard `.ics` event with the `text/calendar` content type. [Apple documents importing an ICS event through Mail](https://support.apple.com/guide/iphone/set-up-mail-contacts-and-calendar-accounts-ipha0d932e96/ios); handling a downloaded ICS file varies by phone/browser and installed apps. Keep Google Calendar and downloading/sharing the ICS as alternatives. Do not claim that a website can silently insert an event into Apple Calendar or that a download proves it was saved. Real iPhone/Android handoff remains a device verification task.

Calendar exports require an explicit date, start, later same-day end and valid IANA time zone. The helper checks local civil times, rejects nonexistent spring-forward times, and consistently uses the first occurrence of an ambiguous fall-back hour. Quarter-hour time zones are covered. One tentative event contains all selected picks, the combined estimated cost for two and the plan link. It includes no organizer, attendees, invitations, reminders, subscriptions or booking claims.

ICS escaping, UTF-8 line folding, CRLF endings, UTC date-times and a stable UID follow [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545). Stable IDs can help calendar applications recognize duplicates but do not guarantee deduplication by every calendar.

## Share behavior and validation

The compact snapshot stores catalog IDs, budget and documented plan preferences, optional selected calendar times and a requested category change. It excludes trusted venue/source/price metadata, generated titles and tried-place history. Up to four personal ideas can be included as already supported by the app. The browser puts its base64url UTF-8 token in the URL fragment `#date=...`; no database, account or server file storage is introduced. Anyone given the link can read it. Encoding is not encryption or an authorization boundary.

Both browser and server must revalidate the decoded preferences against the current canonical catalog before displaying a plan or producing an ICS response. `preferences(snapshot)` locks the referenced choices, but does not verify whether the IDs exist, source prices changed, owned supplies suffice or the combination still fits. Those checks belong to the existing shared planner. Reject stale/unaffordable/unsupported links with a readable explanation rather than trusting encoded prices. The codec rejects undocumented root fields, invalid basic values, special prototype keys, malformed UTF-8/encodings, and tokens above 12,000 characters / 9,000 JSON bytes.

A share action can combine a readable note and the web link using the [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share), with clipboard/manual text or a downloaded note as fallback. Call native sharing directly from the visitor's click to retain transient user activation. A local `localhost` link is not a public cross-phone link; the same snapshot works after the site is deployed at a reachable HTTPS URL.

`test/date-invite.test.js` covers both Node and browser codecs, malformed/oversized tokens, history omission, canonical category locks, dates/DST/time zones, Google draft parameters, single-event ICS injection resistance/folding, readable notes and platform recommendations. It does not claim a real phone saved or shared anything.
