import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  ExternalLink,
  Upload,
  Sparkles,
  Loader2,
  Mic,
  Info,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  analyzeMedia,
  listMedia,
  uploadMedia,
  type TribeActivationResult,
} from "@/lib/cortex.functions";
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

function narrativeInsightForScore(analysis: TribeActivationResult | null, key: string) {
  const insight = analysis?.score_insights?.[key]?.trim();
  if (insight) return insight;
  if (analysis?.insight_error) {
    return "Natural-language interpretation is unavailable for this run, but the score still reflects the saved TRIBE output.";
  }
  return "Natural-language interpretation will appear here after the LLM reviews the saved TRIBE result.";
}

function textPreview(item: MediaItem) {
  return item.content_text?.trim() || item.title?.trim() || "Text preview unavailable.";
}

function waveformHeight(index: number, seed: string) {
  const seedValue = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const wave = Math.abs(Math.sin((index + seedValue) * 0.46) * Math.cos((index + 3) * 0.28));
  return 18 + wave * 70;
}

function AudioWaveform({ seed, compact = false }: { seed: string; compact?: boolean }) {
  const bars = compact ? 34 : 56;
  return (
    <div className="flex h-full w-full items-center justify-center gap-1">
      {Array.from({ length: bars }).map((_, i) => {
        const height = waveformHeight(i, seed);
        return (
          <span
            key={i}
            className={cn(
              "rounded-full bg-primary/60 shadow-[0_0_14px_rgba(255,255,255,0.04)]",
              compact ? "w-0.5" : "w-1",
            )}
            style={{
              height: compact ? `${height}%` : `${10 + height * 0.8}px`,
              opacity: 0.45 + (height / 100) * 0.45,
            }}
          />
        );
      })}
    </div>
  );
}

function LiveAudioPreview({ src, seed }: { src: string; seed: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const fallbackTimeRef = useRef(0);
  const bars = 56;
  const idleLevels = useMemo(
    () => Array.from({ length: bars }, (_, i) => 10 + waveformHeight(i, seed) * 0.8),
    [seed],
  );
  const [levels, setLevels] = useState(idleLevels);

  useEffect(() => {
    setLevels(idleLevels);
  }, [idleLevels]);

  useEffect(() => {
    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
      }
      audioContextRef.current?.close().catch(() => undefined);
      frameRef.current = null;
      audioContextRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
      frequencyDataRef.current = null;
    };
  }, []);

  const stopVisualizer = (reset = false) => {
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (reset) setLevels(idleLevels);
  };

  const fallbackLevels = () => {
    fallbackTimeRef.current += 0.18;
    return idleLevels.map((level, i) => {
      const pulse =
        Math.abs(Math.sin(fallbackTimeRef.current + i * 0.38)) *
        Math.abs(Math.cos(fallbackTimeRef.current * 0.62 + i * 0.17));
      return Math.max(10, Math.min(90, level * 0.45 + pulse * 72));
    });
  };

  const startVisualizer = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const context = audioContextRef.current ?? new AudioContextCtor();
      audioContextRef.current = context;

      if (!sourceRef.current) {
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.82;
        const source = context.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(context.destination);
        analyserRef.current = analyser;
        sourceRef.current = source;
        frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      }

      if (context.state === "suspended") {
        await context.resume();
      }
    } catch (error) {
      console.warn("Audio analyser unavailable; using animated fallback waveform.", error);
    }

    const tick = () => {
      const analyser = analyserRef.current;
      const frequencyData = frequencyDataRef.current;

      if (analyser && frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
        const next = Array.from({ length: bars }, (_, i) => {
          const start = Math.floor((i / bars) * frequencyData.length);
          const end = Math.max(start + 1, Math.floor(((i + 1) / bars) * frequencyData.length));
          let total = 0;
          for (let j = start; j < end; j++) total += frequencyData[j] ?? 0;
          const average = total / (end - start);
          return 10 + (average / 255) * 86;
        });
        const hasSignal = next.some((height) => height > 12);
        setLevels(hasSignal ? next : fallbackLevels());
      } else {
        setLevels(fallbackLevels());
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    if (frameRef.current == null) {
      frameRef.current = requestAnimationFrame(tick);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-popover/40 p-6">
      <div className="mb-4 flex h-32 items-end justify-center gap-1">
        {levels.map((height, i) => (
          <span
            key={i}
            className="w-1 rounded-full bg-primary/70 shadow-[0_0_14px_rgba(255,255,255,0.05)] transition-[height,opacity] duration-75"
            style={{
              height: `${height}px`,
              opacity: 0.4 + Math.min(height / 100, 1) * 0.55,
            }}
          />
        ))}
      </div>
      <audio
        ref={audioRef}
        src={src}
        controls
        crossOrigin="anonymous"
        className="w-full"
        onPlay={() => void startVisualizer()}
        onPause={() => stopVisualizer()}
        onEnded={() => stopVisualizer(true)}
      />
    </div>
  );
}

function GalleryMediaPreview({ item }: { item: MediaItem }) {
  if (item.type === "video" && item.content_url) {
    return <video src={item.content_url} className="h-full w-full object-cover" muted />;
  }

  if (item.type === "audio") {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-lg bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.10),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] px-4 py-5">
        <AudioWaveform seed={item.id} compact />
        <Mic className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-lg bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.12),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4">
      <p className="line-clamp-5 text-xs leading-relaxed text-foreground/80">{textPreview(item)}</p>
      <span className="mt-3 w-fit rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Text
      </span>
    </div>
  );
}

