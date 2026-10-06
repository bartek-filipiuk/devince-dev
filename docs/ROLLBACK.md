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
  before every deploy and does not deploy if the dump fails.

## Where to find the rollback point

GitHub → Actions → the "Deploy to Coolify" run of the bad deploy → **Summary**.
The table "Rollback point for this deploy" lists the code that ran before the
deploy (image to pick in level 1) and the DB dump taken right before it
(file for level 3).

## Level 1: code rollback (seconds, no data loss)

1. If the breakage came from an env var change, revert that first: the rollback
   uses the CURRENT env vars, not the ones from the old deploy.
2. Coolify (over Tailscale) → `devince-dev` → **Configuration** → **Rollback**.
3. Pick the image whose tag is "Code before deploy" from the run summary and
   click **Rollback**. No rebuild, the retained image is started again.
4. Check https://devince.dev and `/api/health`.

Coolify keeps the last 5 images of devince-dev ("Images to keep" on the Rollback
page); older commits need a normal redeploy of that commit.

## Level 2: undo a migration (minutes, no data loss)

Only when the bad deploy shipped a migration that the old code cannot live with.
This includes a deploy that passed the health check and turned out bad later.
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

1. Find the restore point: "DB before deploy" in the run summary, or
   Coolify → `devince-db` → **Backups** → executions list.
2. Coolify → `devince-db` → **Import Backup** → file on the server → paste that
   path. Dumps are PostgreSQL custom format (`.dmp`); Coolify restores them with
   `pg_restore` since v4.3.11 (we run 4.3.23). Fallback on the server:
   `docker exec -i <db-container> pg_restore -U <user> -d <db> --clean --if-exists < <file>.dmp`
3. Level 1 to the image that matches the dump.
4. Stripe: events already answered with 200 are NOT redelivered. Stripe Dashboard
   → Developers → Events, filter from the dump time, open each
   `checkout.session.*` and `charge.refunded` event and click **Resend** to the prod webhook.
   Idempotency (`StripeEvents`) makes resends safe.
