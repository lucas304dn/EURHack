import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database, Json } from "@/integrations/supabase/types";

type MediaItemRow = Database["public"]["Tables"]["media_items"]["Row"];
type TribeAnalysisRunRow = Database["public"]["Tables"]["tribe_analysis_runs"]["Row"];

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

type GeminiImagePart = {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
};

type GeminiResponsePart = {
  text?: string;
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
  inline_data?: {
    mime_type?: string;
    data?: string;
  };
};

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiResponsePart[];
    };
    finishReason?: string;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function imageUrlToGeminiPart(url: string): Promise<GeminiImagePart> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load reference image: ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "image/png";
  if (!contentType.startsWith("image/")) {
    throw new Error("Reference URL did not return an image");
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  return {
    inline_data: {
      mime_type: contentType.split(";")[0],
      data: bytesToBase64(bytes),
    },
  };
}

function getGeminiImage(response: GeminiGenerateResponse) {
  const parts = response.candidates?.flatMap((candidate) => candidate.content?.parts ?? []) ?? [];
  for (const part of parts) {
    const inlineData = part.inlineData ?? part.inline_data;
    const imageData = inlineData?.data;
    if (imageData) {
      return {
        base64: imageData,
        contentType: inlineData?.mimeType ?? inlineData?.mime_type ?? "image/png",
      };
    }
  }
  return null;
}

// ---------- IMAGE (Gemini API / Nano Banana) ----------
export const generateImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenMediaInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not configured");

    const parts: GeminiImagePart[] = [{ text: data.prompt }];
    for (const url of data.imageUrls ?? []) {
      parts.push(await imageUrlToGeminiPart(url));
    }

    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "x-goog-api-key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Gemini image generation is rate limited. Try again shortly.");
      if (res.status === 403) throw new Error("Gemini API denied image generation. Check that billing/quota is enabled for this API key.");
      throw new Error(`Gemini image generation ${res.status}: ${t.slice(0, 200)}`);
    }

    const json = (await res.json()) as GeminiGenerateResponse;
    if (json.error) {
      throw new Error(`Gemini image generation failed: ${json.error.message ?? json.error.status ?? "unknown error"}`);
    }

    const image = getGeminiImage(json);
    if (!image) throw new Error("Gemini returned no image");

    const contentType = image.contentType;
    const ext = contentType.split("/")[1] ?? "png";
    const bytes = Uint8Array.from(atob(image.base64), (c) => c.charCodeAt(0));

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asJsonRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
}

function asNumberRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, raw]) => [key, Number(raw)] as const)
      .filter(([, numeric]) => Number.isFinite(numeric)),
  );
}

function asRegionMaskRecord(value: unknown): Record<string, [number, number]> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, raw]) => {
      if (!Array.isArray(raw) || raw.length < 2) return [];
      const start = Number(raw[0]);
      const end = Number(raw[1]);
      return Number.isFinite(start) && Number.isFinite(end) ? [[key, [start, end] as [number, number]]] : [];
    }),
  );
}

function serializeAnalysisRun(row: TribeAnalysisRunRow) {
  return {
    id: row.id,
    media_item_id: row.media_item_id,
    created_at: row.created_at,
    input_type: row.input_type as "text" | "audio" | "video",
    title: row.title,
    analysis_id: row.analysis_id,
    shape: asNumberArray(row.shape),
    segments: Array.isArray(row.segments) ? (row.segments as Array<Record<string, unknown>>) : [],
    metadata: asJsonRecord(row.metadata),
    summary: asJsonRecord(row.summary),
    scores: asNumberRecord(row.scores),
    region_masks: asRegionMaskRecord(row.region_masks),
    peak_activation_step: row.peak_activation_step,
    viewer_url: row.viewer_url,
    viewer_absolute_url: row.viewer_absolute_url,
    viewer_available: row.viewer_available,
    viewer_error: row.viewer_error,
  };
}

export const listMediaWithLatestAnalysis = createServerFn({ method: "GET" }).handler(async () => {
  const { data: media, error: mediaError } = await supabaseAdmin
    .from("media_items")
    .select("*")
    .eq("user_id", "demo-user")
    .order("created_at", { ascending: false });
  if (mediaError) throw new Error(mediaError.message);

  const items = (media ?? []) as MediaItemRow[];
  const ids = items.map((item) => item.id);
  if (ids.length === 0) return { items: [] };

  const { data: analyses, error: analysisError } = await supabaseAdmin
    .from("tribe_analysis_runs")
    .select("*")
    .eq("user_id", "demo-user")
    .in("media_item_id", ids)
    .order("created_at", { ascending: false });
  if (analysisError) {
    console.error("Failed to load TRIBE analysis runs", analysisError);
    return {
      items: items.map((item) => ({
        ...item,
        latest_analysis: null,
      })),
      analysis_error: analysisError.message,
    };
  }

  const latestByMedia = new Map<string, ReturnType<typeof serializeAnalysisRun>>();
  ((analyses ?? []) as TribeAnalysisRunRow[]).forEach((row) => {
    if (!latestByMedia.has(row.media_item_id)) {
      latestByMedia.set(row.media_item_id, serializeAnalysisRun(row));
    }
  });

  return {
    items: items.map((item) => ({
      ...item,
      latest_analysis: latestByMedia.get(item.id) ?? null,
    })),
  };
});

