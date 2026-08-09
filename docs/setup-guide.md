# Setup Guide — what to configure before testing

The app builds and boots with the placeholder values already in `.env.local`, but almost nothing *works* until you provide real credentials for two services. This is the minimum path to a fully testable app.

## Status check: what's blocking you right now

| Feature | Needs | Status |
|---|---|---|
| Landing page, PWA install, dashboard shell | nothing | ✅ works |
| Sign-in | Local Keycloak (built in) **or** the demo account (see `/help`) | ✅ both work out of the box |
| Kid profiles, subjects, quiz results, uploaded notes | Firebase project (Auth real, Firestore/Storage emulated by default) | ✅ once §1 is done |
| Photo → notes (OCR), AI quiz generation, flashcards | **real Gemini API key** | ❌ fails until you complete §2 |

So: **Firebase first** (unblocks profiles/data), **Gemini second** (unblocks the AI features). Keycloak needs nothing from you — a local instance is included and pre-configured (§3).

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

## 3. Keycloak (included — nothing to set up)

A real local Keycloak instance is part of `docker-compose.yml` (the `keycloak` service) — `docker compose up` starts it alongside the app, with a realm/client/test-user already imported from `keycloak/realm-export.json`. Nothing to configure:

- **Realm:** `fun-learning`
- **Client:** `fun-learning-app` (already matches `.env.local`'s `KEYCLOAK_CLIENT_ID`)
- **Test user:** `parent1` / `parent12345`
- **Admin console:** [http://localhost:8180](http://localhost:8180) (`admin` / `admin`) if you want to add more users or inspect the realm

Click **"Sign in with Keycloak"** on the landing page and log in with `parent1`/`parent12345` — this exercises the real OIDC flow (authorization code + PKCE, server-side token exchange), not the demo bypass. The demo account (`/help`) still works too and is unaffected — use whichever is convenient.

Why port **8180**, not Keycloak's default 8080: the Firestore emulator (§1) already owns 8080.

### Why this needed the same "dual hostname" fix as the Firebase emulator

Keycloak issues tokens with an `iss` (issuer) claim that must exactly match what NextAuth expects — but the **browser** reaches Keycloak via `http://localhost:8180`, while this app's own **server** (inside its Docker container) would normally need a different hostname (the docker-compose service name) to reach the same Keycloak instance. Two different hostnames would mean two different `iss` values, breaking token validation.

Fixed via `extra_hosts: ["localhost:host-gateway"]` on the `web` service in `docker-compose.yml` — this makes `localhost` inside the app container resolve to the host machine (Docker's portable host-gateway mechanism), so **both** the browser and the app's server reach Keycloak via the exact same `http://localhost:8180`, and Keycloak (configured with a fixed `KC_HOSTNAME=localhost`) always reports the same issuer regardless of which one asked. See `docs/architecture.md` for the full explanation — it's the same shape of problem the Firebase emulator setup already solved, just for a different service.

### Setting up real Keycloak later (production)
Not covered here since it's not blocking local testing — that's a separate task: a real realm on your organization's Keycloak server, a client registered with production redirect URIs matching your real `NEXTAUTH_URL`, and updating `KEYCLOAK_CLIENT_ID`/`KEYCLOAK_CLIENT_SECRET`/`KEYCLOAK_ISSUER` accordingly. Once real Keycloak is in place, remove the demo login (see `CLAUDE.md` → Known follow-ups) — the local Keycloak service here is fine to leave as-is for continued local dev even after that.

---

## 4. Apply the changes

`.env.local` changes only take effect after a rebuild, because `NEXT_PUBLIC_*` values are baked into the client bundle at **build** time, not read at container start:

```bash
docker compose --env-file .env.local up -d --build
```

This starts the app plus two local services: `firebase-emulator` (Firestore + Storage) and `keycloak`. Give them a few seconds to finish starting before testing — check `docker compose logs firebase-emulator` or `docker compose logs keycloak` if something can't be reached right away.

(Running locally with `npm run dev` instead picks up `.env.local` automatically on restart — no rebuild step needed there, but you'd need to run the Firebase emulator and a Keycloak instance yourself outside Docker for those flows to work.)

---

## 5. Verify it worked

1. Open `http://localhost:3000`. Either **"Sign in with Keycloak"** (`parent1`/`parent12345`) or the demo account (`/help`) should land you on the profile picker instead of the "Something needs setting up" error card. If you still see that card, read its message — it now tells you specifically whether it's a Firebase config problem or a rules/permission problem (see `components/ProfileProvider.tsx`'s `friendlyFirebaseError`).
2. Create a profile → pick a subject → **Upload Notes** with a real textbook photo → confirm you get back extracted text (proves Gemini + Storage + Firestore write all work). Check `http://localhost:4000` (Emulator UI) to see the data land in real time.
3. **Take Challenge** on that subject → confirm 5 questions generate and confetti fires on a correct answer.
