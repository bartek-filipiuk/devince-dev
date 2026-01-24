# Deployment Guide: Next.js + Payload CMS to CapRover

## Quick Deploy Checklist

```bash
# 1. Create database
ssh root@SERVER_IP 'docker exec -it $(docker ps -q -f name=srv-captain--postgres) psql -U USER -d DB -c "CREATE DATABASE APP_NAME_payload;"'

# 2. Create app + set port + env vars in ONE call
TOKEN=$(curl -s -X POST https://captain.DOMAIN/api/v2/login \
  -H "Content-Type: application/json" \
  -d '{"password":"CAPROVER_PASSWORD"}' | jq -r '.data.token')

curl -X POST https://captain.DOMAIN/api/v2/user/apps/appDefinitions/register \
  -H "Content-Type: application/json" \
  -H "x-captain-auth: $TOKEN" \
  -d '{"appName":"APP_NAME","hasPersistentData":true}'

curl -X POST https://captain.DOMAIN/api/v2/user/apps/appDefinitions/update \
  -H "Content-Type: application/json" \
  -H "x-captain-auth: $TOKEN" \
  -d '{
    "appName":"APP_NAME",
    "containerHttpPort":3000,
    "instanceCount":1,
    "volumes":[
      {"hostPath":"","containerPath":"/app/public/media","volumeName":"APP_NAME-media"}
    ],
    "envVars":[
      {"key":"DATABASE_URI","value":"postgresql://USER:PASS@srv-captain--postgres:5432/APP_NAME_payload"},
      {"key":"PAYLOAD_SECRET","value":"YOUR_SECRET_KEY_MIN_32_CHARS"},
      {"key":"NEXT_PUBLIC_SERVER_URL","value":"https://YOUR_DOMAIN"},
      {"key":"NEXT_PUBLIC_SITE_NAME","value":"Site Name"},
      {"key":"PREVIEW_SECRET","value":"preview-secret"}
    ]
  }'

# 3. Deploy (tarball method - no git required)
caprover deploy --tarFile deploy.tar --caproverUrl https://captain.DOMAIN --caproverPassword PASS --appName APP_NAME

# 4. Enable SSL + custom domain
curl -X POST https://captain.DOMAIN/api/v2/user/apps/appDefinitions/enablebasedomainssl \
  -H "Content-Type: application/json" -H "x-captain-auth: $TOKEN" \
  -d '{"appName":"APP_NAME"}'

curl -X POST https://captain.DOMAIN/api/v2/user/apps/appDefinitions/customdomain \
  -H "Content-Type: application/json" -H "x-captain-auth: $TOKEN" \
  -d '{"appName":"APP_NAME","customDomain":"YOUR_DOMAIN"}'

curl -X POST https://captain.DOMAIN/api/v2/user/apps/appDefinitions/enablecustomdomainssl \
  -H "Content-Type: application/json" -H "x-captain-auth: $TOKEN" \
  -d '{"appName":"APP_NAME","customDomain":"YOUR_DOMAIN"}'

# 5. Seed database
curl https://YOUR_DOMAIN/next/seed
```

---

## Critical Lessons Learned

### 1. Container HTTP Port Must Be 3000

**Problem:** CapRover defaults to port 80, but Next.js runs on 3000.

**Solution:** Always set `containerHttpPort: 3000` when creating/updating the app.

**Gotcha:** Updating environment variables through API **resets the port to 80**. Always include `containerHttpPort: 3000` in every update call.

### 2. Instance Count Resets to 0

**Problem:** After API updates, the service sometimes scales to 0 instances.

**Solution:** Always include `"instanceCount": 1` in update API calls.

### 3. Database Schema in Production

**Problem:** `push: true` in drizzle config only works in dev mode. Standalone Next.js builds don't support runtime schema push.

**Solutions (pick one):**
- **Option A:** Export schema from local, import to production:
  ```bash
  # Local: export schema
  pg_dump -U postgres -d payload --schema-only > schema.sql

  # Production: import schema
  ssh root@SERVER 'docker exec -i $(docker ps -q -f name=srv-captain--postgres) psql -U USER -d APP_payload' < schema.sql
  ```
- **Option B:** Use Payload migrations (requires migration files in `src/migrations/`)

### 4. generateStaticParams Breaks Docker Build

**Problem:** Next.js tries to connect to database during build when using `generateStaticParams()`.

**Solution:** Remove `generateStaticParams` and add `export const dynamic = 'force-dynamic'` to all database-dependent pages.

Files typically affected:
- `src/app/(frontend)/[slug]/page.tsx`
- `src/app/(frontend)/posts/[slug]/page.tsx`
- `src/app/(frontend)/posts/page/[pageNumber]/page.tsx`
- `src/app/(frontend)/program/[slug]/page.tsx`
- `src/app/(frontend)/projects/[slug]/page.tsx`
- Any locale re-export files (e.g., `en/*/page.tsx`)

