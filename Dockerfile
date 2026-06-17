# To use this Dockerfile, you have to set `output: 'standalone'` in your next.config.js file.
# From https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile

FROM node:22.17.0-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time environment variables for Payload CMS
ARG DATABASE_URI
ARG PAYLOAD_SECRET
ARG NEXT_PUBLIC_SERVER_URL
ARG NEXT_PUBLIC_SITE_NAME
ENV DATABASE_URI=${DATABASE_URI}
ENV PAYLOAD_SECRET=${PAYLOAD_SECRET}
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}
ENV NEXT_PUBLIC_SITE_NAME=${NEXT_PUBLIC_SITE_NAME}

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Copy seed images to separate location (volume mount overwrites /app/public/media)
COPY --from=builder /app/public/media/seed ./seed-images

RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy full node_modules for Payload migrations at runtime.
# NOTE: the deps stage installs WITH devDependencies (no --prod), so `tsx` is
# present — the Payload CLI loads the TS config through tsx (see payload/bin.js).
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
# Ops scripts must ship with the image: reconcile-prod-migrations (one-off via
# `docker exec`) and migrate.mjs (fallback runner if the Payload CLI misbehaves).
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Private upload dirs: course-assets -> /app/private-media, app-assets ->
# /app/private-media-apps. They MUST exist and be owned by the runtime user so
# Payload can write uploads (the user can't mkdir under /app, which is root).
# Mount Coolify persistent volumes on these paths so files survive redeploys —
# when a volume mounts onto an image dir that already exists with this owner,
# Docker initializes the volume with that ownership (writable).
RUN mkdir -p /app/private-media /app/private-media-apps \
  && chown nextjs:nodejs /app/private-media /app/private-media-apps

USER nextjs

EXPOSE 3000

ENV PORT 3000

# Deterministic config resolution for the Payload CLI (no tsconfig guessing).
ENV PAYLOAD_CONFIG_PATH=/app/src/payload.config.ts

# Run pending migrations, then start the server. FAIL-FAST by design: a failed
# migration MUST NOT let the server boot on a wrong schema (that caused a prod
# incident under the old push:true flow). If the container crash-loops here,
# fix the migration / run reconcile — do not soften this to `|| true`.
# First-deploy prerequisite on a hand-patched DB: run
# scripts/reconcile-prod-migrations.ts ONCE before this CMD can succeed.
CMD npx payload migrate && HOSTNAME="0.0.0.0" node server.js
