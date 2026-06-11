# ──────────────────────────────────────────────────────────────────────
# Stage 1: Build
#   Uses the full monorepo workspace to compile the NestJS server.
# ──────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

# System packages needed to compile the `canvas` native module
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    libcairo2-dev libjpeg-dev libpango1.0-dev \
    libgif-dev librsvg2-dev libpixman-1-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy workspace manifests first to maximize Docker layer cache
COPY package*.json ./
COPY client/package.json ./client/
COPY server/ ./server/
COPY shared/ ./shared/

RUN npm ci

RUN npm run build:server

# ──────────────────────────────────────────────────────────────────────
# Stage 2: Production image
#   Installs only production dependencies and copies compiled output.
# ──────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS production

# Build tools (to recompile canvas) + runtime shared libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    libcairo2-dev libjpeg-dev libpango1.0-dev \
    libgif-dev librsvg2-dev libpixman-1-dev \
    libcairo2 libjpeg62-turbo libpango-1.0-0 \
    libgif7 librsvg2-2 libpixman-1-0 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server package manifest and Prisma schema before npm install so
# the postinstall script (prisma generate) can run successfully.
COPY --from=builder /build/server/package.json ./
COPY --from=builder /build/server/prisma ./prisma/

# Install production dependencies only (prisma CLI is now in deps, so
# `prisma generate` runs via postinstall and migrations work at startup)
RUN npm install --omit=dev

# Copy compiled NestJS output
COPY --from=builder /build/server/dist ./dist/

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/main"]
