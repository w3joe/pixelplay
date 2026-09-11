# PixelPlay

Public event-tech planner (lead magnet) for [PixelPro](https://pixelpro.sg) — venue → equipment wizard with rule-based sufficiency checks, indicative SGD pricing, 2.5D preview, and email lead capture.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Zustand for wizard state
- React Three Fiber 2.5D orthographic preview
- Resend for lead emails (optional; always logs to server)

## Develop

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

## Environment

Copy `.env.example` to `.env.local`:

- `RESEND_API_KEY` — Resend API key
- `LEADS_TO_EMAIL` — sales inbox
- `LEADS_FROM_EMAIL` — verified Resend from address (optional; defaults to Resend onboarding)
- `GEMINI_PROVIDER` — `developer` (Google AI Studio) or `vertex` (Vertex AI); default `developer`
- `GEMINI_MODEL` — model id used by both providers (e.g. `gemini-3.1-flash-lite`)
- `GEMINI_API_KEY` / `GOOGLE_API_KEY` — developer API key; also used as Vertex fallback
- For Vertex: `VERTEX_API_KEY` (preferred), `VERTEX_PROJECT_ID` (or `GOOGLE_CLOUD_PROJECT`), `VERTEX_LOCATION` (or `GOOGLE_CLOUD_LOCATION`, default `us-central1`)

Without Resend env vars, leads still appear in Vercel/server logs as `[pixelplay-lead]`. Without Gemini credentials for the chosen provider, the AI planner card shows a not-configured message.

## Deploy (Vercel)

1. Import this repo in Vercel under the PixelPro account.
2. Set the env vars above.
3. Point `play.pixelpro.sg` (or your chosen subdomain) at the project.

Prices and venue dimensions are planning ballparks — labeled non-binding in the UI.
