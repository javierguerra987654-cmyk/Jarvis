# J.A.R.V.I.S. Core

Rebuild limpio del asistente JARVIS sobre Next.js, Vercel y OpenAI.

## Arquitectura

- Next.js App Router + TypeScript
- OpenAI Responses API con streaming
- Tailwind CSS v4
- Capa de núcleo aislada en `src/lib`
- UI holográfica en `src/components`
- API preparada para function calling, memoria, voz Realtime e integraciones externas

## Desarrollo

```bash
npm install
cp .env.example .env.local
npm run dev
```

Variables mínimas:

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6
```

## Verificación

```bash
npm run typecheck
npm run lint
npm run build
```

## Producción

El proyecto está diseñado para desplegarse desde Vercel con `jarvis-business-os` como Root Directory.
