# Findaspace mobile, loading and installation update

Based on web commit 217c7b21758e1b28c6cedbcb0f1692d2583f78f0 and inspected API
commit 685912c7664fc2367bb1cce9ad92b27e57add893. No API or database changes.

## Apply

The release ZIP has full frontend source in space_web/ and the changed-file list.
Compare with your local changes before replacing source. Preserve .env.local and
provider secrets. Keep the API repository separate. Do not deploy tests/stub-api.
Use Node 24.19.0 (nvm install && nvm use), then:

npm ci
npm run check
npm run build
npm run budget

Build and runtime need your existing SPACE_API_URL, SPACE_BFF_SECRET and map settings.
SPACE_SITE_URL must equal the deployed frontend origin. For the domain launch use
https://findaspace.site. Keep SPACE_DEMO_MODE=false and SPACE_PAYMENTS_ENABLED=false.

## Changes and why

Search UI and the homepage introduction stream before the search response. Inventory
is fetched inside Suspense and a failed API leaves the search controls intact with a
retry button. Local delayed-API smoke check: shell 117 ms, listings 3148 ms with an
artificial 3000 ms pause. This does not measure Render or real device performance.
Run node scripts/verify-streaming.mjs after building to repeat the isolated check.
The homepage retrieves 32 newest listings instead of 50. Category search is unchanged.

The refreshed introduction gives six direct purpose shortcuts and plain rental copy.
It doesn't require listing photography before it can appear. Existing real listing
photos, logos, saved spaces, contacts, hosting and messaging flows remain in place.
Card links do not automatically prefetch dozens of listing pages on mobile data.

Install Findaspace appears in the footer and Account. Android's native prompt is triggered only
on click when available. Safari and other browsers get centered installation help.
The existing manifest/icons launch the site in standalone mode. Actual device
installation still needs testing; a PWA does not prove capacity or session reliability.

Service worker updates wait until a user chooses Reload to update or all app windows
close. Network-only private pages are preserved; only offline HTML and fingerprinted
static assets are cached. Static cache is limited to 100 entries. Cache quota errors
no longer prevent a successfully fetched asset from loading.

Stable scrollbar gutters, quiet scrollbars, vertical overscroll prevention and a
full-height public layout carry across the GOBA improvements. Verify the iPhone
pull gesture and keyboard/focus behavior on real hardware.

Next.js and eslint-config-next move from 16.3.6 to 16.3.8, a limited patch update.
Registry latest Next is 16.4.0; the new minor is deliberately not introduced in this
UI change. OpenNext adapter 1.20.9 declares >=16.3.8 for Next 16 compatibility.
This release adds no Cloudflare adapter and does not claim a Workers deployment.

## Domain: Cloudflare DNS while GoDaddy remains the registrar

You do not need to transfer ownership/registration before the 60-day lock expires.
1. Add findaspace.site to Cloudflare using its Free DNS plan.
2. Review imported DNS records against GoDaddy. Preserve existing MX/TXT records.
3. If DNSSEC is enabled at GoDaddy, follow Cloudflare's migration instructions to
   remove the old DS record before changing nameservers.
4. In GoDaddy domain settings change nameservers to the exact two Cloudflare supplies.
   Keep the registrar transfer lock; this is not a domain transfer.
5. Wait until Cloudflare shows the zone Active.
6. Add findaspace.site and www.findaspace.site in the chosen frontend host's custom
   domain settings, then add the exact records that host supplies. Verify TLS first.
   Start DNS-only while validating a Render custom domain; only proxy after TLS works.
7. Set SPACE_SITE_URL=https://findaspace.site in frontend build/runtime and update
   object storage CORS and allowed application origins where configured.
8. Test OTP, refresh/logout, WhatsApp sharing, photos/maps and messaging on the domain.
   Redirect www to the canonical apex after verification.

Do not add a Cloudflare 'Cache Everything' rule for this app. Account pages, server
actions, RSC responses and session cookies cannot be shared between users.

## Hosting decision: avoid two sleeping services for a public launch

The supplied Render free Blueprint makes the frontend and API sleep after 15 idle
minutes. Its 90-second API timeout masks a cold start but doesn't make it faster.
Cloudflare DNS/proxy cannot wake a sleeping Node frontend before showing the page.

The smallest operational change is always-on Render instances for both services,
near the database. Worker/image processing and DB connection budgets also need
capacity testing. This costs money; no billing change was made here.

Cloudflare Workers is a possible frontend migration via OpenNext, because this app
has server components, server actions and HttpOnly authentication cookies. It is
not a static export and GOBA's static Worker/fallback cannot host it. A migration
must verify env secrets, cookies, refresh proxy, server actions, forwarding of real
client IPs, map assets and request-size/runtime limits in workerd before switching DNS.
The Go API still needs its own host. Cloudflare currently also recommends vinext
for new projects; a framework migration is a separate decision, not a speed toggle.

## Verified / pending

Passed: frontend typecheck, ESLint, 209 unit tests in 20 files; Next production build;
all existing compressed-JS budgets (home 193 KB under 215 KB); delayed-API streaming
smoke; unchanged Go API go vet and go test -race ./....
Browser responsive/a11y suite attempted but Chromium crashed with SIGSEGV before
opening a page. Real API+Postgres integration, SMS, object storage, maps, production
load tests and real Android/iPhone installation were not run here. No security or
capacity certification is implied. Review remaining npm audit findings in VERIFY.md.

## Sources checked 2026-10-08

https://nextjs.org/docs/app/getting-started/fetching-data
https://render.com/docs/free
https://developers.cloudflare.com/registrar/get-started/transfer-domain-to-cloudflare/
https://www.godaddy.com/help/change-my-domain-nameservers-664
https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
https://opennext.js.org/cloudflare/get-started
