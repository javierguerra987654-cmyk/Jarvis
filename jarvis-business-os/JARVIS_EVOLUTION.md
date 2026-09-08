# JARVIS Evolution

## North star

JARVIS evolves from an AI chat interface into a governed personal + business operating system that can understand context, plan, use real connectors, request approval for consequential actions, execute, and verify outcomes.

## Architecture principles

- Real data only. Never fabricate connector state, business metrics or completed actions.
- Human control for sensitive or irreversible actions.
- Capabilities are explicit and fail closed when unavailable.
- Every externally meaningful action gets a request ID and an auditable result.
- Memory is selective, user-directed and private.
- Planning is separated from execution.
- Production readiness is verified through CI, deployment checks and runtime health.

## Evolution stages

### Foundation v1 — current

- Stable Next.js + Node 24 deployment.
- Signed HttpOnly session bootstrap.
- Safe readiness/status endpoints.
- Persistent memory architecture with Supabase support.
- Read-only GitHub and Shopify tools.
- Rate limiting and audit telemetry.
- Strategic God Mode and mission-control UI.

### Intelligence v2

- Structured task objects: goal, constraints, context, plan, state and outcome.
- Better conversation state and resumable missions.
- Explicit distinction between facts, assumptions and recommendations.
- Evaluation suite for tool selection, safety and factuality.
- Cost and latency telemetry per model/tool call.

### Connectors v3

- OAuth for Gmail and Calendar.
- Broader GitHub and Shopify read surfaces.
- Approval-gated write actions.
- Web search with source capture.
- Durable background jobs and scheduled automation.
- Connector health checks with last-success timestamps.

### Autonomous operations v4

- Durable workflows with retries and checkpoints.
- Mission execution plans with approval checkpoints.
- Event-driven triggers and notifications.
- Idempotent external actions.
- Post-action verification and rollback strategy where supported.

### Business OS v5

- Goals, projects, opportunities and operating metrics as first-class entities.
- Business dashboards and decision support.
- Cross-system memory and entity resolution.
- Role-based permissions for additional users.
- Full observability, alerting and operational runbooks.

## Immediate execution order

1. Satisfy the core production environment contract in Vercel.
2. Verify `/api/health` and `/api/session` on the deployed production URL.
3. Configure Supabase and validate persistent memory end-to-end.
4. Configure GitHub and Shopify read connectors and test real data.
5. Add automated smoke tests for session, status, health and chat.
6. Introduce structured missions as the foundation of God Mode.
7. Add approval-gated write tools only after the read path is reliable.
