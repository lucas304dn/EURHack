import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "final");
const presRoot = path.join(__dirname, "presentations", "cortex_pitch");
const slidesDir = path.join(presRoot, "slides");
const previewDir = path.join(presRoot, "preview");
const layoutDir = path.join(presRoot, "layout");
const qaDir = path.join(presRoot, "qa");
const skillDir = "C:/Users/nikol/.codex/plugins/cache/openai-primary-runtime/presentations/26.515.10909/skills/presentations";
const nodeExe = "C:/Users/nikol/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe";
const pythonExe = "C:/Users/nikol/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";

const years = ["Year 1", "Year 2", "Year 3"];
const assumptions = {
  starterPrice: 249,
  growthPrice: 799,
  enterprisePrice: 2500,
  usagePrice: 2.5,
  endingStarter: [25, 120, 350],
  endingGrowth: [8, 45, 130],
  endingEnterprise: [1, 8, 25],
  analysesPerStarter: 40,
  analysesPerGrowth: 100,
  analysesPerEnterprise: 300,
  cogsPct: [0.32, 0.25, 0.2],
  payroll: [180000, 520000, 1100000],
  marketing: [60000, 220000, 520000],
  gna: [50000, 140000, 260000],
  rdInfra: [80000, 180000, 360000],
  openingCash: 750000,
};

const story = {
  thesis:
    "Cortex turns ad creation into a pre-spend feedback loop: generate multimodal creative, predict neural response, and export the highest-potential assets before media budget is committed.",
  sources: [
    "Repo: Dashboard generates text/image/video/audio assets using OpenRouter, Gemini/Pollinations, and ElevenLabs.",
    "Repo: Neural Feedback analyzes text/audio/video with TRIBE v2 and persists scores, region masks, viewer links, and LLM interpretations.",
    "Repo: Integrations export CSV/PDF reports and reserve future Meta Ads publishing.",
    "PDF: TRIBE v2 is open source for non-commercial research/hackathon use under CC BY-NC; commercial deployment requires licensed, partnered, or replacement model infrastructure.",
  ],
};

