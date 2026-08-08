# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js validates env vars (lib/env.ts, lib/server-env.ts) and inlines
# NEXT_PUBLIC_* into the client bundle at build time, so every var needs a
# real (or at least non-empty, syntactically valid) value here — placeholder
# strings are fine for the build itself, but NEXT_PUBLIC_* values baked in
# here are what the browser will actually use at runtime, and the Firebase
# Admin key must already be a real PEM for anything that touches it later.
# Pass these via `docker compose --env-file .env.local build` (see compose
# file) rather than hardcoding them in this Dockerfile.
ARG KEYCLOAK_CLIENT_ID
ARG KEYCLOAK_CLIENT_SECRET
ARG KEYCLOAK_ISSUER
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_USE_FIREBASE_EMULATORS
ARG GEMINI_API_KEY
ARG GEMINI_MODEL
ARG FIREBASE_ADMIN_PROJECT_ID
ARG FIREBASE_ADMIN_CLIENT_EMAIL
ARG FIREBASE_ADMIN_PRIVATE_KEY

ENV KEYCLOAK_CLIENT_ID=$KEYCLOAK_CLIENT_ID \
    KEYCLOAK_CLIENT_SECRET=$KEYCLOAK_CLIENT_SECRET \
    KEYCLOAK_ISSUER=$KEYCLOAK_ISSUER \
    NEXTAUTH_URL=$NEXTAUTH_URL \
    NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
    NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS=$NEXT_PUBLIC_USE_FIREBASE_EMULATORS \
    GEMINI_API_KEY=$GEMINI_API_KEY \
    GEMINI_MODEL=$GEMINI_MODEL \
    FIREBASE_ADMIN_PROJECT_ID=$FIREBASE_ADMIN_PROJECT_ID \
    FIREBASE_ADMIN_CLIENT_EMAIL=$FIREBASE_ADMIN_CLIENT_EMAIL \
    FIREBASE_ADMIN_PRIVATE_KEY=$FIREBASE_ADMIN_PRIVATE_KEY \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
