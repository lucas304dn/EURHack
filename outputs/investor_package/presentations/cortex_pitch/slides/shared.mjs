
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
export const data = {
  "story": {
    "thesis": "Cortex turns ad creation into a pre-spend feedback loop: generate multimodal creative, predict neural response, and export the highest-potential assets before media budget is committed.",
    "sources": [
      "Repo: Dashboard generates text/image/video/audio assets using OpenRouter, Gemini/Pollinations, and ElevenLabs.",
      "Repo: Neural Feedback analyzes text/audio/video with TRIBE v2 and persists scores, region masks, viewer links, and LLM interpretations.",
      "Repo: Integrations export CSV/PDF reports and reserve future Meta Ads publishing.",
      "PDF: TRIBE v2 is open source for non-commercial research/hackathon use under CC BY-NC; commercial deployment requires licensed, partnered, or replacement model infrastructure."
    ]
  },
  "rows": [
    {
      "year": "Year 1",
      "avgCustomers": 17,
      "endingCustomers": 34,
      "subscription": 90702,
      "usage": 31500,
      "revenue": 122202,
      "cogs": 39104.64,
      "grossProfit": 83097.36,
      "grossMargin": 0.68,
      "opex": 370000,
      "ebitda": -286902.64
    },
    {
      "year": "Year 2",
      "avgCustomers": 103.5,
      "endingCustomers": 173,
      "subscription": 605712,
      "usage": 207000,
      "revenue": 812712,
      "cogs": 203178,
      "grossProfit": 609534,
      "grossMargin": 0.75,
      "opex": 1060000,
      "ebitda": -450466
    },
    {
      "year": "Year 3",
      "avgCustomers": 339,
      "endingCustomers": 505,
      "subscription": 2036130,
      "usage": 693000,
      "revenue": 2729130,
      "cogs": 545826,
      "grossProfit": 2183304,
      "grossMargin": 0.8,
      "opex": 2240000,
      "ebitda": -56696
    }
  ],
  "model": {
    "y1Revenue": "EUR 122k",
    "y3Revenue": "EUR 2.7M",
    "y3Customers": 505,
    "y3GrossMargin": "80%",
    "seedAsk": "EUR 750k"
  }
};

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
  const words = String(value || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (next.length > maxChars && line) { lines.push(line); line = word; } else { line = next; }
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (words.length && lines.join(" ").length < words.join(" ").length && lines.length) lines[lines.length - 1] = lines[lines.length - 1].replace(/[.,;:]?$/, "") + "...";
  return lines.join("\n");
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
