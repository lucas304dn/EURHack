import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, FileText, Music2, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/cortex/Shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listMediaWithLatestAnalysis } from "@/lib/cortex.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — Cortex" },
      { name: "description", content: "Connect Cortex to your ad platforms." },
    ],
  }),
  component: Page,
});

function Page() {
  const fnList = useServerFn(listMediaWithLatestAnalysis);

  const loadCampaignData = async () => {
    const result = (await fnList()) as { items?: MediaItem[]; analysis_error?: string };
    if (result.analysis_error) {
      toast.warning("Saved TRIBE analysis is unavailable; exporting media only.");
    }
    const campaignData = buildCampaignExportRows((result.items ?? []) as MediaItem[]);

    if (campaignData.length === 0) {
      toast.message("No campaign data to export yet.");
      return null;
    }

    return campaignData;
  };

  const handleCsvExport = async () => {
    try {
      const campaignData = await loadCampaignData();
      if (!campaignData) return;
      exportCsv(campaignData);
      toast.success("CSV export ready");
    } catch (error) {
      console.error(error);
      toast.error("CSV export failed.");
    }
  };

  const handlePdfExport = async () => {
    try {
      const campaignData = await loadCampaignData();
      if (!campaignData) return;
      exportPdf(campaignData);
      toast.success("PDF export ready");
    } catch (error) {
      console.error(error);
      toast.error("PDF export failed.");
    }
  };

  const openExternal = (url: string) => {
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (newWindow) newWindow.opener = null;
  };

  const integrations: IntegrationItem[] = [
    {
      name: "Export to CSV",
      description: "Download all your ads and saved TRIBE scores as a spreadsheet",
      logo: <Table2 className="h-5 w-5 text-[#16a34a]" />,
      action: (
        <Button
          variant="outline"
          className="rounded-xl border-primary/40 bg-primary/15 text-foreground hover:border-primary/60 hover:bg-primary/25"
          onClick={handleCsvExport}
        >
          Export
        </Button>
      ),
    },
    {
      name: "Export to PDF",
      description: "Generate a branded Neuro Report with saved TRIBE analysis",
      logo: <FileText className="h-5 w-5 text-[#dc2626]" />,
      action: (
        <Button
          variant="outline"
          className="rounded-xl border-primary/40 bg-primary/15 text-foreground hover:border-primary/60 hover:bg-primary/25"
          onClick={handlePdfExport}
        >
          Export
        </Button>
      ),
    },
    {
      name: "Meta Ads",
      description: "Publish high-scoring ads directly to your Meta campaigns",
      logo: <MetaLogo />,
      action: (
        <Badge
          variant="outline"
          className="cursor-default rounded-full border-white/10 bg-slate-500/10 px-3 py-1 text-slate-300 hover:bg-slate-500/10"
        >
          Coming Soon
        </Badge>
      ),
    },
    {
      name: "Instagram",
      description: "View and manage your Instagram presence",
      logo: <InstagramLogo />,
      action: (
        <Button
          variant="secondary"
          className="rounded-xl"
          onClick={() => openExternal("https://www.instagram.com")}
        >
          Open
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      ),
    },
    {
      name: "TikTok",
      description: "Reach your audience on TikTok",
      logo: <TikTokLogo />,
      action: (
        <Button
          variant="secondary"
          className="rounded-xl"
          onClick={() => openExternal("https://www.tiktok.com")}
        >
          Open
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <Shell>
      <div className="space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-primary">Connections</p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Integrations</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Export NeuroPulse reports or connect campaign channels from one premium control surface.
          </p>
        </header>

        <section className="space-y-3">
          {integrations.map((integration) => (
            <IntegrationRow key={integration.name} integration={integration} />
          ))}
        </section>
      </div>
    </Shell>
  );
}

type MediaItem = {
  id: string;
  type: string;
  title: string | null;
  content_url: string | null;
  content_text: string | null;
  created_at: string;
  latest_analysis?: LatestAnalysis | null;
};

type LatestAnalysis = {
  id: string;
  media_item_id: string;
  created_at: string;
  input_type: "text" | "audio" | "video";
  title: string | null;
  analysis_id: string | null;
  shape: number[];
  segments: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  summary: Record<string, unknown>;
  scores: Record<string, number>;
  score_insights: Record<string, string>;
  insight_summary: string | null;
  insight_model: string | null;
  insight_error: string | null;
  insight_generated_at: string | null;
  region_masks: Record<string, [number, number]>;
  peak_activation_step: number;
  viewer_url: string | null;
  viewer_absolute_url: string | null;
  viewer_available: boolean;
  viewer_error: string | null;
};

type IntegrationItem = {
  name: string;
  description: string;
  logo: React.ReactNode;
  action: React.ReactNode;
};

type Score = {
  key: string;
  label: string;
  value: number;
};

type CampaignExportRow = {
  campaignName: string;
  adCopyVariant: string;
  mediaType: string;
  createdAt: string;
  contentUrl: string;
  analysisStatus: string;
  analysisRunAt: string;
  tribeAnalysisId: string;
  inputType: string;
  shape: string;
  segments: string;
  metadata: string;
  summary: string;
  viewerUrl: string;
  scores: Score[];
  scoreInsights: Record<string, string>;
  insightSummary: string;
  insightError: string;
  peakActivationStep: string;
  aiInsights: string;
};

const SCORE_LABELS: Record<string, string> = {
  visual_cortex: "Visual Cortex",
  language_network: "Language Network",
  attention: "Attention",
  emotional_response: "Emotional Response",
  memory_encoding: "Memory Encoding",
  overall_impact: "Overall Impact",
};

function IntegrationRow({ integration }: { integration: IntegrationItem }) {
  return (
    <div className="glass-card flex items-center gap-4 rounded-2xl p-4 transition-all hover:border-primary/30 md:p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-popover/60">
        {integration.logo}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold tracking-tight">{integration.name}</h2>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{integration.description}</p>
      </div>
      <div className="shrink-0">{integration.action}</div>
    </div>
  );
}

function labelForScore(key: string) {
  return SCORE_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function sortScores([a]: [string, number], [b]: [string, number]) {
  if (a === "overall_impact") return 1;
  if (b === "overall_impact") return -1;
  return a.localeCompare(b);
}

function scoresFromAnalysis(analysis?: LatestAnalysis | null): Score[] {
  return Object.entries(analysis?.scores ?? {})
    .sort(sortScores)
    .map(([key, raw]) => ({
      key,
      label: labelForScore(key),
      value: Math.max(0, Math.min(100, Number(raw) || 0)),
    }));
}

function shapeLabel(analysis?: LatestAnalysis | null) {
  if (!analysis) return "";
  return `${analysis.shape?.[0] ?? 0} frames x ${analysis.shape?.[1] ?? 0} vertices`;
}

function assetContentLabel(item: MediaItem) {
  const text = item.content_text?.trim();
  if (text) return text;
  if (item.type === "image") return "[Image asset — stored in media library]";
  if (item.type === "video") return "[Video asset — stored in media library]";
  return "Media creative";
}

function compactJson(value: unknown) {
  if (!value || (typeof value === "object" && Object.keys(value).length === 0)) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function buildAnalysisInsights(analysis: LatestAnalysis | null | undefined, scores: Score[]) {
  if (!analysis) {
    return "No saved TRIBE analysis has been run for this asset yet.";
  }

  const savedInsights = Object.entries(analysis.score_insights ?? {})
    .map(([key, value]) => `${labelForScore(key)}: ${value}`)
    .join(" ");
  if (analysis.insight_summary || savedInsights) {
    return [analysis.insight_summary, savedInsights].filter(Boolean).join(" ");
  }

  if (analysis.insight_error) {
    return `LLM interpretation was unavailable for this run: ${analysis.insight_error}`;
  }

  const overall = scores.find((score) => score.key === "overall_impact");
  const topScores = scores
    .filter((score) => score.key !== "overall_impact")
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);
  const insights: string[] = [];

  if (topScores[0]) {
    insights.push(
      `${topScores[0].label} is the strongest saved TRIBE signal at ${topScores[0].value.toFixed(1)}/100.`,
    );
  }
  if (topScores[1]) {
    insights.push(`${topScores[1].label} follows at ${topScores[1].value.toFixed(1)}/100.`);
  }
  if (overall) {
    insights.push(`Overall impact is ${overall.value.toFixed(1)}/100.`);
  }
  insights.push(`Peak activation occurred at TRIBE step ${analysis.peak_activation_step}.`);
  if (analysis.viewer_available && (analysis.viewer_absolute_url || analysis.viewer_url)) {
    insights.push("Interactive cortical viewer was available when the analysis was saved.");
  }

  return insights.join(" ");
}

function buildCampaignExportRows(items: MediaItem[]): CampaignExportRow[] {
  return items.map((item) => {
    const analysis = item.latest_analysis ?? null;
    const scores = scoresFromAnalysis(analysis);
    return {
      campaignName: item.title?.trim() || "Cortex Campaign",
      adCopyVariant: assetContentLabel(item),
      mediaType: item.type,
      createdAt: item.created_at,
      contentUrl: item.content_url ?? "",
      analysisStatus: analysis ? "Analyzed" : "Not analyzed",
      analysisRunAt: analysis?.created_at ?? "",
      tribeAnalysisId: analysis?.analysis_id ?? analysis?.id ?? "",
      inputType: analysis?.input_type ?? "",
      shape: shapeLabel(analysis),
      segments: analysis ? String(analysis.segments?.length ?? 0) : "",
      metadata: compactJson(analysis?.metadata),
      summary: compactJson(analysis?.summary),
      viewerUrl: analysis?.viewer_absolute_url ?? analysis?.viewer_url ?? "",
      scores,
      scoreInsights: analysis?.score_insights ?? {},
      insightSummary: analysis?.insight_summary ?? "",
      insightError: analysis?.insight_error ?? "",
      peakActivationStep: analysis ? String(analysis.peak_activation_step) : "",
      aiInsights: buildAnalysisInsights(analysis, scores),
    };
  });
}

function exportCsv(rows: CampaignExportRow[]) {
  const scoreHeaders = scoreHeadersForRows(rows);
  const headers = [
    "Campaign Name",
    "Ad Copy Variant",
    "Media Type",
    "Created At",
    "Content URL",
    "Analysis Status",
    "Analysis Run At",
    "TRIBE Analysis ID",
    "TRIBE Input Type",
    "TRIBE Shape",
    "TRIBE Segments",
    "Peak Activation Step",
    "Viewer URL",
    ...scoreHeaders.map((score) => score.label),
    ...scoreHeaders.map((score) => `${score.label} Insight`),
    "LLM Summary",
    "LLM Error",
    "Analysis Insights",
  ];

  const body = rows.map((row) =>
    [
      row.campaignName,
      row.adCopyVariant,
      row.mediaType,
      row.createdAt,
      row.contentUrl,
      row.analysisStatus,
      row.analysisRunAt,
      row.tribeAnalysisId,
      row.inputType,
      row.shape,
      row.segments,
      row.peakActivationStep,
      row.viewerUrl,
      ...scoreHeaders.map((score) => scoreValueForHeader(row, score.key)),
      ...scoreHeaders.map((score) => row.scoreInsights[score.key] ?? ""),
      row.insightSummary,
      row.insightError,
      row.aiInsights,
    ]
      .map(csvCell)
      .join(","),
  );

  triggerDownload(
    new Blob([[headers.map(csvCell).join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8",
    }),
    "cortex-campaign-export.csv",
  );
}

function scoreHeadersForRows(rows: CampaignExportRow[]) {
  const headers = new Map<string, string>();
  rows.forEach((row) => {
    row.scores.forEach((score) => {
      if (!headers.has(score.key)) headers.set(score.key, score.label);
    });
  });
  return Array.from(headers, ([key, label]) => ({ key, label }));
}

function scoreValueForHeader(row: CampaignExportRow, key: string) {
  const score = row.scores.find((item) => item.key === key);
  return score ? score.value.toFixed(1) : "";
}

function averagedScoresForRows(rows: CampaignExportRow[]) {
  const totals = new Map<string, { label: string; total: number; count: number }>();
  rows.forEach((row) => {
    row.scores.forEach((score) => {
      const current = totals.get(score.key) ?? { label: score.label, total: 0, count: 0 };
      current.total += score.value;
      current.count += 1;
      totals.set(score.key, current);
    });
  });

  return Array.from(totals, ([key, value]) => ({
    key,
    label: value.label,
    value: value.count > 0 ? value.total / value.count : 0,
  })).sort((a, b) => sortScores([a.key, a.value], [b.key, b.value]));
}

function mediaTypeSummary(rows: CampaignExportRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => counts.set(row.mediaType, (counts.get(row.mediaType) ?? 0) + 1));
  return Array.from(counts, ([type, count]) => `${count} ${type}${count === 1 ? "" : "s"}`).join(
    ", ",
  );
}

function reportDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function exportPdf(rows: CampaignExportRow[]) {
  const pdf = createPdfReport(rows);
  triggerDownload(new Blob([pdf], { type: "application/pdf" }), "cortex-neuro-report.pdf");
}

function createPdfReport(rows: CampaignExportRow[]) {
  const first = rows[0];
  const analyzedRows = rows.filter((row) => row.scores.length > 0);
  const unanalyzedCount = rows.length - analyzedRows.length;
  const primary = analyzedRows[0] ?? first;
  const aggregateScores = averagedScoresForRows(analyzedRows);
  const overall = aggregateScores.find((score) => score.key === "overall_impact");
  const strongestDimension = aggregateScores
    .filter((score) => score.key !== "overall_impact")
    .sort((a, b) => b.value - a.value)[0];
  const weakestDimension = aggregateScores
    .filter((score) => score.key !== "overall_impact")
    .sort((a, b) => a.value - b.value)[0];
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  const pages: string[] = [];
  let commands = "";
  let y = 0;

  const pdfY = (top: number) => pageHeight - top;
  const color = (r: number, g: number, b: number) =>
    `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)}`;
  const rect = (x: number, top: number, width: number, height: number, fill: string) => {
    commands += `q ${fill} rg ${x.toFixed(2)} ${(pageHeight - top - height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f Q\n`;
  };
  const text = (
    value: string,
    x: number,
    top: number,
    size = 10,
    fill = color(17, 24, 39),
    font = "F1",
  ) => {
    commands += `BT /${font} ${size} Tf ${fill} rg ${x.toFixed(2)} ${pdfY(top).toFixed(2)} Td (${escapePdfText(value)}) Tj ET\n`;
  };
  const footer = () => {
    rect(0, pageHeight - 28, pageWidth, 28, color(15, 17, 21));
    text("Generated by Cortex / Neural Feedback", margin, pageHeight - 11, 9, color(209, 213, 219));
  };
  const startPage = () => {
    commands = "";
    rect(0, 0, pageWidth, 72, color(15, 17, 21));
    text("CORTEX / NEURAL FEEDBACK", margin, 27, 10, color(125, 211, 252), "F2");
    text("Neurocognitive Ad Effectiveness Report", margin, 54, 19, color(255, 255, 255), "F2");
    y = 102;
  };
  const finishPage = () => {
    footer();
    pages.push(commands);
  };
  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 48) return;
    finishPage();
    startPage();
  };
  const sectionGap = () => {
    y += pages.length === 0 ? 18 : 12;
  };
  const heading = (value: string) => {
    ensureSpace(26);
    text(value, margin, y, 15, color(17, 24, 39), "F2");
    y += 24;
  };
  const paragraph = (value: string, maxChars = 96) => {
    const lines = wrapPdfText(value, maxChars);
    ensureSpace(lines.length * 14 + 6);
    lines.forEach((line) => {
      text(line, margin, y, 10, color(75, 85, 99));
      y += 14;
    });
    y += 6;
  };
  const sectionBox = (height: number) => {
    ensureSpace(height + 16);
    rect(margin - 12, y - 17, contentWidth + 24, height, color(248, 250, 252));
    commands += `q ${color(229, 231, 235)} RG 1 w ${(margin - 12).toFixed(2)} ${(pageHeight - y - height + 17).toFixed(2)} ${(contentWidth + 24).toFixed(2)} ${height.toFixed(2)} re S Q\n`;
  };

  startPage();

  text(`Campaign corpus: ${primary.campaignName}`, margin, y, 10, color(75, 85, 99));
  y += 15;
  text(`Report generated: ${new Date().toLocaleDateString()}`, margin, y, 10, color(75, 85, 99));
  y += 15;
  text(
    `Database records: ${rows.length} creative assets (${mediaTypeSummary(rows) || "no media types recorded"})`,
    margin,
    y,
    10,
    color(75, 85, 99),
  );
  y += 15;
  text(
    `Saved TRIBE analyses: ${analyzedRows.length}; pending analyses: ${unanalyzedCount}`,
    margin,
    y,
    10,
    color(75, 85, 99),
  );
  y += 24;
  sectionGap();

  heading("Abstract");
  paragraph(
    analyzedRows.length > 0
      ? `This report summarizes database-backed creative assets and their latest saved TRIBE v2 neural response analyses. Across ${analyzedRows.length} analyzed asset${analyzedRows.length === 1 ? "" : "s"}, the observed overall impact${overall ? ` averaged ${overall.value.toFixed(1)}/100` : ""}. The strongest aggregate cognitive dimension was ${strongestDimension ? `${strongestDimension.label} (${strongestDimension.value.toFixed(1)}/100)` : "not available"}, while the lowest observed dimension was ${weakestDimension ? `${weakestDimension.label} (${weakestDimension.value.toFixed(1)}/100)` : "not available"}.`
      : "This report summarizes creative assets stored in the Cortex database. No saved TRIBE v2 neural response analysis was available at export time, so the document records campaign materials and identifies the missing analytical evidence.",
    92,
  );
  sectionGap();

  heading("Data and Method");
  paragraph(
    "The dataset was retrieved from the Supabase-backed Cortex media table together with the latest persisted TRIBE analysis for each creative asset. Each analyzed record contributes the saved cognitive dimension scores, peak activation step, temporal metadata, viewer availability, and any stored model-generated interpretation.",
    92,
  );
  paragraph(
    "Scores are reported on a 0-100 scale and are interpreted as relative activation estimates for advertising effectiveness dimensions rather than clinical measurements. Missing analyses are retained in the corpus to preserve database completeness.",
    92,
  );
  sectionGap();

  heading("Aggregate Results");
  if (aggregateScores.length > 0) {
    aggregateScores.forEach((score) => {
      text(score.label, margin, y, 10, color(55, 65, 81));
      text(
        `${score.value.toFixed(1)}/100`,
        pageWidth - margin - 52,
        y,
        10,
        color(55, 65, 81),
        "F2",
      );
      y += 7;
      rect(margin, y, contentWidth, 5, color(229, 231, 235));
      rect(margin, y, contentWidth * (score.value / 100), 5, color(1, 105, 111));
      y += 16;
    });
  } else {
    paragraph(
      "No saved TRIBE analysis is available yet. Run Neural Feedback first to populate real scores.",
    );
  }
  y += 10;
  sectionGap();

  if (primary.scores.length > 0) {
    heading("Primary Analysis Record");
    text(`Asset: ${primary.campaignName}`, margin, y, 10, color(75, 85, 99));
    y += 15;
    text(
      `Analyzed: ${reportDate(primary.analysisRunAt) || "Unknown date"} / Input: ${primary.inputType || primary.mediaType}`,
      margin,
      y,
      10,
      color(75, 85, 99),
    );
    y += 15;
    text(
      `TRIBE ID: ${primary.tribeAnalysisId || "Not recorded"}`,
      margin,
      y,
      10,
      color(75, 85, 99),
    );
    y += 15;
    text(
      `Shape: ${primary.shape || "Not recorded"} / Segments: ${primary.segments || "Not recorded"} / Peak step: ${primary.peakActivationStep || "Not recorded"}`,
      margin,
      y,
      10,
      color(75, 85, 99),
    );
    y += 20;
    sectionGap();
  }

  sectionBox(112);
  heading("Interpretive Findings");
  paragraph(primary.aiInsights, 92);

  if (Object.keys(primary.scoreInsights).length > 0) {
    sectionBox(52 + Object.keys(primary.scoreInsights).length * 34);
    heading("Dimension-Level Interpretations");
    primary.scores.forEach((score) => {
      const insight = primary.scoreInsights[score.key];
      if (!insight) return;
      ensureSpace(30);
      text(score.label, margin, y, 9, color(17, 24, 39), "F2");
      y += 12;
      paragraph(insight, 92);
    });
  }

  sectionBox(92);
  heading("Limitations");
  paragraph(
    analyzedRows.length > 0
      ? `The report reflects only analyses persisted in the current database at export time. ${unanalyzedCount > 0 ? `${unanalyzedCount} asset${unanalyzedCount === 1 ? " has" : "s have"} no saved neural analysis and should not be interpreted as cognitively evaluated.` : "All exported assets include a saved analysis record."} Scores should be used comparatively within this campaign context rather than as absolute measures of neurological response.`
      : "Because no saved TRIBE analysis was available, this PDF is a database inventory rather than an effectiveness assessment. Run Neural Feedback and export again to include cognitive scores and model interpretations.",
    92,
  );

  heading("Appendix: Asset-Level Database Records");
  rows.forEach((row, index) => {
    const copy = truncateAppendixText(row.adCopyVariant);
    const copyLines = wrapPdfText(copy.text, 105);
    const analysisLine = `${row.analysisStatus}${row.analysisRunAt ? ` / ${new Date(row.analysisRunAt).toLocaleDateString()}` : ""}${row.peakActivationStep ? ` / Peak step ${row.peakActivationStep}` : ""}`;
    const metadataLines = formatMetadataLines(row.metadata);
    ensureSpace(68 + copyLines.length * 13 + metadataLines.length * 12 + (copy.truncated ? 12 : 0));
    text(
      `${index + 1}. ${row.campaignName} (${row.mediaType})`,
      margin,
      y,
      10,
      color(17, 24, 39),
      "F2",
    );
    y += 15;
    text(analysisLine, margin + 10, y, 9, color(1, 105, 111), "F2");
    y += 13;
    copyLines.forEach((line) => {
      text(line, margin + 10, y, 9, color(75, 85, 99));
      y += 13;
    });
    if (copy.truncated) {
      text("[truncated]", margin + 10, y, 8, color(120, 130, 145));
      y += 12;
    }
    text("Metadata:", margin + 10, y, 8, color(17, 24, 39), "F2");
    y += 11;
    metadataLines.forEach((line) => {
      text(line, margin + 10, y, 8, color(75, 85, 99));
      y += 12;
    });
    y += 8;
  });

  finishPage();
  return buildPdfDocument(pages, pageWidth, pageHeight);
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildPdfDocument(pages: string[], pageWidth: number, pageHeight: number) {
  const encoder = new TextEncoder();
  const pageRefs = pages.map((_, index) => 5 + index * 2);
  const contentRefs = pages.map((_, index) => 6 + index * 2);
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  pages.forEach((pageCommands, index) => {
    const contentRef = contentRefs[index];
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentRef} 0 R >>`,
    );
    objects.push(
      `<< /Length ${encoder.encode(pageCommands).length} >>\nstream\n${pageCommands}endstream`,
    );
  });

  let pdf = "%PDF-1.4\n% Cortex Neuro Report\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return encoder.encode(pdf);
}

function truncateAppendixText(value: string) {
  const cleaned = cleanPdfText(value);
  const maxLength = 430;
  if (cleaned.length <= maxLength) return { text: cleaned, truncated: false };

  const excerpt = cleaned.slice(0, maxLength);
  const sentenceEnd = Math.max(
    excerpt.lastIndexOf(". "),
    excerpt.lastIndexOf("! "),
    excerpt.lastIndexOf("? "),
  );
  const wordEnd = excerpt.lastIndexOf(" ");
  const end = sentenceEnd > 160 ? sentenceEnd + 1 : Math.max(160, wordEnd);

  return {
    text: `${excerpt.slice(0, end).trim()}...`,
    truncated: true,
  };
}

function formatMetadataLines(metadata: string) {
  if (!metadata) return ["No metadata recorded."];

  try {
    const parsed = JSON.parse(metadata) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return ["No metadata recorded."];
    }

    const record = parsed as Record<string, unknown>;
    const lines: string[] = [];
    const filename = valueToCleanString(record.filename);
    const campaign = valueToCleanString(
      record.campaign_name ?? record.campaignName ?? record.campaign,
    );

    if (filename) lines.push(`Filename: ${filename}`);
    if (campaign) lines.push(`Campaign: ${campaign}`);

    Object.entries(record).forEach(([key, raw]) => {
      if (["filename", "campaign_name", "campaignName", "campaign"].includes(key)) return;
      const value = valueToCleanString(raw);
      if (!value) return;
      lines.push(`${labelForScore(key)}: ${value}`);
    });

    return lines.length > 0 ? lines : ["No metadata recorded."];
  } catch {
    return ["No metadata recorded."];
  }
}

function valueToCleanString(value: unknown) {
  if (value == null) return "";
  if (typeof value === "object") return compactJson(value);
  return cleanPdfText(String(value));
}

function wrapPdfText(value: string, maxChars: number) {
  const words = cleanPdfText(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars));
      }
      return;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function escapePdfText(value: string | number) {
  return cleanPdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function cleanPdfText(value: string | number) {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function MetaLogo() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <span className="absolute text-lg font-bold text-[#0866FF]">M</span>
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg"
        alt="Meta"
        className="relative z-10 max-h-5 max-w-8"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

function InstagramLogo() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#FCAF45]">
      <span className="absolute h-5 w-5 rounded-md border-2 border-white" />
      <span className="absolute h-1.5 w-1.5 rounded-full bg-white" />
      <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-white" />
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png"
        alt="Instagram"
        className="relative z-10 h-full w-full object-cover"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

function TikTokLogo() {
  return (
    <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-black">
      <Music2 className="absolute h-5 w-5 translate-x-0.5 text-[#25F4EE]" />
      <Music2 className="absolute h-5 w-5 -translate-x-0.5 text-[#FE2C55]" />
      <Music2 className="h-5 w-5 text-white" />
      <img
        src="https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg"
        alt="TikTok"
        className={cn("absolute inset-0 h-full w-full object-contain p-1.5")}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}
