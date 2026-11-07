# syntax=docker/dockerfile:1
# Build context is the repository root (npm workspaces share one lockfile).

# ─── Build stage ────────────────────────────────────────────────────────────
FROM node:20-slim AS build
WORKDIR /app

# Prisma needs OpenSSL at generate time.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci && mkdir -p /app/backend/node_modules

COPY backend/prisma ./backend/prisma
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/src ./backend/src
RUN cd backend && npx prisma generate && npm run build

# ─── Runtime stage ──────────────────────────────────────────────────────────
FROM node:20-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# node_modules comes from the build stage because the Prisma CLI (a dev
# dependency) runs at start-up to apply migrations.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/backend/package.json ./backend/package.json

WORKDIR /app/backend

RUN groupadd --system app && useradd --system --gid app app \
  && mkdir -p /app/backend/uploads && chown -R app:app /app
USER app

ENV PORT=4001
EXPOSE 4001

# Migrations run on boot so a fresh volume reaches the expected schema before
# the API starts serving traffic.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
