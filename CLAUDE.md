# Fun Learning

Gamified, cross-platform learning app for kids in Grade 3 (CBSE) and Grade 6 (IGCSE). Parents sign in, create kid profiles, kids upload textbook photos that get OCR'd into study material, take AI-generated grade-tailored quizzes, and review strong/weak topics before exams.

This file is for whoever/whatever edits the code next. For setup steps, architecture deep-dives, the data model, CI/CD, mobile, and end-user docs, see [`docs/`](./docs/README.md) — keep both in sync when either changes.

## Stack

- **Framework:** Next.js 14 (App Router, TypeScript, Tailwind CSS), no `src/` directory — paths are `app/`, `lib/`, `components/` at root.
- **Auth:** NextAuth.js v4 with the Keycloak OIDC provider (`lib/auth.ts`). Route protection via `middleware.ts` (matcher `/dashboard/:path*`).
- **Database/Storage:** Firebase (Firestore + Storage). The app authenticates via Keycloak, not Firebase Auth, so a **custom-token bridge** (`app/api/firebase-token`, `components/FirebaseAuthBridge.tsx`) exchanges the NextAuth session for a Firebase custom token on sign-in, keyed on the Keycloak user id. This is what lets Firestore/Storage security rules enforce per-family ownership via `request.auth.uid`. Never bypass this — don't add client Firestore/Storage calls before the bridge has run. **Firestore/Storage are emulated locally by default** (`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`, `Dockerfile.emulator`, `firebase.json`) — real Cloud Storage now requires the Blaze plan even at $0 usage, so local testing avoids it entirely. Auth stays real either way; see `lib/firebase.ts` for the dual-hostname emulator connection (server container vs. browser) and `docs/setup-guide.md` for the full explanation.
- **AI:** Google Gemini via `@google/genai` (not the deprecated `@google/generative-ai`), wrapped in `lib/gemini.ts`. Model id is env-configurable (`GEMINI_MODEL`, default `gemini-2.5-flash`) — never hardcode a model id, Gemini model availability changes.
- **Icons:** `lucide-react`. **Confetti:** `canvas-confetti`, fired only on correct quiz answers/milestones.
- **PWA:** manual `public/manifest.json` + meta tags in `app/layout.tsx`, no service worker/offline caching yet (see Follow-ups below).

## Env / secrets architecture

Two separate files — **do not merge them**:
- `lib/env.ts` — client-safe (`NEXT_PUBLIC_*` only). Safe to import from client or server code.
- `lib/server-env.ts` — server secrets (Keycloak, NextAuth, Firebase Admin, Gemini). Guarded with `import "server-only"` so an accidental import from a client component fails the build instead of silently shipping secrets or crashing at runtime with `undefined`.

Route handlers needing Firestore writes that a browser couldn't make directly (OCR extraction, quiz/flashcard generation) use `lib/firebase-admin.ts`'s `getAdminDb()`, which **bypasses Firestore Security Rules**. Every such route must manually verify the requester owns the `profile_id` it's operating on (fetch the profile doc, compare `parent_user_id` to `session.user.id`) before doing anything — see `app/api/ocr/route.ts` for the pattern. `getAdminAuth()`/`getAdminDb()` are lazy (initialize on first call) on purpose — see the comment in `lib/firebase-admin.ts`.

Client-side Firestore/Storage calls (`lib/db.ts`, used from components) go through the regular client SDK and are enforced by `firestore.rules`/`storage.rules`.

## Code standards

