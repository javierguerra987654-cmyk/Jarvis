# J.A.R.V.I.S. Architecture

## Current state

- Next.js App Router + React + TypeScript.
- OpenAI Responses API with server-side streaming at `POST /api/jarvis`.
- `OPENAI_API_KEY` is server-only.
- Tool registry exists but no production tools are registered yet.
- Memory interface exists, but the current implementation is in-memory and does not persist to Supabase/PostgreSQL.
- Voice, vision, Realtime audio, GitHub, Shopify, Google, automations and computer control are not connected by this application yet.

## Security rules

1. Never expose `OPENAI_API_KEY` to client code.
2. Never use `NEXT_PUBLIC_OPENAI_API_KEY`.
3. Tool integrations must fail closed when credentials or authorization are missing.
4. Never present simulated data as real external data.
5. Sensitive tool calls require explicit authorization at execution time.

## Deployment

The intended Vercel configuration is:

- Root Directory: `jarvis-business-os`
- Framework: Next.js
- Install: `npm install`
- Build: `npm run build`
- Node.js: 24+
- Production environment requires a current, unexposed OpenAI API key.

## Roadmap

### Phase 1 — Core
- Chat
- SSE streaming
- Structured tool calling
- Error boundaries and request IDs

### Phase 2 — Memory
- Supabase PostgreSQL adapter
- Short-term conversation persistence
- Long-term memory
- Embeddings/vector search

### Phase 3 — Tools
- Web search
- GitHub
- Shopify
- Calendar
- Email
- Automation
- System tools

### Phase 4 — Multimodal
- Vision
- OpenAI Realtime
- VAD
- interruption/barging
- speech output

### Phase 5 — Autonomous execution
- durable jobs
- approval gates
- audit trail
- autonomous agents
