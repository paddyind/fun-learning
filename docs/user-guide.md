# User Guide

## Signing in

Fun Learning is meant for a parent (or teacher) to sign in once, then set up one profile per child. Two ways in:

- **Keycloak** — the real login path. Locally, this needs the sibling `identity-platform` project running (`cd ../identity-platform && docker compose up -d` — see `docs/setup-guide.md` §3), which has a pre-configured test user (`parent1@example.com` / `parent12345`) — click "Sign in with Keycloak" and use those credentials. If identity-platform isn't running, the button shows a clear "Keycloak isn't reachable yet" message instead of failing silently. For a real deployment, this points at your organization's actual Keycloak realm instead.
- **Demo account** — a lighter-weight local-testing shortcut requiring no external services at all, credentials shown on the `/help` page. Gets removed before any real launch (see `CLAUDE.md`).

## Setting up a kid profile

On first sign-in you'll see "Who's learning today?" — pick an existing profile or **Add a profile**:

1. Enter the child's name.
2. Pick a grade: **Grade 3 Explorer** (CBSE) or **Grade 6 Challenger** (IGCSE) — this tailors quiz wording and difficulty later.
3. **Start learning!** — this creates the profile and seeds the four default subjects (Math, Science, English, Social Studies).

You can add more profiles later (one parent account can have several kids) and switch between them anytime via the people icon in the dashboard header.

## The dashboard

The header shows the active child's name/grade, an **XP badge**, and a **streak flame** (days in a row with at least one completed quiz). Below that is a grid of subject cards, each with three actions:

- **Upload Notes** — turn a textbook photo into study material.
- **Take Challenge** — a 5-question AI quiz for that subject.
- **Quarterly Review** — jump into that subject's slice of the Revision Hub.

## Uploading notes

1. From a subject card, **Upload Notes**.
2. Confirm the subject, add a chapter title and a volume/term tag (e.g. "Term 1 Vol 1").
3. Take a photo or drag one in. It's compressed in the browser before upload (keeps things fast and keeps your Firebase Storage bill small).
4. **Upload & extract** — the photo goes to Firebase Storage, then Gemini turns it into clean study notes (concepts, formulas, vocabulary). You'll see the extracted text once it's done, with a shortcut straight into a quiz on that material.

## Taking a challenge (quiz)

- 5 questions, one at a time, tailored to the child's grade:
  - **Grade 3** — simple multiple choice, high-energy encouragement.
  - **Grade 6** — a mix of multiple choice and short-answer, more conceptual/scenario-based.
- Correct answers trigger confetti and add XP. Incorrect answers show the right answer plus a short, friendly explanation — never phrased as "wrong."
- Finishing 5/5 gives a bonus XP boost. The first quiz completed each calendar day advances the streak by one.

## Exam Revision Hub

Aggregates quiz history over time into:

- **Superpower Topics** — subjects where average accuracy is 75%+.
- **Need Extra Practice** — subjects under 60% accuracy, plus a list of specific concepts flagged as weak from past quizzes.
- **Quick Flash Card Revision** — generates a short flashcard deck (front/back, tap to flip) from the weak-concept list, framed as a 5-minute session with an on-screen countdown.

## Installing as an app (PWA)

On desktop Chrome/Edge or Android, an install banner appears automatically (or use the browser's install option) — installs Fun Learning as a standalone app. On iOS Safari, use Share → **Add to Home Screen**.

## Dark mode

Follows your system/browser preference automatically. Override it anytime with the sun/moon icon in the header (landing page, Help, Contact, and the dashboard header all have it) — your choice is remembered.

## Getting help

The `/help` page has an FAQ and the demo login credentials. `/contact` has a support email.
