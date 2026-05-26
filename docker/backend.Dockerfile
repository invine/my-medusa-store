# syntax=docker/dockerfile:1.7

FROM node:24.0.0-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /server

RUN corepack enable && corepack prepare pnpm@11.2.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json

FROM base AS deps
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*
RUN pnpm install --frozen-lockfile

FROM deps AS dev
COPY . .
EXPOSE 9000
CMD ["pnpm", "--filter", "@dtc/backend", "dev"]

FROM deps AS build
COPY . .
RUN pnpm --filter @dtc/backend build

FROM base AS prod

ENV NODE_ENV=production

COPY --from=deps /server/node_modules ./node_modules
COPY --from=deps /server/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /server/package.json ./package.json
COPY --from=build /server/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /server/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /server/apps/backend ./apps/backend

WORKDIR /server/apps/backend/.medusa/server

EXPOSE 9000
CMD ["/server/apps/backend/node_modules/.bin/medusa", "start"]
