# Fun Learning — Documentation

Living documentation, updated alongside the code as the app evolves. If you change something these docs describe, update the doc in the same change — see `docs/CHANGELOG.md` for the running history of what's changed and why.

- **[setup-guide.md](./setup-guide.md)** — what to configure (Firebase, Gemini — Keycloak is included and pre-configured) before the app is actually testable, not just buildable.
- **[architecture.md](./architecture.md)** — the stack, the Keycloak/demo-login → Firebase custom-token identity bridge, request flows for upload/OCR and quiz generation, directory map.
- **[data-model.md](./data-model.md)** — Firestore collections, relationships, indexes, security rules summary.
- **[user-guide.md](./user-guide.md)** — how to actually use the app (sign in, profiles, upload, quizzes, revision hub, dark mode).
- **[backup.md](./backup.md)** — manual Firestore/Storage export & restore commands.
- **[ci-cd.md](./ci-cd.md)** — the cloud CI workflow and the self-hosted-runner deploy-to-local-Docker-Desktop workflow, including the security reasoning behind how each is scoped.
- **[mobile.md](./mobile.md)** — Capacitor scaffolding, why it's a thin-wrapper (not static export), what's built vs. deliberately not.
- **[CHANGELOG.md](./CHANGELOG.md)** — dated history of what changed and why.

See also, at the repo root: **`CLAUDE.md`** (stack summary, code standards, child-friendly design system — written for whoever/whatever is editing the code next) and **`README.md`** (quickstart).
