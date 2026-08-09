# Architecture

## Stack

- **Framework:** Next.js 14 (App Router, TypeScript, Tailwind CSS). No `src/` directory — `app/`, `lib/`, `components/` sit at repo root.
- **Auth:** NextAuth.js v4, two providers:
  - `KeycloakProvider` — the real, intended login path (OIDC). Keycloak itself is **not part of this repo** — it's owned by the sibling `identity-platform` project, started separately — see "Keycloak lives outside this repo" below.
  - `CredentialsProvider` ("demo") — a fixed-credential local-testing fallback (`lib/demoLogin.ts`), shown on `/help`. **Must be removed before any real deployment** (see `CLAUDE.md` → Known follow-ups).
- **Database/Storage:** Firebase — Firestore for data, Storage for uploaded book-page images. **Emulated locally by default** (`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`, `Dockerfile.emulator`) since real Cloud Storage now requires the Blaze plan even at $0 usage — see "Emulators vs. real Firebase" below.
- **AI:** Google Gemini via `@google/genai`, wrapped in `lib/gemini.ts`. Handles OCR extraction (`extractStudyMaterial`), quiz generation (`generateQuizQuestions`), and flashcard generation (`generateFlashcards`).
- **PWA:** manual `public/manifest.json` + meta tags, no service worker yet (see Follow-ups in `CLAUDE.md`).
- **Containerization:** multi-stage `Dockerfile` producing a Next.js `output: "standalone"` image, orchestrated locally via `docker-compose.yml`.

## The identity chain (why two auth systems talk to each other)

The app authenticates parents via **Keycloak or the demo Credentials provider** (both are NextAuth providers), but Firestore Security Rules only trust `request.auth`, which is populated by **Firebase Auth** — a completely different identity system that knows nothing about NextAuth or Keycloak.

The bridge:

```
Keycloak/demo login
  → NextAuth session (session.user.id = Keycloak "sub", or "dev-parent-demo" for the demo account)
  → client calls GET /api/firebase-token
  → server (lib/firebase-admin.ts, using the service account) mints a Firebase custom token
    via adminAuth.createCustomToken(session.user.id)
  → client calls signInWithCustomToken(auth, token)     [components/FirebaseAuthBridge.tsx]
  → now request.auth.uid in Firestore === session.user.id === profiles.parent_user_id
```

This is why `FIREBASE_ADMIN_*` env vars exist even though the app "just" uses Keycloak for login — without them, Firestore rules have no way to verify who's asking.

Note this bridge still runs, and still matters, when Firestore/Storage are emulated (see below) — only the Firestore/Storage *data layer* is emulated, Auth is always real, so `request.auth.uid` still needs to be populated the same way.

## Emulators vs. real Firebase

Firestore and Storage run as local emulators by default (`Dockerfile.emulator`, a `docker-compose.yml` service named `firebase-emulator`, config in `firebase.json`) — this is a cost workaround, not an architectural preference: Google now requires the Blaze plan for real Cloud Storage even at $0 usage, and emulating avoids that entirely for local testing. Firebase Auth is never emulated — it stays real, since Auth alone doesn't require Blaze and the custom-token bridge above needs a real Auth backend.

`lib/firebase.ts` connects to the emulators conditionally (`env.useFirebaseEmulators`, from `NEXT_PUBLIC_USE_FIREBASE_EMULATORS`) and — the same class of problem local Keycloak has (see below) — the emulator container is reachable at a **different hostname depending on where the code executes**:

```
Server-side (inside the app's own Docker container) → firebase-emulator:8080 / :9199
                                                         (docker-compose service name)
Client-side (the user's browser, outside any container) → localhost:8080 / :9199
                                                         (published container ports)
```

`lib/firebase.ts` picks between these via `typeof window === "undefined"`. If Firestore/Storage calls start failing specifically when made from a Server Component (they aren't today — all Firestore/Storage client-SDK calls happen from `"use client"` components' `useEffect` hooks, i.e. browser-only), that hostname split is the first thing to check.

Switching to real Firestore/Storage later (`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false`) requires enabling them for real in the Firebase console (Storage will prompt for Blaze) and deploying `firestore.rules`/`storage.rules`/`firestore.indexes.json` — see `docs/setup-guide.md` §1f.

## Keycloak lives outside this repo (and the dual-hostname problem, solved via endpoint-splitting)

