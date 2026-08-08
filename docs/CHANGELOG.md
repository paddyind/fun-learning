# Change History

Format loosely follows [Keep a Changelog](https://keepachangelog.com/). Update this file alongside any non-trivial change — it's the fast way to answer "when did X happen and why."

## 2026-08-08 (dashboard dead-end fix)

### Fixed
- **Dashboard sign-out dead end.** The "Sign out" button in `DashboardShell.tsx` only rendered inside the `{activeProfile && ...}` block — so if `ProfileProvider`'s error card showed (e.g. Firebase not configured yet), there was no way to sign out and start over. The error card is a `fixed inset-0 z-50` overlay, so even the header's other buttons underneath it were unreachable. Fixed by (1) always rendering Sign Out in the header regardless of profile state, and (2) adding "Try again" / "Sign out" actions directly into the error card itself.
- `/api/firebase-token` returned a bare 500 with no body on failure (almost always caused by placeholder `FIREBASE_ADMIN_*` values). Now returns a clear JSON error message and logs server-side, pointing at `docs/setup-guide.md` §1d.
- `ProfileProvider`'s `friendlyFirebaseError` only recognized real Firestore's `permission-denied` code; the emulator's raw rules-evaluation error (`false for 'list' @ L16`) fell through to a generic, unhelpful message. Broadened detection to cover both and explain the likely root cause (the `/api/firebase-token` bridge failing).

## 2026-08-08 (Firebase emulators)

### Added
- Firestore + Storage now run as local emulators by default (`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`, `Dockerfile.emulator`, `firebase.json`, `.firebaserc`, new `firebase-emulator` service in `docker-compose.yml`). Reason: Google now requires the Blaze (pay-as-you-go) plan to enable real Cloud Storage, even for $0 usage — emulating avoids needing a card on file just to test locally. Firebase Auth stays real (doesn't require Blaze, and the custom-token bridge needs it). `lib/firebase.ts` resolves the emulator hostname differently for server-side (docker-compose service name) vs. client-side (localhost) code — same class of problem as the Keycloak Docker-networking split.
- Emulator UI at `http://localhost:4000` for inspecting local Firestore/Storage data while testing.

## 2026-08-08 (self-hosted runner fix)

### Fixed
- `deploy-local.yml` failed twice on first real runs: (1) `docker compose --env-file` came back "unknown flag" because an isolated `DOCKER_CONFIG` didn't carry over `cli-plugins/`; (2) `error getting credentials ... keychain cannot be accessed` because the runner's launchd background session has no GUI/keychain access, and Docker's registry resolution hits the credential store even for public images. Fixed via an isolated Docker config (`~/actions-runners/fun-learning/.docker`, no `credsStore`, `cli-plugins/` copied over) loaded through the runner's `.env` file, plus pre-pulling the Dockerfile's base images interactively so resolution is a local cache hit, not a fresh registry round-trip. Full writeup: `docs/ci-cd.md`.

## 2026-08-08

### Added
- Demo login (`CredentialsProvider` "demo" in `lib/auth.ts`, credentials in `lib/demoLogin.ts`) so the app is testable before a real Keycloak realm exists. Shown on the new `/help` page. **Must be removed before any real deployment** — flagged in `CLAUDE.md`.
- `/help` and `/contact` public pages, richer landing page copy (feature highlights, "How it works"), shared `components/Footer.tsx`.
- Dark mode: `darkMode: "class"` in Tailwind, CSS-variable theme tokens (`--background`, `--foreground`, `--surface`, `--surface-muted`, `--muted`, `--line`, `--line-strong`), no-flash bootstrap script in `app/layout.tsx`, `components/ThemeToggle.tsx`. Respects OS/browser preference by default, remembers manual overrides.
- `docs/` folder (this document, plus architecture, user-guide, data-model, backup, setup-guide, ci-cd, mobile).
- GitHub Actions CI workflow (cloud, lint/typecheck/build validation on every push/PR).
- Self-hosted-runner deploy workflow for local Docker Desktop testing on pushes to `main`.
- Capacitor scaffolding (config + npm scripts) for future iOS/Android wrapping — no platform builds run automatically.

### Fixed
- `lib/firebase-admin.ts` was eagerly parsing the Firebase service-account key at module-import time, which crashed `next build` (and any Docker build) whenever real credentials weren't present yet. Made `getAdminAuth()`/`getAdminDb()` lazy.
- `components/ProfileProvider.tsx` and the dashboard/upload/quiz/revision pages had no error handling around Firestore calls — a failure (e.g. placeholder Firebase config) left the UI stuck on an infinite loading spinner with no explanation. Now surfaces a specific, actionable error message.
- Landing/meta copy changed from grade-specific wording ("Grade 3 CBSE and Grade 6 IGCSE") to "school kids" for public-facing copy (landing page, meta description, manifest, README). Internal docs (`CLAUDE.md`, data model) still document the actual grade values since they're a real schema constraint.

## 2026-08-08 (earlier)

### Added
- Docker containerization: multi-stage `Dockerfile` (Node 22 Alpine, `output: "standalone"`), `.dockerignore`, `docker-compose.yml` wiring `.env.local` as both build args (`NEXT_PUBLIC_*`, baked into the client bundle) and runtime env.
- README Docker section documenting the `--env-file .env.local` requirement.

## 2026-08-08 (initial)

### Added
- Initial MVP scaffold: Next.js 14 App Router + TypeScript + Tailwind, NextAuth + Keycloak, Firebase client/admin split with a custom-token bridge for Firestore rule enforcement, Gemini-backed OCR/quiz/flashcard generation, gamified dashboard (profiles, XP, streaks), upload flow, quiz engine with confetti, Exam Revision Hub, PWA manifest/icons/install prompt.
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`.
- `CLAUDE.md` (stack, code standards, child-friendly design system, known follow-ups).
