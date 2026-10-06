# Rollback runbook (production, Coolify)

Three levels, cheapest first. Stop at the first one that fixes prod.

## What protects you automatically

- **Health check gate.** Coolify starts the new container next to the old one and
  only switches traffic when `GET /api/health` returns 200 (DB ping included).
  A container that crashes or cannot reach the DB never goes live: the deploy is
  marked failed and the old container keeps serving.
  Caveat: `npx payload migrate` runs on container boot, so a migration from a
  rejected deploy is already applied. Keep migrations backward compatible
  (expand/contract) so the old code still works against the new schema.
- **Pre-deploy DB dump.** `.github/workflows/deploy.yml` dumps devince-db right
  before every deploy and does not deploy if the dump fails. The job log prints
  the restore point file name.

## Level 1: code rollback (seconds, no data loss)

1. Coolify → `devince-dev` → **Configuration** → **Rollback**.
2. Pick the image of the last good commit (deploy history: **Deployments** tab)
   and click **Rollback**. No rebuild, the retained image is started again.
3. Check https://devince.dev and `/api/health`.

Notes: the rollback uses the CURRENT env vars, not the ones from the old deploy.
Coolify keeps a limited number of images (set on the same Rollback page); older
commits need a normal redeploy of that commit.

## Level 2: undo a migration (minutes, no data loss)

Only when the bad deploy shipped a migration that the old code cannot live with.
Every migration in `src/migrations/` has a `down`.

Run it BEFORE level 1, from the container of the bad deploy (the old image does
not contain the new migration file, so it cannot run its `down`):

1. Coolify → `devince-dev` → **Terminal** → the running container.
2. `npx payload migrate:status` to confirm what is applied.
3. `npx payload migrate:down` rolls back the last batch.
4. Then do level 1. The old image runs `npx payload migrate` on boot; it has
   nothing to apply and ignores migration rows it has no file for, so it boots fine.

If the bad container is already gone (health check rejected it), the migration
is applied but its `down` is not in any running image: either deploy a fix
forward, or redeploy the bad commit with the health check temporarily off, run
`migrate:down`, then roll back.

## Level 3: restore the database (disaster only, LOSES DATA)

Everything written after the dump is lost: orders, Stripe events, sign-ups,
lesson progress. Use only when data is corrupted.

1. Find the restore point: the deploy job log line `Restore point: ...dmp`, or
   Coolify → `devince-db` → **Backups** → executions list.
2. Coolify → `devince-db` → **Import Backup** → choose that file from the server.
   Dumps are PostgreSQL custom format (`.dmp`, needs `pg_restore`). Coolify
   older than v4.3.11 may fail importing its own dumps (coollabsio/coolify#11459);
   if it does, restore on the server:
   `docker exec -i <db-container> pg_restore -U <user> -d <db> --clean --if-exists < <file>.dmp`
3. Level 1 to the image that matches the dump.
4. Stripe: events already answered with 200 are NOT redelivered. Stripe Dashboard
   → Developers → Events, filter from the dump time, open each
   `checkout.session.*` and `charge.refunded` event and click **Resend** to the prod webhook.
   Idempotency (`StripeEvents`) makes resends safe.
