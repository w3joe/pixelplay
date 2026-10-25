# PixelPlay

Public event-layout sandbox (lead magnet) for [PixelPro](https://pixelpro.sg). Pick a Singapore venue, drag stages, LED walls, speakers and lights onto an isometric 1m grid, and get live SGD cost estimates, a sound-coverage map, one-tap recommendations, a plan score, a first-person walkthrough and email lead capture.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Zustand for builder state (placements + undo/redo)
- React Three Fiber isometric builder and first-person walkthrough
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

## How it fits together

- `src/lib/builder/` — the grid model: item catalogue, placement rules (`grid.ts`), auto-placement and starter kits, and `insights.ts` (sound map, tips, score, per-item cost).
- `placementsToConfig()` folds the grid back into the existing `PlayConfig`, so the rule engine (`src/lib/engine`) and pricing (`src/lib/pricing`) are unchanged.
- `src/components/builder/` — the sandbox UI; `src/components/scene/` — shared 3D fixtures; `src/components/walk/` — the walkthrough.

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