**fun-learning does not run Keycloak.** Identity/auth infrastructure is owned by a sibling project, **`identity-platform`** (`../identity-platform`) — a shared Keycloak deployment meant for multiple apps in this workspace, not fun-learning-specific. `identity-platform/realms/fun-learning-realm.json` defines this app's realm (`fun-learning`), a single client (`fun-learning-app`), and a test user (`parent1@example.com`/`parent12345`). Start it with `cd ../identity-platform && docker compose up -d`; see `docs/setup-guide.md` §3 for the full picture and identity-platform's own `docs/ONBOARDING.md` for the platform's design.

fun-learning registers **one confidential client**, not identity-platform's usual `{app}-frontend`/`{app}-backend` pair — because it's a single Next.js server doing the whole OIDC exchange itself via NextAuth (never a client-side SPA + separate bearer-token-verifying backend). See identity-platform's `docs/ONBOARDING.md` § "Server-rendered app pattern (NextAuth-style)" — fun-learning is that pattern's reference example.

### The dual-hostname problem

This has the same *shape* of problem the Firebase emulator has (browser and the app's own server need to reach the same service, but naively would use different hostnames) — but it can't be solved the same way (remapping `localhost` itself), because **Keycloak embeds a hostname in the tokens it issues** (the `iss` claim). If the browser and the server reached Keycloak via two different hostnames, Keycloak would report two different issuers, and any correct OIDC client would reject the mismatch as a possible token-substitution attack — it's supposed to.

Fixed differently here: **split the OIDC endpoints themselves**, in `lib/auth.ts`'s `KeycloakProvider` config:

```
issuer            → KEYCLOAK_ISSUER (public, e.g. http://localhost:3510/realms/fun-learning)
                    used for the browser-facing authorization redirect AND for `iss` validation
authorization     → same public URL
token             → KEYCLOAK_INTERNAL_ISSUER (this app's server → Keycloak, e.g.
userinfo            http://host.docker.internal:3510/realms/fun-learning inside Docker,
jwks_endpoint       or the same as KEYCLOAK_ISSUER when running via `npm run dev`)
wellKnown         → explicitly unset (undefined)
```

NextAuth's `KeycloakProvider` defaults to a single well-known-discovery URL derived from `issuer`, and if `wellKnown` were left set, the SERVER-side discovery fetch would target the public (browser-only-reachable) host and fail inside Docker. Setting `wellKnown: undefined` disables discovery entirely, so NextAuth builds its OIDC client purely from the explicit endpoint values instead — letting `token`/`userinfo`/`jwks_endpoint` point at whichever host can actually reach them, while `issuer` stays pinned to the public value Keycloak actually stamps into every token's `iss` claim (identity-platform's Keycloak has a fixed `KC_HOSTNAME`, so `iss` never varies regardless of which URL a request used to reach it). Traced through NextAuth v4's actual source (`node_modules/next-auth/core/lib/oauth/client.js`) to confirm this behavior before relying on it — worth re-checking if next-auth is ever upgraded.

Unlike the Firebase emulator's fix (`extra_hosts: ["localhost:host-gateway"]`, remapping `localhost` for the whole container), this approach touches nothing at the Docker networking level — `host.docker.internal` is used directly, which Docker Desktop (Mac/Windows) provides natively with zero extra configuration. This also matches identity-platform's own documented convention for *any* consumer app's server-side code, not something invented just for fun-learning.

Verified end-to-end (not just discovery): a full authorization-code + PKCE login as `parent1`, followed by the server-side token exchange, a session with the real Keycloak identity, and a successful `/api/firebase-token` custom-token mint — all working through this endpoint-split setup.

Setting up *real* Keycloak (a production realm, not this local one) is a separate, later task — see `docs/setup-guide.md` §3 and identity-platform's `docs/ONBOARDING.md` § "Production cutover".

## Two Firestore access paths — client SDK (rule-enforced) vs admin SDK (bypasses rules)

- **`lib/db.ts`** — client Firestore SDK. Used from client components (`ProfileProvider`, quiz page, etc.) after the custom-token bridge has completed. Every read/write here is checked against `firestore.rules`.
- **`lib/firebase-admin.ts`**'s `getAdminDb()` — server-only, used inside route handlers (`/api/ocr`, `/api/generate-quiz`, `/api/generate-flashcards`) that need to read/write Firestore as part of a trusted server-side operation (e.g. writing the `study_materials` doc right after a Gemini extraction). **This bypasses Firestore rules entirely**, so every route using it manually re-checks that `profile.parent_user_id === session.user.id` before doing anything — see the top of `app/api/ocr/route.ts` for the pattern. Don't add a new admin-SDK route without that check.

`getAdminAuth()`/`getAdminDb()` are lazy (initialize on first call, not at module import) specifically because Next.js imports every route handler module during `next build`'s page-data-collection phase — eager initialization would parse the service-account key at build time and crash the build whenever a real key isn't available yet (a fresh checkout, or a Docker image built before secrets are provisioned).

## Request flow: photo upload → OCR → study material

```
app/dashboard/upload/page.tsx (client)
  1. compress image client-side (lib/image.ts, canvas downscale ~1600px)
  2. upload to Firebase Storage: book_pages/{profile_id}/{file_id}.jpg
  3. POST /api/ocr  { subject_id, profile_id, title, volume_tag, imageUrl }
       ↓
app/api/ocr/route.ts (server)
  4. verify session + profile ownership via getAdminDb()
  5. fetch the image bytes itself (doesn't trust the client to relay them)
  6. base64-encode, call lib/gemini.ts → extractStudyMaterial()
  7. write study_materials doc via getAdminDb()
  8. return extracted text to the client
```

Image bytes are fetched server-side rather than passed through from the client, and rather than handing Gemini the Storage download URL directly — see the comment block in `app/api/ocr/route.ts` for the reasoning (avoids relaying Storage's embedded access token to a third party).

## Request flow: quiz generation

```
app/dashboard/quiz/page.tsx (client)
  1. POST /api/generate-quiz { subject_id, profile_id, material_id? }
       ↓
app/api/generate-quiz/route.ts (server)
  2. verify session + profile ownership
  3. fetch the relevant study_materials doc (or most recent one for the subject)
  4. lib/gemini.ts → generateQuizQuestions() — grade-tailored prompt, structured JSON output
  5. return questions to the client (NOT persisted — ephemeral, regenerated per attempt)
       ↓ (client-side, after all 5 answered)
  6. lib/db.ts → createQuizResult() + addProfileXp() + setProfileStreak()
     (client SDK, rule-enforced — by this point it's a simple authenticated write)
```

## Directory map

```
app/
  page.tsx                    landing (public)
  help/, contact/              public info pages
  dashboard/                   auth-guarded (middleware.ts matcher: /dashboard/:path*)
    page.tsx                   subject grid
    upload/, quiz/, revision/  feature pages
  api/
    auth/[...nextauth]/        NextAuth route handler
    firebase-token/            Keycloak/demo session -> Firebase custom token
    ocr/, generate-quiz/, generate-flashcards/   Gemini-backed routes (admin SDK)
lib/
  env.ts            client-safe env (NEXT_PUBLIC_* only)
  server-env.ts      server secrets, guarded with `import "server-only"`
  firebase.ts         client SDK init (db, storage, auth)
  firebase-admin.ts   admin SDK init, lazy (getAdminAuth, getAdminDb)
  auth.ts              NextAuth options (Keycloak + demo providers)
  db.ts                 Firestore CRUD (client SDK) + collection types
  gemini.ts              Gemini wrapper (OCR, quiz, flashcards)
  useActiveProfile.ts    profile context/hook
components/           see CLAUDE.md's design-system section for styling conventions
```

## PWA / theming

- `darkMode: "class"` in `tailwind.config.ts`; theme tokens are CSS custom properties (`--background`, `--foreground`, `--surface`, `--surface-muted`, `--muted`, `--line`, `--line-strong`) defined in `app/globals.css` for `:root` and `.dark`.
- A synchronous inline script in `app/layout.tsx` sets the `dark` class on `<html>` before first paint (reads `localStorage.theme`, falls back to `prefers-color-scheme`) — this avoids a flash of the wrong theme.
- `components/ThemeToggle.tsx` flips the class and persists the choice.

## What's deliberately out of scope (see `CLAUDE.md` for the full list)

Offline PWA caching, real Capacitor native builds (scaffolding only — see `docs/mobile.md`), a parent-facing analytics dashboard, rate limiting on the Gemini routes, i18n, automated tests.
