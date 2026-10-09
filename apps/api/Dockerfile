FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY prisma/ ./prisma/

# Install deps
RUN pnpm install --filter api

# Copy source
COPY apps/api/ ./apps/api/

# Entrypoint helper (db push + seed, then start)
COPY apps/api/entrypoint.sh ./apps/api/entrypoint.sh
RUN chmod +x ./apps/api/entrypoint.sh

# Generate Prisma client
RUN cd apps/api && pnpm db:generate

# Build
RUN cd apps/api && pnpm build

FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY prisma/ ./prisma/

RUN pnpm install --filter api --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY --from=builder /app/apps/api/entrypoint.sh ./apps/api/entrypoint.sh
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

ENTRYPOINT ["sh", "/app/apps/api/entrypoint.sh"]
