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
EXPOSE 8000
CMD ["pnpm", "--filter", "@dtc/storefront", "dev"]

FROM deps AS build

ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_build_placeholder
ARG NEXT_PUBLIC_DEFAULT_REGION=ae
ARG NEXT_PUBLIC_BASE_URL=http://localhost:8000
ARG NEXT_PUBLIC_STRIPE_KEY=
ARG SKIP_STATIC_GENERATION=true

ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_DEFAULT_REGION=$NEXT_PUBLIC_DEFAULT_REGION
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_STRIPE_KEY=$NEXT_PUBLIC_STRIPE_KEY
ENV SKIP_STATIC_GENERATION=$SKIP_STATIC_GENERATION

COPY . .
RUN pnpm --filter @dtc/storefront build

FROM node:24.0.0-bookworm-slim AS prod

ENV NODE_ENV=production
ENV PORT=8000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=build /server/apps/storefront/public ./apps/storefront/public
COPY --from=build /server/apps/storefront/.next/standalone ./
COPY --from=build /server/apps/storefront/.next/static ./apps/storefront/.next/static

WORKDIR /app/apps/storefront

EXPOSE 8000
CMD ["node", "server.js"]
