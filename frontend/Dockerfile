# syntax=docker/dockerfile:1
#
# Build context is the repository root (npm workspaces share one lockfile).

# ─── Build stage ────────────────────────────────────────────────────────────
FROM node:22-bookworm AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN --mount=type=cache,target=/root/.npm npm ci

COPY frontend ./frontend
RUN cd frontend && npm run build

# ─── Runtime stage ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
