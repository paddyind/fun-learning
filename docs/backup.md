# Backup & Restore

There's no automated backup job configured yet (out of scope for the MVP) — this documents the manual process using the Firebase/Google Cloud CLI, so it's ready to script into a scheduled job later.

## Firestore

Firestore export/import uses Google Cloud Storage as the intermediate location (a *different* bucket or prefix than the app's own `book_pages/` uploads is recommended, to keep backups and live app data separate).

**Export (backup):**

```bash
gcloud firestore export gs://<your-backup-bucket>/firestore-backups/$(date +%Y%m%d-%H%M%S) \
  --project=<your-firebase-project-id>
```

**Import (restore)** — restores into the *same* project; restoring into a different project requires that project to have an empty Firestore database of the same edition (Native mode):

```bash
gcloud firestore import gs://<your-backup-bucket>/firestore-backups/<TIMESTAMP> \
  --project=<your-firebase-project-id>
```

Notes:
- Requires the Cloud Firestore Admin API enabled and a service account (or user) with `datastore.import`/`datastore.export` permission — the same service account used for `FIREBASE_ADMIN_*` typically already has this if it was granted the "Cloud Datastore Import Export Admin" or "Editor" role.
- Export is a point-in-time snapshot of the whole database (or a specific collection with `--collection-ids=profiles,quiz_results`); it does not capture continuous changes.
- For a scheduled backup, wrap the export command in a Cloud Scheduler job + Cloud Function, or a cron job wherever you're running CI — not set up yet, see `docs/ci-cd.md` for what *is* automated today.

## Firebase Storage (`book_pages/`)

No `gsutil`/`gcloud storage` backup is scripted yet. For an ad-hoc backup:

```bash
gsutil -m rsync -r gs://<your-project>.appspot.com/book_pages gs://<your-backup-bucket>/book_pages-backup
```

Uploaded images are re-derivable from `study_materials.image_url` if lost (the extracted text in Firestore is the actually valuable artifact — the source photo is a lower-priority thing to back up, since it's just a textbook page).

## Restoring security rules and indexes

`firestore.rules`, `storage.rules`, and `firestore.indexes.json` are checked into this repo (source of truth), not something to "back up" separately — redeploy them with:

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage
```

## What's not covered here

- Point-in-time recovery (Firestore supports it as a paid feature — not evaluated/enabled for this project).
- Cross-region replication.
- Automated/scheduled backups — manual only, for now.
