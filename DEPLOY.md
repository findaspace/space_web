# Deploying Findaspace

Deploy the real API first, then this Next.js frontend. The local test API is not a production backend. Keep direct-contact mode for this release.

## Configuration

| Variable | Required configuration |
| --- | --- |
| `SPACE_API_URL` | Real backend HTTPS origin |
| `SPACE_BFF_SECRET` | At least 32 characters; same secret configured on the backend |
| `SPACE_SITE_URL` | Public frontend HTTPS origin for canonical/share URLs |
| `SPACE_API_TIMEOUT_MS` | Optional, defaults to 10000 |
| `SPACE_MAP_TILES_URL` | Optional HTTPS PMTiles URL; omit to hide maps |
| `SPACE_PAYMENTS_ENABLED` | `false` |
| `SPACE_DEMO_MODE` | `false` |

These settings are server-only; do not add `NEXT_PUBLIC_` prefixes. Generate a secret with `openssl rand -hex 32`. Review supported security updates for the pinned dependencies before public deployment and repeat the checks after any upgrade.

## Frontend hosting

Use a Next.js-compatible host such as Vercel, or Node 22+ with `npm ci`, `npm run build` and `npm start`. Set the environment above for build and runtime, including previews. Configure HTTPS and the correct public origin. `next.config.ts` supplies security headers and allows API-provided image URLs. Review media origins if tightening the image allowlist.

## Photos and maps

The browser compresses uploads to JPEG and sends them directly to the backend-provided presigned URL using its required headers. Storage must allow the frontend origin, `PUT`, and the ticket's headers (normally `Content-Type`). Both production and preview origins need CORS entries. Keep bucket credentials on the backend. The frontend respects `max_bytes` and supports PUT upload tickets.

If using maps, host an actual Ghana PMTiles archive and set its URL. Tile storage must allow range requests and relevant exposed headers. The map's external style/font resources also need network access. Verify the supplied tiles on real devices; this delivery tested the map-disabled fallback, not a production tile archive.

## Launch checks with the real API

1. Homepage and filtered searches show actual Ghana inventory with correct rate periods, location privacy and no fictional sample data.
2. Receive a real SMS code; test expiry, retry/rate limits and sign-out on a shared phone.
3. Create a listing with camera photos, confirm processing reaches ready, submit it and publish through the backend's moderation workflow.
4. Reveal contact details from a second account, call or open WhatsApp, start a conversation and check notification delivery. Set `SPACE_DIRECT_CONTACT=true` on the companion API.
5. Check host attributes survive reload, owner access controls reject other users and uploads obey limits.
6. Test the logo, search sheet, galleries, sticky contact button and keyboard navigation on real Android/iPhone phones and desktop browsers.
7. Check WhatsApp share previews, canonical URLs, HTTPS/security headers and a configured map if enabled.
8. Check offline fallback and confirm private pages/messages are not cached. Saved snapshots remain local to the device.
9. Confirm booking and payout routes return 404 with payments disabled. Do not turn payments on without independently validating the existing payment backend and flows.

The complete automated suite runs against a contract-oriented local test API. The connected suite also exercised the real Go API, PostgreSQL, moderation and photo processing with local S3 emulation. Real SMS, production storage configuration and production map tiles require deployment integration checks. Keep a previous frontend deployment available for rollback; coordinate API changes rather than reversing live database migrations.
