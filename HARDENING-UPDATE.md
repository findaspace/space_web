Read PROVIDER-SIGN-IN-SETUP.md first: this combined update adds provider sign-in and REQUIRES API migration 00024.

# Findaspace UI and session reliability update

This includes the previous mobile/speed/PWA improvements plus the following fixes:

- Private-page prefetches pass through refresh handling; header and mobile navigation links also avoid speculative prefetches.
- Refresh cookies survive API/network failures. An expired access session that cannot reconnect receives a retryable, uncached 503 instead of a login redirect. A still-valid access token continues working during a refresh outage.
- Sign-in validates `/v1/me` before redirecting a user who already has an access cookie. Revoked cookies cannot create a sign-in redirect loop.
- Root error boundary offers retry and a home link, showing only a support digest rather than internal error details.
- Touch inputs use at least 16px text, focused fields have scroll clearance for the mobile navigation, and filter sheets contain scroll chaining.
- Existing PWA caches only its offline fallback and bounded static assets, not private pages/API responses.

The API must be deployed alongside these changes for immediate revocation/live-role checks and the missing profile update endpoint. Ordinary navigation keeps HttpOnly cookies; no token is stored in localStorage and no private API response cache was introduced.

## Verified here

TypeScript, ESLint, 232 unit tests across 24 files, production Next build (16.3.8), route JavaScript budgets delayed-API streaming smoke check, and structural axe checks on the homepage, sign-in and safety pages (not contrast or device interaction). The build uses inert localhost fixture settings: rebuild with your real environment before deployment.

## Still required

Real Android/iPhone interaction, SMS login, S3 uploads, media worker jobs, browser accessibility/contrast checks, and real concurrent-traffic measurements. Browser automation could not be completed here because the available Chromium binary crashes before loading a page. Unit tests cannot prove those provider/device flows. The API's disposable PostGIS harness requires Docker, unavailable in this workspace. No release or live configuration has been changed.

Full dependency audit retains five high development-tool entries in the braces/Next ESLint dependency chain. Production-only dependency audit reports zero. A compatibility-breaking downgrade was not applied to conceal those findings.
