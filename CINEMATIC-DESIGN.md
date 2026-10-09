# Findaspace cinematic design update

This is the complete frontend source, built on the provider sign-in, session,
mobile, PWA and reliability update. It is not a replacement authentication
system. The matching API source is included unchanged in the full archive.

## What changed

- A photographic, video-backed homepage with a search that works before the
  listings API responds. Black and white controls; colour comes from the media.
- Independent editorial category stories, a renting guide and an owner section.
  These render even when listings fail or there are no listings yet.
- Monochrome shared navigation, footer and controls; a photographic sign-in
  story; refined listing cards and detail typography; account, inbox and hosting
  surfaces use the same visual system.
- The background film has a native pause/play control and an immediate poster.
  Only the appropriate mobile or desktop poster is requested. No source is
  attached to the video until it is visible and preferences have been checked.
- Automatic playback is disabled for reduced motion, Save-Data and 2G networks
  where the browser exposes those signals. A deliberate Play click is allowed.
  Off-screen or hidden-tab playback pauses; a manual pause survives scrolling.
  Autoplay rejection or download failure preserves the poster and search.
- Eight-second, audio-free H.264 files are local to the frontend. There is no
  third-party player, iframe or video tracking request. Promotional media is
  labelled illustrative; it is never inserted as a real listing or Ghana property.

## Run the design locally

Use Node from `.nvmrc`, then:

    npm ci
    npm run demo

Open http://localhost:3100. This command starts a local fictional listing API.
The fixture SMS code is 123456. Do not deploy the fixture or enable
SPACE_DEMO_MODE in production. Real sign-in providers still need their credentials;
this update does not pretend an unconfigured provider works.

For production, follow PROVIDER-SIGN-IN-SETUP.md and existing deployment docs.
Run a new production build with the actual configuration. Copy both source
folders into their respective repositories, preserving private .env files.
Do not upload node_modules or .next from another machine.

## Checks

    npm run check
    npm run build
    npm run budget
    npx playwright install --with-deps chromium
    npm run verify:preview

verify:preview starts the production build and a disposable fictional API,
then runs the interaction suite and cinematic checks, and stops both processes.
It never uses the live API. BROWSER_EXECUTABLE_PATH may select an existing Chrome.
Screenshots and check results go into artifacts/qa and artifacts/cinematic.
The same cinematic suite is now included in the web CI workflow.

The bundle includes the previous API changes. No new database migration is
introduced by this design update. Migration 00024 remains required for the
provider-auth update if you have not deployed it yet. API integration/provider
credentials and production infrastructure checks remain separate release gates.

## Media ownership and replacement

Read public/editorial/CREDITS.md. The included footage and photos are stock
editorial illustrations, not available Findaspace spaces, and not claimed to be
in Ghana. Replace them with footage of your own spaces when available.
Keep mobile framing separate and the posters matched to the film. Use an
8–10 second, muted clip and small local files; a huge 4K film would undermine
mobile speed. Update filenames when changing media and preserve the credits.

## Verification limits

Local Chromium with fictional data tests UI and interaction, not real SMS,
real provider consent, media processing, live Postgres or deployed session policy.
Real iPhone and Android testing is still needed for this changed layout and video.
