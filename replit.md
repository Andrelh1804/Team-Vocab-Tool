# NexSupport AI

Enterprise SaaS platform for IT support management — manages devices, tickets, alerts, AI diagnostics, and automation workflows across multi-tenant organizations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/nexsupport run dev` — run the frontend (proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TanStack Query, Recharts, Framer Motion, Wouter, shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for API contracts
- `lib/db/src/schema/` — Drizzle table definitions (devices, tickets, alerts, scripts, automations, users, activity)
- `artifacts/api-server/src/routes/` — Express route handlers (dashboard, devices, tickets, alerts, ai, automations, users)
- `artifacts/nexsupport/src/` — React frontend (pages, components, hooks)

## Architecture decisions

- OpenAPI-first: all API contracts in YAML, codegen generates React Query hooks + Zod schemas
- Modular routes: each domain (devices, tickets, alerts, AI, automations) is a separate router file
- AI assistant uses pattern-matching responses for common IT scenarios; ready for OpenAI/Ollama integration
- Dashboard endpoints compute aggregates server-side, not in the frontend

## Product

NexSupport AI is a control-room style IT management platform targeting MSPs and enterprise IT teams. Core modules:
- **Executive Dashboard** — uptime, SLA compliance, ticket trends, device health
- **Technical Dashboard** — per-device metrics, alert breakdown, performance charts
- **Device Inventory** — filterable asset table with real-time status, metrics per device, AI diagnosis
- **Help Desk** — ticket management with SLA tracking, comments, priority/status workflow
- **Alerts Center** — live alert feed by severity, acknowledge/resolve actions
- **AI Assistant** — chat-based IT support expert with script suggestions and device diagnosis
- **Script Library** — PowerShell, Bash, Python, CMD scripts with language filter and search
- **Automations** — workflow triggers (alert, schedule, device_offline, ticket_created, manual)
- **Settings** — user management

## User preferences

_None set yet._

## Gotchas

- `ticket_comments.is_internal` was originally created as `text`; manually migrated to `boolean` via `ALTER TABLE ... USING (is_internal = 'true')`. The Drizzle schema now correctly declares it as `boolean`.
- Enum types (device_type, device_status, ticket_status, ticket_priority, alert_severity, alert_status, script_language, automation_trigger, user_role, activity_type) are all PostgreSQL native enums — adding new values requires `ALTER TYPE ... ADD VALUE`.
- API response schemas use `AiReply` (not `AiChatResponse`) to avoid Orval naming collision with the operation body Zod schema.
- The `search` query param for `GET /devices`, `GET /tickets`, `GET /ai/scripts` uses `ILIKE` — case-insensitive.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
