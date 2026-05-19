import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Video,
  Image as ImageIcon,
  Mic,
  Type as TypeIcon,
  Loader2,
  Trash2,
  Brain,
  Check,
  Download,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import elevenLabsLogo from "@/assets/elevenlabs-logo.png";
import {
  generateAudio,
  generateImage,
  generateText,
  generateVideo,
  listMedia,
  deleteMedia,
  saveTextVariant,
} from "@/lib/cortex.functions";

type Format = "text" | "image" | "video" | "audio";

const FORMATS: { id: Format; label: string; icon: typeof Video }[] = [
  { id: "text", label: "Text Copy", icon: TypeIcon },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "video", label: "Video", icon: Video },
  { id: "audio", label: "Audio", icon: Mic },
];

const PLACEHOLDERS: Record<Format, string> = {
  text: "Write persuasive ad copy for your next campaign...",
  image: "Describe the image ad you want to create...",
  video: "Describe the video ad you want to generate...",
  audio: "Generate voiceover or speech powered by ElevenLabs...",
};

const VOICES: { id: string; label: string }[] = [
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah" },
  { id: "IKne3meq5aSn9XLyUdCD", label: "Charlie" },
  { id: "nPczCjzI2devNBz1zQrb", label: "Brian" },
  { id: "pFZP5JQG7iQjIQuC4Bku", label: "Lily" },
  { id: "XrExE9yKIg1WjnnlVkGX", label: "Matilda" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam" },
  { id: "cgSgspJ2msm6clMCkdW9", label: "Jessica" },
];

export function Dashboard() {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<Format>("text");
  const [voice, setVoice] = useState<string>(VOICES[0].id);
  const [hideVideoNotice, setHideVideoNotice] = useState(false);
  const [variants, setVariants] = useState<{ prompt: string; items: string[] } | null>(null);

  const fnText = useServerFn(generateText);
  const fnImage = useServerFn(generateImage);
  const fnVideo = useServerFn(generateVideo);
  const fnAudio = useServerFn(generateAudio);
  const fnList = useServerFn(listMedia);
  const fnDelete = useServerFn(deleteMedia);
  const fnSaveVariant = useServerFn(saveTextVariant);

  const galleryQ = useQuery({
    queryKey: ["media"],
    queryFn: () => fnList(),
  });

  const gen = useMutation({
    mutationFn: async () => {
      const data = { data: { prompt } };
      if (format === "text") return { kind: "text" as const, res: await fnText(data) };
      if (format === "image") return { kind: "image" as const, res: await fnImage(data) };
      if (format === "video") return { kind: "video" as const, res: await fnVideo(data) };
      return { kind: "audio" as const, res: await fnAudio({ data: { prompt, voiceId: voice } }) };
    },
    onSuccess: (out) => {
      if (out.kind === "text") {
        const r = out.res as { variants: string[]; prompt: string };
        setVariants({ prompt: r.prompt, items: r.variants });
        toast.success("3 ad copy variants ready — pick your favorite");
      } else {
        toast.success(`${format} generated`);
        qc.invalidateQueries({ queryKey: ["media"] });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pickVariant = useMutation({
    mutationFn: ({ prompt, text }: { prompt: string; text: string }) =>
      fnSaveVariant({ data: { prompt, text } }),
    onSuccess: () => {
      toast.success("Saved to gallery");
      setVariants(null);
      qc.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeFmt = FORMATS.find((f) => f.id === format)!;

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-semibold tracking-tight md:text-6xl"
        >
          Welcome, eurhacknl
        </motion.h1>
        <p className="text-4xl font-semibold tracking-tight text-muted-foreground md:text-5xl">
          Ready to generate new ads?
        </p>
      </header>

      {/* Prompt bar */}
      <section className="space-y-6">
        <div className="prompt-bar flex items-center gap-3 rounded-3xl p-2 pl-6">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={PLACEHOLDERS[format]}
            className="flex-1 bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground/70"
            onKeyDown={(e) => {
              if (e.key === "Enter" && prompt.trim() && !gen.isPending) gen.mutate();
            }}
          />

          {format === "audio" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl border-border/70 bg-card/60 px-4 text-sm font-medium text-foreground hover:bg-card"
                >
                  <Mic className="mr-2 h-4 w-4 text-primary" />
                  {VOICES.find((v) => v.id === voice)?.label ?? "Voice"}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-2xl p-1.5">
                <div className="px-2 pb-1.5 pt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Voice
                </div>
                {VOICES.map((v) => (
                  <DropdownMenuItem
                    key={v.id}
                    onClick={() => setVoice(v.id)}
                    className={cn(
                      "rounded-xl py-2",
                      voice === v.id && "bg-primary/15 text-foreground",
                    )}
                  >
                    {v.label}
                    {voice === v.id && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="relative">
            <AnimatePresence>
              {format === "video" && !hideVideoNotice && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  className="absolute bottom-[calc(100%+14px)] right-0 z-30 w-80 rounded-2xl border border-black/10 bg-white p-4 pr-10 text-[12px] leading-relaxed text-neutral-800 shadow-[0_18px_55px_rgba(0,0,0,0.28)]"
                >
                  <span className="absolute -bottom-2 right-10 h-4 w-4 rotate-45 border-b border-r border-black/10 bg-white" />
                  <button
                    type="button"
                    onClick={() => setHideVideoNotice(true)}
                    aria-label="Dismiss video generation notice"
                    className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <p className="font-medium text-neutral-950">Video generation note</p>
                  <p className="mt-1">
                    For demo purposes, a low quality AI video generation model is used. For actual
                    production, higgsfield.ai is optimal for advertisement use case.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl border-primary/40 bg-primary/15 px-4 text-sm font-medium text-foreground shadow-sm hover:border-primary/60 hover:bg-primary/25"
                >
                  <activeFmt.icon className="mr-2 h-4 w-4 text-primary" />
                  {activeFmt.label}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5">
                <div className="px-2 pb-1.5 pt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Output format
                </div>
                {FORMATS.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={cn(
                      "rounded-xl py-2",
                      format === f.id && "bg-primary/15 text-foreground",
                    )}
                  >
                    <f.icon className="mr-2 h-4 w-4" /> {f.label}
                    {f.id === "audio" && (
                      <img
                        src={elevenLabsLogo}
                        alt="ElevenLabs"
                        width={16}
                        height={16}
                        loading="lazy"
                        className="ml-1.5 h-4 w-4 rounded-[4px] border border-white/15 object-cover"
                      />
                    )}
                    {format === f.id && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button
            onClick={() => gen.mutate()}
            disabled={!prompt.trim() || gen.isPending}
            variant="outline"
            className="h-11 rounded-2xl border-border/70 bg-card/80 px-6 text-foreground hover:bg-card"
          >
            {gen.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate
          </Button>
        </div>

        <AnimatePresence>
          {variants && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid gap-4 md:grid-cols-3"
            >
              {variants.items.map((v, i) => (
                <div
                  key={i}
                  className="glass-card group flex flex-col rounded-2xl p-5 transition-all hover:border-primary/40"
                >
                  <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                    <Check className="h-3 w-3 text-primary" /> Variant {i + 1}
                  </div>
                  <p className="flex-1 text-sm leading-relaxed">{v}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-4 rounded-xl"
                    disabled={pickVariant.isPending}
                    onClick={() => pickVariant.mutate({ prompt: variants.prompt, text: v })}
                  >
                    {pickVariant.isPending ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-3.5 w-3.5" />
                    )}
                    Keep this one
                  </Button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Gallery */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Gallery</h2>
          <span className="text-sm text-muted-foreground">
            {galleryQ.data?.items.length ?? 0} items
          </span>
        </div>

        {galleryQ.isLoading ? (
          <div className="-mx-1 overflow-x-auto overflow-y-hidden px-1 pb-3">
            <div className="grid h-[560px] auto-cols-[280px] grid-flow-col grid-rows-2 gap-5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "glass-card w-full animate-pulse rounded-2xl",
                    i % 2 === 0 ? "row-span-2" : "row-span-1",
                  )}
                />
              ))}
            </div>
          </div>
        ) : galleryQ.data?.items.length === 0 ? (
          <div className="glass-card rounded-2xl p-16 text-center text-muted-foreground">
            No media yet. Generate your first ad above.
          </div>
        ) : (
          <div className="-mx-1 overflow-x-auto overflow-y-hidden px-1 pb-3">
            <div className="grid h-[560px] auto-cols-[280px] grid-flow-col grid-rows-2 gap-5">
              {galleryQ.data?.items.map((item) => {
                const isTall = item.type === "image" || item.type === "video";
                return (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onDelete={() => del.mutate(item.id)}
                    className={isTall ? "row-span-2" : "row-span-1"}
                  />
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

type MediaItem = {
  id: string;
  type: string;
  title: string | null;
  content_url: string | null;
  content_text: string | null;
  created_at: string;
};

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "cortex"
  );
}

function extFromUrl(url: string, fallback: string) {
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\.([a-z0-9]{2,5})(?:$|\?)/i);
    return m ? m[1].toLowerCase() : fallback;
  } catch {
    return fallback;
  }
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadItem(item: MediaItem) {
  const base = slugify(item.title ?? item.type) + "-" + item.id.slice(0, 6);
  try {
    if (item.type === "text") {
      const blob = new Blob([item.content_text ?? ""], { type: "text/plain" });
      triggerBlobDownload(blob, `${base}.txt`);
    } else if (item.content_url) {
      const fallback = item.type === "image" ? "png" : item.type === "video" ? "mp4" : "mp3";
      const ext = extFromUrl(item.content_url, fallback);
      const res = await fetch(item.content_url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      triggerBlobDownload(blob, `${base}.${ext}`);
    } else {
      throw new Error("Nothing to download");
    }
    toast.success("Downloaded");
  } catch (e) {
    console.error(e);
    toast.error("Download failed");
  }
}

function MediaCard({
  item,
  onDelete,
  className,
}: {
  item: MediaItem;
  onDelete: () => void;
  className?: string;
}) {
  const typeIcon = {
    text: TypeIcon,
    image: ImageIcon,
    video: Video,
    audio: Mic,
  }[item.type as Format];

  const Icon = typeIcon ?? TypeIcon;

  const [open, setOpen] = useState(false);
  const canFullscreen =
    (item.type === "image" || item.type === "video" || item.type === "audio") && !!item.content_url;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "glass-card group flex h-full w-full flex-col overflow-hidden rounded-2xl",
          className,
        )}
      >
        <button
          type="button"
          disabled={!canFullscreen}
          onClick={() => canFullscreen && setOpen(true)}
          className={cn(
            "relative block min-h-0 w-full flex-1 overflow-hidden bg-popover/50 text-left",
            canFullscreen && "cursor-zoom-in",
          )}
        >
          {item.type === "image" && item.content_url && (
            <img
              src={item.content_url}
              alt={item.title ?? ""}
              loading="lazy"
              className="block h-full w-full object-cover"
            />
          )}
          {item.type === "video" && item.content_url && (
            <video
              src={item.content_url}
              className="block h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          )}
          {item.type === "audio" && (
            <div className="flex h-full items-center justify-center gap-1 px-5">
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-primary/60"
                  style={{
                    height: `${20 + Math.abs(Math.sin(i * 0.7)) * 60}%`,
                  }}
                />
              ))}
            </div>
          )}
          {item.type === "text" && (
            <div className="line-clamp-4 p-5 pt-10 text-sm leading-relaxed text-muted-foreground">
              {item.content_text}
            </div>
          )}

          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground backdrop-blur">
            <Icon className="h-3 w-3" />
            {item.type}
          </div>
        </button>

        <div className="space-y-3 p-4">
          <div className="space-y-1">
            <p className="line-clamp-1 text-sm font-medium">{item.title ?? "Untitled"}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(item.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {item.type === "image" ? (
              <Button
                size="sm"
                variant="secondary"
                disabled
                title="Meta TRIBE V2 does not accept image input"
                className="flex-1 rounded-xl"
              >
                <Brain className="mr-1.5 h-3.5 w-3.5" /> Neural Feedback
              </Button>
            ) : (
              <Button asChild size="sm" variant="secondary" className="flex-1 rounded-xl">
                <Link to="/neural-feedback" search={{ mediaId: item.id }}>
                  <Brain className="mr-1.5 h-3.5 w-3.5" /> Neural Feedback
                </Link>
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className={cn("rounded-xl text-muted-foreground hover:text-foreground")}
              onClick={() => downloadItem(item)}
              aria-label="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={cn("rounded-xl text-muted-foreground hover:text-destructive")}
              onClick={onDelete}
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {canFullscreen && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-[95vw] border-0 bg-background/95 p-2 sm:max-w-5xl">
            <DialogTitle className="sr-only">{item.title ?? "Media preview"}</DialogTitle>
            {item.type === "image" && item.content_url && (
              <img
                src={item.content_url}
                alt={item.title ?? ""}
                className="mx-auto max-h-[85vh] w-auto rounded-xl object-contain"
              />
            )}
            {item.type === "video" && item.content_url && (
              <video
                src={item.content_url}
                controls
                autoPlay
                className="mx-auto max-h-[85vh] w-auto rounded-xl"
              />
            )}
            {item.type === "audio" && item.content_url && (
              <div className="space-y-5 p-6">
                <div className="flex h-32 items-end justify-center gap-1">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-1 rounded-full bg-primary/60"
                      style={{
                        height: `${15 + Math.abs(Math.sin(i * 0.45)) * 75}%`,
                      }}
                    />
                  ))}
                </div>
                <audio src={item.content_url} controls autoPlay className="w-full" />
                {item.content_text && (
                  <p className="max-h-48 overflow-y-auto rounded-xl border border-border bg-popover/40 p-4 text-sm leading-relaxed text-muted-foreground">
                    {item.content_text}
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
