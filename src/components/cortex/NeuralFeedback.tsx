import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, ExternalLink, Upload, Sparkles, Loader2, Mic, Type as TypeIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { analyzeMedia, listMedia, uploadMedia, type TribeActivationResult } from "@/lib/cortex.functions";
import brainImg from "@/assets/brain.png";
import { cn } from "@/lib/utils";

type MediaItem = {
  id: string;
  type: string;
  title: string | null;
  content_url: string | null;
  content_text: string | null;
  created_at: string;
};

const ANALYZABLE_MEDIA_TYPES = new Set(["text", "video", "audio"]);

const SCORE_LABELS: Record<string, string> = {
  visual_cortex: "Visual Cortex",
  language_network: "Language Network",
  attention: "Attention",
  emotional_response: "Emotional Response",
  memory_encoding: "Memory Encoding",
  overall_impact: "Overall Impact",
};

const SCORE_INSIGHTS: Record<string, string> = {
  visual_cortex: "Visual processing signal from the peak predicted cortical response.",
  language_network: "Language-related activation estimate from the TRIBE vertex ranges.",
  attention: "Attention-region activation estimate from the TRIBE response.",
  emotional_response: "Reward/emotion-adjacent activation estimate for the selected creative.",
  memory_encoding: "Memory-encoding signal from the approximate demo region mask.",
  overall_impact: "Average of the available TRIBE region scores.",
};