const BRAIN_VOLUME_SLICES = Array.from({ length: 19 }, (_, i) => i - 9);
const ANALYSIS_PROGRESS_STEPS = [
  "Converting text via TTS...",
  "Analyzing potential audio response...",
  "Analyzing potential video response...",
  "Extracting multimodal event timing...",
  "Projecting activation onto cortex...",
];

function BrainPlaceholder3D({ analyzing }: { analyzing: boolean }) {
  return (
    <div
      role="img"
      aria-label="Rotating 3D brain placeholder"
      className="relative h-72 w-80 [perspective:920px]"
    >
      <motion.div
        className="absolute inset-0 [transform-style:preserve-3d]"
        initial={{ rotateX: -8, rotateY: -28 }}
        animate={{
          rotateX: [-8, 7, -8],
          rotateY: 332,
        }}
        transition={{
          rotateX: {
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          },
          rotateY: {
            duration: 22,
            repeat: Infinity,
            ease: "linear",
          },
        }}
      >
        <div
          className="absolute inset-x-12 bottom-4 h-12 rounded-full bg-black/35 blur-xl"
          style={{ transform: "translateZ(-54px) rotateX(82deg)" }}
        />

        {BRAIN_VOLUME_SLICES.map((slice) => {
          const depth = slice * 4.2;
          const distanceFromCenter = Math.abs(slice) / 9;
          const scale = 1 - distanceFromCenter * 0.08;
          const opacity = 0.055 + (1 - distanceFromCenter) * 0.06;

          return (
            <img
              key={slice}
              src={brainImg}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="brain-volume-slice absolute inset-0 h-full w-full select-none object-contain"
              style={{
                opacity,
                transform: `translateZ(${depth}px) scale(${scale})`,
              }}
            />
          );
        })}

        <img
          src={brainImg}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="brain-volume-slice absolute inset-0 h-full w-full select-none object-contain"
          style={{
            opacity: analyzing ? 0.5 : 0.42,
            transform: "translateZ(46px) scale(0.98)",
          }}
        />
      </motion.div>

      <motion.div
        aria-hidden="true"
        className="absolute inset-4 rounded-full border border-white/10"
        initial={{ rotateX: 72, rotate: 0 }}
        animate={{ rotateX: 72, rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute inset-8 rounded-full border border-primary/20"
        initial={{ rotateY: 68, rotate: 0 }}
        animate={{ rotateY: 68, rotate: -360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function AnalysisProgressTicker() {
  const [stepIndex, setStepIndex] = useState(0);
  const [visibleText, setVisibleText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fullText = ANALYSIS_PROGRESS_STEPS[stepIndex];
    const atFullText = visibleText === fullText;
    const atEmptyText = visibleText.length === 0;
    const delay = atFullText && !deleting ? 1100 : deleting ? 28 : 45;

    const id = window.setTimeout(() => {
      if (!deleting && atFullText) {
        setDeleting(true);
        return;
      }

      if (deleting && atEmptyText) {
        setDeleting(false);
        setStepIndex((current) => (current + 1) % ANALYSIS_PROGRESS_STEPS.length);
        return;
      }

      setVisibleText(fullText.slice(0, visibleText.length + (deleting ? -1 : 1)));
    }, delay);

    return () => window.clearTimeout(id);
  }, [deleting, stepIndex, visibleText]);

  return (
    <p className="mx-auto flex min-h-5 w-fit items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.055] px-3 py-1 text-[11px] font-medium text-foreground/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
      <span>{visibleText}</span>
      <span className="h-3.5 w-px animate-pulse bg-primary/70" aria-hidden="true" />
    </p>
  );
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
        throw new Error(
          "Only video (.mp4 .mov), audio (.mp3 .wav), and text (.txt) files are supported.",
        );
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
  const regionMaskEntries = Object.entries(
    analysis?.region_masks ?? analysis?.summary.region_masks ?? {},
  );
  const viewerUrl = analysis?.viewer_available ? analysis.viewer_absolute_url : null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2 pb-1"
        >
          <p className="text-xs uppercase tracking-[0.28em] text-primary">Neural Feedback</p>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-5xl">
            Predict brain activation from your content
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Upload or select text, audio, or video to estimate cortical response patterns with TRIBE
            V2.
          </p>
        </motion.header>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT */}
          <section className="glass-card neural-input-panel flex flex-col rounded-3xl p-7">
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

                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-xs leading-relaxed text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                    <Video className="h-3.5 w-3.5" />
                  </span>
                  <p>
                    Video analysis is most optimal for clips up to 10 seconds due to compute
                    requirements.
                  </p>
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
                      {upload.isPending ? "Uploading…" : "Upload media or drag & drop"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">.mp4 .mov .mp3 .wav .txt</p>
                  </div>
                ) : (
                  <div className="mt-6 grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto pr-1">
                    {eligible.length === 0 && (
                      <p className="col-span-2 py-12 text-center text-sm text-muted-foreground">
                        No analyzable media in gallery. Meta TRIBE V2 supports text, audio, and
                        video only.
                      </p>
                    )}
                    {eligible.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelected(m as MediaItem)}
                        className="glass-card rounded-xl p-3 text-left transition-all hover:border-primary/40"
                      >
                        <div className="mb-2 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-popover/50">
                          <GalleryMediaPreview item={m as MediaItem} />
                        </div>
                        <p className="line-clamp-1 text-xs font-medium">{m.title ?? "Untitled"}</p>
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

                <div>
                  {selected.type === "text" && (
                    <div className="max-h-[260px] overflow-y-auto rounded-2xl border border-border bg-popover/40 p-6 text-sm leading-relaxed">
                      {selected.content_text}
                    </div>
                  )}
                  {selected.type === "video" && selected.content_url && (
                    <video src={selected.content_url} controls className="w-full rounded-2xl" />
                  )}
                  {selected.type === "audio" && selected.content_url && (
                    <div className="space-y-4">
                      <LiveAudioPreview src={selected.content_url} seed={selected.id} />
                      <TranscriptStream key={selected.id} text={selected.content_text ?? ""} />
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
                  className="mt-4 w-full rounded-2xl py-6 text-base"
                >
                  {analyzing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {analyzing ? "Analyzing neural response…" : "Analyze with Cortex AI"}
                </Button>

                {analyzed && (analysis.insight_summary || analysis.insight_error) && (
                  <div className="mt-4 max-h-56 overflow-y-auto rounded-2xl border border-primary/15 bg-primary/[0.055] p-4">
                    <p className="text-[10px] uppercase tracking-widest text-primary/80">
                      LLM Interpretation
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                      {analysis.insight_summary ??
                        "Natural-language interpretation could not be generated for this run. The TRIBE scores and viewer are still available."}
                    </p>
                  </div>
                )}

                {analyzed && (
                  <motion.div
                    key="analysis"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 max-h-[620px] space-y-4 overflow-y-auto pr-1"
                  >
                    {scoreEntries.map(([key, rawScore], i) => {
                      const score = Math.max(0, Math.min(100, Number(rawScore) || 0));
                      const label = labelForScore(key);
                      return (
                        <motion.div
                          key={key}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.15 }}
                          className="rounded-2xl border border-border bg-popover/40 p-4"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{label}</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                                    aria-label={`What ${label} means`}
                                  >
                                    <Info className="h-2.5 w-2.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-64 rounded-xl border border-white/10 bg-popover px-3 py-2 text-xs leading-relaxed text-foreground shadow-2xl"
                                >
                                  {scoreInsight(key)}
                                </TooltipContent>
                              </Tooltip>
                            </div>
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
                          <p className="rounded-xl border border-white/10 bg-background/25 p-3 text-xs leading-relaxed text-foreground/80">
                            {narrativeInsightForScore(analysis, key)}
                          </p>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
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
              {analysis?.brain_visualization_html ? (
                <iframe
                  title="TRIBE v2 interactive cortical activation viewer"
                  srcDoc={analysis.brain_visualization_html}
                  className="h-[620px] w-full bg-black"
                  sandbox="allow-scripts allow-same-origin"
                  referrerPolicy="no-referrer"
                />
              ) : viewerUrl ? (
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
                <BrainPlaceholder3D analyzing={analyzing} />
              )}
            </div>

            {analyzed && (
              <motion.div
                key="analysis-summary"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 grid gap-3 rounded-2xl border border-border bg-popover/40 p-4 text-sm md:grid-cols-2"
              >
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
              </motion.div>
            )}

            {analyzed && regionMaskEntries.length > 0 && (
              <div className="mt-4 rounded-2xl border border-border bg-popover/40 p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Region Masks
                </p>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  {regionMaskEntries.map(([key, range]) => (
                    <div
                      key={key}
                      className="flex justify-between gap-3 rounded-xl bg-background/30 px-3 py-2"
                    >
                      <span>{labelForScore(key)}</span>
                      <span className="tabular-nums">
                        {range?.[0]}-{range?.[1]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {!analyzed && (
                <motion.div
                  key="caption"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-6 space-y-3 text-center"
                >
                  <p className="text-sm text-muted-foreground">
                    {analyzing
                      ? "Calling TRIBE v2 and generating the peak-frame brain viewer..."
                      : "Select media to begin neural analysis"}
                  </p>
                  {analyzing && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <p className="mx-auto w-fit rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-1.5 text-[11px] font-medium text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                        Please be patient, TRIBE V2 may take 5-10 minutes.
                      </p>
                      <AnalysisProgressTicker />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <p className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_34px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            Powered by <span className="text-foreground/80">Meta TRIBE V2</span>.
          </p>
        </motion.div>
      </div>
    </TooltipProvider>
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
      <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Transcript</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {shown}
        {shown.length < text.length && (
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-primary align-middle" />
        )}
      </p>
    </div>
  );
}
