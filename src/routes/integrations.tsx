import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { jsPDF } from "jspdf";
import { ExternalLink, FileText, Music2, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/cortex/Shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listMedia } from "@/lib/cortex.functions";
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
  const fnList = useServerFn(listMedia);
  const mediaQ = useQuery({
    queryKey: ["media"],
    queryFn: () => fnList(),
  });
  const campaignData = useMemo(
    () => buildCampaignExportRows((mediaQ.data?.items ?? []) as MediaItem[]),
    [mediaQ.data],
  );

  const ensureData = () => {
    if (mediaQ.isError) {
      toast.error("Could not load campaign data for export.");
      return false;
    }
    if (campaignData.length === 0) {
      toast.message("No campaign data to export yet.");
      return false;
    }
    return true;
  };

  const handleCsvExport = () => {
    try {
      if (!ensureData()) return;
      exportCsv(campaignData);
      toast.success("CSV export ready");
    } catch (error) {
      console.error(error);
      toast.error("CSV export failed.");
    }
  };

  const handlePdfExport = () => {
    try {
      if (!ensureData()) return;
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
      description: "Download all your ads and cognitive insights as a spreadsheet",
      logo: <Table2 className="h-5 w-5 text-[#16a34a]" />,
      action: (
        <Button
          variant="outline"
          className="rounded-xl border-primary/40 bg-primary/15 text-foreground hover:border-primary/60 hover:bg-primary/25"
          onClick={handleCsvExport}
          disabled={mediaQ.isLoading}
        >
          Export
        </Button>
      ),
    },
    {
      name: "Export to PDF",
      description: "Generate a branded Neuro Report with scores and insights",
      logo: <FileText className="h-5 w-5 text-[#dc2626]" />,
      action: (
        <Button
          variant="outline"
          className="rounded-xl border-primary/40 bg-primary/15 text-foreground hover:border-primary/60 hover:bg-primary/25"
          onClick={handlePdfExport}
          disabled={mediaQ.isLoading}
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
};

type IntegrationItem = {
  name: string;
  description: string;
  logo: React.ReactNode;
  action: React.ReactNode;
};

type Score = {
  label: string;
  value: number;
};

type CampaignExportRow = {
  campaignName: string;
  adCopyVariant: string;
  mediaType: string;
  createdAt: string;
  contentUrl: string;
  scores: Score[];
  peakActivationStep: string;
  aiInsights: string;
};

const NEURO_SCORES: Score[] = [
  { label: "Visual Cortex", value: 78 },
  { label: "Language Network", value: 86 },
  { label: "Attention", value: 74 },
  { label: "Emotional Response", value: 81 },
  { label: "Memory Encoding", value: 69 },
  { label: "Overall Impact", value: 82 },
];

const PEAK_ACTIVATION_STEP = "Message comprehension";

const AI_INSIGHTS = [
  "High parietal activation suggests this campaign is likely to capture and hold viewer attention effectively.",
  "Language network response indicates strong message clarity and persuasive structure.",
  "Reward and memory signals suggest strong emotional resonance with follow-up recall potential.",
];

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

function buildCampaignExportRows(items: MediaItem[]): CampaignExportRow[] {
  return items.map((item) => ({
    campaignName: item.title?.trim() || "Cortex Campaign",
    adCopyVariant: item.content_text?.trim() || item.content_url || "Media creative",
    mediaType: item.type,
    createdAt: item.created_at,
    contentUrl: item.content_url ?? "",
    scores: NEURO_SCORES,
    peakActivationStep: PEAK_ACTIVATION_STEP,
    aiInsights: AI_INSIGHTS.join(" "),
  }));
}

function exportCsv(rows: CampaignExportRow[]) {
  const scoreHeaders = NEURO_SCORES.map((score) => score.label);
  const headers = [
    "Campaign Name",
    "Ad Copy Variant",
    "Media Type",
    "Created At",
    "Content URL",
    ...scoreHeaders,
    "Peak Activation Step",
    "AI Insights",
  ];

  const body = rows.map((row) =>
    [
      row.campaignName,
      row.adCopyVariant,
      row.mediaType,
      row.createdAt,
      row.contentUrl,
      ...row.scores.map((score) => String(score.value)),
      row.peakActivationStep,
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

function exportPdf(rows: CampaignExportRow[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const first = rows[0];
  let y = 48;

  doc.setFillColor(15, 17, 21);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Cortex", margin, 15);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Neuro Report", margin, 24);
  doc.setTextColor(70, 70, 70);
  doc.setFontSize(11);
  doc.text(`Campaign: ${first.campaignName}`, margin, y);
  y += 7;
  doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y);
  y += 12;

  doc.setTextColor(15, 17, 21);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Cognitive Scores", margin, y);
  y += 8;

  first.scores.forEach((score) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    doc.text(score.label, margin, y);
    doc.text(`${score.value}/100`, pageWidth - margin - 18, y);
    y += 3;
    doc.setFillColor(229, 231, 235);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 3, 1.5, 1.5, "F");
    doc.setFillColor(1, 105, 111);
    doc.roundedRect(margin, y, (pageWidth - margin * 2) * (score.value / 100), 3, 1.5, 1.5, "F");
    y += 9;
  });

  y += 2;
  doc.setTextColor(15, 17, 21);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Peak Activation", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  doc.text(first.peakActivationStep, margin, y);
  y += 12;

  doc.setTextColor(15, 17, 21);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("AI Insights", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  const insightLines = doc.splitTextToSize(first.aiInsights, pageWidth - margin * 2);
  doc.text(insightLines, margin, y);
  y += insightLines.length * 5 + 8;

  doc.setTextColor(15, 17, 21);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Campaign Assets", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);

  rows.forEach((row, index) => {
    if (y > pageHeight - 26) {
      doc.addPage();
      y = 20;
    }
    const copy = doc.splitTextToSize(row.adCopyVariant, pageWidth - margin * 2 - 10);
    doc.text(`${index + 1}. ${row.campaignName} (${row.mediaType})`, margin, y);
    y += 5;
    doc.text(copy.slice(0, 3), margin + 4, y);
    y += Math.min(copy.length, 3) * 4 + 5;
  });

  doc.setFillColor(15, 17, 21);
  doc.rect(0, pageHeight - 16, pageWidth, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("Generated by Cortex / NeuroPulse", margin, pageHeight - 7);
  doc.save("cortex-neuro-report.pdf");
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
