# Mobile (Capacitor)

## Why "thin wrapper," not a static app

Fun Learning is a server-rendered Next.js app — API routes (`/api/ocr`, `/api/generate-quiz`, ...), middleware-based auth guarding, NextAuth server sessions. That's fundamentally incompatible with Capacitor's usual model of bundling a static `index.html` + JS/CSS into the native shell (`next export` doesn't support any of those features).

So `capacitor.config.ts` instead points the native WebView at a **real deployed URL** of the app (`server.url`, sourced from `CAPACITOR_SERVER_URL`) — the native app is a thin wrapper around the actual hosted site, similar to a PWA-in-a-shell. This matches the original project brief's phrase "structured for future Capacitor mobile compilation": the codebase avoids anything that would block this (no server-only logic leaking into shared UI, clean `lib/` boundaries), but there's no static bundle to produce.

**Practical implication:** before building for a real device, `CAPACITOR_SERVER_URL` needs to point at a real HTTPS deployment — `http://localhost:3000` (the default) only works for a simulator/emulator running on the same machine as the dev server.

## What's scaffolded vs. not

Done:
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios` installed.
- `capacitor.config.ts`.
- `android/` and `ios/` native project folders (via `npx cap add android` / `npx cap add ios`) — committed to the repo like any other project config, with their build-output subdirectories git-ignored (Gradle caches, Pods, DerivedData — see `.gitignore`).
- `.github/workflows/mobile-build.yml` — **manual trigger only** (`workflow_dispatch`), never runs on push/PR. Builds an unsigned debug APK / unsigned simulator build, uploaded as a workflow artifact. This is deliberate: mobile builds are opt-in until there's an actual reason to produce one, per the "don't create apk/ipa by default" requirement.

Not done (out of scope until actually needed):
- Code signing (Android keystore, iOS certificate + provisioning profile) — no store-ready artifact is possible without these, and they're not configured on purpose.
- Native camera plugin — the upload page currently uses `<input type="file" capture="environment">`, which works in a Capacitor WebView but a native `@capacitor/camera` integration would be smoother.
- Native OAuth redirect handling for Keycloak inside the WebView (the web-based `signIn()` flow may need adjustment for a WebView context — not verified).
- Push notifications, deep linking, or any other native-only capability.

## Local commands

```bash
npm run cap:sync           # copy web assets + sync native config after any capacitor.config.ts change
npm run cap:open:android    # open the Android project in Android Studio (must be installed)
npm run cap:open:ios        # open the iOS project in Xcode (must be installed — CLT alone isn't enough)
```

This machine currently has Xcode Command Line Tools but not full Xcode, and no Android SDK — `cap add` itself doesn't need those (it just copies template files), but actually building/running does. Install Android Studio and/or full Xcode locally before using `cap:open:*`.

## Triggering a manual mobile build in CI

Actions tab → **Mobile build (manual)** → Run workflow → pick `android`, `ios`, or `both`, and provide a real `server_url` (not `localhost`). Downloads as a workflow artifact once it finishes — an unsigned APK for Android, an unsigned simulator build for iOS. Neither is installable on a real device without signing, which isn't configured (see above).
