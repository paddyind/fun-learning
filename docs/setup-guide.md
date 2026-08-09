# Setup Guide — what to configure before testing

The app builds and boots with the placeholder values already in `.env.local`, but almost nothing *works* until you provide real credentials for two services. This is the minimum path to a fully testable app.

## Status check: what's blocking you right now

| Feature | Needs | Status |
|---|---|---|
| Landing page, PWA install, dashboard shell | nothing | ✅ works |
| Sign-in | The sibling **identity-platform** repo running (§3) **or** the demo account (see `/help`) | ✅ demo works immediately; Keycloak needs identity-platform started once |
| Kid profiles, subjects, quiz results, uploaded notes | Firebase project (Auth real, Firestore/Storage emulated by default) | ✅ once §1 is done |
| Photo → notes (OCR), AI quiz generation, flashcards | **real Gemini API key** | ❌ fails until you complete §2 |

So: **Firebase first** (unblocks profiles/data), **Gemini second** (unblocks the AI features). Keycloak needs identity-platform running (§3) — or skip it entirely and use the demo account.

---

## 1. Firebase project (required)

### Why Firestore/Storage are emulated by default

Google now requires the **Blaze (pay-as-you-go)** plan to enable real Cloud Storage — even for $0 actual usage, a card has to be on file. Rather than require that just to test locally, this project runs **Firestore and Storage as local emulators** (`Dockerfile.emulator`, `firebase.json`) by default — genuinely free, no card, ever. **Firebase Auth stays real** (Auth alone doesn't require Blaze), since the Keycloak/demo → Firebase custom-token bridge (see `CLAUDE.md` → "Env / secrets architecture") needs a real Auth backend to redeem custom tokens against.

If you later want real Firestore/Storage (e.g. before a real deployment), see §1f.

### 1a. Create the project
1. Go to the [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. Name it (e.g. `fun-learning-dev`). Google Analytics is optional — skip it for a dev project.

### 1b. Enable Authentication
1. **Build → Authentication → Get started**.
2. You don't need to enable any specific sign-in provider (Email/Password, Google, etc.) — the app only uses custom-token sign-in, which works once Authentication itself is initialized for the project.

### 1c. Register a Web app → get the 6 `NEXT_PUBLIC_FIREBASE_*` values
1. Project Overview → **⚙ Project settings → General** → scroll to "Your apps" → **Add app → Web** (`</>` icon).
2. Give it any nickname, skip Firebase Hosting.
3. Firebase shows a `firebaseConfig` object — copy each value into `.env.local`:

   | Firebase Console field | `.env.local` variable |
   |---|---|
   | `apiKey` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
   | `authDomain` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
   | `projectId` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
   | `storageBucket` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
   | `messagingSenderId` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
   | `appId` | `NEXT_PUBLIC_FIREBASE_APP_ID` |

### 1d. Generate a service account key → get the 3 `FIREBASE_ADMIN_*` values
This is what lets the app mint a Firebase custom token from your Keycloak/demo session.

1. **⚙ Project settings → Service accounts** tab.
2. **Generate new private key** → downloads a JSON file. Treat it like a password — it's full admin access to your Firebase project.
3. From that JSON, copy into `.env.local`:

   | JSON field | `.env.local` variable |
   |---|---|
   | `project_id` | `FIREBASE_ADMIN_PROJECT_ID` |
   | `client_email` | `FIREBASE_ADMIN_CLIENT_EMAIL` |
   | `private_key` | `FIREBASE_ADMIN_PRIVATE_KEY` (keep the quotes and `\n` sequences exactly as in the JSON) |

### 1e. Leave `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`
Already set in `.env.local` by default. This routes Firestore/Storage to the local emulator containers (`firebase-emulator` service in `docker-compose.yml`) instead of the real project — no rules deployment needed for local testing, since the emulator loads `firestore.rules`/`storage.rules` directly from the repo.

Emulator data is **ephemeral** — it resets every time the `firebase-emulator` container restarts. That's fine for testing, not for anything you want to keep. Inspect/browse data live at `http://localhost:4000` (Emulator UI) once the containers are running.

### 1f. (Later) Switching to real Firestore/Storage
When you're ready to stop emulating (e.g. before a real deployment):
1. Enable Firestore (**Build → Firestore Database → Create database**, production mode) and Storage (**Build → Storage → Get started**) in the console — Storage will prompt you to upgrade to Blaze at this point.
2. Deploy the security rules: `npx firebase-tools login && npx firebase-tools use --add && npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage`.
3. Set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false` in `.env.local` and rebuild.

---

## 2. Gemini API key (required for OCR + quizzes + flashcards)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey) → **Create API key**.
2. Copy it into `.env.local` as `GEMINI_API_KEY`.
3. Leave `GEMINI_MODEL` as its default (`gemini-2.5-flash`) unless you have a reason to change it — see `lib/gemini.ts` for why the model is env-configurable rather than hardcoded.

---

## 3. Keycloak (external — lives in the sibling `identity-platform` repo)

**This repo does not run Keycloak.** Identity/auth infrastructure is intentionally kept out of fun-learning — it lives in a separate, sibling project, **`identity-platform`** (`../identity-platform` next to this repo), which is a shared Keycloak deployment for multiple apps in this workspace, not something fun-learning-specific. See that repo's `docs/ONBOARDING.md` for the full platform design; this section just covers what fun-learning needs from it.

### Start it

```bash
cd ../identity-platform
docker compose up -d
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3510/realms/fun-learning
# expect 200
```

fun-learning's realm is already defined there (`identity-platform/realms/fun-learning-realm.json`) — nothing to create, just start the platform:

- **Realm:** `fun-learning`
- **Client:** `fun-learning-app` (a single confidential client — see below for why this differs from identity-platform's usual frontend/backend client pair)
- **Test user:** `parent1@example.com` / `parent12345`
- **Admin console:** [http://localhost:3510](http://localhost:3510) (`admin`/`admin`), or the realm-scoped console at `http://localhost:3510/admin/fun-learning/console/`

Click **"Sign in with Keycloak"** on the landing page and log in with those credentials — this exercises the real OIDC flow (authorization code + PKCE, server-side token exchange), not the demo bypass. The demo account (`/help`) still works too and is unaffected — use whichever is convenient. If identity-platform isn't running, the Keycloak button fails with a clear "Keycloak isn't reachable yet" message (see `components/SignInCard.tsx`) rather than a cryptic error.

### Why fun-learning registers one client, not the usual frontend/backend pair

identity-platform's convention (documented in its `docs/ONBOARDING.md`) is built around apps with a client-side SPA (`keycloak-js`) plus a separate backend verifying bearer tokens — two clients, `{app}-frontend` (public) and `{app}-backend` (confidential, service account). fun-learning is architecturally different: a single Next.js server does the entire OIDC exchange itself via NextAuth, holds the client secret server-side, and only ever hands the browser an httpOnly session cookie — never a Keycloak token. That maps onto **one confidential client** (`fun-learning-app`, `standardFlowEnabled: true`, not service-accounts-only), not two. See identity-platform's `docs/ONBOARDING.md` § "Server-rendered app pattern (NextAuth-style)" for the general version of this pattern — fun-learning is its reference example.

### Why this needed a "dual hostname" fix, same shape as the Firebase emulator's

Keycloak issues tokens with an `iss` (issuer) claim that must exactly match what NextAuth expects — but the **browser** reaches Keycloak via `http://localhost:3510`, while this app's own **server** (inside its Docker container) needs a different hostname to reach that same, externally-run Keycloak. Two different hostnames talking to the same service would normally risk two different `iss` values.

Fixed in `lib/auth.ts`: `issuer` (used for the browser-facing authorization redirect and for `iss` validation) stays pinned to the public `KEYCLOAK_ISSUER` value, while `token`/`userinfo`/`jwks_endpoint` are explicitly pointed at `KEYCLOAK_INTERNAL_ISSUER` — `http://host.docker.internal:3510/...` inside Docker (Docker Desktop provides this hostname natively, no extra config needed), or the same value as `KEYCLOAK_ISSUER` when running via `npm run dev` outside Docker. See `docs/architecture.md` and identity-platform's `docs/ONBOARDING.md` "public issuer vs Docker JWKS URL" for the full explanation — it's the same class of problem the Firebase emulator setup solved, just fixed differently here (endpoint-splitting inside the OIDC client config, rather than remapping `localhost` itself).

### Setting up real Keycloak later (production)
Not covered here since it's not blocking local testing. Follow identity-platform's `docs/ONBOARDING.md` § "Production cutover" — same realm/client names, different `KEYCLOAK_ISSUER`/`KEYCLOAK_INTERNAL_ISSUER` values pointing at a real Keycloak deployment, and rotate the `fun-learning-app` client secret out of its dev value. Once real Keycloak is in place, remove the demo login (see `CLAUDE.md` → Known follow-ups).

---

## 4. Apply the changes

`.env.local` changes only take effect after a rebuild, because `NEXT_PUBLIC_*` values are baked into the client bundle at **build** time, not read at container start:

```bash
docker compose --env-file .env.local up -d --build
```

This starts the app plus `firebase-emulator` (Firestore + Storage). It does **not** start Keycloak — that's identity-platform's job (§3); start it separately if you want the real OIDC flow, or skip it and use the demo account. Give the emulator a few seconds to finish starting before testing — check `docker compose logs firebase-emulator` if it can't be reached right away.

(Running locally with `npm run dev` instead picks up `.env.local` automatically on restart — no rebuild step needed there, but you'd need to run the Firebase emulator yourself outside Docker for uploads/OCR to work.)

---

## 5. Verify it worked

1. Open `http://localhost:3000`. Either **"Sign in with Keycloak"** (`parent1`/`parent12345`) or the demo account (`/help`) should land you on the profile picker instead of the "Something needs setting up" error card. If you still see that card, read its message — it now tells you specifically whether it's a Firebase config problem or a rules/permission problem (see `components/ProfileProvider.tsx`'s `friendlyFirebaseError`).
2. Create a profile → pick a subject → **Upload Notes** with a real textbook photo → confirm you get back extracted text (proves Gemini + Storage + Firestore write all work). Check `http://localhost:4000` (Emulator UI) to see the data land in real time.
3. **Take Challenge** on that subject → confirm 5 questions generate and confetti fires on a correct answer.