### 5. Tarball Deployment (No Git Required)

**Problem:** Project may not be a git repository.

**Solution:** Use tarball deployment:
```bash
# Create tarball (respects .gitignore)
tar -cvf deploy.tar --exclude=node_modules --exclude=.next --exclude=.git .

# Deploy
caprover deploy --tarFile deploy.tar --caproverUrl URL --caproverPassword PASS --appName APP
```

### 6. TypeScript: Image IDs Are Numbers

**Problem:** PostgreSQL uses numeric IDs. TypeScript may expect `string | number`.

**Solution:** Use `number` type for image IDs in seed data:
```typescript
let postImage: { id: number } | null = null
```

### 7. Internal Docker Hostname

**Problem:** Database connection fails with external hostname.

**Solution:** Use internal Docker service name:
```
postgresql://USER:PASS@srv-captain--postgres:5432/DATABASE
```
NOT `localhost` or external IP.

---

## Dockerfile Requirements

```dockerfile
# Key sections for Payload CMS

# Build args for Next.js build
ARG DATABASE_URI
ARG PAYLOAD_SECRET
ARG NEXT_PUBLIC_SERVER_URL
ARG NEXT_PUBLIC_SITE_NAME

# Runner stage - copy for migrations
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

# Run migrations then start
CMD npx payload migrate --config ./src/payload.config.ts 2>/dev/null || echo "Migration completed or skipped" && HOSTNAME="0.0.0.0" node server.js
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 502 Bad Gateway | Wrong port (80 vs 3000) | Set `containerHttpPort: 3000` |
| 502 Bad Gateway | Service has 0 instances | `docker service scale srv-captain--APP=1` |
| 502 "Host not found" | DNS resolution issue | Restart nginx: `docker service update --force captain-nginx` |
| "missing secret key" | Env vars not set | Re-set env vars via API with port + instanceCount |
| Build fails on generateStaticParams | DB not available at build | Use `dynamic = 'force-dynamic'` |
| "relation does not exist" | Schema not created | Import schema or run migrations |

---

## Useful Commands

```bash
# View logs
ssh root@SERVER 'docker service logs srv-captain--APP --tail 50'

# Restart app
ssh root@SERVER 'docker service update --force srv-captain--APP'

# Check service status
ssh root@SERVER 'docker service ps srv-captain--APP'

# Reload nginx config
ssh root@SERVER 'docker exec $(docker ps -q -f name=captain-nginx) nginx -s reload'

# Check nginx upstream config
ssh root@SERVER 'docker exec $(docker ps -q -f name=captain-nginx) cat /etc/nginx/conf.d/captain.conf | grep -A 10 "server_name.*YOUR_DOMAIN"'

# Scale service
ssh root@SERVER 'docker service scale srv-captain--APP=1'
```

---

### 8. Persistent Volume Overwrites Seed Images

**Problem:** Mounting a persistent volume to `/app/public/media` overwrites seed images from Docker image.

**Solution:** Copy seed images to a separate location in Dockerfile:
```dockerfile
# Copy seed images to separate location (volume mount overwrites /app/public/media)
COPY --from=builder /app/public/media/seed ./seed-images
```

Then update seed code to check both locations:
```typescript
const dockerSeedDir = path.join(process.cwd(), 'seed-images')
const localSeedDir = path.join(process.cwd(), 'public/media/seed')
const seedImagesDir = fs.existsSync(dockerSeedDir) ? dockerSeedDir : localSeedDir
```

### 9. Tarball Size Limit

**Problem:** CapRover has upload size limits (~100MB). Generated media files make tarball too large.

**Solution:** Exclude generated images from tarball:
```bash
tar -cvf deploy.tar \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  --exclude='public/media/*.png' \
  --exclude='public/media/*.jpg' \
  .
```

---

## Files Required

| File | Purpose |
|------|---------|
| `captain-definition` | `{"schemaVersion": 2, "dockerfilePath": "./Dockerfile"}` |
| `Dockerfile` | Multi-stage build with migration support |
| `.dockerignore` | Exclude node_modules, .next, .git |

---

## Environment Variables

| Variable | Example | Notes |
|----------|---------|-------|
| DATABASE_URI | `postgresql://user:pass@srv-captain--postgres:5432/db` | Use internal Docker hostname |
| PAYLOAD_SECRET | `YourSecretKey32CharsMinimum` | Min 32 characters |
| NEXT_PUBLIC_SERVER_URL | `https://yourdomain.com` | Full URL with https |
| NEXT_PUBLIC_SITE_NAME | `Site Name` | Displayed in header/SEO |
| PREVIEW_SECRET | `any-secret-string` | For draft previews |
