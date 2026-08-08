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

Notes:
- Placeholder values in `.env.local` are enough for the app to **build, start, and log in** (via the demo account on `/help` — no Keycloak needed for local testing). Real Firebase credentials are needed for profiles/data to load, and a real Gemini key for OCR/quiz/flashcard generation — see [`docs/setup-guide.md`](./docs/setup-guide.md) for exact steps.
- If you change any `NEXT_PUBLIC_*` value, you must rebuild (`--build` or `docker compose build`) — those are compiled into the client bundle at image build time, not read at container startup.
- Omitting `--env-file .env.local` on a `docker compose` command (e.g. plain `docker compose ps`) prints harmless "variable is not set" warnings — it doesn't affect the already-built image or running container, but pass the flag consistently to avoid the noise.
