# Browser checks

The current phone-first redesign suite is `responsive.mjs`; run with `npm run test:browser` against the production frontend on localhost:3100 and a fresh test API on localhost:8099 with `DEMO_PHOTOS=true`. Install Chromium using `npx playwright install chromium`, or set `BROWSER_EXECUTABLE_PATH` to a compatible local Chromium binary. See the root README for shared environment settings.

This suite exercises responsive widths, accessibility, search, saves, login, contact reveal, messaging, host creation and uploads, persisted attributes, payment-route disabling and logout. Results and screenshots are written to `artifacts/qa`.

The older Python suites preserve historical backend scenarios. Their design-specific text selectors reflect the earlier interface and have not been certified against the redesign. The GitHub Actions workflow runs the current JavaScript suite.

The real-API suite now holds two separate signed-in browser contexts for renter and host, verifies live reply polling and persistence, denies a third account access, and measures horizontal 44px header links at 320–1440px. Set a sufficiently high **local-only** `SPACE_RATELIMIT_AUTH_PER_MIN` for the fixture's repeated logins. `VERIFY_MAPS=true` includes the map tests before withdrawing the fixture listing. The Go API must use LogSender locally; this suite deliberately refuses remote API/database hosts. Never grant fixture roles or read OTP logs on production.

`maps.mjs` can run separately against a deployed site's existing public listing. See the root README for variables. It does not sign in, send messages or edit listings.
