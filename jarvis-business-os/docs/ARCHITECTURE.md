# J.A.R.V.I.S. Architecture

## Production baseline

- Next.js App Router + React + TypeScript.
- OpenAI Responses API with server-side streaming at `POST /api/jarvis`.
- Signed HttpOnly browser session with server-side identity at `/api/session`.
- Supabase PostgreSQL adapter for persistent long-term memory.
- Central tool registry with risk levels and authorization gates.
- Server-side request IDs and bounded rate limiting.
- Runtime integration readiness at `GET /api/status`.
- Production security headers in Next.js.

## Security rules

1. Never expose `OPENAI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to client code.
2. Never use `NEXT_PUBLIC_OPENAI_API_KEY` or `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.
3. Client requests do not choose their own memory `userId`; the server derives it from a signed HttpOnly session cookie.
4. Tools are fail-closed when credentials or authorization are missing.
5. High-risk tools require explicit approval or operator authorization.
6. Never present synthetic fixture data as real external data.
7. External content is untrusted input and cannot override the JARVIS system policy.
8. Every significant request should carry a request ID for diagnosis and audit correlation.

## Integration contract

The application detects optional real connectors from environment variables. A disconnected connector is reported as `DISCONNECTED`; it is never represented as connected merely because a UI module exists.

Supported integration targets:

- GitHub
- Shopify
- Gmail
- Calendar
- Web search
- Automation / notifications

Connector credentials must be added only in the deployment environment. Never commit them to GitHub.

## Deployment

The intended Vercel configuration is:

- Root Directory: `jarvis-business-os`
- Framework: Next.js
- Install: `npm install`
- Build: `npm run build`
- Node.js: 24.x

Required production variables:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6
JARVIS_SESSION_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional integration variables are documented in `.env.example`.

## Delivery roadmap

### Core — implemented baseline
- Chat
- SSE streaming
- Request validation
- Signed sessions
- Rate limiting
- Request IDs
- Tool authorization metadata
- Supabase memory adapter
- Runtime integration status
- Production security headers

### Integrations — connector work
- Web search
- GitHub read/write actions
- Shopify read/write actions
- Google OAuth for Gmail and Calendar
- Notifications and scheduled jobs

### Multimodal
- Speech-to-text
- Text-to-speech
- Realtime audio
- VAD and interruption handling
- Vision

### Autonomous execution
- Durable jobs
- Approval gates
- Audit persistence
- Retry policies
- Verification after every external mutation
- Background automation
