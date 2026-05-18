import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GenInput = z.object({
  prompt: z.string().min(1).max(2000),
});

const GenMediaInput = z.object({
  prompt: z.string().min(1).max(2000),
  imageUrls: z.array(z.string().url().max(2048)).max(3).optional(),
});

// ---------- TEXT (OpenRouter) — returns variants WITHOUT persisting ----------
export const generateText = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("OPENROUTER_API_KEY is not configured");

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        messages: [
          {
            role: "system",
            content:
              "You are a world-class ad copywriter. Return ONLY a JSON object of the form {\"variants\":[\"...\",\"...\",\"...\"]} with exactly 3 short, punchy ad copy variants (max 280 chars each). No extra text.",
          },
          { role: "user", content: data.prompt },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${t}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";

    let variants: string[] = [];
    try {
      const match = content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : content);
      if (Array.isArray(parsed.variants)) variants = parsed.variants;
    } catch {
      variants = content
        .split(/\n+/)
        .map((s) => s.replace(/^[\d\-\.\)\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 3);
    }
    variants = variants.slice(0, 3);
    if (variants.length === 0) throw new Error("No variants returned");

    return { variants, prompt: data.prompt };
  });

// ---------- Save chosen text variant ----------
export const saveTextVariant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        prompt: z.string().min(1).max(2000),
        text: z.string().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("media_items").insert({
      user_id: "demo-user",
      type: "text",
      title: data.prompt.slice(0, 80),
      content_text: data.text,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function callVideoBackend(prompt: string, imageUrls?: string[]): Promise<string> {
  const backendUrl = process.env.VIDEO_GENERATION_BACKEND_URL;
  if (!backendUrl) throw new Error("VIDEO_GENERATION_BACKEND_URL is not configured");

  const body: Record<string, unknown> = { prompt };
  if (imageUrls && imageUrls.length > 0) body.image_urls = imageUrls;
  const res = await fetch(`${backendUrl.replace(/\/+$/, "")}/generate/video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`video generation failed: ${res.status} ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new Error(`video generation returned no url`);
  return json.url;
}

// ---------- IMAGE (Lovable AI Gateway — Nano Banana) ----------
export const generateImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenMediaInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured");

    const userContent: Array<Record<string, unknown>> = [
      { type: "text", text: data.prompt },
    ];
    for (const url of data.imageUrls ?? []) {
      userContent.push({ type: "image_url", image_url: { url } });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: userContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Rate limited by Lovable AI — try again shortly.");
      if (res.status === 402) throw new Error("Lovable AI credits exhausted — top up in workspace settings.");
      throw new Error(`Lovable AI ${res.status}: ${t.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
    };
    const dataUrl = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl) throw new Error("Lovable AI returned no image");

    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const mimeMatch = dataUrl.match(/^data:([^;]+);/);
    const contentType = mimeMatch?.[1] ?? "image/png";
    const ext = contentType.split("/")[1] ?? "png";
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const path = `image/${crypto.randomUUID()}.${ext}`;
    const up = await supabaseAdmin.storage
      .from("media")
      .upload(path, bytes, { contentType });
    if (up.error) throw new Error(up.error.message);
    const { data: pub } = supabaseAdmin.storage.from("media").getPublicUrl(path);

    const { error } = await supabaseAdmin.from("media_items").insert({
      user_id: "demo-user",
      type: "image",
      title: data.prompt.slice(0, 80),
      content_url: pub.publicUrl,
    });
    if (error) throw new Error(error.message);
    return { url: pub.publicUrl };
  });

// ---------- VIDEO ----------
export const generateVideo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenMediaInput.parse(input))
  .handler(async ({ data }) => {
    const url = await callVideoBackend(data.prompt, data.imageUrls);
    const { error } = await supabaseAdmin.from("media_items").insert({
      user_id: "demo-user",
      type: "video",
      title: data.prompt.slice(0, 80),
      content_url: url,
    });
    if (error) throw new Error(error.message);
    return { url };
  });



// ---------- AUDIO (script via OpenRouter, then ElevenLabs TTS) ----------
async function generateAdScript(prompt: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-3-super-120b-a12b:free",
      messages: [
        {
          role: "system",
          content:
            "You write short, punchy ad voiceover scripts. Given a topic or brief, return ONLY the spoken script — no labels, no stage directions, no quotes, no markdown. Tone, length, and style must fit the user's brief. Default to ~60-80 words of natural single-voice cadence when unspecified.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Script generation ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const script = (json.choices?.[0]?.message?.content ?? "").trim().replace(/^["']|["']$/g, "");
  if (!script) throw new Error("Empty script from model");
  return script;
}

export const generateAudio = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        prompt: z.string().min(1).max(2000),
        voiceId: z.string().min(1).max(64).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error("ELEVENLABS_API_KEY is not configured");

    const script = await generateAdScript(data.prompt);

    const voiceId = data.voiceId || "JBFqnCBsd6RMkjVDRZzb";
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_multilingual_v2",
        }),
      },
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`ElevenLabs ${res.status}: ${t}`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    const path = `audio/${crypto.randomUUID()}.mp3`;
    const up = await supabaseAdmin.storage
      .from("media")
      .upload(path, buf, { contentType: "audio/mpeg" });
    if (up.error) throw new Error(up.error.message);
    const { data: pub } = supabaseAdmin.storage.from("media").getPublicUrl(path);

    const { error } = await supabaseAdmin.from("media_items").insert({
      user_id: "demo-user",
      type: "audio",
      title: data.prompt.slice(0, 80),
      content_url: pub.publicUrl,
      content_text: script,
    });
    if (error) throw new Error(error.message);
    return { url: pub.publicUrl, script };
  });


// ---------- List / Delete ----------
export const listMedia = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("media_items")
    .select("*")
    .eq("user_id", "demo-user")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { items: data ?? [] };
});

export const deleteMedia = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("media_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Upload (Neural Feedback) ----------
export const uploadMedia = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        filename: z.string().min(1).max(255),
        contentType: z.string().min(1).max(100),
        type: z.enum(["text", "image", "video", "audio"]),
        base64: z.string().optional(),
        text: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (data.type === "text") {
      if (!data.text) throw new Error("Missing text content");
      const { data: row, error } = await supabaseAdmin
        .from("media_items")
        .insert({
          user_id: "demo-user",
          type: "text",
          title: data.filename,
          content_text: data.text,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { item: row };
    }

    if (!data.base64) throw new Error("Missing file data");
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const ext = data.filename.split(".").pop() || "bin";
    const path = `${data.type}/${crypto.randomUUID()}.${ext}`;
    const up = await supabaseAdmin.storage
      .from("media")
      .upload(path, bytes, { contentType: data.contentType });
    if (up.error) throw new Error(up.error.message);
    const { data: pub } = supabaseAdmin.storage.from("media").getPublicUrl(path);
    const { data: row, error } = await supabaseAdmin
      .from("media_items")
      .insert({
        user_id: "demo-user",
        type: data.type,
        title: data.filename,
        content_url: pub.publicUrl,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { item: row };
  });
