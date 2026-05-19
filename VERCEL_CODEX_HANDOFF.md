# EuroHackNL Vercel Implementation Handoff

This document is written for a coding agent/Codex that needs to understand the current project quickly and add a Vercel implementation.

## 1. Project Overview

EuroHackNL is a Cortex frontend: a neuroscience-powered ad generation and analysis platform.

The application is a TanStack Start React app using:

- React 19
- Vite 7
- TanStack Start
- TanStack Router
- TanStack Query
- Tailwind CSS 4
- shadcn/Radix UI components
- Supabase for media persistence
- External AI services for text, image, video, audio, and TRIBE neural analysis

The frontend app lives under `src/`.

The TRIBE v2 backend is not part of the Vercel app. It is a Kaggle notebook exported as:

```text
notebook6ad3107c56 (1).ipynb
```

That notebook starts a FastAPI server on Kaggle and exposes it through ngrok.

## 2. Current Deployment State

The repo is currently Cloudflare-oriented, not Vercel-oriented.

Important files:

```text
package.json
vite.config.ts
wrangler.jsonc
src/server.ts
src/start.ts
```

`wrangler.jsonc` points to a Cloudflare Worker entry:

```json
{
  "name": "tanstack-start-app",
  "compatibility_date": "2025-09-24",
  "compatibility_flags": ["nodejs_compat"],
  "main": "src/server.ts"
}
```

`src/server.ts` exports a Worker-style `fetch` handler:

```ts
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // wraps @tanstack/react-start/server-entry
  },
};
```

This is the main Vercel blocker. Vercel needs the correct TanStack Start Vercel/serverless output, not a Wrangler/Cloudflare Worker entry unless using an edge-compatible adapter intentionally.

## 3. Package Scripts

From `package.json`:

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

Package manager is Bun. There is a `bun.lock`.

Recommended Vercel install/build starting point:

```bash
bun install
bun run build
```

Codex should verify whether Vercel auto-detects Bun or whether `vercel.json` / project settings must explicitly set the install command.

## 4. Vite Config

`vite.config.ts` uses Lovable’s TanStack config wrapper:

```ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
```

The comments say this wrapper already includes:

- TanStack Start plugin
- React plugin
- Tailwind plugin
- tsconfig paths
- Cloudflare build plugin
- VITE env injection
- `@/*` alias

For Vercel, Codex must check whether this Lovable config can emit Vercel-compatible output or whether it needs a Vercel-specific config/preset. Avoid blindly adding duplicate Vite plugins because the comment explicitly warns that duplicated plugins can break the app.

## 5. App Entry Points

### `src/start.ts`

Creates the TanStack Start instance and request middleware:

```ts
export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));
```

The middleware catches non-HTTP errors and returns a branded HTML error page.

### `src/server.ts`

Cloudflare-style wrapper around:

```ts
@tanstack/react-start/server-entry
```

It normalizes catastrophic SSR errors and returns a branded error page.

For Vercel, Codex should either:

- replace this with the official Vercel-compatible entry, or
- add a parallel Vercel-specific entry/config while preserving the Cloudflare path.

Do not assume the Cloudflare Worker entry is valid for Vercel Node/serverless.

## 6. Router And Routes

Routing is file-based under `src/routes/`.

Important files:

```text
src/routes/__root.tsx
src/routes/index.tsx
src/routes/dashboard.tsx
src/routes/neural-feedback.tsx
src/routes/integrations.tsx
src/routeTree.gen.ts
src/router.tsx
```

Routes:

| Route | File | Purpose |
| --- | --- | --- |
| `/` | `src/routes/index.tsx` | Redirects to `/dashboard` |
| `/dashboard` | `src/routes/dashboard.tsx` | Main ad generation dashboard |
| `/neural-feedback` | `src/routes/neural-feedback.tsx` | Neural/brain analysis UI, optional `?mediaId=<uuid>` |
| `/integrations` | `src/routes/integrations.tsx` | CSV/PDF export and platform placeholders |

`src/routes/__root.tsx` defines:

- HTML shell
- page metadata
- Google font link
- global CSS import
- `QueryClientProvider`
- `ThemeProvider`
- `Toaster`
- 404 component
- error component

`src/router.tsx` creates a new `QueryClient` and router.

## 7. Core UI Structure

Main Cortex layout components:

