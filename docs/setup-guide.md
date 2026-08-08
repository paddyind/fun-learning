# Setup Guide — what to configure before testing

The app builds and boots with the placeholder values already in `.env.local`, but almost nothing *works* until you provide real credentials for two services. This is the minimum path to a fully testable app.

## Status check: what's blocking you right now

| Feature | Needs | Status with placeholders |
|---|---|---|
| Landing page, PWA install, dashboard shell | nothing | ✅ works |
| Sign-in | Keycloak **or** the demo account (see `/help`) | ✅ works today via demo login |
| Kid profiles, subjects, quiz results, uploaded notes | **real Firebase project** | ❌ fails — this is what you're hitting now |
| Photo → notes (OCR), AI quiz generation, flashcards | **real Gemini API key** | ❌ fails |

So: **Firebase first** (unblocks profiles/data), **Gemini second** (unblocks the AI features). Keycloak is optional while you're testing locally — the demo login (`/help`) bypasses it.

---

## 1. Firebase project (required)

### 1a. Create the project
1. Go to the [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. Name it (e.g. `fun-learning-dev`). Google Analytics is optional — skip it for a dev project.

### 1b. Enable Firestore
1. In the left nav: **Build → Firestore Database → Create database**.
2. Choose **production mode** (we ship real security rules, not test-mode-open rules) and pick a region close to you.

### 1c. Enable Storage
1. **Build → Storage → Get started**.
2. Same region as Firestore is fine. Production mode again.

### 1d. Register a Web app → get the 6 `NEXT_PUBLIC_FIREBASE_*` values
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

### 1e. Generate a service account key → get the 3 `FIREBASE_ADMIN_*` values
This is what lets the app mint a Firebase custom token from your Keycloak/demo session (see `CLAUDE.md` → "Env / secrets architecture" for why this bridge exists).

1. **⚙ Project settings → Service accounts** tab.
2. **Generate new private key** → downloads a JSON file. Treat it like a password — it's full admin access to your Firebase project.
3. From that JSON, copy into `.env.local`:

   | JSON field | `.env.local` variable |
   |---|---|
   | `project_id` | `FIREBASE_ADMIN_PROJECT_ID` |
   | `client_email` | `FIREBASE_ADMIN_CLIENT_EMAIL` |
   | `private_key` | `FIREBASE_ADMIN_PRIVATE_KEY` (keep the quotes and `\n` sequences exactly as in the JSON) |

### 1f. Deploy the security rules and indexes
From the project root (installs the Firebase CLI on first run if you don't have it):

```bash
npx firebase-tools login
npx firebase-tools use --add          # pick your fun-learning-dev project
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage
```

Without this step, Firestore has **no rules deployed yet**, which typically defaults to deny-all in production mode — profile creation will fail with a `permission-denied` error even with correct credentials.

---

## 2. Gemini API key (required for OCR + quizzes + flashcards)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey) → **Create API key**.
2. Copy it into `.env.local` as `GEMINI_API_KEY`.
3. Leave `GEMINI_MODEL` as its default (`gemini-2.5-flash`) unless you have a reason to change it — see `lib/gemini.ts` for why the model is env-configurable rather than hardcoded.

---

## 3. Keycloak (optional for local testing)

Skip this entirely while testing locally — use the **demo account** shown on `/help` instead. Set up real Keycloak only once you're ready to onboard real families; that's a separate task (realm, client, redirect URIs matching `NEXTAUTH_URL`) not covered here since it's not blocking local testing.

---

## 4. Apply the changes

`.env.local` changes only take effect after a rebuild, because `NEXT_PUBLIC_*` values are baked into the client bundle at **build** time, not read at container start:

```bash
docker compose --env-file .env.local up -d --build
```

(Running locally with `npm run dev` instead picks up `.env.local` automatically on restart — no rebuild step needed there.)

---

## 5. Verify it worked

1. Open `http://localhost:3000`, sign in with the demo account (`/help` has the credentials).
2. You should land on the profile picker instead of the "Something needs setting up" error card. If you still see that card, read its message — it now tells you specifically whether it's a Firebase config problem or a rules/permission problem (see `components/ProfileProvider.tsx`'s `friendlyFirebaseError`).
3. Create a profile → pick a subject → **Upload Notes** with a real textbook photo → confirm you get back extracted text (proves Gemini + Storage + Firestore write all work).
4. **Take Challenge** on that subject → confirm 5 questions generate and confetti fires on a correct answer.