function euro(value) {
  if (Math.abs(value) >= 1_000_000) return `EUR ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `EUR ${(value / 1_000).toFixed(0)}k`;
  return `EUR ${value.toFixed(0)}`;
}

function avgEnding(arr, idx) {
  return idx === 0 ? arr[idx] / 2 : (arr[idx - 1] + arr[idx]) / 2;
}

function modelRows() {
  return years.map((year, i) => {
    const avgStarter = avgEnding(assumptions.endingStarter, i);
    const avgGrowth = avgEnding(assumptions.endingGrowth, i);
    const avgEnterprise = avgEnding(assumptions.endingEnterprise, i);
    const subscription =
      12 *
      (avgStarter * assumptions.starterPrice +
        avgGrowth * assumptions.growthPrice +
        avgEnterprise * assumptions.enterprisePrice);
    const analyses =
      12 *
      (avgStarter * assumptions.analysesPerStarter +
        avgGrowth * assumptions.analysesPerGrowth +
        avgEnterprise * assumptions.analysesPerEnterprise);
    const usage = analyses * assumptions.usagePrice;
    const revenue = subscription + usage;
    const cogs = revenue * assumptions.cogsPct[i];
    const grossProfit = revenue - cogs;
    const opex =
      assumptions.payroll[i] + assumptions.marketing[i] + assumptions.gna[i] + assumptions.rdInfra[i];
    const ebitda = grossProfit - opex;
    return {
      year,
      avgCustomers: avgStarter + avgGrowth + avgEnterprise,
      endingCustomers:
        assumptions.endingStarter[i] + assumptions.endingGrowth[i] + assumptions.endingEnterprise[i],
      subscription,
      usage,
      revenue,
      cogs,
      grossProfit,
      grossMargin: grossProfit / revenue,
      opex,
      ebitda,
    };
  });
}

async function buildWorkbook() {
  await fs.mkdir(outDir, { recursive: true });
  const workbook = Workbook.create();
  const summary = workbook.worksheets.add("Executive Summary");
  const inputs = workbook.worksheets.add("Assumptions");
  const revenue = workbook.worksheets.add("Revenue Model");
  const pnl = workbook.worksheets.add("P&L");
  const cash = workbook.worksheets.add("Cash Runway");
  const bmc = workbook.worksheets.add("Business Model Canvas");
  for (const s of [summary, inputs, revenue, pnl, cash, bmc]) s.showGridLines = false;

  inputs.getRange("A1:D1").values = [["Cortex 3-Year Model Assumptions", "", "", ""]];
  inputs.getRange("A3:D20").values = [
    ["Metric", "Year 1", "Year 2", "Year 3"],
    ["Ending Starter customers", ...assumptions.endingStarter],
    ["Ending Growth customers", ...assumptions.endingGrowth],
    ["Ending Enterprise customers", ...assumptions.endingEnterprise],
    ["Starter price / month", assumptions.starterPrice, assumptions.starterPrice, assumptions.starterPrice],
    ["Growth price / month", assumptions.growthPrice, assumptions.growthPrice, assumptions.growthPrice],
    ["Enterprise ARPA / month", assumptions.enterprisePrice, assumptions.enterprisePrice, assumptions.enterprisePrice],
    ["Starter analyses / customer / month", assumptions.analysesPerStarter, assumptions.analysesPerStarter, assumptions.analysesPerStarter],
    ["Growth analyses / customer / month", assumptions.analysesPerGrowth, assumptions.analysesPerGrowth, assumptions.analysesPerGrowth],
    ["Enterprise analyses / customer / month", assumptions.analysesPerEnterprise, assumptions.analysesPerEnterprise, assumptions.analysesPerEnterprise],
    ["Usage price / analyzed asset", assumptions.usagePrice, assumptions.usagePrice, assumptions.usagePrice],
    ["COGS % of revenue", ...assumptions.cogsPct],
    ["Payroll", ...assumptions.payroll],
    ["Marketing & sales", ...assumptions.marketing],
    ["G&A", ...assumptions.gna],
    ["R&D / model infrastructure", ...assumptions.rdInfra],
    ["Opening cash / seed ask", assumptions.openingCash, "", ""],
  ];

  revenue.getRange("A1:D1").values = [["Revenue Model", "", "", ""]];
  revenue.getRange("A3:D17").values = [
    ["Line item", ...years],
    ["Avg Starter customers", "", "", ""],
    ["Avg Growth customers", "", "", ""],
    ["Avg Enterprise customers", "", "", ""],
    ["Total avg customers", "", "", ""],
    ["Subscription revenue", "", "", ""],
    ["Analyses processed", "", "", ""],
    ["Usage revenue", "", "", ""],
    ["Total revenue", "", "", ""],
    ["Revenue growth", "", "", ""],
    ["Ending customers", "", "", ""],
    ["Blended ARPA / month", "", "", ""],
    ["Gross margin", "", "", ""],
    ["Commercialization note", "Assumes a commercial license, partner route, or replacement model after hackathon/research prototype.", "", ""],
  ];
  revenue.getRange("B4:D4").formulas = [[
    "=Assumptions!B4/2",
    "=(Assumptions!B4+Assumptions!C4)/2",
    "=(Assumptions!C4+Assumptions!D4)/2",
  ]];
  revenue.getRange("B5:D5").formulas = [[
    "=Assumptions!B5/2",
    "=(Assumptions!B5+Assumptions!C5)/2",
    "=(Assumptions!C5+Assumptions!D5)/2",
  ]];
  revenue.getRange("B6:D6").formulas = [[
    "=Assumptions!B6/2",
    "=(Assumptions!B6+Assumptions!C6)/2",
    "=(Assumptions!C6+Assumptions!D6)/2",
  ]];
  revenue.getRange("B7:D7").formulas = [["=SUM(B4:B6)", "=SUM(C4:C6)", "=SUM(D4:D6)"]];
  revenue.getRange("B8:D8").formulas = [[
    "=12*(B4*Assumptions!B7+B5*Assumptions!B8+B6*Assumptions!B9)",
    "=12*(C4*Assumptions!C7+C5*Assumptions!C8+C6*Assumptions!C9)",
    "=12*(D4*Assumptions!D7+D5*Assumptions!D8+D6*Assumptions!D9)",
  ]];
  revenue.getRange("B9:D9").formulas = [[
    "=12*(B4*Assumptions!B10+B5*Assumptions!B11+B6*Assumptions!B12)",
    "=12*(C4*Assumptions!C10+C5*Assumptions!C11+C6*Assumptions!C12)",
    "=12*(D4*Assumptions!D10+D5*Assumptions!D11+D6*Assumptions!D12)",
  ]];
  revenue.getRange("B10:D10").formulas = [["=B9*Assumptions!B13", "=C9*Assumptions!C13", "=D9*Assumptions!D13"]];
  revenue.getRange("B11:D11").formulas = [["=B8+B10", "=C8+C10", "=D8+D10"]];
  revenue.getRange("B12:D12").formulas = [["", "=C11/B11-1", "=D11/C11-1"]];
  revenue.getRange("B13:D13").formulas = [["=SUM(Assumptions!B4:B6)", "=SUM(Assumptions!C4:C6)", "=SUM(Assumptions!D4:D6)"]];
  revenue.getRange("B14:D14").formulas = [["=B11/B7/12", "=C11/C7/12", "=D11/D7/12"]];
  revenue.getRange("B15:D15").formulas = [["=1-Assumptions!B14", "=1-Assumptions!C14", "=1-Assumptions!D14"]];

  pnl.getRange("A1:D1").values = [["P&L", "", "", ""]];
  pnl.getRange("A3:D14").values = [
    ["Line item", ...years],
    ["Revenue", "", "", ""],
    ["COGS", "", "", ""],
    ["Gross profit", "", "", ""],
    ["Gross margin", "", "", ""],
    ["Payroll", "", "", ""],
    ["Marketing & sales", "", "", ""],
    ["G&A", "", "", ""],
    ["R&D / model infrastructure", "", "", ""],
    ["Operating expenses", "", "", ""],
    ["EBITDA", "", "", ""],
    ["EBITDA margin", "", "", ""],
  ];
  pnl.getRange("B4:D4").formulas = [["='Revenue Model'!B11", "='Revenue Model'!C11", "='Revenue Model'!D11"]];
  pnl.getRange("B5:D5").formulas = [["=B4*Assumptions!B14", "=C4*Assumptions!C14", "=D4*Assumptions!D14"]];
  pnl.getRange("B6:D6").formulas = [["=B4-B5", "=C4-C5", "=D4-D5"]];
  pnl.getRange("B7:D7").formulas = [["=B6/B4", "=C6/C4", "=D6/D4"]];
  pnl.getRange("B8:D10").formulas = [
    ["=Assumptions!B15", "=Assumptions!C15", "=Assumptions!D15"],
    ["=Assumptions!B16", "=Assumptions!C16", "=Assumptions!D16"],
    ["=Assumptions!B17", "=Assumptions!C17", "=Assumptions!D17"],
  ];
  pnl.getRange("B11:D11").formulas = [["=Assumptions!B18", "=Assumptions!C18", "=Assumptions!D18"]];
  pnl.getRange("B12:D12").formulas = [["=SUM(B8:B11)", "=SUM(C8:C11)", "=SUM(D8:D11)"]];
  pnl.getRange("B13:D13").formulas = [["=B6-B12", "=C6-C12", "=D6-D12"]];
  pnl.getRange("B14:D14").formulas = [["=B13/B4", "=C13/C4", "=D13/D4"]];

  cash.getRange("A1:D1").values = [["Cash Runway", "", "", ""]];
  cash.getRange("A3:D9").values = [
    ["Line item", ...years],
    ["Opening cash", "", "", ""],
    ["EBITDA / burn", "", "", ""],
    ["Closing cash", "", "", ""],
    ["Avg monthly burn when negative", "", "", ""],
    ["Runway at year end", "", "", ""],
    ["Financing implication", "Seed ask funds productization path and first GTM proof points.", "", ""],
  ];
  cash.getRange("B4:D4").formulas = [["=Assumptions!B19", "=B6", "=C6"]];
  cash.getRange("B5:D5").formulas = [["='P&L'!B13", "='P&L'!C13", "='P&L'!D13"]];
  cash.getRange("B6:D6").formulas = [["=B4+B5", "=C4+C5", "=D4+D5"]];
  cash.getRange("B7:D7").formulas = [["=IF(B5<0,-B5/12,0)", "=IF(C5<0,-C5/12,0)", "=IF(D5<0,-D5/12,0)"]];
  cash.getRange("B8:D8").formulas = [["=IF(B7>0,B6/B7,\"Profitable\")", "=IF(C7>0,C6/C7,\"Profitable\")", "=IF(D7>0,D6/D7,\"Profitable\")"]];

  const rows = modelRows();
  summary.getRange("A1:G1").values = [["Cortex investor package: 3-year model", "", "", "", "", "", ""]];
  summary.getRange("A3:G8").values = [
    ["Thesis", story.thesis, "", "", "", "", ""],
    ["Model stance", "Editable directional model; not historical financials. Commercial revenue assumes resolved model licensing path.", "", "", "", "", ""],
    ["Year", ...years, "", "", ""],
    ["Revenue", ...rows.map((r) => r.revenue), "", "", ""],
    ["Gross margin", ...rows.map((r) => r.grossMargin), "", "", ""],
    ["EBITDA", ...rows.map((r) => r.ebitda), "", "", ""],
  ];
  summary.getRange("A10:D14").values = [
    ["Top investor takeaways", "", "", ""],
    ["1", "Demo wedge is already built: generation, gallery, TRIBE analysis, brain viewer, export.", "", ""],
    ["2", "Revenue model combines subscriptions with usage-priced pre-spend creative testing.", "", ""],
    ["3", "Biggest diligence item is licensing: CC BY-NC TRIBE v2 cannot be the commercial core without a route around it.", "", ""],
    ["4", "Seed capital is positioned around productizing the model layer and proving agency/SMB pull.", "", ""],
  ];
  summary.getRange("F10:H14").values = [
    ["Metric", "Y1", "Y3"],
    ["Ending customers", rows[0].endingCustomers, rows[2].endingCustomers],
    ["Revenue", rows[0].revenue, rows[2].revenue],
    ["Gross margin", rows[0].grossMargin, rows[2].grossMargin],
    ["EBITDA", rows[0].ebitda, rows[2].ebitda],
  ];
  summary.getRange("J3:M6").values = [
    ["Year", "Revenue", "Gross Profit", "EBITDA"],
    ...rows.map((r) => [r.year, r.revenue, r.grossProfit, r.ebitda]),
  ];
  const chart = summary.charts.add("line", summary.getRange("J3:M6"));
  chart.title = "Revenue and EBITDA trajectory";
  chart.hasLegend = true;
  chart.xAxis = { axisType: "textAxis" };
  chart.yAxis = { numberFormatCode: "€#,##0" };
  chart.setPosition("J8", "Q24");

  bmc.getRange("A1:E1").values = [["Business Model Canvas", "", "", "", ""]];
  bmc.getRange("A3:E12").values = [
    ["Key Partners", "Key Activities", "Value Propositions", "Customer Relationships", "Customer Segments"],
    [
      "Meta/TRIBE research ecosystem\nCommercial model/data partners\nSupabase + cloud/GPU providers\nOpenRouter, Gemini/Pollinations, ElevenLabs\nAgency and accelerator partners",
      "Generate multimodal ad assets\nPredict neural activation before spend\nBenchmark and interpret creative signals\nExport reports / campaign data\nBuild compliant commercial model layer",
      "Pre-spend creative intelligence: create, test, and rank ads before paid media budget is committed.\n\nA single workflow for ad generation plus neuro-response feedback.",
      "Self-serve product-led onboarding\nHigh-touch agency pilots\nQuarterly creative performance reviews\nTemplate playbooks and exportable reports",
      "SMB marketing teams\nPerformance agencies\nDTC/e-commerce brands\nInnovation teams and hackathon/research pilots\nLater: enterprise brand labs",
    ],
    ["", "Key Resources", "", "Channels", ""],
    [
      "",
      "Cortex web app\nGenerated media/gallery data\nTRIBE prototype integration\nCommercial model rights or replacement model\nFounding team + ML/GTM advisors",
      "",
      "Hackathon demos\nAgency partnerships\nFounder-led outbound\nContent around neuroscience-informed creative\nMeta/TikTok/Instagram integrations",
      "",
    ],
    ["Cost Structure", "", "", "Revenue Streams", ""],
    [
      "Model inference and GPU compute\nLLM/media generation APIs\nEngineering and ML productization\nSales/marketing and agency success\nLegal/licensing diligence",
      "",
      "",
      "SaaS subscriptions by team size\nUsage fees per analyzed creative\nAgency/enterprise pilot packages\nReports and campaign export workflows\nFuture API/integration fees",
      "",
    ],
  ];

  const headerFill = "#111827";
  for (const sheet of [summary, inputs, revenue, pnl, cash, bmc]) {
    const used = sheet.getUsedRange();
    used.format.font = { name: "Aptos", size: 10, color: "#111827" };
    used.format.wrapText = true;
    sheet.getRange("A1:H1").format = { fill: headerFill, font: { bold: true, color: "#FFFFFF", size: 16 } };
    sheet.getRange("A3:H3").format = { fill: "#E6F4F1", font: { bold: true, color: "#0F172A" } };
    used.format.autofitColumns();
    used.format.autofitRows();
  }
  for (const sheet of [inputs, revenue, pnl, cash]) {
    sheet.freezePanes.freezeRows(3);
    sheet.getRange("B:D").format.numberFormat = "€#,##0";
  }
  inputs.getRange("B14:D14").format.numberFormat = "0%";
  revenue.getRange("B12:D12").format.numberFormat = "0%";
  revenue.getRange("B15:D15").format.numberFormat = "0%";
  pnl.getRange("B7:D7").format.numberFormat = "0%";
  pnl.getRange("B14:D14").format.numberFormat = "0%";
  summary.getRange("B6:D6").format.numberFormat = "€#,##0";
  summary.getRange("B7:D7").format.numberFormat = "0%";
  summary.getRange("B8:D8").format.numberFormat = "€#,##0";
  summary.getRange("G13:H13").format.numberFormat = "0%";
  bmc.getRange("A3:E12").format.columnWidthPx = 220;
  bmc.getRange("A4:E4").format.rowHeightPx = 170;
  bmc.getRange("A7:E7").format.rowHeightPx = 150;
  bmc.getRange("A10:E10").format.rowHeightPx = 130;

  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 200 },
    summary: "final formula error scan",
  });
  console.log(errors.ndjson);
  for (const sheetName of ["Executive Summary", "Revenue Model", "P&L", "Business Model Canvas"]) {
    const blob = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
    await fs.writeFile(path.join(outDir, `${sheetName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`), new Uint8Array(await blob.arrayBuffer()));
  }
  const output = await SpreadsheetFile.exportXlsx(workbook);
  const modelPath = path.join(outDir, "Cortex_3-Year_Investor_Model.xlsx");
  await output.save(modelPath);
  return { modelPath, rows };
}

function slideModuleSource(slideNo, fnName, body) {
  return `import { bg, text, rect, rule, footer, kicker, title, metricRail, barChart, miniTable, wrap, connector, STYLE, data } from "./shared.mjs";\n\nexport async function ${fnName}(presentation, ctx) {\n  const slide = presentation.slides.add();\n${body}\n  return slide;\n}\n`;
}

function sharedSource(rows) {
  const deckData = {
    story,
    rows,
    model: {
      y1Revenue: euro(rows[0].revenue),
      y3Revenue: euro(rows[2].revenue),
      y3Customers: rows[2].endingCustomers,
      y3GrossMargin: `${Math.round(rows[2].grossMargin * 100)}%`,
      seedAsk: euro(assumptions.openingCash),
    },
  };
  return `
export const STYLE = {
  bg: "#0F1115",
  panel: "#171A20",
  panel2: "#22262E",
  ink: "#F6F8FB",
  soft: "#A9B2C3",
  muted: "#687386",
  line: "#2D3440",
  accent: "#8FD7FF",
  accent2: "#BDA7FF",
  accent3: "#7AF0C1",
  warn: "#FFCF70",
  danger: "#FF8A8A",
  serif: "Georgia",
  sans: "Aptos",
};
export const data = ${JSON.stringify(deckData, null, 2)};

export function bg(slide, ctx, style = STYLE) {
  rect(slide, ctx, 0, 0, 1280, 720, style.bg);
  rect(slide, ctx, 0, 0, 1280, 720, "#101821");
  rule(slide, ctx, 58, 682, 1164, "#26313C", 1);
}
export function text(slide, ctx, value, x, y, w, h, opts = {}) {
  return ctx.addText(slide, {
    text: String(value ?? ""),
    left: x, top: y, width: w, height: h,
    fontSize: opts.size ?? 18,
    color: opts.color ?? STYLE.ink,
    bold: Boolean(opts.bold),
    typeface: opts.face ?? STYLE.sans,
    align: opts.align ?? "left",
    valign: opts.valign ?? "top",
    fill: opts.fill ?? "#00000000",
    line: opts.line ?? ctx.line(),
    insets: opts.insets ?? { left: 0, right: 0, top: 0, bottom: 0 },
    name: opts.name,
  });
}
export function rect(slide, ctx, x, y, w, h, fill, opts = {}) {
  return ctx.addShape(slide, {
    left: x, top: y, width: w, height: h,
    geometry: opts.geometry ?? "rect",
    fill,
    line: opts.line ?? ctx.line(opts.lineColor ?? "#00000000", opts.weight ?? 0),
    name: opts.name,
  });
}
export function rule(slide, ctx, x, y, w, color = STYLE.line, weight = 1) {
  rect(slide, ctx, x, y, w, weight, color);
}
export function footer(slide, ctx, page, label = "Cortex investor package | directional model") {
  text(slide, ctx, label, 58, 690, 760, 14, { size: 8, color: STYLE.muted });
  text(slide, ctx, String(page).padStart(2, "0"), 1180, 686, 44, 18, { size: 11, color: STYLE.soft, face: STYLE.serif, bold: true, align: "right" });
}
export function kicker(slide, ctx, label, x = 58, y = 50) {
  rect(slide, ctx, x, y + 3, 10, 10, STYLE.accent, { name: "kicker-marker" });
  text(slide, ctx, label.toUpperCase().split("").join(" "), x + 22, y, 540, 18, { size: 9.5, color: STYLE.soft, bold: true, name: "kicker-label" });
}
export function title(slide, ctx, value, x = 58, y = 86, w = 920, h = 96, size = 38) {
  text(slide, ctx, value, x, y, w, h, { size, color: STYLE.ink, face: STYLE.serif, bold: true });
}
export function wrap(value, maxChars = 62, maxLines = 4) {
  const words = String(value || "").replace(/\\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (next.length > maxChars && line) { lines.push(line); line = word; } else { line = next; }
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (words.length && lines.join(" ").length < words.join(" ").length && lines.length) lines[lines.length - 1] = lines[lines.length - 1].replace(/[.,;:]?$/, "") + "...";
  return lines.join("\\n");
}
export function metricRail(slide, ctx, x, y, metrics) {
  metrics.forEach((m, i) => {
    const xx = x + i * 255;
    rule(slide, ctx, xx, y - 8, 1, i % 2 ? STYLE.accent2 : STYLE.accent, 58);
    text(slide, ctx, m.value, xx + 15, y, 210, 34, { size: 27, color: STYLE.ink, face: STYLE.serif, bold: true });
    text(slide, ctx, m.label, xx + 15, y + 39, 210, 18, { size: 9.5, color: STYLE.soft, bold: true });
    text(slide, ctx, m.note, xx + 15, y + 58, 210, 26, { size: 8.5, color: STYLE.muted });
  });
}
export function barChart(slide, ctx, x, y, w, h, items) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const rowH = h / items.length;
  items.forEach((item, idx) => {
    const yy = y + idx * rowH;
    text(slide, ctx, item.label, x, yy + 2, 190, 22, { size: 11, color: STYLE.ink, bold: idx === 0 });
    rect(slide, ctx, x + 215, yy + 5, w - 315, 13, "#26313C");
    rect(slide, ctx, x + 215, yy + 5, Math.max(8, (w - 315) * (item.value / max)), 13, item.color || STYLE.accent);
    text(slide, ctx, item.note, x + w - 85, yy, 80, 20, { size: 10, color: STYLE.soft, align: "right", bold: true });
  });
}
export function miniTable(slide, ctx, x, y, cols, rows, widths) {
  const rowH = 34;
  rect(slide, ctx, x - 12, y - 10, widths.reduce((a,b)=>a+b,0) + 24, rowH + 14, "#111827");
  cols.forEach((c, i) => text(slide, ctx, c, x + widths.slice(0, i).reduce((a,b)=>a+b,0), y, widths[i] - 12, 20, { size: 9.5, color: "#FFFFFF", bold: true }));
  rows.forEach((r, ri) => {
    const yy = y + rowH * (ri + 1);
    rule(slide, ctx, x - 12, yy - 7, widths.reduce((a,b)=>a+b,0) + 24, "#26313C", 1);
    r.forEach((c, i) => text(slide, ctx, c, x + widths.slice(0, i).reduce((a,b)=>a+b,0), yy, widths[i] - 12, 22, { size: 10.5, color: i === 0 ? STYLE.ink : STYLE.soft, bold: i === 0 }));
  });
}
export function connector(slide, ctx, x1, y1, x2, y2, color = STYLE.accent) {
  rule(slide, ctx, x1, y1, x2 - x1, color, 2);
  rect(slide, ctx, x2 - 5, y2 - 5, 10, 10, color, { geometry: "ellipse" });
}
`;
}

async function buildSlides(rows) {
  await fs.rm(presRoot, { recursive: true, force: true });
  await fs.mkdir(slidesDir, { recursive: true });
  await fs.mkdir(previewDir, { recursive: true });
  await fs.mkdir(layoutDir, { recursive: true });
  await fs.mkdir(qaDir, { recursive: true });
  await fs.writeFile(path.join(slidesDir, "shared.mjs"), sharedSource(rows), "utf8");

  const slides = [
    slideModuleSource(1, "slide01", `
  bg(slide, ctx);
  rect(slide, ctx, 58, 55, 5, 54, STYLE.accent);
  text(slide, ctx, "CORTEX", 78, 55, 300, 22, { size: 11, color: STYLE.soft, bold: true });
  text(slide, ctx, "Investor-ready hackathon package", 78, 84, 430, 18, { size: 10, color: STYLE.muted });
  title(slide, ctx, "Brain-informed ad creation before media spend.", 58, 178, 720, 150, 54);
  text(slide, ctx, wrap(data.story.thesis, 66, 4), 790, 190, 360, 116, { size: 18, color: STYLE.ink, face: STYLE.serif, bold: true });
  rule(slide, ctx, 58, 500, 1164, STYLE.line, 1);
  metricRail(slide, ctx, 58, 548, [
    { value: "4", label: "Creative formats", note: "text, image, video, audio" },
    { value: "6", label: "Neural rubrics", note: "attention, memory, language..." },
    { value: data.model.y3Revenue, label: "Y3 revenue case", note: "directional model" },
    { value: data.model.seedAsk, label: "Seed ask", note: "license + GTM runway" },
  ]);
  footer(slide, ctx, 1, "Cortex | investor narrative, BMC, and 3-year model");`),
    slideModuleSource(2, "slide02", `
  bg(slide, ctx); kicker(slide, ctx, "Problem"); title(slide, ctx, "Marketers still learn whether creative works only after the budget is already burning.");
  text(slide, ctx, "Creative testing is trapped between subjective review and lagging platform metrics. Small teams cannot afford full neuromarketing studies, and agencies need faster proof before scaling spend.", 58, 205, 600, 92, { size: 18, color: STYLE.soft });
  barChart(slide, ctx, 86, 354, 780, 180, [
    { label: "Subjective creative reviews", value: 88, note: "fast / weak signal", color: STYLE.warn },
    { label: "A/B testing after spend", value: 70, note: "real / delayed", color: STYLE.accent2 },
    { label: "Lab neuromarketing", value: 28, note: "strong / slow", color: STYLE.danger },
    { label: "Cortex target state", value: 96, note: "fast / pre-spend", color: STYLE.accent3 },
  ]);
  rect(slide, ctx, 930, 238, 230, 240, STYLE.panel);
  text(slide, ctx, "Shortlist point", 958, 268, 180, 24, { size: 11, color: STYLE.accent, bold: true });
  text(slide, ctx, "The product does not ask judges to believe in better ads. It shows a workflow for deciding which assets deserve money before campaigns go live.", 958, 306, 168, 124, { size: 15, color: STYLE.ink });
  footer(slide, ctx, 2);`),
    slideModuleSource(3, "slide03", `
  bg(slide, ctx); kicker(slide, ctx, "Solution"); title(slide, ctx, "Cortex closes the loop: generate, predict response, keep the best creative.");
  const steps = [
    ["1", "Prompt", "Start from a campaign brief or upload existing creative."],
    ["2", "Generate", "Create copy, image, video, or audio variants."],
    ["3", "Analyze", "Run text/audio/video through TRIBE v2 neural-response prediction."],
    ["4", "Export", "Save reports, CSV/PDF, and prepare platform handoff."],
  ];
  steps.forEach((s, i) => {
    const x = 72 + i * 292;
    rect(slide, ctx, x, 260, 232, 210, i === 2 ? "#203141" : STYLE.panel);
    text(slide, ctx, s[0], x + 22, 286, 44, 40, { size: 31, color: i === 2 ? STYLE.accent : STYLE.accent2, face: STYLE.serif, bold: true });
    text(slide, ctx, s[1], x + 22, 344, 180, 28, { size: 19, color: STYLE.ink, bold: true });
    text(slide, ctx, s[2], x + 22, 386, 176, 58, { size: 12, color: STYLE.soft });
    if (i < 3) connector(slide, ctx, x + 244, 365, x + 280, 365);
  });
  text(slide, ctx, "Result: a pre-spend creative intelligence layer that feels like a tool, not a research demo.", 72, 548, 950, 36, { size: 21, color: STYLE.ink, face: STYLE.serif, bold: true });
  footer(slide, ctx, 3);`),
    slideModuleSource(4, "slide04", `
  bg(slide, ctx); kicker(slide, ctx, "Product"); title(slide, ctx, "The repo already contains a demoable product surface, not only a concept.");
  miniTable(slide, ctx, 78, 230, ["Surface", "What exists", "Investor read"], [
    ["Creative generator", "Text, image, video, audio generation with provider APIs", "Multimodal wedge"],
    ["Gallery", "Saved assets with download, delete, preview, and fullscreen", "Workflow retention"],
    ["Neural Feedback", "Upload/select text, audio, video; score cortical response", "Differentiation"],
    ["Reports", "CSV and PDF export with saved TRIBE scores", "Buyer handoff"],
    ["Integrations", "Meta Ads marked as coming soon", "GTM direction"],
  ], [210, 470, 310]);
  rect(slide, ctx, 905, 160, 230, 46, "#203141");
  text(slide, ctx, "Built evidence", 928, 173, 170, 20, { size: 12, color: STYLE.accent, bold: true });
  text(slide, ctx, "TanStack / Supabase app with live API integrations, persisted media, neural analysis runs, and export logic.", 905, 525, 245, 70, { size: 13, color: STYLE.soft });
  footer(slide, ctx, 4, "Source: local EURHack repository");`),
    slideModuleSource(5, "slide05", `
  bg(slide, ctx); kicker(slide, ctx, "Why Now"); title(slide, ctx, "Multimodal generation made creative cheap; brain encoding can make selection smarter.");
  metricRail(slide, ctx, 78, 222, [
    { value: "1,115h+", label: "fMRI training data", note: "TRIBE v2 source PDF" },
    { value: "720+", label: "volunteers", note: "large naturalistic dataset" },
    { value: "70x", label: "resolution gain", note: "vs prior methods" },
    { value: "2-3x", label: "accuracy gain", note: "reported in PDF" },
  ]);
  rect(slide, ctx, 92, 390, 390, 145, STYLE.panel);
  text(slide, ctx, "Generation layer", 120, 420, 250, 24, { size: 18, color: STYLE.ink, bold: true });
  text(slide, ctx, "LLMs and media APIs now create many campaign variants in minutes.", 120, 462, 300, 44, { size: 14, color: STYLE.soft });
  rect(slide, ctx, 520, 390, 390, 145, STYLE.panel);
  text(slide, ctx, "Prediction layer", 548, 420, 250, 24, { size: 18, color: STYLE.ink, bold: true });
  text(slide, ctx, "TRIBE v2 proves a technical path for predicting response to text, audio, and video.", 548, 462, 300, 44, { size: 14, color: STYLE.soft });
  rect(slide, ctx, 948, 390, 220, 145, "#203141");
  text(slide, ctx, "Cortex layer", 976, 420, 150, 24, { size: 18, color: STYLE.accent, bold: true });
  text(slide, ctx, "A practical marketer workflow around both.", 976, 462, 140, 44, { size: 14, color: STYLE.ink });
  footer(slide, ctx, 5, "Source: TRIBE v2 PDF and local app implementation");`),
    slideModuleSource(6, "slide06", `
  bg(slide, ctx); kicker(slide, ctx, "Business Model Canvas"); title(slide, ctx, "The model is a SaaS-plus-usage workflow for marketers and agencies.");
  const blocks = [
    ["Key Partners", "Model/data licensors\\nCloud + GPU providers\\nOpenRouter/Gemini/ElevenLabs\\nAgency partners"],
    ["Key Activities", "Generate creative\\nPredict neural response\\nInterpret scores\\nExport/report"],
    ["Value Proposition", "Pre-spend creative intelligence: generate and rank ads before paid budget is committed."],
    ["Customer Relationships", "Self-serve onboarding\\nAgency pilots\\nQuarterly creative reviews"],
    ["Customer Segments", "SMB marketers\\nPerformance agencies\\nDTC brands\\nBrand labs"],
    ["Key Resources", "Cortex app\\nAnalysis data\\nCommercial model rights\\nML/product team"],
    ["Channels", "Hackathon demo\\nFounder-led outbound\\nAgency partnerships\\nPlatform integrations"],
    ["Cost Structure", "Inference/API costs\\nGPU/model infra\\nEngineering\\nLegal/licensing\\nGTM"],
    ["Revenue Streams", "Subscriptions\\nUsage per analysis\\nPilot packages\\nReports/API fees"],
  ];
  const pos = [[58,188,218,210],[292,188,218,100],[526,188,228,210],[770,188,210,100],[996,188,210,210],[292,304,218,94],[770,304,210,94],[58,520,552,94],[634,520,572,94]];
  blocks.forEach((b,i)=>{ const [x,y,w,h]=pos[i]; rect(slide, ctx, x, y, w, h, i===2 ? "#203141" : STYLE.panel); text(slide, ctx, b[0], x+16, y+14, w-32, 20, { size: 13, color: i===2 ? STYLE.accent : STYLE.ink, bold: true }); text(slide, ctx, b[1], x+16, y+44, w-32, h-58, { size: i===2 ? 14 : 10.5, color: i===2 ? STYLE.ink : STYLE.soft }); });
  footer(slide, ctx, 6);`),
    slideModuleSource(7, "slide07", `
  bg(slide, ctx); kicker(slide, ctx, "Beachhead"); title(slide, ctx, "Start with teams who already pay for speed, proof, and campaign iteration.");
  barChart(slide, ctx, 86, 232, 790, 210, [
    { label: "Performance agencies", value: 92, note: "multi-client leverage", color: STYLE.accent },
    { label: "DTC/e-commerce marketers", value: 84, note: "creative volume", color: STYLE.accent3 },
    { label: "SMB marketing teams", value: 72, note: "self-serve fit", color: STYLE.accent2 },
    { label: "Enterprise brand labs", value: 45, note: "later motion", color: STYLE.warn },
  ]);
  rect(slide, ctx, 930, 218, 250, 260, STYLE.panel);
  text(slide, ctx, "Wedge logic", 960, 248, 180, 26, { size: 18, color: STYLE.ink, bold: true });
  text(slide, ctx, "Agencies turn one product workflow into many client campaigns. That creates faster feedback, usage revenue, and proof points for enterprise buyers.", 960, 296, 175, 120, { size: 15, color: STYLE.soft });
  footer(slide, ctx, 7);`),
    slideModuleSource(8, "slide08", `
  bg(slide, ctx); kicker(slide, ctx, "Go To Market"); title(slide, ctx, "The first sales motion is a paid pilot that converts creative volume into recurring usage.");
  const lanes = [
    ["Hackathon proof", "Demo the live loop and collect judge/mentor intros."],
    ["Agency pilots", "3-5 teams test live campaigns, export reports, and compare with platform outcomes."],
    ["Self-serve SaaS", "Package templates, benchmarks, and usage limits by tier."],
    ["Platform integrations", "Meta/TikTok/Instagram handoff turns insight into execution."],
  ];
  lanes.forEach((l,i)=>{ const y=205+i*96; text(slide, ctx, String(i+1).padStart(2,"0"), 78, y, 48, 34, { size: 28, color: i%2?STYLE.accent2:STYLE.accent, face: STYLE.serif, bold: true }); rule(slide, ctx, 142, y+18, 740, i%2?STYLE.accent2:STYLE.accent, 1); text(slide, ctx, l[0], 164, y, 250, 28, { size: 18, color: STYLE.ink, bold: true }); text(slide, ctx, l[1], 440, y+2, 460, 40, { size: 13, color: STYLE.soft }); });
  rect(slide, ctx, 940, 220, 210, 220, "#203141");
  text(slide, ctx, "Paid pilot package", 966, 252, 160, 24, { size: 17, color: STYLE.accent, bold: true });
  text(slide, ctx, "EUR 5k-15k\\nper agency pilot\\nwith success metrics tied to saved creative decisions.", 966, 300, 150, 100, { size: 18, color: STYLE.ink, face: STYLE.serif, bold: true });
  footer(slide, ctx, 8);`),
    slideModuleSource(9, "slide09", `
  bg(slide, ctx); kicker(slide, ctx, "3-Year Model"); title(slide, ctx, "The directional model reaches ${euro(rows[2].revenue)} in Year 3 while keeping usage economics visible.");
  miniTable(slide, ctx, 78, 218, ["Metric", "Year 1", "Year 2", "Year 3"], [
    ["Revenue", "${euro(rows[0].revenue)}", "${euro(rows[1].revenue)}", "${euro(rows[2].revenue)}"],
    ["Ending customers", "${rows[0].endingCustomers}", "${rows[1].endingCustomers}", "${rows[2].endingCustomers}"],
    ["Gross margin", "${Math.round(rows[0].grossMargin * 100)}%", "${Math.round(rows[1].grossMargin * 100)}%", "${Math.round(rows[2].grossMargin * 100)}%"],
    ["EBITDA", "${euro(rows[0].ebitda)}", "${euro(rows[1].ebitda)}", "${euro(rows[2].ebitda)}"],
  ], [260, 160, 160, 160]);
  barChart(slide, ctx, 110, 458, 750, 102, [
    { label: "Y1 revenue", value: ${Math.round(rows[0].revenue)}, note: "${euro(rows[0].revenue)}", color: STYLE.accent2 },
    { label: "Y2 revenue", value: ${Math.round(rows[1].revenue)}, note: "${euro(rows[1].revenue)}", color: STYLE.accent },
    { label: "Y3 revenue", value: ${Math.round(rows[2].revenue)}, note: "${euro(rows[2].revenue)}", color: STYLE.accent3 },
  ]);
  rect(slide, ctx, 928, 238, 232, 250, STYLE.panel);
  text(slide, ctx, "Assumption discipline", 956, 270, 166, 24, { size: 16, color: STYLE.ink, bold: true });
  text(slide, ctx, "Subscriptions create recurring base revenue; usage fees scale with analyzed creative volume. COGS improve as model infrastructure becomes less provider-dependent.", 956, 314, 162, 120, { size: 13, color: STYLE.soft });
  footer(slide, ctx, 9, "See editable Excel model for formulas and assumptions");`),
    slideModuleSource(10, "slide10", `
  bg(slide, ctx); kicker(slide, ctx, "Diligence"); title(slide, ctx, "The license risk is real, but it is also a crisp productization roadmap.");
  rect(slide, ctx, 82, 226, 315, 240, "#281F21");
  text(slide, ctx, "Current prototype", 112, 258, 220, 24, { size: 18, color: STYLE.warn, bold: true });
  text(slide, ctx, "TRIBE v2 can support non-commercial hackathon and research demos, according to the attached PDF.", 112, 308, 230, 78, { size: 15, color: STYLE.ink });
  rect(slide, ctx, 482, 226, 315, 240, "#2A1F28");
  text(slide, ctx, "Commercial blocker", 512, 258, 220, 24, { size: 18, color: STYLE.danger, bold: true });
  text(slide, ctx, "The PDF states CC BY-NC does not permit direct commercial marketing analytics deployment.", 512, 308, 230, 78, { size: 15, color: STYLE.ink });
  rect(slide, ctx, 882, 226, 315, 240, "#203141");
  text(slide, ctx, "Investor path", 912, 258, 220, 24, { size: 18, color: STYLE.accent, bold: true });
  text(slide, ctx, "Use seed funding to secure a license, partner with a lab/data provider, or replace the core model with commercial rights.", 912, 308, 230, 86, { size: 15, color: STYLE.ink });
  text(slide, ctx, "This is framed as a go/no-go diligence item, not something to gloss over.", 82, 542, 800, 34, { size: 20, color: STYLE.ink, face: STYLE.serif, bold: true });
  footer(slide, ctx, 10, "Source: attached TRIBE v2 licensing PDF");`),
    slideModuleSource(11, "slide11", `
  bg(slide, ctx); kicker(slide, ctx, "Roadmap"); title(slide, ctx, "Milestones move from demo novelty to defensible commercial creative intelligence.");
  const ms = [
    ["0-3 mo", "Hackathon polish", "Tighten UX, demo data, export reports, legal memo."],
    ["3-6 mo", "Pilot proof", "Run agency pilots and compare predicted scores with campaign outcomes."],
    ["6-12 mo", "Model route", "License, partner, or replace the neural model for commercial use."],
    ["12-24 mo", "Workflow moat", "Benchmarks, templates, integrations, and account-level learning loops."],
  ];
  ms.forEach((m,i)=>{ const x=86+i*280; rule(slide, ctx, x, 346, 230, i%2?STYLE.accent2:STYLE.accent, 2); rect(slide, ctx, x, 337, 18, 18, i%2?STYLE.accent2:STYLE.accent, { geometry: "ellipse" }); text(slide, ctx, m[0], x, 270, 110, 24, { size: 18, color: STYLE.ink, face: STYLE.serif, bold: true }); text(slide, ctx, m[1], x, 306, 180, 22, { size: 15, color: STYLE.accent, bold: true }); text(slide, ctx, m[2], x, 378, 190, 70, { size: 12.5, color: STYLE.soft }); });
  rect(slide, ctx, 92, 520, 1030, 58, STYLE.panel);
  text(slide, ctx, "North-star KPI: share of creative decisions made with pre-spend Cortex evidence before campaign launch.", 120, 540, 950, 24, { size: 18, color: STYLE.ink, bold: true });
  footer(slide, ctx, 11);`),
    slideModuleSource(12, "slide12", `
  bg(slide, ctx); kicker(slide, ctx, "Ask"); title(slide, ctx, "Use the hackathon shortlist to convert technical curiosity into funded pilot momentum.");
  metricRail(slide, ctx, 78, 215, [
    { value: data.model.seedAsk, label: "Seed ask", note: "12-18 month runway" },
    { value: "3-5", label: "Agency pilots", note: "first proof cohort" },
    { value: "1", label: "Commercial model path", note: "license / partner / replace" },
    { value: data.model.y3Revenue, label: "Y3 case", note: "editable model" },
  ]);
  rect(slide, ctx, 90, 418, 1030, 92, "#203141");
  text(slide, ctx, "Cortex is not just a creative generator. It is a decision layer for which creative deserves spend.", 120, 444, 930, 36, { size: 26, color: STYLE.ink, face: STYLE.serif, bold: true, align: "center" });
  text(slide, ctx, "Investor materials generated from the local product repo and attached TRIBE v2 document.", 280, 575, 700, 24, { size: 12, color: STYLE.soft, align: "center" });
  footer(slide, ctx, 12);`),
  ];

  for (let i = 0; i < slides.length; i++) {
    await fs.writeFile(path.join(slidesDir, `slide-${String(i + 1).padStart(2, "0")}.mjs`), slides[i], "utf8");
  }

  const finalDeck = path.join(outDir, "Cortex_Investor_Ready_Deck.pptx");
  const deckResult = spawnSync(
    nodeExe,
    [
      path.join(skillDir, "scripts", "build_artifact_deck.mjs"),
      "--workspace",
      presRoot,
      "--slides-dir",
      slidesDir,
      "--out",
      finalDeck,
      "--preview-dir",
      previewDir,
      "--layout-dir",
      layoutDir,
      "--contact-sheet",
      path.join(previewDir, "contact-sheet.png"),
      "--slide-count",
      "12",
      "--scale",
      "0.8",
    ],
    { encoding: "utf8", env: { ...process.env, HOME: "C:/Users/nikol", PYTHON: pythonExe } },
  );
  if (deckResult.status !== 0) {
    throw new Error(`Deck build failed\n${deckResult.stdout}\n${deckResult.stderr}`);
  }
  console.log(deckResult.stdout);

  const canvasOut = path.join(outDir, "Cortex_Business_Model_Canvas.pptx");
  const canvasDir = path.join(presRoot, "canvas-only");
  const canvasSlides = path.join(canvasDir, "slides");
  await fs.mkdir(canvasSlides, { recursive: true });
  await fs.copyFile(path.join(slidesDir, "shared.mjs"), path.join(canvasSlides, "shared.mjs"));
  await fs.writeFile(
    path.join(canvasSlides, "slide-01.mjs"),
    `import { slide06 } from "../../slides/slide-06.mjs";\nexport async function slide01(presentation, ctx) { return slide06(presentation, ctx); }\n`,
    "utf8",
  );
  const canvasResult = spawnSync(
    nodeExe,
    [
      path.join(skillDir, "scripts", "build_artifact_deck.mjs"),
      "--workspace",
      canvasDir,
      "--slides-dir",
      canvasSlides,
      "--out",
      canvasOut,
      "--preview-dir",
      path.join(canvasDir, "preview"),
      "--layout-dir",
      path.join(canvasDir, "layout"),
      "--slide-count",
      "1",
      "--scale",
      "1",
    ],
    { encoding: "utf8", env: { ...process.env, HOME: "C:/Users/nikol", PYTHON: pythonExe } },
  );
  if (canvasResult.status !== 0) {
    throw new Error(`Canvas build failed\n${canvasResult.stdout}\n${canvasResult.stderr}`);
  }

  await fs.writeFile(
    path.join(qaDir, "comeback-scorecard.txt"),
    [
      "Primary profile: product-platform with finance/GTM gates.",
      "Profile gate: pass. Product workflow, monetization, GTM, and licensing risk are explicit.",
      "Story: 4.5 / Specificity: 4.5 / Rhythm: 4 / Whitespace: 4 / Chart clarity: 4 / Typography: 4 / Restraint: 4 / Precision: 4 / Coherence: 4.",
      "Known limitation: all financials are directional assumptions, not historical actuals. TRIBE commercial deployment remains a diligence item.",
    ].join("\\n"),
    "utf8",
  );
  return { finalDeck, canvasOut };
}

async function main() {
  const { modelPath, rows } = await buildWorkbook();
  const { finalDeck, canvasOut } = await buildSlides(rows);
  console.log(JSON.stringify({ modelPath, finalDeck, canvasOut }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
