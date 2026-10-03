# Findaspace

A phone-first Ghana space marketplace, built with Next.js, React and TypeScript over the supplied `space_api` OpenAPI contract. Black and white branding uses the supplied Findaspace logos; listing photography remains in colour.

Renters discover homes, hostel beds, workplaces, event spaces and other supported spaces, save favourites on their device, filter listings, share a space, sign in by phone, reveal owner contact details and send messages. Hosts create listings, choose a cover photo, upload compressed images, provide GhanaPostGPS and map coordinates, enter rental terms, submit for review and manage schema-defined attributes. The first release uses direct contact; payments are disabled by default.

## Preview without a backend

Requires Node 22 or newer and npm.

```sh
npm ci
npm run demo
```

Open http://localhost:3100. The demo starts a local test API and the frontend. Use a valid Ghana phone number and SMS code `123456`. Listings and photographs are fictional sample inventory, explicitly marked as a design preview. Restarting clears test data. Never deploy the test API or enable demo mode in production.

## Connect the real backend

```sh
cp .env.example .env.local
```

Set `SPACE_API_URL`, `SPACE_SITE_URL` and a `SPACE_BFF_SECRET` of at least 32 characters matching the backend. Keep `SPACE_PAYMENTS_ENABLED=false` and `SPACE_DEMO_MODE=false`. Then run `npm run dev`, or `npm run build` followed by `npm start`.

See [DEPLOY.md](DEPLOY.md) for deployment, storage CORS and launch checks. The supplied contract is bundled at `api/openapi.yaml`; `npm run api:types` regenerates its TypeScript types. No backend repository is needed for type generation.

## Verification

```sh
npm run check
npm run build
npm run budget
npx playwright install chromium
```

For the complete browser suite, use a fresh production build, the test API on port 8099 and the web app on port 3100. Both need the same 32-character test BFF secret. Start the API with `DEMO_PHOTOS=true ACCESS_TTL=900 GRACE=30 BFF_SECRET=... npm run stub`; start the web app with `SPACE_API_URL=http://localhost:8099 SPACE_SITE_URL=http://localhost:3100 SPACE_BFF_SECRET=... PORT=3100 npm start`. Then `npm run test:browser`. A custom Chromium installation can be supplied with `BROWSER_EXECUTABLE_PATH`.

The canonical responsive suite is `tests/e2e/responsive.mjs`. It checks widths from 320 to 1920 pixels, accessibility including contrast, saved spaces, search, gallery navigation, login, direct contact, conversations, host creation/uploads, attribute persistence, disabled payment routes and logout. Earlier Python UI suites remain as historical backend-flow references; their old design-specific copy assertions have not been updated. CI runs the current suite against the local test API. Screenshots and results are in `artifacts/qa`.

## Design and boundaries

- Responsive photo-led cards, desktop discovery shelves, mobile swipe galleries, bottom navigation and filter sheets. Respect reduced motion and keyboard focus.
- Server-only API configuration and session cookies. Private pages are never cached by the service worker.
- The map engine is loaded only when requested and only with a configured PMTiles URL. Browsing works without a map. Real map tiles were not available for this delivery.
- Favourites stay on the device, with safe storage handling. They are not synchronised to an account.
- Phone verification and a listing declaration do not prove ownership. Host verification needs backend support.
- No invented inventory, ratings, payment guarantees or booking availability. Budget means the advertised rate in the selected exact price period. The frontend sends `price_period` to avoid comparing different units.
- The companion API now supports sports/studios, hour/day/week and academic rates, core listing edits and uploaded-photo deletion/order. See [BACKEND_REQUIREMENTS.md](BACKEND_REQUIREMENTS.md).

Do not check `.env.local`, secrets, `node_modules` or `.next` into source control. Sample-photo sources and limitations are documented in `tests/stub-api/photos/README.md`.

## Connected Go API verification

`npm run test:connected` runs `tests/e2e/real-api.mjs` against a local Go API on port 8080 and the frontend on 3200. It requires the migrated local database, running River worker and S3 storage, a development OTP log at `REAL_API_LOG`, and `psql` for a fixture-only admin grant. Set `REAL_API_DATABASE_URL` to the local test database and configure storage CORS for port 3200. The script refuses remote API/frontend/database hosts. It creates test accounts and listings; use an isolated test database.

The release has been checked with PostgreSQL 18/PostGIS and Moto S3. Real SMS and production S3 credentials/signature enforcement still require a production integration check.

## Production providers and connected chat

Use `.env.production.example` and the API package's `deploy/PRODUCTION_SETUP.md` for Neon PostgreSQL 18, Cloudflare R2 and live Arkesel setup. Never commit filled environment files. `SPACE_MAP_TILES_URL` points to the public `maps/ghana.pmtiles` object from the companion Ghana map bundle. Official map fonts/sprites ship under `public/map-assets` with their licenses and upstream revision; no external font/icon host is required.

Two accounts can chat about a listing: **Ask a question** opens the thread, and host/renter reply through their inbox. Visible threads refresh every five seconds and retain messages on reload. Other accounts receive 404 for reading or replying to that thread. The header's message and notification links now sit side by side at phone and desktop widths. Contact details are retained with the API's default direct-contact mode.

`VERIFY_MAPS=true npm run test:connected` additionally verifies real Ghana maps in the local API/worker fixture. For a deployed site, `npm run test:maps` is read-only; set `E2E_BASE_URL`, `SPACE_MAP_TILES_URL` and `MAP_LISTING_SLUG` to a published football-pitch listing. It checks the actual PMTiles header/metadata/Ghana tiles and browser worker, fonts, sprites, attribution, marker cards, listing maps and failure/retry behavior. A successful local run does not verify the production bucket or SMS delivery.

## Cheapest Render test deployment

`render.yaml` selects a Free Node web service. Follow `RENDER_TEST_SETUP.md` with the companion API's combined API/worker Free Docker service. Use the actual public API URL, matching BFF secret, Neon Free and R2's included usage. Expect cold starts; both web services share the workspace's free-hour allowance. Real SMS needs credits.
