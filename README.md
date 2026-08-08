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

Without Resend env vars, leads still appear in Vercel/server logs as `[pixelplay-lead]`.

## Deploy (Vercel)

1. Import this repo in Vercel under the PixelPro account.
2. Set the env vars above.
3. Point `play.pixelpro.sg` (or your chosen subdomain) at the project.

Prices and venue dimensions are planning ballparks — labeled non-binding in the UI.