export const deleteMedia = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("media_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Neural analysis (TRIBE v2 Kaggle API) ----------
const AnalyzeMediaInput = z.object({
  id: z.string().uuid(),
  type: z.enum(["text", "video", "audio"]),
  title: z.string().nullable().optional(),
  content_url: z.string().url().nullable().optional(),
  content_text: z.string().nullable().optional(),
});

type AnalyzeMediaInput = z.infer<typeof AnalyzeMediaInput>;

export type TribeActivationResult = {
  input_type: "text" | "audio" | "video";
  shape: number[];
  activation?: number[][];
  allPreds?: number[][];
  segments: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  summary: {
    scores?: Record<string, number>;
    region_masks?: Record<string, [number, number]>;
    peak_activation_step?: number;
  };
  scores: Record<string, number>;
  region_masks: Record<string, [number, number]>;
  peak_activation_step: number;
  analysis_id?: string;
  viewer_url?: string;
  viewer_absolute_url?: string;
  viewer_available?: boolean;
  viewer_error?: string;
  analysis_db_id?: string;
  persistence_error?: string;
};

function getTribeApiBase() {
  const raw = process.env.TRIBE_API_URL || process.env.VITE_TRIBE_API;
  if (!raw) {
    throw new Error("VITE_TRIBE_API is not configured");
  }
  return raw.replace(/\/+$/, "");
}

function titleToCampaignName(item: AnalyzeMediaInput) {
  return item.title?.trim() || `${item.type} ${item.id.slice(0, 8)}`;
}

function filenameFromMedia(item: AnalyzeMediaInput) {
  const fallbackExt = item.type === "video" ? "mp4" : "mp3";
  const title = (item.title || item.type)
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  let ext = "";
  if (item.content_url) {
    try {
      const last = new URL(item.content_url).pathname.split("/").pop() || "";
      ext = last.match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? "";
    } catch {
      ext = "";
    }
  }

  const safeExt = ext || fallbackExt;
  if (title.toLowerCase().endsWith(`.${safeExt.toLowerCase()}`)) {
    return title;
  }
  return `${title || item.type}.${safeExt}`;
}

function withAbsoluteViewerUrl(result: TribeActivationResult, tribeBase: string) {
  if (result.viewer_url && !result.viewer_url.startsWith("http")) {
    return {
      ...result,
      viewer_absolute_url: `${tribeBase}${result.viewer_url}`,
    };
  }
  return {
    ...result,
    viewer_absolute_url: result.viewer_url,
  };
}

async function readTribeResponse(res: Response, tribeBase: string) {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`TRIBE API ${res.status}: ${text.slice(0, 300)}`);
  }

  const result = JSON.parse(text) as TribeActivationResult;
  if (!result.summary || !result.scores || typeof result.peak_activation_step !== "number") {
    throw new Error("TRIBE API response is missing summary, scores, or peak_activation_step");
  }

  return withAbsoluteViewerUrl(result, tribeBase);
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? null)) as Json;
}

function compactTribeResult(result: TribeActivationResult) {
  const { activation, allPreds, ...compact } = result;
  return {
    ...compact,
    raw_arrays_omitted: true,
    activation_frames: activation?.length ?? 0,
    activation_vertices: activation?.[0]?.length ?? 0,
    allPreds_frames: allPreds?.length ?? 0,
    allPreds_vertices: allPreds?.[0]?.length ?? 0,
  };
}

async function persistTribeAnalysisRun(
  item: AnalyzeMediaInput,
  result: TribeActivationResult,
): Promise<TribeActivationResult> {
  try {
    const scores = result.scores ?? result.summary.scores ?? {};
    const regionMasks = result.region_masks ?? result.summary.region_masks ?? {};
    const { data: row, error } = await supabaseAdmin
      .from("tribe_analysis_runs")
      .insert({
        media_item_id: item.id,
        user_id: "demo-user",
        input_type: result.input_type,
        title: item.title ?? null,
        analysis_id: result.analysis_id ?? null,
        shape: toJson(result.shape ?? []),
        segments: toJson(result.segments ?? []),
        metadata: toJson(result.metadata ?? {}),
        summary: toJson(result.summary ?? {}),
        scores: toJson(scores),
        region_masks: toJson(regionMasks),
        peak_activation_step: result.peak_activation_step,
        viewer_url: result.viewer_url ?? null,
        viewer_absolute_url: result.viewer_absolute_url ?? null,
        viewer_available: result.viewer_available ?? false,
        viewer_error: result.viewer_error ?? null,
        result_payload: toJson(compactTribeResult(result)),
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { ...result, analysis_db_id: row.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to persist TRIBE analysis run", error);
    return { ...result, persistence_error: message };
  }
}

export const analyzeMedia = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AnalyzeMediaInput.parse(input))
  .handler(async ({ data }) => {
    const tribeBase = getTribeApiBase();
    const campaignName = titleToCampaignName(data);

    if (data.type === "text") {
      const text = data.content_text?.trim();
      if (!text) throw new Error("Text media has no content to analyze");

      const res = await fetch(`${tribeBase}/activate/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, campaign_name: campaignName }),
      });
      const result = await readTribeResponse(res, tribeBase);
      return persistTribeAnalysisRun(data, result);
    }

    if (!data.content_url) {
      throw new Error(`${data.type} media has no URL to analyze`);
    }

    const mediaRes = await fetch(data.content_url);
    if (!mediaRes.ok) {
      throw new Error(`Failed to load ${data.type} media: ${mediaRes.status}`);
    }

    const form = new FormData();
    form.append("file", await mediaRes.blob(), filenameFromMedia(data));
    form.append("campaign_name", campaignName);

    const res = await fetch(`${tribeBase}/activate/${data.type}`, {
      method: "POST",
      body: form,
    });
    const result = await readTribeResponse(res, tribeBase);
    return persistTribeAnalysisRun(data, result);
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
