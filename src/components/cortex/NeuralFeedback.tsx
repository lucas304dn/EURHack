import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  Sparkles,
  Loader2,
  
  Mic,
  Type as TypeIcon,
  Image as ImageIcon,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listMedia, uploadMedia } from "@/lib/cortex.functions";
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

const RUBRICS = [
  {
    key: "attention",
    label: "Attention",
    score: 74,
    insight:
      "High parietal activation suggests this ad is likely to capture and hold viewer attention effectively.",
  },
  {
    key: "focus",
    label: "Focus",
    score: 61,
    insight:
      "Prefrontal engagement indicates strong cognitive processing and sustained focus on the message.",
  },
  {
    key: "virality",
    label: "Virality",
    score: 83,
    insight:
      "Elevated reward network activity suggests strong social sharing potential and emotional resonance.",
  },
] as const;

export function NeuralFeedback({ initialMediaId }: { initialMediaId?: string }) {
  const qc = useQueryClient();
  const fnList = useServerFn(listMedia);
  const fnUpload = useServerFn(uploadMedia);

  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [tab, setTab] = useState<"upload" | "gallery">("upload");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const mediaQ = useQuery({
    queryKey: ["media"],
    queryFn: () => fnList(),
  });

  const eligible = useMemo(
    () => mediaQ.data?.items ?? [],
    [mediaQ.data],
  );

  useEffect(() => {
    if (initialMediaId && !selected && mediaQ.data) {
      const found = mediaQ.data.items.find((m) => m.id === initialMediaId);
      if (found) setSelected(found as MediaItem);
    }
  }, [initialMediaId, mediaQ.data, selected]);

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
    setAnalyzing(true);
    setAnalyzed(false);
    setTimeout(() => {
      setAnalyzing(false);
      setAnalyzed(true);
    }, 3000);
  };

  // Reset analysis when changing selection
  useEffect(() => {
    setAnalyzed(false);
    setAnalyzing(false);
  }, [selected?.id]);

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
                    No analyzable media in gallery.
                  </p>
                )}
                {eligible.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m as MediaItem)}
                    className="glass-card rounded-xl p-3 text-left transition-all hover:border-primary/40"
                  >
                    <div className="mb-2 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-popover/50">
                      {m.type === "image" && m.content_url ? (
                        <img
                          src={m.content_url}
                          alt={m.title ?? ""}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : m.type === "video" && m.content_url ? (
                        <video src={m.content_url} className="h-full w-full object-cover" muted />
                      ) : m.type === "audio" ? (
                        <Mic className="h-6 w-6 text-muted-foreground" />
                      ) : m.type === "image" ? (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
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
              {selected.type === "image" && selected.content_url && (
                <img
                  src={selected.content_url}
                  alt={selected.title ?? ""}
                  className="w-full rounded-2xl object-contain"
                />
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
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={analyzing}
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
        {/* Reserved integration container — do not populate */}
        <div
          id="brain-visualization-container"
          style={{ border: "1px dashed #333" }}
          className="pointer-events-none absolute inset-7 rounded-2xl opacity-0"
          aria-hidden
        />

        <motion.div
          layout
          className={cn(
            "relative mx-auto flex items-center justify-center transition-all",
            analyzed ? "h-44" : "h-72 flex-1",
          )}
        >
          <motion.img
            layout
            src={brainImg}
            alt="Brain"
            width={1024}
            height={1024}
            loading="lazy"
            className={cn(
              "h-full w-auto select-none object-contain transition-all duration-700",
              analyzed ? "opacity-80" : "opacity-40",
              analyzing && "animate-pulse",
            )}
          />
          {analyzed && (
            <>
              <span className="absolute left-[35%] top-[40%] h-3 w-3 animate-ping rounded-full bg-primary" />
              <span className="absolute left-[55%] top-[30%] h-2 w-2 animate-ping rounded-full bg-primary/70 [animation-delay:.3s]" />
              <span className="absolute left-[48%] top-[55%] h-2.5 w-2.5 animate-ping rounded-full bg-primary/80 [animation-delay:.6s]" />
            </>
          )}
        </motion.div>

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
                ? "Scanning neural pathways…"
                : "Select media to begin neural analysis"}
            </motion.p>
          ) : (
            <motion.div
              key="rubrics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex flex-1 flex-col gap-4"
            >
              {RUBRICS.map((r, i) => (
                <motion.div
                  key={r.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="rounded-2xl border border-border bg-popover/40 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{r.label}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {r.score}/100
                    </span>
                  </div>
                  <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-border/60">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${r.score}%` }}
                      transition={{ duration: 1, delay: 0.2 + i * 0.15, ease: "easeOut" }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {r.insight}
                  </p>
                </motion.div>
              ))}

              <Button
                variant="outline"
                className="mt-2 rounded-2xl border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
              >
                <Send className="mr-2 h-4 w-4" />
                Publish to Meta Ads
              </Button>
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
