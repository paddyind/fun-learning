# Fun Learning

A gamified, cross-platform learning app for school kids. Upload textbook pages, get AI-generated quizzes tailored to grade level, earn XP and streaks, and review weak topics before exams.

See [`CLAUDE.md`](./CLAUDE.md) for the stack, code standards, and design system, and [`docs/`](./docs/README.md) for setup, architecture, data model, user guide, CI/CD, mobile, and backup docs.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and fill in Keycloak, Firebase, and Gemini credentials before running.

## Running in Docker (Docker Desktop)

The app builds to a standalone Next.js server image (multi-stage `Dockerfile`, ~280MB). Both the image build (for `NEXT_PUBLIC_*` values, which get baked into the client bundle) and the running container need the values from `.env.local`, so always pass `--env-file .env.local` to `docker compose`:

```bash
docker compose --env-file .env.local build
docker compose --env-file .env.local up -d
```

Open [http://localhost:3000](http://localhost:3000). Stop it with:

```bash
docker compose --env-file .env.local down
```

This also starts a `firebase-emulator` container (Firestore + Storage) and a `keycloak` container (real local OIDC login) alongside the app.

Notes:
- Placeholder values in `.env.local` are enough for the app to **build, start, and log in** — via the built-in local Keycloak (test user `parent1`/`parent12345`) or the demo account on `/help`, both work with zero setup. Real Firebase Auth credentials (not Firestore/Storage — those are emulated by default) are still needed for profiles/data to load, and a real Gemini key for OCR/quiz/flashcard generation — see [`docs/setup-guide.md`](./docs/setup-guide.md) for exact steps.
- **Firestore + Storage run as local emulators by default** (`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`) — real Cloud Storage now requires the Blaze (pay-as-you-go) plan even at $0 usage, so emulating avoids needing a card on file just to test locally. Browse emulated data live at [http://localhost:4000](http://localhost:4000). Firebase Auth always stays real regardless of this setting — see `docs/architecture.md`.
- **Keycloak runs locally too** (admin console at [http://localhost:8180](http://localhost:8180), `admin`/`admin`) with a realm pre-imported from `keycloak/realm-export.json` — no external Keycloak needed for testing. Real production Keycloak setup is a separate later task, see `docs/setup-guide.md` §3.
- If you change any `NEXT_PUBLIC_*` value, you must rebuild (`--build` or `docker compose build`) — those are compiled into the client bundle at image build time, not read at container startup.
- Omitting `--env-file .env.local` on a `docker compose` command (e.g. plain `docker compose ps`) prints harmless "variable is not set" warnings — it doesn't affect the already-built image or running container, but pass the flag consistently to avoid the noise.
