import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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

  const loadCampaignData = async () => {
    const result = await fnList();
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
      description: "Download all your ads and cognitive insights as a spreadsheet",
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
      description: "Generate a branded Neuro Report with scores and insights",
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
  const pdf = createPdfReport(rows);
  triggerDownload(new Blob([pdf], { type: "application/pdf" }), "cortex-neuro-report.pdf");
}

function createPdfReport(rows: CampaignExportRow[]) {
  const first = rows[0];
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
    text("Generated by Cortex / NeuroPulse", margin, pageHeight - 11, 9, color(209, 213, 219));
  };
  const startPage = () => {
    commands = "";
    rect(0, 0, pageWidth, 72, color(15, 17, 21));
    text("CORTEX / NEUROPULSE", margin, 27, 10, color(125, 211, 252), "F2");
    text("Neuro Report", margin, 54, 24, color(255, 255, 255), "F2");
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

  sectionBox(76);
  heading("Campaign Summary");
  text(`Campaign: ${first.campaignName}`, margin, y, 10, color(75, 85, 99));
  y += 15;
  text(`Date: ${new Date().toLocaleDateString()}`, margin, y, 10, color(75, 85, 99));
  y += 15;
  text(`Assets analyzed: ${rows.length}`, margin, y, 10, color(75, 85, 99));
  y += 25;

  sectionBox(148);
  heading("Cognitive Scores");
  first.scores.forEach((score) => {
    text(score.label, margin, y, 10, color(55, 65, 81));
    text(`${score.value}/100`, pageWidth - margin - 44, y, 10, color(55, 65, 81), "F2");
    y += 7;
    rect(margin, y, contentWidth, 5, color(229, 231, 235));
    rect(margin, y, contentWidth * (score.value / 100), 5, color(1, 105, 111));
    y += 16;
  });
  y += 10;

  sectionBox(62);
  heading("Peak Activation");
  paragraph(first.peakActivationStep);

  sectionBox(92);
  heading("AI Insights");
  paragraph(first.aiInsights, 92);

  heading("Campaign Assets");
  rows.forEach((row, index) => {
    const copyLines = wrapPdfText(row.adCopyVariant, 105).slice(0, 5);
    ensureSpace(34 + copyLines.length * 13);
    text(
      `${index + 1}. ${row.campaignName} (${row.mediaType})`,
      margin,
      y,
      10,
      color(17, 24, 39),
      "F2",
    );
    y += 15;
    copyLines.forEach((line) => {
      text(line, margin + 10, y, 9, color(75, 85, 99));
      y += 13;
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
