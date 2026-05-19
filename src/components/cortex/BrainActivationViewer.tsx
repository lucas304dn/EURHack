import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, Pause, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TribeActivationResult } from "@/lib/cortex.functions";
import { cn } from "@/lib/utils";

type MediaItem = {
  id: string;
  type: string;
  title: string | null;
  content_url: string | null;
  content_text: string | null;
  created_at: string;
};

type BrainAssets = {
  glb: ArrayBuffer;
  sulcBgMap: number[];
  yeo7Labels: number[];
};

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  network: string;
  activation: number;
};

const TRIBE_ASSET_BASE = "https://sibling-luminous-gothic.ngrok-free.dev/assets";
const VERTEX_COUNT = 20484;
const SEGMENT_DURATION = 0.4;
const BG_DARKNESS = 0.3;

const YEO_NAMES: Record<number, string> = {
  1: "Visual Cortex",
  2: "Somatomotor",
  3: "Dorsal Attention",
  4: "Ventral Attention",
  5: "Limbic",
  6: "Frontoparietal",
  7: "Default Mode",
};

const YEO_COLORS: Record<number, string> = {
  1: "#38bdf8",
  2: "#34d399",
  3: "#facc15",
  4: "#f97316",
  5: "#fb7185",
  6: "#a78bfa",
  7: "#60a5fa",
};

const NETWORK_KEYS: Record<number, string> = {
  1: "visual_cortex",
  2: "somatomotor",
  3: "attention",
  4: "emotional_response",
  5: "memory_encoding",
  6: "frontoparietal",
  7: "default_mode",
};

let cachedAssets: BrainAssets | null = null;
let assetPromise: Promise<BrainAssets> | null = null;
const decodedPredsCache = new WeakMap<object, { predsFlat: Float32Array; nTimesteps: number }>();

export function BrainActivationWorkspace({
  selected,
  analysis,
  analyzing,
  selectedIsAnalyzable,
  onAnalyze,
  onChange,
}: {
  selected: MediaItem;
  analysis: TribeActivationResult | null;
  analyzing: boolean;
  selectedIsAnalyzable: boolean;
  onAnalyze: () => void;
  onChange: () => void;
}) {
  const timeline = useTimelineData(analysis);
  const nTimesteps = getTimelineLength(analysis);
  const duration = nTimesteps * SEGMENT_DURATION;
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setCurrentTimeSec(0);
    setIsPlaying(!!analysis?.preds_b64);
  }, [analysis?.preds_b64, selected.id]);

  const currentFrame = Math.max(
    0,
    Math.min(nTimesteps - 1, Math.floor(currentTimeSec / SEGMENT_DURATION)),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,40%)_minmax(0,60%)]">
        <section className="glass-card flex min-h-[680px] flex-col rounded-3xl p-6">
          <SelectedMediaPanel
            selected={selected}
            analyzing={analyzing}
            selectedIsAnalyzable={selectedIsAnalyzable}
            onAnalyze={onAnalyze}
            onChange={onChange}
          />
          <ActivationGraph
            timeline={timeline}
            currentTimeSec={currentTimeSec}
            onSeek={setCurrentTimeSec}
          />
        </section>

        <BrainVisualizationCard
          analysis={analysis}
          analyzing={analyzing}
          currentTimeSec={currentTimeSec}
          isPlaying={isPlaying}
          setCurrentTimeSec={setCurrentTimeSec}
        />
      </div>

      <TimelineScrubber
        currentTimeSec={currentTimeSec}
        duration={duration}
        frame={currentFrame}
        frameCount={nTimesteps}
        isPlaying={isPlaying}
        hasTimeline={!!analysis?.preds_b64}
        onPlayPause={() => setIsPlaying((value) => !value)}
        onSeekFrame={(frame) => setCurrentTimeSec(frame * SEGMENT_DURATION)}
      />
    </div>
  );
}