```text
src/components/cortex/Shell.tsx
src/components/cortex/Sidebar.tsx
src/components/cortex/TopBar.tsx
src/components/cortex/ThemeProvider.tsx
src/components/cortex/ThemeSwitcher.tsx
```

### Shell

`Shell.tsx` renders:

- fixed sidebar
- top bar
- centered content area with `max-w-[1400px]`

### Sidebar

`Sidebar.tsx` links to:

- Dashboard
- Neural Feedback
- Integrations

It imports:

```ts
import cortexLogo from "@/assets/cortex-logo.png";
```

### TopBar

`TopBar.tsx` imports:

```ts
import avatar from "@/assets/avatar.jpg";
```

## 8. Dashboard

Main file:

```text
src/components/cortex/Dashboard.tsx
```

Dashboard lets users generate and manage media:

- text copy
- image
- video
- audio

It calls server functions using `useServerFn`:

```ts
generateText
generateImage
generateVideo
generateAudio
listMedia
deleteMedia
saveTextVariant
```

The gallery shows stored media from Supabase. Non-image media has a link to:

```text
/neural-feedback?mediaId=<id>
```

Images are currently disabled for neural feedback because TRIBE only supports text, audio, and video.

## 9. Neural Feedback

Main file:

```text
src/components/cortex/NeuralFeedback.tsx
```

Important: on the current `main` branch, this component is still mocked.

Current behavior:

- user uploads/selects text, audio, or video
- uploads are stored through `uploadMedia`
- `Analyze with Cortex AI` runs a 3-second `setTimeout`
- hardcoded `RUBRICS` scores are displayed
- static `brain.png` is shown with animated CSS pings

Current imports include:

```ts
import brainImg from "@/assets/brain.png";
```

There is a reserved hidden DOM container:

```tsx
<div
  id="brain-visualization-container"
  style={{ border: "1px dashed #333" }}
  className="pointer-events-none absolute inset-7 rounded-2xl opacity-0"
  aria-hidden
/>
```

Codex should know: real TRIBE integration is not currently wired into `main`. The Kaggle notebook exposes the API that should eventually replace this mock.

## 10. Integrations Page

Main file:

```text
src/routes/integrations.tsx
```

This page supports:

- CSV export
- PDF export
- Meta Ads placeholder
- Instagram external link
- TikTok external link

The CSV/PDF export currently uses hardcoded mock neuro scores:

```ts
const NEURO_SCORES = [
  { label: "Visual Cortex", value: 78 },
  { label: "Language Network", value: 86 },
  { label: "Attention", value: 74 },
  { label: "Emotional Response", value: 81 },
  { label: "Memory Encoding", value: 69 },
  { label: "Overall Impact", value: 82 },
];
```

This is not real TRIBE output.

## 11. Server Functions

Main file:

```text
src/lib/cortex.functions.ts
```

All backend app actions are TanStack Start server functions via `createServerFn`.

Functions:

| Function | Method | Purpose |
| --- | --- | --- |
| `generateText` | POST | OpenRouter generates 3 ad copy variants |
| `saveTextVariant` | POST | Saves selected text variant to Supabase |
| `generateImage` | POST | Gemini image generation, stores image in Supabase Storage |
| `generateVideo` | POST | Calls external video backend |
| `generateAudio` | POST | OpenRouter script + ElevenLabs TTS, stores MP3 |
| `listMedia` | GET | Lists all `demo-user` media |
| `deleteMedia` | POST | Deletes one media row |
| `uploadMedia` | POST | Uploads text/audio/video for neural feedback |

External APIs used:

- OpenRouter
- Gemini Generative Language API
- ElevenLabs
- external video generation backend
- Supabase

Important implementation details:

- `generateImage` uses `GEMINI_API_KEY` and optional `GEMINI_IMAGE_MODEL`.
- `generateAudio` generates script text with OpenRouter, then sends it to ElevenLabs.
- `generateVideo` expects an external service at `VIDEO_GENERATION_BACKEND_URL` with endpoint `/generate/video`.
- `uploadMedia` accepts base64 for audio/video and inserts rows into Supabase.

Vercel concerns:

- large uploads and base64 conversion can hit body size/function duration limits
- image/audio/video generation can exceed serverless timeouts
- long-running work should eventually move to background jobs or external services

## 12. Supabase

Server admin client:

```text
src/integrations/supabase/client.server.ts
```

Uses:

