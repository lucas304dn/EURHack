# Vercel Deployment Notes

This app deploys to Vercel as a TanStack Start app using Nitro. TRIBE v2 is not part of
the Vercel deployment; keep it running as an external Kaggle/ngrok FastAPI GPU service.

## Build Settings

- Framework preset: `tanstack-start`
- Install command: `bun install`
- Build command: `bun run build`
- Runtime/output: `nitro/vite` with the `vercel` preset during Vercel builds
- Vercel output: Nitro generates Vercel Build Output API files in `.vercel/output`
- Function runtime: Node.js Vercel Function; local Nitro verification reported `nodejs24.x`

The existing Cloudflare Worker path is preserved. Vercel builds are detected through
`VERCEL`, `VERCEL_ENV`, `DEPLOY_TARGET=vercel`, or `NITRO_PRESET=vercel`; only then does
`vite.config.ts` disable the Lovable Cloudflare build plugin and enable Nitro.

## Required Environment Variables

Client-safe Supabase values:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PROJECT_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

Server-side Supabase values:

```env
SUPABASE_URL=
SUPABASE_PROJECT_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Server-only AI and backend secrets:

```env
OPENROUTER_API_KEY=
GEMINI_API_KEY=
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
ELEVENLABS_API_KEY=
VIDEO_GENERATION_BACKEND_URL=
TRIBE_API_URL=
```

Optional browser-visible TRIBE URL:

```env
VITE_TRIBE_API=
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`,
`ELEVENLABS_API_KEY`, `NGROK_TOKEN`, or `HF_TOKEN` as `VITE_*` variables.

## Operational Notes

Vercel will run the TanStack server functions as Vercel Functions through Nitro. The
current media generation and upload flows can be long-running or large, so production
deployments should watch function duration and request/body size limits. For heavier
workloads, keep GPU/model work in external services and use Supabase Storage or jobs for
large media transfer.
