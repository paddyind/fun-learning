# Data Model

Firestore, native mode. All types are defined once in `lib/db.ts` — treat that file as the source of truth; this document explains the *why*, not a duplicate schema that can drift.

## Collections

### `profiles`

```ts
{
  id: string;
  name: string;
  grade: "Grade 3 CBSE" | "Grade 6 IGCSE";
  xp_points: number;
  streak_days: number;
  parent_user_id: string;   // == session.user.id (Keycloak "sub" or the demo account's fixed id)
  created_at: Timestamp;
}
```

The ownership root of the whole data model — every other collection is authorized by walking back to the `profiles` doc that owns it (see `firestore.rules`).

### `subjects`

```ts
{ id: string; profile_id: string; name: "Math" | "Science" | "English" | "Social Studies"; icon: string; }
```

Seeded automatically (`lib/db.ts`'s `seedDefaultSubjects`) when a profile is created — all four subjects, every time. `icon` is a string key looked up in `lib/icons.ts`'s `ICONS` map, not a stored component reference.

### `study_materials`

```ts
{
  id: string;
  subject_id: string;
  profile_id: string;
  title: string;          // chapter title, user-entered
  volume_tag: string;     // e.g. "Term 1 Vol 1"
  image_url: string;      // Firebase Storage download URL
  extracted_text: string; // Gemini's markdown extraction
  created_at: Timestamp;
}
```

Written server-side (`app/api/ocr/route.ts`, admin SDK) immediately after a successful Gemini extraction — never written client-side.

### `quiz_results`

```ts
{
  id: string;
  profile_id: string;
  subject_id: string;
  topic: string;              // currently the subject name at time of the attempt
  score: number;
  total_questions: number;
  weak_concepts: string[];    // per-question topic labels for questions answered incorrectly
  created_at: Timestamp;
}
```

Written client-side (`lib/db.ts`'s `createQuizResult`) once a 5-question run completes. The generated questions themselves are **never persisted** — they're ephemeral, regenerated fresh on every attempt via `/api/generate-quiz`.

## Relationships

```
profiles (1) ──< subjects (4, seeded)
profiles (1) ──< study_materials (N)
profiles (1) ──< quiz_results (N)
subjects (1) ──< study_materials (N)
subjects (1) ──< quiz_results (N)
```

No collection references a Firebase Auth user directly — `parent_user_id` is the NextAuth session id, and the Firebase custom-token bridge (see `docs/architecture.md`) is what lets Firestore rules verify it via `request.auth.uid`.

## Indexes

Defined in `firestore.indexes.json`:

- `quiz_results`: `(profile_id, created_at desc)` and `(profile_id, subject_id, created_at desc)` — the Revision Hub's history/aggregation queries.
- `study_materials`: same two composites — the "most recent material for a subject" lookup in `/api/generate-quiz` and the upload history list.

If a new query needs a composite index, Firestore's own runtime error gives you the exact definition to add here — don't guess it by hand.

## Security rules summary

`firestore.rules`: every collection except `profiles` is authorized by a `get()` lookup on its parent `profiles` doc, checking `parent_user_id == request.auth.uid`. `profiles` itself is authorized directly by that same field. See `docs/architecture.md` for why `request.auth` is populated at all (the custom-token bridge) — without it these rules are unsatisfiable by design (deny-by-default).

`storage.rules`: same ownership pattern, applied to the `book_pages/{profile_id}/...` path via a cross-service `firestore.get()` lookup.

## Backup & restore

See `docs/backup.md`.
