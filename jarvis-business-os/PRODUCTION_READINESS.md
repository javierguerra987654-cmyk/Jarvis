# JARVIS Production Readiness

This file defines the production baseline and the gate for the next evolution stages.

## Current baseline

- Next.js App Router application lives under `jarvis-business-os`.
- Node runtime is pinned to 24.x.
- JARVIS chat requires a server-side signed HttpOnly session.
- Memory uses Supabase persistence with vector embeddings and lexical fallback when Supabase is configured.
- Tool registry supports risk and authorization metadata.
- GitHub and Shopify tools are read-only and fail closed when credentials are absent.
- Request IDs, rate limiting and persistent audit telemetry are implemented.
- Security response headers are configured.
- `/api/status` exposes safe readiness diagnostics without secrets.
- `/api/health` provides a public-safe liveness/readiness contract for deployment checks.
- Strategic God Mode and mission-control UI are included in `main`.

## Required core production environment

The minimum runtime contract for JARVIS chat is:

`OPENAI_API_KEY` and `JARVIS_SESSION_SECRET` (at least 32 characters).

`OPENAI_MODEL` is optional and defaults to `gpt-5.6`.

Supabase is strongly recommended for persistent memory but is not required for the core chat to boot. The application must report memory as unavailable rather than pretending it is active.

Integration credentials must only be configured in the deployment environment and must never be committed to Git.

## Connector-dependent capabilities

GitHub, Shopify, Gmail, Calendar, web search and automation remain explicitly disconnected until their real credentials and authorization flows are configured.

Write access must remain approval-gated. JARVIS must never claim an external action completed without a successful tool result and verification.

## Release gate

A release is considered production-ready only when:

1. GitHub CI passes typecheck, lint and build.
2. Vercel deployment reaches `READY`.
3. `/api/health` reports `ok: true`.
4. `/api/session` successfully establishes a signed HttpOnly session.
5. `/api/status` reports the expected connector states.
6. Chat can complete one real OpenAI request when `OPENAI_API_KEY` is configured.
7. Any enabled connector can perform its permitted read operation and returns verified real data.

## Known architecture constraint

The repository contains a root-level `app/` directory in addition to `jarvis-business-os/app/`. The deployed application is built from `jarvis-business-os`, so the latter is the authoritative runtime source. Future cleanup should either remove the unused root app or convert the repository to a deliberate workspace architecture; until then, no production feature should be implemented in the root `app/`.
