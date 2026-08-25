# JARVIS Production Readiness

This file records the production baseline and the remaining connector-dependent work.

## Verified baseline

- Next.js App Router application lives under `jarvis-business-os`.
- Node runtime is pinned to 24.x.
- Server-side signed HttpOnly session is required by JARVIS chat.
- Memory uses Supabase persistence with vector embeddings and lexical fallback.
- Tool registry supports risk and authorization metadata.
- GitHub and Shopify tools are read-only and fail closed when credentials are absent.
- Request IDs, rate limiting and persistent audit telemetry are implemented.
- Security response headers are configured.
- `/api/status` exposes real connector readiness without secrets.

## Required production environment

`OPENAI_API_KEY`, `OPENAI_MODEL`, `JARVIS_SESSION_SECRET`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are required.

Integration credentials must only be configured in the deployment environment.

## Remaining connector-dependent capabilities

Write access to Shopify/GitHub, Google OAuth for Gmail/Calendar, web search provider credentials, durable background jobs, and external realtime providers require their respective production credentials and authorization flows.

JARVIS must continue to report those capabilities as disconnected until those dependencies exist.