export function BrainVisualizationCard({
  analysis,
  analyzing,
  currentTimeSec = 0,
  isPlaying = false,
  setCurrentTimeSec,
}: {
  analysis: TribeActivationResult | null;
  analyzing: boolean;
  currentTimeSec?: number;
  isPlaying?: boolean;
  setCurrentTimeSec?: (time: number) => void;
}) {
  const [assetState, setAssetState] = useState<"loading" | "ready" | "error">(
    cachedAssets ? "ready" : "loading",
  );
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    network: "",
    activation: 0,
  });
  const timeline = useTimelineData(analysis);
  const nTimesteps = getTimelineLength(analysis);
  const currentFrame = Math.max(
    0,
    Math.min(nTimesteps - 1, Math.floor(currentTimeSec / SEGMENT_DURATION)),
  );
  const hasPreds = hasTimelinePredictions(analysis);
  const isFallback = !!analysis && !hasPreds;
  const scores = useNetworkScores(analysis, currentFrame);

  useEffect(() => {
    let cancelled = false;
    loadBrainAssets()
      .then(() => {
        if (!cancelled) setAssetState("ready");
      })
      .catch((error) => {
        console.error("[Brain] Failed to load assets", error);
        if (!cancelled) setAssetState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const highestNetworkId = scores.reduce(
    (best, item) => (item.score > scores[best].score ? item.networkId - 1 : best),
    0,
  );

  return (
    <section className="glass-card relative flex min-h-[680px] flex-col rounded-3xl p-6">
      {isFallback && (
        <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs text-primary">
          Live brain timeline unavailable — showing averaged activation scores
        </div>
      )}

      <div className="relative min-h-[520px] flex-1 overflow-hidden rounded-2xl border border-border bg-popover/20">
        {isFallback && analysis?.brain_visualization_html ? (
          <iframe
            title="TRIBE fallback brain visualization"
            srcDoc={analysis.brain_visualization_html}
            className="h-[520px] w-full bg-transparent"
            sandbox="allow-scripts allow-same-origin"
            referrerPolicy="no-referrer"
          />
        ) : (
          <>
            <BrainCanvas
              analysis={analysis}
              assetState={assetState}
              currentTimeSec={currentTimeSec}
              isPlaying={isPlaying}
              setCurrentTimeSec={setCurrentTimeSec}
              setTooltip={setTooltip}
            />

            {assetState === "loading" && (
              <CenteredOverlay>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-3 text-sm text-muted-foreground">Loading brain mesh...</p>
              </CenteredOverlay>
            )}

            {assetState === "error" && (
              <CenteredOverlay>
                <p className="text-sm font-medium">Brain mesh unavailable</p>
                <p className="mt-2 max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
                  The fsaverage5 assets could not be loaded from the Kaggle backend or local public
                  fallback.
                </p>
              </CenteredOverlay>
            )}

            {assetState === "ready" && !analysis && !analyzing && (
              <CenteredOverlay translucent>
                <p className="text-sm font-medium text-foreground">
                  Run an analysis to see neural activation
                </p>
              </CenteredOverlay>
            )}

            {assetState === "ready" && analyzing && (
              <CenteredOverlay translucent>
                <div className="h-14 w-14 animate-ping rounded-full border border-primary" />
                <p className="mt-5 text-sm font-medium text-primary">
                  Tribe v2 is processing your ad...
                </p>
              </CenteredOverlay>
            )}
          </>
        )}

        {tooltip.visible && (
          <div
            className="pointer-events-none fixed z-50 rounded-xl border border-border bg-background/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
            style={{ left: tooltip.x, top: tooltip.y + 12 }}
          >
            <p className="font-medium">{tooltip.network}</p>
            <p className="mt-1 text-muted-foreground">
              Activation: {Math.round(tooltip.activation * 100)}%
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        {scores.map((item, index) => (
          <NetworkCard
            key={item.networkId}
            networkId={item.networkId}
            score={item.score}
            active={index === highestNetworkId && item.score > 0}
          />
        ))}
      </div>
    </section>
  );
}

function BrainCanvas({
  analysis,
  assetState,
  currentTimeSec,
  isPlaying,
  setCurrentTimeSec,
  setTooltip,
}: {
  analysis: TribeActivationResult | null;
  assetState: "loading" | "ready" | "error";
  currentTimeSec: number;
  isPlaying: boolean;
  setCurrentTimeSec?: (time: number) => void;
  setTooltip: (tooltip: TooltipState) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    analysis,
    currentTimeSec,
    isPlaying,
  });
  const meshRef = useRef<THREE.Mesh | null>(null);
  const colorsRef = useRef<THREE.BufferAttribute | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const lastFrameRef = useRef(Date.now());
  const autoRotateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = { analysis, currentTimeSec, isPlaying };
  }, [analysis, currentTimeSec, isPlaying]);

  useEffect(() => {
    if (assetState !== "ready" || !hostRef.current || !cachedAssets) return;

    const host = hostRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    camera.position.set(0, 0.5, 5);
    cameraRef.current = camera;

    const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.8);
    keyLight.position.set(3, 4, 5);
    const fillLight = new THREE.DirectionalLight(0x8899cc, 0.6);
    fillLight.position.set(-4, -2, -3);
    const rimLight = new THREE.DirectionalLight(0x9966cc, 0.35);
    rimLight.position.set(0, 2, -5);
    const ambient = new THREE.AmbientLight(0x223344, 0.5);
    scene.add(keyLight, fillLight, rimLight, ambient);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.enablePan = false;
    controls.minDistance = 2.5;
    controls.maxDistance = 8;
    controls.addEventListener("start", () => {
      controls.autoRotate = false;
      if (autoRotateTimerRef.current) window.clearTimeout(autoRotateTimerRef.current);
    });
    controls.addEventListener("end", () => {
      autoRotateTimerRef.current = window.setTimeout(() => {
        controls.autoRotate = true;
      }, 2000);
    });

    let disposed = false;
    let animationId = 0;
    const loader = new GLTFLoader();

    loader.parse(
      cachedAssets.glb.slice(0),
      "",
      (gltf) => {
        if (disposed) return;

        let mesh: THREE.Mesh | null = null;
        gltf.scene.traverse((child) => {
          if (!mesh && (child as THREE.Mesh).isMesh) mesh = child as THREE.Mesh;
        });

        if (!mesh) {
          console.error("[Brain] GLB did not contain a mesh");
          return;
        }

        const geometry = mesh.geometry as THREE.BufferGeometry;
        const vertexCount = geometry.attributes.position?.count ?? 0;
        if (vertexCount !== VERTEX_COUNT) {
          console.error(`[Brain] Expected ${VERTEX_COUNT} vertices, received ${vertexCount}`);
        }

        const colors = new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3);
        colors.setUsage(THREE.DynamicDrawUsage);
        geometry.setAttribute("color", colors);
        colorsRef.current = colors;

        mesh.material = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.65,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
        mesh.geometry.computeBoundingSphere();
        mesh.geometry.center();
        mesh.scale.setScalar(2.8);
        meshRef.current = mesh;
        scene.add(mesh);
      },
      (error) => console.error("[Brain] Failed to parse GLB", error),
    );

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const updateColors = () => {
      const colors = colorsRef.current;
      if (!colors || !cachedAssets) return;

      const { predsFlat, nTimesteps } = getPredsData(stateRef.current.analysis);
      const totalDuration = nTimesteps * SEGMENT_DURATION;
      const now = Date.now();
      const delta = (now - lastFrameRef.current) / 1000;
      lastFrameRef.current = now;

      let time = stateRef.current.currentTimeSec;
      if (stateRef.current.isPlaying && predsFlat && nTimesteps > 0) {
        time += delta;
        if (time >= totalDuration) time = 0;
        setCurrentTimeSec?.(time);
      }

      const tFloat = time / SEGMENT_DURATION;
      const tA = Math.max(0, Math.min(nTimesteps - 1, Math.floor(tFloat)));
      const tB = Math.min(nTimesteps - 1, tA + 1);
      const blend = tFloat - tA;
      const colorArray = colors.array as Float32Array;
      const vertexCount = Math.min(colors.count, cachedAssets.sulcBgMap.length);

      for (let i = 0; i < vertexCount; i++) {
        const activation = predsFlat ? getActivation(predsFlat, nTimesteps, tA, tB, blend, i) : 0;
        const bgValue = cachedAssets.sulcBgMap[i] ?? 0.5;
        let { r, g, b } = computeVertexColor(activation, bgValue);

        if (activation > 0.6) {
          const pulseStrength = (activation - 0.6) / 0.4;
          const pulse = 1 + pulseStrength * 0.18 * Math.sin(Date.now() * 0.003 + i * 0.0001);
          r = Math.min(1, r * pulse);
          g = Math.min(1, g * pulse);
          b = Math.min(1, b * pulse);
        }

        colorArray[i * 3] = r;
        colorArray[i * 3 + 1] = g;
        colorArray[i * 3 + 2] = b;
      }

      colors.needsUpdate = true;
    };

    const animate = () => {
      resize();
      updateColors();
      controls.update();
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    const onMouseMove = (event: MouseEvent) => {
      const mesh = meshRef.current;
      if (!mesh || !cachedAssets || !cameraRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const [hit] = raycasterRef.current.intersectObject(mesh);
      if (!hit?.face) return;

      const vertexIndex = closestFaceVertexIndex(mesh, hit.face, hit.point);
      const networkId = cachedAssets.yeo7Labels[vertexIndex] ?? 0;
      const { predsFlat, nTimesteps } = getPredsData(stateRef.current.analysis);
      const frame = Math.max(
        0,
        Math.min(nTimesteps - 1, Math.floor(stateRef.current.currentTimeSec / SEGMENT_DURATION)),
      );
      const activation = predsFlat?.[frame * VERTEX_COUNT + vertexIndex] ?? 0;
      setTooltip({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        network: YEO_NAMES[networkId] ?? "Unknown Network",
        activation,
      });
    };

    const onMouseLeave = () =>
      setTooltip({ visible: false, x: 0, y: 0, network: "", activation: 0 });

    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mouseleave", onMouseLeave);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mouseleave", onMouseLeave);
      if (autoRotateTimerRef.current) window.clearTimeout(autoRotateTimerRef.current);
      controls.dispose();
      scene.traverse((child) => {
        const meshChild = child as THREE.Mesh;
        if (meshChild.isMesh) {
          meshChild.geometry?.dispose();
          const material = meshChild.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material?.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      meshRef.current = null;
      colorsRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
    };
  }, [assetState, setCurrentTimeSec, setTooltip]);

  return <div ref={hostRef} className="h-full min-h-[520px] w-full" />;
}

function SelectedMediaPanel({
  selected,
  analyzing,
  selectedIsAnalyzable,
  onAnalyze,
  onChange,
}: {
  selected: MediaItem;
  analyzing: boolean;
  selectedIsAnalyzable: boolean;
  onAnalyze: () => void;
  onChange: () => void;
}) {
  return (
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
        <Button variant="ghost" size="sm" className="rounded-xl" onClick={onChange}>
          Change
        </Button>
      </div>

      <div className="min-h-[260px] flex-1 overflow-hidden rounded-2xl border border-border bg-popover/40">
        {(selected.type === "text" || selected.type === "image_copy") && (
          <div className="h-full overflow-y-auto p-6 text-sm leading-relaxed">
            {selected.content_text}
          </div>
        )}
        {selected.type === "video" && selected.content_url && (
          <video src={selected.content_url} controls className="h-full w-full object-contain" />
        )}
        {selected.type === "audio" && selected.content_url && (
          <div className="space-y-4 p-6">
            <div className="mb-4 flex h-32 items-end justify-center gap-1">
              {Array.from({ length: 56 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-primary/60"
                  style={{ height: `${10 + Math.abs(Math.sin(i * 0.4)) * 60}px` }}
                />
              ))}
            </div>
            <audio src={selected.content_url} controls className="w-full" />
          </div>
        )}
        {!selectedIsAnalyzable && (
          <div className="p-6 text-sm text-muted-foreground">
            Meta TRIBE V2 supports text, audio, and video only. Images cannot be analyzed.
          </div>
        )}
      </div>

      <Button
        onClick={onAnalyze}
        disabled={analyzing || !selectedIsAnalyzable}
        className="mt-5 w-full rounded-2xl py-6 text-base"
      >
        {analyzing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {analyzing ? "Analyzing neural response..." : "Analyze with Cortex AI"}
      </Button>
    </>
  );
}

function ActivationGraph({
  timeline,
  currentTimeSec,
  onSeek,
}: {
  timeline: Array<Record<string, number>>;
  currentTimeSec: number;
  onSeek: (time: number) => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-popover/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Network activation timeline</h3>
        <span className="text-xs text-muted-foreground">Average activation 0-100</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={timeline}
            onClick={(state) => {
              if (typeof state?.activeLabel === "number") onSeek(state.activeLabel);
              else if (state?.activePayload?.[0]?.payload?.time != null) {
                onSeek(Number(state.activePayload[0].payload.time));
              }
            }}
            margin={{ left: -18, right: 12, top: 8, bottom: 8 }}
          >
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(value) => `${Number(value).toFixed(1)}s`}
              stroke="rgba(255,255,255,0.35)"
              tick={{ fontSize: 11 }}
            />
            <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "#0F1115",
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 12,
                color: "#E8E9ED",
              }}
              labelFormatter={(value) => `${Number(value).toFixed(1)}s`}
            />
            <ReferenceLine x={currentTimeSec} stroke="#01696f" strokeWidth={2} />
            {Object.entries(YEO_COLORS).map(([id, color]) => (
              <Line
                key={id}
                type="monotone"
                dataKey={`network_${id}`}
                dot={false}
                stroke={color}
                strokeWidth={1.8}
                name={YEO_NAMES[Number(id)]}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TimelineScrubber({
  currentTimeSec,
  duration,
  frame,
  frameCount,
  isPlaying,
  hasTimeline,
  onPlayPause,
  onSeekFrame,
}: {
  currentTimeSec: number;
  duration: number;
  frame: number;
  frameCount: number;
  isPlaying: boolean;
  hasTimeline: boolean;
  onPlayPause: () => void;
  onSeekFrame: (frame: number) => void;
}) {
  return (
    <div className="glass-card flex flex-wrap items-center gap-4 rounded-3xl p-4">
      <Button
        variant="secondary"
        size="icon"
        className="rounded-xl"
        onClick={onPlayPause}
        disabled={!hasTimeline}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <span className="w-28 text-sm tabular-nums text-muted-foreground">
        {currentTimeSec.toFixed(1)}s / {duration.toFixed(1)}s
      </span>
      <input
        type="range"
        min={0}
        max={Math.max(0, frameCount - 1)}
        step={1}
        value={frame}
        disabled={!hasTimeline}
        onChange={(event) => onSeekFrame(Number(event.target.value))}
        className="min-w-48 flex-1"
        style={{ accentColor: "#01696f" }}
      />
      <span className="w-28 text-right text-sm tabular-nums text-muted-foreground">
        Frame {frame + 1} / {frameCount}
      </span>
    </div>
  );
}

function NetworkCard({
  networkId,
  score,
  active,
}: {
  networkId: number;
  score: number;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-popover/30 p-3 transition-all",
        active && "border-primary shadow-[0_0_12px_rgba(1,105,111,0.5)]",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: YEO_COLORS[networkId] }} />
        <span className="line-clamp-1 text-[12px] font-bold">{YEO_NAMES[networkId]}</span>
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {Math.round(score * 100)}%
        </span>
      </div>
      <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-border/60">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${Math.round(score * 100)}%` }}
        />
      </div>
    </div>
  );
}

function CenteredOverlay({
  children,
  translucent = false,
}: {
  children: React.ReactNode;
  translucent?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center",
        translucent && "bg-background/35 backdrop-blur-sm",
      )}
    >
      {children}
    </div>
  );
}

function useTimelineData(analysis: TribeActivationResult | null) {
  return useMemo(() => {
    const nTimesteps = getTimelineLength(analysis);
    const timeline = analysis?.network_timeline;
    return Array.from({ length: nTimesteps }, (_, index) => {
      const point: Record<string, number> = {
        time: Number((index * SEGMENT_DURATION).toFixed(1)),
      };
      Object.entries(NETWORK_KEYS).forEach(([id, key]) => {
        const series = timeline?.[key];
        const fallback = getStaticNetworkScore(analysis, Number(id));
        point[`network_${id}`] = Math.round(((series?.[index] ?? fallback) || 0) * 100);
      });
      return point;
    });
  }, [analysis]);
}

function useNetworkScores(analysis: TribeActivationResult | null, frame: number) {
  return useMemo(
    () =>
      Object.keys(YEO_NAMES).map((id) => {
        const networkId = Number(id);
        const key = NETWORK_KEYS[networkId];
        const score =
          analysis?.network_timeline?.[key]?.[frame] ?? getStaticNetworkScore(analysis, networkId);
        return { networkId, score: Math.max(0, Math.min(1, score || 0)) };
      }),
    [analysis, frame],
  );
}

function getStaticNetworkScore(analysis: TribeActivationResult | null, networkId: number) {
  const scores = analysis?.scores ?? analysis?.summary?.scores ?? {};
  const key = NETWORK_KEYS[networkId];
  const value =
    scores[key] ??
    (networkId === 6 ? scores.language_network : undefined) ??
    (networkId === 7 ? scores.overall_impact : undefined) ??
    0;
  return Math.max(0, Math.min(1, Number(value) / 100));
}

function getTimelineLength(analysis: TribeActivationResult | null) {
  return Math.max(1, analysis?.preds_shape?.[0] ?? analysis?.duration_steps ?? 75);
}

function hasTimelinePredictions(analysis: TribeActivationResult | null) {
  return !!analysis?.preds_b64 && analysis?.preds_shape?.[1] === VERTEX_COUNT;
}

function getPredsData(analysis: TribeActivationResult | null) {
  if (!hasTimelinePredictions(analysis)) {
    return { predsFlat: null as Float32Array | null, nTimesteps: getTimelineLength(analysis) };
  }
  const cached = decodedPredsCache.get(analysis);
  if (cached) return cached;

  const buffer = Uint8Array.from(atob(analysis!.preds_b64!), (c) => c.charCodeAt(0)).buffer;
  const decoded = {
    predsFlat: new Float32Array(buffer),
    nTimesteps: analysis!.preds_shape![0],
  };
  decodedPredsCache.set(analysis, decoded);
  return decoded;
}

function getActivation(
  predsFlat: Float32Array,
  nTimesteps: number,
  tA: number,
  tB: number,
  blend: number,
  vertexIndex: number,
) {
  const actA = predsFlat[tA * VERTEX_COUNT + vertexIndex] ?? 0;
  const actB = predsFlat[tB * VERTEX_COUNT + vertexIndex] ?? actA;
  return actA + (actB - actA) * blend;
}

function closestFaceVertexIndex(mesh: THREE.Mesh, face: THREE.Face, point: THREE.Vector3) {
  const position = mesh.geometry.getAttribute("position");
  const vertex = new THREE.Vector3();
  let closestIndex = face.a;
  let closestDistance = Number.POSITIVE_INFINITY;

  [face.a, face.b, face.c].forEach((index) => {
    vertex.fromBufferAttribute(position, index);
    mesh.localToWorld(vertex);
    const distance = vertex.distanceToSquared(point);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function hotColormap(t: number) {
  const r = Math.min(1, t * 3);
  const g = Math.min(1, Math.max(0, t * 3 - 1));
  const b = Math.min(1, Math.max(0, t * 3 - 2));
  const threshold = 0.15;
  const alpha = t < threshold ? 0 : Math.min(1, (t - threshold) / 0.25);
  return { r, g, b, alpha };
}

function computeVertexColor(activation: number, bgValue: number) {
  const bgGray = 1 - (BG_DARKNESS + bgValue * (1 - BG_DARKNESS));
  const { r, g, b, alpha } = hotColormap(activation);
  return {
    r: alpha * r + (1 - alpha) * bgGray,
    g: alpha * g + (1 - alpha) * bgGray,
    b: alpha * b + (1 - alpha) * bgGray,
  };
}

function loadBrainAssets() {
  if (cachedAssets) return Promise.resolve(cachedAssets);
  if (assetPromise) return assetPromise;

  assetPromise = Promise.all([
    fetchAssetArrayBuffer("fsaverage5_brain.glb"),
    fetchAssetJson<number[]>("sulc_bg_map.json"),
    fetchAssetJson<number[]>("yeo7_labels.json"),
  ])
    .then(([glb, sulcBgMap, yeo7Labels]) => {
      cachedAssets = { glb, sulcBgMap, yeo7Labels };
      return cachedAssets;
    })
    .catch((error) => {
      assetPromise = null;
      throw error;
    });

  return assetPromise;
}

async function fetchAssetArrayBuffer(filename: string) {
  const response = await fetchWithFallback(filename);
  return response.arrayBuffer();
}

async function fetchAssetJson<T>(filename: string) {
  const response = await fetchWithFallback(filename);
  return response.json() as Promise<T>;
}

async function fetchWithFallback(filename: string) {
  const remote = `${TRIBE_ASSET_BASE}/${filename}`;
  try {
    const response = await fetch(remote);
    if (response.ok) return response;
  } catch (error) {
    console.warn(`[Brain] Remote asset unavailable: ${remote}`, error);
  }

  const local = `/${filename}`;
  const localResponse = await fetch(local);
  if (!localResponse.ok) {
    throw new Error(`Missing brain asset ${filename}`);
  }
  return localResponse;
}
