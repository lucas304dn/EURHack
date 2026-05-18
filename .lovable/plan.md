## Goal

Replace the ngrok/Higgsfield image generation path with Lovable AI Gateway so image generation:
- Bills against your Lovable workspace AI credits
- Works identically when the project is exported to GitHub / self-hosted (just needs `LOVABLE_API_KEY` env var)
- Supports the planned reference-image upload flow natively

Video generation stays on Higgsfield/ngrok (Gateway has no video model). Audio/text unchanged.

## Changes

### 1. `src/lib/cortex.functions.ts` — rewrite `generateImage`

Replace the `callGenBackend("image", ...)` path with a direct call to Lovable AI Gateway using `google/gemini-2.5-flash-image` (Nano Banana — fast, supports reference images).

Flow inside the handler:
1. Read `LOVABLE_API_KEY` from `process.env` inside `.handler()` (never module scope).
2. POST to `https://ai.gateway.lovable.dev/v1/chat/completions` with:
   - Header: `Authorization: Bearer ${LOVABLE_API_KEY}` + `Content-Type: application/json`
   - Body: `{ model: "google/gemini-2.5-flash-image", messages: [{ role: "user", content: [{ type: "text", text: prompt }, ...refImageParts] }], modalities: ["image","text"] }`
   - `refImageParts` is built from the new optional `imageUrls` input — each becomes `{ type: "image_url", image_url: { url } }`.
3. Parse response → extract base64 image from `choices[0].message.images[0].image_url.url` (data URL).
4. Decode base64 → upload to the existing `media` Supabase bucket at `image/${uuid}.png` (mirrors how `generateAudio` already handles binary uploads).
5. Get public URL → insert into `media_items` (same shape as today) → return `{ url }`.
6. Surface gateway failures with clear messages: **429** → "Rate limited, try again", **402** → "Lovable AI credits exhausted — top up in workspace settings".

Input schema extended:
```ts
z.object({
  prompt: z.string().min(1).max(2000),
  imageUrls: z.array(z.string().url().max(2048)).max(3).optional(),
})
```

### 2. `src/lib/cortex.functions.ts` — `generateVideo` unchanged path, accept optional `imageUrls`

Keep ngrok call, but extend the input schema with the same optional `imageUrls` and forward as `image_urls` in the JSON body (so your ngrok service can use them once wired). No behaviour change if the array is empty.

### 3. Remove unused image branch from `callGenBackend`

`callGenBackend` becomes video-only. Inline it or narrow its type to `"video"`. Small cleanup, no functional impact.

### 4. No frontend changes required for this task

The Dashboard `gen` mutation already passes a `prompt` and (per prior plan) will pass `imageUrls`. The contract stays `{ prompt, imageUrls? } → { url }`, so `Dashboard.tsx` doesn't need edits for the backend swap itself.

## Why this works after GitHub export

- The new code only depends on:
  - `process.env.LOVABLE_API_KEY` (carry to your host's env vars)
  - `supabaseAdmin` (already standard Supabase)
  - `fetch` (built-in)
- No ngrok dependency, no localhost-only service, no machine-bound CLI.
- Runs on Cloudflare Workers, Vercel, Node — anywhere your exported TanStack app runs.

## Out of scope

- Video → still Higgsfield/ngrok (Gateway limitation).
- Audio/text → unchanged.
- The upload UI from the prior plan is a separate change; this plan only swaps the image backend so reference uploads, when added, work end-to-end through Gateway.

## Files touched

- `src/lib/cortex.functions.ts`
