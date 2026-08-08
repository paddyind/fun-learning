# Setup Guide — what to configure before testing

The app builds and boots with the placeholder values already in `.env.local`, but almost nothing *works* until you provide real credentials for two services. This is the minimum path to a fully testable app.

## Status check: what's blocking you right now

| Feature | Needs | Status with placeholders |
|---|---|---|
| Landing page, PWA install, dashboard shell | nothing | ✅ works |
| Sign-in | Keycloak **or** the demo account (see `/help`) | ✅ works today via demo login |
| Kid profiles, subjects, quiz results, uploaded notes | Firebase project (Auth real, Firestore/Storage emulated by default) | ❌ fails until you complete §1 |
| Photo → notes (OCR), AI quiz generation, flashcards | **real Gemini API key** | ❌ fails until you complete §2 |

So: **Firebase first** (unblocks profiles/data), **Gemini second** (unblocks the AI features). Keycloak is optional while you're testing locally — the demo login (`/help`) bypasses it.

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

## 3. Keycloak (optional for local testing)

Skip this entirely while testing locally — use the **demo account** shown on `/help` instead. Set up real Keycloak only once you're ready to onboard real families; that's a separate task (realm, client, redirect URIs matching `NEXTAUTH_URL`) not covered here since it's not blocking local testing.

**Expected:** clicking "Sign in with Keycloak" on the landing page while `KEYCLOAK_ISSUER` is still the `.env.local` placeholder will fail with a redirect to `?error=OAuthSignin` — NextAuth can't reach a Keycloak server that doesn't exist yet. `components/SignInCard.tsx` recognizes this specific error and tells the user to use the demo account instead of showing a generic "check your details" message; it also auto-expands the demo login form when this happens. This is not a bug to fix, just documenting the expected flow.

If/when you want to test the *real* Keycloak OIDC flow locally (not just the demo bypass) — e.g. before productizing — a local Keycloak instance via Docker (realm import, client registration matching `KEYCLOAK_CLIENT_ID`/`NEXTAUTH_URL`) is the same class of solution as the Firebase emulator setup above, just not built yet. Ask for it when you actually need it.

---

## 4. Apply the changes

`.env.local` changes only take effect after a rebuild, because `NEXT_PUBLIC_*` values are baked into the client bundle at **build** time, not read at container start:

```bash
docker compose --env-file .env.local up -d --build
```

This now also starts the `firebase-emulator` container (Firestore + Storage). Give it a few seconds to finish starting before testing — check `docker compose logs firebase-emulator` if the app can't reach it right away.

(Running locally with `npm run dev` instead picks up `.env.local` automatically on restart — no rebuild step needed there, but you'd need to run `firebase emulators:start --only firestore,storage` yourself in a separate terminal for emulator mode to work outside Docker.)

---

## 5. Verify it worked

1. Open `http://localhost:3000`, sign in with the demo account (`/help` has the credentials).
2. You should land on the profile picker instead of the "Something needs setting up" error card. If you still see that card, read its message — it now tells you specifically whether it's a Firebase config problem or a rules/permission problem (see `components/ProfileProvider.tsx`'s `friendlyFirebaseError`).
3. Create a profile → pick a subject → **Upload Notes** with a real textbook photo → confirm you get back extracted text (proves Gemini + Storage + Firestore write all work). Check `http://localhost:4000` (Emulator UI) to see the data land in real time.
4. **Take Challenge** on that subject → confirm 5 questions generate and confetti fires on a correct answer.
