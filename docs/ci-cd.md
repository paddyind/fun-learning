# CI/CD

Two workflows, two very different trust boundaries. Read the "why" before touching either.

## `.github/workflows/ci.yml` — cloud validation

Runs on GitHub-hosted `ubuntu-latest` runners, on every push (any branch) and every PR. Two jobs:

1. **lint-typecheck-build** — `eslint`, `tsc --noEmit`, `next build`.
2. **docker-build** — builds the actual `Dockerfile` image (not pushed anywhere), catching Docker-specific breakage the plain `next build` job wouldn't (missing build args, Dockerfile syntax errors, etc).

All env vars are **placeholder strings hardcoded in the workflow**, not GitHub secrets — this job only proves the app *compiles*, it never calls Keycloak, Firebase, or Gemini, so there's nothing real to protect. This mirrors how the app already builds fine locally with placeholder `.env.local` values (see `lib/firebase-admin.ts`'s lazy-init fix — that's specifically what makes this possible).

This job runs on **cloud infrastructure with no access to your Mac** — safe to let anyone's PR trigger it.

## `.github/workflows/deploy-local.yml` — self-hosted, deploys to Docker Desktop on this Mac

This is the part that's genuinely different from a normal pipeline, so it gets a longer explanation.

### What it does

On every push to `main` (or a manual `workflow_dispatch`), a runner **installed on this Mac** (not GitHub's infrastructure) runs `git reset --hard origin/main` against the actual project directory, then `docker compose --env-file .env.local up -d --build` — i.e. it redeploys the local Docker Desktop container to match whatever was just pushed.

### The runner itself

- Registered via `gh api repos/paddyind/fun-learning/actions/runners/registration-token`, installed at `~/actions-runners/fun-learning`, running as a **launchd service** (auto-starts on login — `~/Library/LaunchAgents/actions.runner.paddyind-fun-learning...plist`).
- Labeled `fun-learning-local` (in addition to the default `self-hosted`/`macOS`/`ARM64` labels) so the workflow targets *this* runner specifically, not any other self-hosted runner that might exist on the account later.
- Check it's alive: `gh api repos/paddyind/fun-learning/actions/runners --jq '.runners[] | {name,status,busy}'`.
- Manage it directly: `cd ~/actions-runners/fun-learning && ./svc.sh status|stop|start|uninstall`.

### The Docker-in-launchd gotcha (already fixed, but know this if it resurfaces)

The runner's launchd service is a background session with no GUI/keychain access ("current session does not allow user interaction"). Two separate problems this caused, both already fixed:

1. **`docker compose --env-file` → `unknown flag`.** The runner's minimal environment didn't pick up Docker Desktop's CLI plugin directory correctly once `DOCKER_CONFIG` was overridden (see next point) without also carrying over `cli-plugins/`. Fixed by copying `~/.docker/cli-plugins` into the isolated config dir below.
2. **`error getting credentials ... keychain cannot be accessed`.** Docker/BuildKit resolves image references (`FROM node:22-alpine`, and the `# syntax=docker/dockerfile:1` frontend image) by checking the registry for the current manifest digest, which goes through the configured credential store (`credsStore: "desktop"` in `~/.docker/config.json`) even for public, unauthenticated images — and that credential helper needs keychain access the background session doesn't have.

**Fix:** the runner gets its own isolated Docker config via a `.env` file GitHub's runner auto-loads for every job:

```
~/actions-runners/fun-learning/.env:
  DOCKER_CONFIG=/Users/padmanabanvaratharajan/actions-runners/fun-learning/.docker

~/actions-runners/fun-learning/.docker/
  config.json       — {} (no credsStore, so no credential-helper calls at all)
  cli-plugins/       — copied from ~/.docker/cli-plugins (needed for `docker compose` to resolve as a plugin)
```

With no `credsStore` configured, Docker treats docker.io as anonymous — but resolution still needs the referenced image manifest reachable *without* a fresh registry round-trip prompting for credentials it doesn't have a store to check. In practice this works because `node:22-alpine` and `docker/dockerfile:1` are already pulled into the shared local Docker image cache (via an ordinary interactive `docker pull`) — resolving a tag that's already present locally doesn't hit the same credential-lookup path a cache-miss pull would. **If the Dockerfile's base image ever changes, pull the new tag once interactively (in a normal terminal, where keychain access works) before the next `deploy-local` run** — otherwise this same failure resurfaces for the new tag.

This only affects the isolated runner config — your normal interactive `docker`/`docker compose` usage on this Mac is untouched (`~/.docker/config.json` was never modified).

### Why it doesn't use `actions/checkout`

`actions/checkout`'s default cleanup step runs `git clean -ffdx`, which deletes **git-ignored files too** (that's what the extra `f`/`x` flags do) — including `.env.local`. Since `.env.local` holds real secrets that only exist on this machine (never committed), letting a workflow silently delete it on every run would be a bad time. Instead, the job runs plain `git fetch`/`git reset --hard` directly against the existing working copy at a hardcoded path — that combo only ever touches *tracked* files, so `.env.local` survives untouched.

One consequence: **any uncommitted local edits in that directory get discarded** when this workflow runs (that's what `reset --hard` does). If you're mid-edit on this Mac and don't want it clobbered, don't push to `main` yet, or `git stash` first.

### Security posture (public repo)

This repo is public. A self-hosted runner attached to a public repo is a real risk in general — a malicious PR could otherwise get arbitrary code executed on the machine the runner lives on. Two things keep that in check here:

1. **Trigger is `push` to `main` only** — never `pull_request` or `pull_request_target`. Push access to `main` requires being a collaborator; a fork's PR branch cannot trigger this workflow at all, regardless of what's in the PR.
2. `ci.yml` (which *does* run on PRs, including from forks) only ever touches GitHub-hosted cloud runners — it never has access to the self-hosted runner or this Mac.

If collaborators are ever added to this repo, revisit this — "push to main" only stays a meaningful boundary if `main` itself is protected (require PR review before merge) so a compromised or careless collaborator can't push directly.

### Manually deploying without waiting for a push

```bash
docker compose --env-file .env.local up -d --build
```

Same command the workflow runs — useful for testing local changes before committing.

## What's not set up

- No deployment to any real hosting target (Vercel, Cloud Run, etc.) — "deployed to local Docker Desktop" was the explicit ask; a real deploy target is a separate decision.
- No secrets management for `deploy-local.yml` — it reads the same `.env.local` sitting in the project directory, which is appropriate for a single-machine local setup but wouldn't be the right pattern for a shared/team runner.