```env
SUPABASE_URL
SUPABASE_PROJECT_URL
SUPABASE_SERVICE_ROLE_KEY
```

Client Supabase:

```text
src/integrations/supabase/client.ts
```

Uses:

```env
VITE_SUPABASE_URL
VITE_SUPABASE_PROJECT_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_PROJECT_URL
SUPABASE_PUBLISHABLE_KEY
```

Migration:

```text
supabase/migrations/20260518172950_4825abe1-fdae-40bb-b04b-e9cd4a178220.sql
```

Creates:

```sql
CREATE TABLE public.media_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'demo-user',
  type TEXT NOT NULL CHECK (type IN ('text','image','video','audio')),
  title TEXT,
  content_url TEXT,
  content_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Also creates public `media` storage bucket and permissive demo RLS policies.

Important: all server functions currently operate as `demo-user`; there is no real auth flow wired into the app.

Auth-related files exist but are not wired:

```text
src/integrations/supabase/auth-middleware.ts
src/integrations/supabase/auth-attacher.ts
```

## 13. Environment Variables

Current `.env.example`:

```env
# Supabase client configuration
VITE_SUPABASE_URL=
VITE_SUPABASE_PROJECT_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
SUPABASE_URL=
SUPABASE_PROJECT_URL=
SUPABASE_PUBLISHABLE_KEY=

# Server-only secrets
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
GEMINI_API_KEY=
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
ELEVENLABS_API_KEY=

# Server-only backend configuration
VIDEO_GENERATION_BACKEND_URL=
```

Codex should add/document for TRIBE:

```env
VITE_TRIBE_API=
```

Potentially also:

```env
TRIBE_API_URL=
```

Use `VITE_TRIBE_API` only if the browser directly needs the TRIBE base URL. Prefer server-side `TRIBE_API_URL` if proxying through TanStack server functions.

Never expose these as `VITE_*`:

```env
SUPABASE_SERVICE_ROLE_KEY
OPENROUTER_API_KEY
GEMINI_API_KEY
ELEVENLABS_API_KEY
NGROK_TOKEN
HF_TOKEN
```

## 14. Kaggle TRIBE Backend

Notebook file:

```text
notebook6ad3107c56 (1).ipynb
```

This is a downloaded copy of the Kaggle notebook.

It installs and runs:

- `fastapi`
- `uvicorn`
- `pyngrok`
- `python-multipart`
- `tribev2[plotting]`
- `numpy==2.2.6`
- `scipy`
- `scikit-learn`

It loads:

```python
tribe_model = TribeModel.from_pretrained('facebook/tribev2', cache_folder=CACHE_DIR)
```

It exposes a FastAPI app with:

```text
GET  /health
POST /activate/text
POST /activate/audio
POST /activate/video
GET  /viewer/{analysis_id}
```

Activation response fields include:

```text
activation
allPreds
segments
shape
input_type
metadata
summary
scores
region_masks
peak_activation_step
analysis_id
viewer_url
viewer_available
viewer_kind
viewer_frame_count
viewer_stride
```

Current notebook viewer behavior:

- one-piece Three.js `fsaverage5` brain viewer
- text uses static peak frame
- audio/video animate timesteps when multiple frames exist
- long media is capped by `TRIBE_VIEWER_MAX_FRAMES`, default `120`

Important:

- This notebook cannot run on Vercel because TRIBE requires GPU and large model downloads.
- It should remain an external GPU service.
- Vercel should call it through `VITE_TRIBE_API` or preferably a server-side proxy using `TRIBE_API_URL`.

Security warning:

- The notebook contains fallback HuggingFace/ngrok token strings in its source.
- Those must be removed/rotated before public deployment.

## 15. Static Assets Risk

Some branches/states of this repo may be missing `src/assets`.

Code imports:

```text
@/assets/brain.png
@/assets/cortex-logo.png
@/assets/avatar.jpg
```

If these files are absent, `vite build` will fail.

Codex should check:

```text
src/assets/brain.png
src/assets/cortex-logo.png
src/assets/avatar.jpg
```

and either restore them or replace imports with existing assets/placeholders.

## 16. Vercel Implementation Plan For Codex

### Step 1: Verify Build On Current Branch

Run:

```bash
bun install
bun run lint
bun run build
```

If build fails because assets are missing, fix assets before Vercel work.

### Step 2: Research Correct TanStack Start Vercel Adapter

The app uses:

```json
"@tanstack/react-start": "^1.167.50"
```

Codex should use the official deployment approach for this version.

Do not assume Next.js-style files or Vercel API routes.

### Step 3: Add Vercel Config

Likely file:

```text
vercel.json
```

Possible concerns:

- install command should use Bun
- build command should be `bun run build`
- output directory depends on TanStack Start/Vite adapter
- server runtime may need Node, not Edge, because server functions use Node-style APIs and binary blobs

### Step 4: Make Cloudflare Optional

Do not break:

```text
wrangler.jsonc
src/server.ts
vite.config.ts
```

unless the goal is to replace Cloudflare completely.

Safer approach:

- support Vercel as an additional deploy target
- keep Wrangler config untouched
- conditionally configure Vercel output if supported by TanStack Start/Lovable config

### Step 5: Configure Vercel Environment

Set in Vercel project settings:

```env
SUPABASE_URL=
SUPABASE_PROJECT_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_PROJECT_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
OPENROUTER_API_KEY=
GEMINI_API_KEY=
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
ELEVENLABS_API_KEY=
VIDEO_GENERATION_BACKEND_URL=
TRIBE_API_URL=
VITE_TRIBE_API=
```

Only add `VITE_TRIBE_API` if client-side iframe/direct calls need it.

### Step 6: Decide TRIBE Integration Path

Current `main` branch has mocked `NeuralFeedback`.

Codex can implement:

1. server function `analyzeMedia`
2. text call to `/activate/text`
3. audio/video multipart forwarding to `/activate/audio` and `/activate/video`
4. UI replacement of mock rubrics with real `scores`
5. iframe embedding of `viewer_url`

But this is separate from the pure Vercel deployment task.

### Step 7: Account For Serverless Limits

Vercel may struggle with:

- large media upload through `uploadMedia`
- Gemini image generation
- ElevenLabs audio generation
- external video generation waits
- TRIBE analysis waits

Recommended production architecture:

- direct browser upload to Supabase Storage using signed URLs
- server functions only create signed upload URLs and metadata rows
- long-running AI generation runs in external services/background jobs
- Vercel app polls job status
- TRIBE stays on GPU host, not Vercel

## 17. High-Risk Issues To Fix Before Production

1. `NeuralFeedback.tsx` is mocked on `main`.
2. `Integrations` exports mock neuro scores.
3. Supabase policies are demo/open.
4. Everything uses `demo-user`; no real auth.
5. Notebook contains fallback secrets.
6. TRIBE API depends on ngrok/Kaggle uptime.
7. Video backend is external and not included.
8. Cloudflare deployment config is the only explicit deploy config.
9. Vercel serverless limits may break long-running/binary server functions.
10. Missing assets may break build.

## 18. Key Files

```text
package.json
vite.config.ts
wrangler.jsonc
.env.example
tsconfig.json
eslint.config.js