- Server-only modules (`lib/server-env.ts`, `lib/auth.ts`, `lib/gemini.ts`, `lib/firebase-admin.ts`) start with `import "server-only";`. Add this to any new file that touches a secret.
- Client components are marked `"use client"` at the top; keep them as thin as reasonable — data fetching/mutation logic belongs in `lib/db.ts` or a route handler, not scattered inline.
- Any page using `useSearchParams` must wrap its content in a `<Suspense>` boundary (see `app/dashboard/upload/page.tsx`, `app/dashboard/quiz/page.tsx`, `app/dashboard/revision/page.tsx` for the pattern) or `next build` fails.
- Firestore collections and their shapes are defined once in `lib/db.ts` (`Profile`, `Subject`, `StudyMaterial`, `QuizResult`) — reuse those types rather than inlining Firestore doc shapes elsewhere.
- Run `npx tsc --noEmit` after non-trivial changes; the project has no test suite yet.

## Child-friendly design system

- **Palette (Tailwind tokens in `tailwind.config.ts`):** `brand` (#6366f1, indigo — primary, matches PWA theme color), `xp` (#22c55e, green), `streak` (#f97316, orange), `encourage` (#ec4899, pink). Use the tokens, not raw hex.
- **Type:** `font-heading` (Baloo 2 — rounded, playful, for headings/buttons) and `font-body` (Inter — for body/quiz text where legibility matters more than personality).
- **Tap targets:** minimum 44px, but 56–64px for primary buttons/cards — assume small fingers and touchscreens. ≥8px spacing between adjacent tap targets to avoid mis-taps during quizzes.
- **Motion:** `canvas-confetti` fires only on correct quiz answers and milestones, never on plain navigation. Respect `prefers-reduced-motion` (see `components/QuizQuestionCard.tsx`'s `fireConfetti`). Transitions 150–300ms, `ease-out`.
- **Copy tone:** encouraging, specific, never punitive — "Almost! Here's the trick:" not "Incorrect." Grade 3 copy: short sentences, high energy, icon-driven (lucide, not raw emoji). Grade 6 copy: matter-of-fact, conceptual, per the spec's "structured thinking" framing.

## Known follow-ups (intentionally out of MVP scope)

- **Demo login must be removed before any real deployment.** `lib/auth.ts` registers a `CredentialsProvider` ("demo") alongside Keycloak, with fixed credentials from `lib/demoLogin.ts`, shown on `/help`. It exists only so the app is testable before a real Keycloak realm is configured — it's not gated behind `NODE_ENV` (it needs to work in the Docker production build too), so it stays active until someone deletes it. Delete the `CredentialsProvider` block in `lib/auth.ts` and `lib/demoLogin.ts` (and the "Use demo account" UI in `components/SignInCard.tsx` and `/help`) once real Keycloak credentials are in place.
- Offline PWA caching / service worker (manifest-only installability today).
- Capacitor is scaffolded (`android/`, `ios/`, `capacitor.config.ts`) as a thin WebView wrapper pointed at a deployed URL — not a static export (the app has API routes/middleware/SSR). No code signing configured, mobile builds are manual-trigger-only in CI. See `docs/mobile.md`.
- Rate-limiting on the Gemini-backed routes (`/api/ocr`, `/api/generate-quiz`, `/api/generate-flashcards`) — currently uncapped per profile per day.
- Parent-facing analytics dashboard (the revision hub is kid/topic-facing only).
- i18n, automated tests.

## Local setup

Full walkthrough with exact console steps: [`docs/setup-guide.md`](./docs/setup-guide.md). Short version:

1. `npm install`
2. Fill in `.env.local` — Firebase (client config + service account, for real Auth) and Gemini are required for the app to actually *work*; Keycloak is optional while testing locally (use the demo account on `/help` instead — clicking "Sign in with Keycloak" without a real `KEYCLOAK_ISSUER` fails with `?error=OAuthSignin`, which `SignInCard.tsx` explains and redirects toward the demo form automatically).
3. Firestore/Storage are emulated by default (`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`) — no rules deployment needed for local testing, `docker compose up` starts the emulator too. Only deploy `firestore.rules`/`firestore.indexes.json`/`storage.rules` for real (`npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage`) once you switch that flag to `false`.
4. `npm run dev`, or `docker compose --env-file .env.local up -d --build` (see `docs/ci-cd.md` for the automated version of this on push).
