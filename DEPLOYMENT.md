# Deployment Guide: devince.dev

## Infrastructure

| Component | Details |
|-----------|---------|
| **Server** | Hetzner AX41 — 12 CPU, 64GB RAM, 512GB NVMe |
| **IP** | `65.109.60.26` |
| **SSH** | `ssh hetzner-ax41-1` (configured in `~/.ssh/config`) |
| **Platform** | Coolify v4 (self-hosted) |
| **Coolify UI** | https://cool.qaci.pl |
| **Proxy** | Traefik v3.6 (managed by Coolify) |
| **Domain** | https://devince.dev |
| **SSL** | Let's Encrypt (auto-renewed by Traefik) |

## How Deployment Works

```
git push main → GitHub Actions → Coolify API → Docker build → rolling deploy
```

1. Push or merge to `main` triggers `.github/workflows/deploy.yml`
2. GitHub Actions calls Coolify API to queue a deployment
3. Coolify pulls the repo, builds Docker image from `Dockerfile`
4. Coolify does a rolling update — new container starts, old one stops
5. Build takes ~4 minutes, zero downtime

Manual trigger is also available via GitHub Actions → "Run workflow".

## Coolify Resources

| Resource | UUID | Type |
|----------|------|------|
| **Project** | `agw8kgc4ksw0gswk004gwwow` | Coolify project |
| **Application** | `nwgk0s00440skc0kwsskw4w4` | Dockerfile app |
| **Database** | `yk8ckw80gwww4owo0088wswg` | PostgreSQL 16 |

## GitHub Secrets

These are configured in the repo `bartek-filipiuk/devince-dev`:

| Secret | Purpose |
|--------|---------|
| `COOLIFY_API_TOKEN` | Coolify API Bearer token |
| `COOLIFY_URL` | `https://cool.qaci.pl` |
| `COOLIFY_APP_UUID` | `nwgk0s00440skc0kwsskw4w4` |

## Environment Variables (in Coolify)

Set via Coolify UI or API. All are both build-time and runtime:

| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URI` | `postgresql://devince:...@yk8ckw80gwww4owo0088wswg:5432/payload` | Internal Docker hostname |
| `PAYLOAD_SECRET` | `DevincePayload2026SecretKey9xMnP` | Min 32 characters |
| `NEXT_PUBLIC_SERVER_URL` | `https://devince.dev` | Full URL with https |
| `NEXT_PUBLIC_SITE_NAME` | `Devince` | Displayed in header/SEO |
| `PREVIEW_SECRET` | `DevincePreview2026sK8nR` | For draft previews |

## Admin Access

| | |
|-|-|
| **Admin panel** | https://devince.dev/admin |
| **Email** | `admin@example.com` |
| **Password** | `admin123` |

Change these after first login.

---

## Common Operations

### Deploy manually (without push)

```bash
# Via GitHub Actions UI
gh workflow run deploy.yml -R bartek-filipiuk/devince-dev

# Via Coolify API directly
curl -H "Authorization: Bearer $COOLIFY_TOKEN" \
  "https://cool.qaci.pl/api/v1/deploy?uuid=nwgk0s00440skc0kwsskw4w4"
```

### View deployment logs

```bash
# Latest deployment status
ssh hetzner-ax41-1 "docker exec coolify-db psql -U coolify -d coolify \
  -c \"SELECT deployment_uuid, status, created_at FROM application_deployment_queues \
  WHERE application_name='devince-dev' ORDER BY created_at DESC LIMIT 5;\""

# App container logs
ssh hetzner-ax41-1 'docker logs --tail 50 $(docker ps -q -f "name=nwgk0s00440skc0kwsskw4w4") 2>&1'
```

### Restart application

```bash
ssh hetzner-ax41-1 'docker restart $(docker ps -q -f "name=nwgk0s00440skc0kwsskw4w4")'
```

### Seed database

```bash
curl -X POST https://devince.dev/next/seed
```

### Access database

```bash
ssh hetzner-ax41-1 "docker exec -it yk8ckw80gwww4owo0088wswg psql -U devince -d payload"
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 503 on domain | App not deployed or Traefik has no route | Check Coolify, redeploy |
| 500 on pages | Database tables missing | Restart container (triggers `push:true` schema sync) |
| "relation does not exist" | Schema not pushed | Restart container or run `drizzle-kit push` manually |
| Build fails "could not read Username" | Repo is private | Make repo public or add deploy key in Coolify |
| Deploy queued but nothing happens | Coolify worker stuck | `ssh hetzner-ax41-1 "docker restart coolify"` |
| SSL certificate error | Cert not issued yet | Wait 1-2 min after first deploy, Traefik auto-issues |

### Manual schema push (emergency)

If `push:true` fails to sync schema on startup:

```bash
# Generate schema file
ssh hetzner-ax41-1 'docker exec $(docker ps -q -f "name=nwgk0s00440skc0kwsskw4w4") \
  npx payload generate:db-schema --config ./src/payload.config.ts'

# Push schema to DB
ssh hetzner-ax41-1 'docker exec $(docker ps -q -f "name=nwgk0s00440skc0kwsskw4w4") \
  npx drizzle-kit push \
  --dialect=postgresql \
  --url="postgresql://devince:DevinceDb2026xR7nQ@yk8ckw80gwww4owo0088wswg:5432/payload" \
  --schema=/app/src/payload-generated-schema.ts \
  --force'
```

---

## Architecture Notes

### Database schema sync

Payload CMS uses `push: true` in `src/payload.config.ts` with `drizzle-kit` (production dependency) to auto-sync the database schema at runtime. This means:

- **No manual migrations needed** — schema changes are applied when Payload initializes
- `drizzle-kit` must stay in `dependencies` (not `devDependencies`) for this to work in Docker
- The `Dockerfile` CMD also runs `npx payload migrate` before starting, but this is a fallback for explicit migration files

### Docker build

Multi-stage Dockerfile:
1. **deps** — installs all node_modules (including devDependencies for build)
2. **builder** — builds Next.js standalone with env vars as build args
3. **runner** — minimal production image with standalone build + full node_modules (needed for Payload runtime + drizzle-kit)

### Seed images

Seed images are copied to `/app/seed-images` in Docker because a volume mount on `/app/public/media` would overwrite them. The seed code checks both locations.
