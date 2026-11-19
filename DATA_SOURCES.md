# Paterson-area price sources

Checked November 19, 2026. These are posted public prices, not live booking quotes. The default local deck has 18 ideas across 11 venues, all in New Jersey. Source-linked nearby towns were selected as a practical shortlist around Paterson, not a geocoded or traffic-verified 60-minute radius. Every result includes a map link; traffic and a multi-stop route can take longer.

## Cost basis

- Every price is for the explicit order or admission basis in data/local-options.json, for two people unless a shared item is stated. Do not replace that basis with a vague per-person restaurant estimate.
- The planning total is posted subtotal + estimated tax + optional tip allowance + optional donation allowance. It is not a guaranteed all-in price.
- Prepared-food tax uses the published [NJ 6.625% sales-tax rate](https://nj.gov/treasury/taxation/salestax.shtml) and the state's [restaurant-tax explanation](https://www.nj.gov/treasury/taxation/pdf/pubs/sales/su1.pdf). Food subtotals are rounded to cents after estimating tax.
- Table-service meal/dessert entries include an explicitly optional 20% pre-tax tip allowance. Pickup pastries/sandwiches have no tip allowance.
- Parkway's page lists lane/shoe prices without specifying tax; the extra 6.625% is a labeled planning reserve, not a claim that the venue charges it.
- Morristown Game Vault's official page says tax is added to card payments; that is the budget basis. Longer play and parking are extra.
- Museum/cinema entries use posted admission; unknown checkout taxes/booking fees are not fabricated as confirmed amounts. Check them before paying.
- Paterson Museum admission is free; its planning total includes a voluntary $4 donation, based on the museum's suggested $2 per adult.
- Garden admission is free; seasonal vehicle parking is separate. The official garden site lists summer weekend/holiday parking of $5 for NJ plates and $7 for other plates. Do not call the entire outing free of all costs.

## Per-entry evidence

| ID | Category | Place | Posted order/admission subtotal | Planning total | Evidence |
| --- | --- | --- | ---: | ---: | --- |
| nj-neo-panini | dinner | Kafe Neo, Totowa | $30.00 | $37.99 | [Official source](https://thekafeneo.com/menu/) |
| nj-sook-sandwich | dinner | Sook Pastry, Ridgewood | $24.00 | $25.59 | [Official source](https://www.sookpastry.com/menu/sandwiches-soup?location_id=3617) |
| nj-saddle-filet | dinner | Saddle River Inn, Saddle River | $144.00 | $182.34 | [Official source](https://www.saddleriverinn.com/menus/) |
| nj-saddle-porterhouse | dinner | Saddle River Inn, Saddle River | $182.00 | $230.46 | [Official source](https://www.saddleriverinn.com/menus/) |
| nj-saddle-splurge | dinner | Saddle River Inn, Saddle River | $656.00 | $830.66 | [Official source](https://www.saddleriverinn.com/menus/) |
| nj-great-falls | activity | Paterson Great Falls, Paterson | $0.00 | $0.00 | [Official source](https://www.nps.gov/pagr/planyourvisit/fees.htm) |
| nj-mam | activity | Montclair Art Museum, Montclair | $34.00 | $34.00 | [Official source](https://www.montclairartmuseum.org/visit-mam/plan-your-visit) |
| nj-bowling-weekday | activity | Parkway Lanes, Elmwood Park | $48.00 | $51.18 | [Official source](https://parkwaylanesnj.com/bowling/) |
| nj-bowling-weekend | activity | Parkway Lanes, Elmwood Park | $68.00 | $72.51 | [Official source](https://parkwaylanesnj.com/bowling/) |
| nj-njbg | activity | New Jersey Botanical Garden, Ringwood | $0.00 | $0.00 | [Official source](https://njbg.org/hours-admission/) |
| nj-neo-crepe | treat | Kafe Neo, Totowa | $16.00 | $20.26 | [Official source](https://thekafeneo.com/menu/) |
| nj-sook-chocolate | treat | Sook Pastry, Ridgewood | $8.70 | $9.28 | [Official source](https://www.sookpastry.com/menu/pastries?location_id=3617) |
| nj-sook-almond | treat | Sook Pastry, Ridgewood | $9.70 | $10.34 | [Official source](https://www.sookpastry.com/menu/pastries?location_id=3617) |
| nj-saddle-sundae | treat | Saddle River Inn, Saddle River | $25.00 | $31.66 | [Official source](https://www.saddleriverinn.com/menu/dessert/) |
| nj-hawthorne-movie | entertainment | Hawthorne Theaters, Hawthorne | $28.00 | $28.00 | [Official source](https://www.hawthornetheatres.com/theater-info/) |
| nj-yogi-museum | entertainment | Yogi Berra Museum, Little Falls | $30.00 | $30.00 | [Official source](https://yogiberramuseum.org/visit/) |
| nj-paterson-museum | entertainment | The Paterson Museum, Paterson | $0.00 | $4.00 | [Official source](https://patersonmuseum.com/) |
| nj-game-vault | entertainment | Morristown Game Vault, Morristown | $34.00 | $36.25 | [Official source](https://www.morristowngamevault.com/pricing/) |

The JSON stores the exact item quantities, admission duration, allowances, exclusions, checked date, regular weekdays, and hours notes for each row. The Saddle River splurge is an assembled order from separately posted items, not a restaurant package or special offer. Prices may change; re-open the source before booking.

## Additional location and hours evidence

- [Saddle River Inn reservations/hours](https://www.saddleriverinn.com/location/the-saddle-river-inn/): Tuesday through Sunday; Monday excluded. Dessert-only seating requires confirmation.
- [Montclair Art Museum directions/parking](https://www.montclairartmuseum.org/visit-mam/directions): public address and free visitor parking.
- [Garden hours/admission](https://njbg.org/hours-admission/) and [directions](https://njbg.org/directions/): 5 Morris Road, Ringwood; general admission free.
- [Paterson Museum visitor information](https://patersonmuseum.com/visitor-info/): regular weekday visiting hours and holiday exceptions.
- [Morristown Game Vault directions](https://www.morristowngamevault.com/contact-information/): 22 South Street; parking is separate.

## Accuracy limits and maintenance

The optional visit date checks known regular weekdays. It does not check live showtimes, reservations, holiday exceptions, weather, sellouts, or a feasible timed order of stops. Blank dates skip weekday filtering. Known closure/rate restrictions are shown with each idea; verify before leaving.

No live-price API is connected. To refresh an entry: open the current official menu/ticket page, confirm the specific location and order basis, update the posted subtotal and checked date, recalculate tax/allowances, verify the address/hours, and run npm test. Do not infer prices from generic review-site ranges or add a seasonal promotion as a year-round price.

Unpriced/dynamic/ambiguous options were not guessed: SoJo admission requires a date-specific booking quote; Toros and Gelotti did not provide a reliably readable priced menu in this review; Holsten's linked an older menu image whose values could not be confirmed as current. The existing original ideas remain labeled illustrative and can be selected separately.