function labelForScore(key: string) {
  return SCORE_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function scoreInsight(key: string) {
  return SCORE_INSIGHTS[key] ?? "TRIBE-derived activation score for this approximate vertex range.";
}

export function NeuralFeedback({ initialMediaId }: { initialMediaId?: string }) {
  const qc = useQueryClient();
  const fnList = useServerFn(listMedia);
  const fnUpload = useServerFn(uploadMedia);
  const fnAnalyze = useServerFn(analyzeMedia);

  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [tab, setTab] = useState<"upload" | "gallery">("upload");
  const [analysis, setAnalysis] = useState<TribeActivationResult | null>(null);
  const selectedIsAnalyzable = selected ? ANALYZABLE_MEDIA_TYPES.has(selected.type) : false;

  const mediaQ = useQuery({
    queryKey: ["media"],
    queryFn: () => fnList(),
  });

  const eligible = useMemo(
    () => (mediaQ.data?.items ?? []).filter((item) => ANALYZABLE_MEDIA_TYPES.has(item.type)),
    [mediaQ.data],
  );

  useEffect(() => {
    if (initialMediaId && !selected && mediaQ.data) {
      const found = eligible.find((m) => m.id === initialMediaId);
      if (found) setSelected(found as MediaItem);
    }
  }, [eligible, initialMediaId, mediaQ.data, selected]);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.toLowerCase().split(".").pop() ?? "";
      const isText = ext === "txt";
      const isVideo = ["mp4", "mov"].includes(ext);
      const isAudio = ["mp3", "wav"].includes(ext);
      if (!isText && !isVideo && !isAudio) {
        throw new Error("Only video (.mp4 .mov), audio (.mp3 .wav), and text (.txt) files are supported.");
      }
      if (isText) {
        const text = await file.text();
        return fnUpload({
          data: {
            filename: file.name,
            contentType: file.type || "text/plain",
            type: "text",
            text,
          },
        });
      }
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const base64 = btoa(bin);
      const type = isVideo ? "video" : "audio";
      const defaultCt = isVideo ? "video/mp4" : "audio/mpeg";
      return fnUpload({
        data: {
          filename: file.name,
          contentType: file.type || defaultCt,
          type,
          base64,
        },
      });
    },
    onSuccess: (out) => {
      toast.success("Uploaded");
      qc.invalidateQueries({ queryKey: ["media"] });
      setSelected(out.item as MediaItem);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const analyze = useMutation({
    mutationFn: async (item: MediaItem) => {
      if (!ANALYZABLE_MEDIA_TYPES.has(item.type)) {
        throw new Error("Meta TRIBE V2 supports text, audio, and video only.");
      }
      return fnAnalyze({
        data: {
          id: item.id,
          type: item.type as "text" | "video" | "audio",
          title: item.title,
          content_url: item.content_url,
          content_text: item.content_text,
        },
      });
    },
    onSuccess: (result) => {
      setAnalysis(result as TribeActivationResult);
      if ((result as TribeActivationResult).persistence_error) {
        toast.warning("TRIBE analysis complete, but saving the run failed.");
      } else {
        toast.success("TRIBE analysis complete");
      }
    },
    onError: (e: Error) => {
      setAnalysis(null);
      toast.error(e.message);
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: {
      "video/*": [".mp4", ".mov"],
      "audio/*": [".mp3", ".wav"],
      "text/plain": [".txt"],
    },
    onDropRejected: () =>
      toast.error("Images are not supported. Upload .mp4 .mov .mp3 .wav or .txt."),
    onDrop: (files) => files[0] && upload.mutate(files[0]),
  });

  const handleAnalyze = () => {
    if (!selected) return;
    if (!selectedIsAnalyzable) {
      toast.error("Meta TRIBE V2 supports text, audio, and video only.");
      return;
    }
    setAnalysis(null);
    analyze.mutate(selected);
  };

  // Reset analysis when changing selection
  useEffect(() => {
    setAnalysis(null);
  }, [selected?.id]);

  const analyzing = analyze.isPending;
  const analyzed = !!analysis;
  const scoreEntries = Object.entries(analysis?.scores ?? analysis?.summary.scores ?? {}).sort(
    ([a], [b]) => {
      if (a === "overall_impact") return 1;
      if (b === "overall_impact") return -1;
      return a.localeCompare(b);
    },
  );
  const regionMaskEntries = Object.entries(analysis?.region_masks ?? analysis?.summary.region_masks ?? {});
  const viewerUrl = analysis?.viewer_available ? analysis.viewer_absolute_url : null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* LEFT */}
      <section className="glass-card flex flex-col rounded-3xl p-7">
        {!selected ? (
          <>
            <h2 className="text-xl font-semibold tracking-tight">
              Select Media for Neural Feedback
            </h2>

            <div className="mt-5 flex gap-2">
              <Button
                variant={tab === "upload" ? "secondary" : "ghost"}
                onClick={() => setTab("upload")}
                className="rounded-xl"
              >
                Upload New
              </Button>
              <Button
                variant={tab === "gallery" ? "secondary" : "ghost"}
                onClick={() => setTab("gallery")}
                className="rounded-xl"
              >
                Select from Gallery
              </Button>
            </div>

            {tab === "upload" ? (
              <div
                {...getRootProps()}
                className={cn(
                  "mt-6 flex flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center transition-colors",
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40",
                )}
              >
                <input {...getInputProps()} />
                {upload.isPending ? (
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                ) : (
                  <Upload className="h-10 w-10 text-muted-foreground" />
                )}
                <p className="mt-4 text-sm">
                  {upload.isPending
                    ? "Uploading…"
                    : "Upload media or drag & drop"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  .mp4 .mov .mp3 .wav .txt
                </p>
              </div>
            ) : (
              <div className="mt-6 grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto pr-1">
                {eligible.length === 0 && (
                  <p className="col-span-2 py-12 text-center text-sm text-muted-foreground">
                    No analyzable media in gallery. Meta TRIBE V2 supports text, audio, and video
                    only.
                  </p>
                )}
                {eligible.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m as MediaItem)}
                    className="glass-card rounded-xl p-3 text-left transition-all hover:border-primary/40"
                  >
                    <div className="mb-2 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-popover/50">
                      {m.type === "video" && m.content_url ? (
                        <video src={m.content_url} className="h-full w-full object-cover" muted />
                      ) : m.type === "audio" ? (
                        <Mic className="h-6 w-6 text-muted-foreground" />
                      ) : (
                        <TypeIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <p className="line-clamp-1 text-xs font-medium">
                      {m.title ?? "Untitled"}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {m.type}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Selected · {selected.type}
                </p>
                <h2 className="mt-1 line-clamp-1 text-lg font-semibold">
                  {selected.title ?? "Untitled"}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl"
                onClick={() => setSelected(null)}
              >
                Change
              </Button>
            </div>

            <div className="flex-1">
              {selected.type === "text" && (
                <div className="h-full overflow-y-auto rounded-2xl border border-border bg-popover/40 p-6 text-sm leading-relaxed">
                  {selected.content_text}
                </div>
              )}
              {selected.type === "video" && selected.content_url && (
                <video
                  src={selected.content_url}
                  controls
                  className="w-full rounded-2xl"
                />
              )}
              {selected.type === "audio" && selected.content_url && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-popover/40 p-6">
                    <div className="mb-4 flex items-end justify-center gap-1">
                      {Array.from({ length: 56 }).map((_, i) => (
                        <span
                          key={i}
                          className="w-1 rounded-full bg-primary/60"
                          style={{
                            height: `${10 + Math.abs(Math.sin(i * 0.4)) * 60}px`,
                          }}
                        />
                      ))}
                    </div>
                    <audio src={selected.content_url} controls className="w-full" />
                  </div>
                  <TranscriptStream
                    key={selected.id}
                    text={selected.content_text ?? ""}
                  />
                </div>
              )}
              {!selectedIsAnalyzable && (
                <div className="rounded-2xl border border-border bg-popover/40 p-6 text-sm text-muted-foreground">
                  Meta TRIBE V2 supports text, audio, and video only. Images cannot be analyzed.
                </div>
              )}
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={analyzing || !selectedIsAnalyzable}
              className="mt-6 w-full rounded-2xl py-6 text-base"
            >
              {analyzing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {analyzing ? "Analyzing neural response…" : "Analyze with Cortex AI"}
            </Button>
          </>
        )}
      </section>

      {/* RIGHT */}
      <section className="glass-card relative flex flex-col rounded-3xl p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              TRIBE v2 Neural Response
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              Interactive brain activation
            </h2>
          </div>
          {analysis?.viewer_absolute_url && (
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <a href={analysis.viewer_absolute_url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Open
              </a>
            </Button>
          )}
        </div>

        <div
          id="brain-visualization-container"
          className={cn(
            "relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-popover/30",
            viewerUrl && "min-h-[620px]",
          )}
        >
          {viewerUrl ? (
            <iframe
              title="TRIBE v2 interactive cortical activation viewer"
              src={viewerUrl}
              className="h-[620px] w-full bg-black"
              sandbox="allow-scripts allow-same-origin"
              referrerPolicy="no-referrer"
            />
          ) : analyzed ? (
            <div className="max-w-md p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
              <p className="mt-4 text-sm font-medium">Brain viewer unavailable</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {analysis?.viewer_error ??
                  "TRIBE returned scores, but the notebook did not provide an HTML viewer for this analysis."}
              </p>
            </div>
          ) : (
            <motion.img
              src={brainImg}
              alt="Brain placeholder"
              width={1024}
              height={1024}
              loading="lazy"
              className={cn(
                "h-72 w-auto select-none object-contain opacity-40 transition-all duration-700",
                analyzing && "animate-pulse",
              )}
            />
          )}
        </div>

        <AnimatePresence mode="wait">
          {!analyzed ? (
            <motion.p
              key="caption"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6 text-center text-sm text-muted-foreground"
            >
              {analyzing
                ? "Calling TRIBE v2 and generating the peak-frame brain viewer..."
                : "Select media to begin neural analysis"}
            </motion.p>
          ) : (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex flex-1 flex-col gap-4"
            >
              <div className="grid gap-3 rounded-2xl border border-border bg-popover/40 p-4 text-sm md:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Input
                  </p>
                  <p className="mt-1 font-medium">{analysis.input_type}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Shape
                  </p>
                  <p className="mt-1 font-medium">
                    {analysis.shape?.[0] ?? 0} frames x {analysis.shape?.[1] ?? 0} vertices
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Peak Activation Step
                  </p>
                  <p className="mt-1 font-medium">{analysis.peak_activation_step}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Segments
                  </p>
                  <p className="mt-1 font-medium">{analysis.segments?.length ?? 0}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Metadata
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {Object.entries(analysis.metadata ?? {})
                      .map(([key, value]) => `${labelForScore(key)}: ${String(value)}`)
                      .join(" · ") || "No metadata returned"}
                  </p>
                </div>
              </div>

              {scoreEntries.map(([key, rawScore], i) => {
                const score = Math.max(0, Math.min(100, Number(rawScore) || 0));
                return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="rounded-2xl border border-border bg-popover/40 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{labelForScore(key)}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {score.toFixed(1)}/100
                    </span>
                  </div>
                  <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-border/60">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 1, delay: 0.2 + i * 0.15, ease: "easeOut" }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {scoreInsight(key)}
                  </p>
                </motion.div>
                );
              })}

              {regionMaskEntries.length > 0 && (
                <div className="rounded-2xl border border-border bg-popover/40 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Region Masks
                  </p>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    {regionMaskEntries.map(([key, range]) => (
                      <div key={key} className="flex justify-between gap-3 rounded-xl bg-background/30 px-3 py-2">
                        <span>{labelForScore(key)}</span>
                        <span className="tabular-nums">
                          {range?.[0]}-{range?.[1]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

function TranscriptStream({ text }: { text: string }) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      if (i >= text.length) {
        setShown(text);
        clearInterval(id);
      } else {
        setShown(text.slice(0, i));
      }
    }, 25);
    return () => clearInterval(id);
  }, [text]);

  if (!text) {
    return (
      <div className="rounded-2xl border border-border bg-popover/40 p-5 text-sm text-muted-foreground">
        No transcript available.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-popover/40 p-5">
      <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        Transcript
      </p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {shown}
        {shown.length < text.length && (
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-primary align-middle" />
        )}
      </p>
    </div>
  );
}
