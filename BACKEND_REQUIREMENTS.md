# API integration status

The backend source is now included as the companion `space_api` deliverable. The frontend and API ship with matching OpenAPI contracts and generated types.

## Completed in this release

| Capability | Implementation |
| --- | --- |
| Sports and studios | `football_pitch`, `sports_court`, `sports_facility` and `studio`, with server-validated schema fields |
| Flexible rates | `flexible` mode with hour/day/week; hostel semester/academic-year rates in `term` mode |
| Comparable search | `GET /v1/search?price_period=...`; frontend selection sends an exact advertised unit with the budget |
| Private listing fetch | Authenticated `GET /v1/spaces/{id}` replaces owner-list pagination |
| Core edits | PATCH title, description, price, deposit, advance, occupancy, rental mode/period and location; editing returns the listing to draft |
| Live listing changes | Withdraw a published listing, edit it, then submit for review again |
| Photo management | Authenticated delete/order; first photo is cover; last ready photo protected on live listings |
| Upload limit | Backend reservations are serialised per listing to enforce the configured photo cap |
| Direct contact | Contact endpoint wired; atomic daily unique-space limit; contact details retained in messages without payment |
| No-payment release | Payment/booking/payout routes gated off; Paystack credentials optional while off |
| Deployment corrections | Separate API and FFmpeg worker image targets, one worker compose definition, migration errors exit nonzero |

Connected tests ran the frontend against the real Go API, PostgreSQL 18/PostGIS and the River worker, using a local Moto S3 emulator. Production storage/signature configuration, real SMS delivery and a real Ghana PMTiles/OSRM dataset still need deployment-specific checks.

## Remaining product work

- Host verification evidence and moderation: phone verification or the ownership/manager declaration does not prove authority. No verified-owner badge is invented.
- Viewing request scheduling, host confirmation, cancellation and notifications.
- Account-synchronised favourites; current saves are device-local.
- Listing/user/message reporting endpoints and moderation outcomes.
- Timed sports availability and conflict handling; hourly/day rates are advertised rental units, not a platform booking calendar.
- Native mobile apps using the same contracts.

Payments stay off. The existing nightly/monthly/yearly quote engine rejects unsupported hourly/day/academic units rather than pricing them incorrectly. Direct-contact users arrange availability and final rental terms with the owner or authorised manager.