src/server.ts
src/start.ts
src/router.tsx
src/routeTree.gen.ts

src/routes/__root.tsx
src/routes/index.tsx
src/routes/dashboard.tsx
src/routes/neural-feedback.tsx
src/routes/integrations.tsx

src/components/cortex/Dashboard.tsx
src/components/cortex/NeuralFeedback.tsx
src/components/cortex/Shell.tsx
src/components/cortex/Sidebar.tsx
src/components/cortex/TopBar.tsx

src/lib/cortex.functions.ts
src/integrations/supabase/client.ts
src/integrations/supabase/client.server.ts
src/integrations/supabase/types.ts
src/integrations/supabase/auth-middleware.ts
src/integrations/supabase/auth-attacher.ts

supabase/config.toml
supabase/migrations/20260518172950_4825abe1-fdae-40bb-b04b-e9cd4a178220.sql

notebook6ad3107c56 (1).ipynb
```

## 19. Short Codex Instruction

Use this prompt:

```text
You are working in a TanStack Start/Vite React app currently configured for Cloudflare Workers. Add Vercel deployment support without breaking the existing app. First verify the correct TanStack Start Vercel adapter/output for @tanstack/react-start ^1.167.50. Add the minimal Vercel config and any necessary runtime/entry changes. Preserve Cloudflare config unless impossible. Ensure Bun install/build works. Then document required Vercel environment variables. Do not attempt to run TRIBE on Vercel; it is an external Kaggle/ngrok FastAPI GPU service represented by notebook6ad3107c56 (1).ipynb.
```
