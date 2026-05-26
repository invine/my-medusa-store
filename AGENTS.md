# Project Context

## Medusa Docs Source

- Fetched on 2026-05-24 from https://docs.medusajs.com/start.
- The page is Medusa's AI-agent setup prompt for creating, running, and optionally deploying a Medusa commerce app.
- The docs navigation on that page showed Medusa v2.15.3, which matches this repo's Medusa package versions.
- Prefer official Medusa documentation for framework behavior. Many Medusa docs pages expose AI-readable markdown by appending `/index.html.md`.
- Medusa documentation MCP endpoint: `https://docs.medusajs.com/mcp`. It may require Medusa Cloud authentication.

## Repository Shape

- This is a Medusa DTC starter monorepo.
- Backend app: `apps/backend`
  - Medusa server and admin dashboard.
  - Config file: `apps/backend/medusa-config.ts`.
  - Medusa packages are pinned to `2.15.3`.
- Storefront app: `apps/storefront`
  - Next.js starter storefront.
  - Runs on port `8000` by default.
- Root workspace uses Node `>=20` and `pnpm@10`.
- Root scripts:
  - `pnpm dev` starts the monorepo development workflow through Turbo.
  - `pnpm backend:dev` starts only the backend.
  - `pnpm storefront:dev` starts only the storefront.
  - `pnpm build`, `pnpm lint`, and `pnpm test` delegate through Turbo.

## Kubernetes And GitOps Context

- The Helm chart for this Medusa project is located at `/Users/invine/src/js/my-medusa-store/charts/medusa`.
- The Argo CD bootstrap app is located at `/Users/invine/src/oracle-cluster/k8s-charts/argocd-bootstrap`.
- For Kubernetes and Helm tasks related to this project, use this repo's chart as the deployment source context.
- For Argo CD bootstrap tasks, use the bootstrap app in the `k8s-charts` repo.

## Local Development Notes

- Medusa backend development server normally listens at `http://localhost:9000`.
- Admin dashboard is normally at `http://localhost:9000/app`.
- Storefront is normally at `http://localhost:8000`.
- PostgreSQL must be installed, running, and reachable through `DATABASE_URL`.
- The fetched Medusa start guide requires Node.js LTS major version 20 through 24; avoid Node 25+ for this stack.
- Before changing setup state, verify prerequisites first: Node, Git, and PostgreSQL.
- Do not silently upgrade local tooling. Ask before upgrading Node, package managers, PostgreSQL, or globally installed CLIs.
- Do not commit `.env` files, admin credentials, API keys, or other secrets.

## Medusa Workflow Guidance

- For new Medusa projects, Medusa recommends creating the app with `create-medusa-app` and the Next.js starter, then creating an admin user manually when browser automation is skipped.
- For this existing repo, prefer the checked-in app structure and package scripts over re-running project scaffolding.
- If a database name collision occurs during fresh scaffolding, use a unique project suffix rather than overwriting an existing database.
- When running long-lived dev servers, start backend and storefront as separate processes when focused debugging is needed.
- If adding custom commerce features, follow Medusa's extension model:
  - Custom backend features belong under `apps/backend/src`.
  - Custom API routes belong under `apps/backend/src/api`.
  - Workflows belong under `apps/backend/src/workflows`.
  - Subscribers belong under `apps/backend/src/subscribers`.
  - Scheduled jobs belong under `apps/backend/src/jobs`.
  - Module links belong under `apps/backend/src/links`.
  - Admin customizations belong under `apps/backend/src/admin`.

## Cloud And Agent Tooling

- Medusa Cloud deployment uses a GitHub repository and should configure:
  - Backend root: `apps/backend`
  - Storefront root: `apps/storefront`
- Use the `mcloud` CLI only after confirming authentication with the user.
- For production Cloud setup, do not reuse local test admin credentials.
- Optional Medusa agent skills can be installed with the Medusa agent-skills package for Codex or other agents, but do not install them unless the user asks or approves.
