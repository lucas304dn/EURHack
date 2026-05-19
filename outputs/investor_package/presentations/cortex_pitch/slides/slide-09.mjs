import { bg, text, rect, rule, footer, kicker, title, metricRail, barChart, miniTable, wrap, connector, STYLE, data } from "./shared.mjs";

export async function slide09(presentation, ctx) {
  const slide = presentation.slides.add();

  bg(slide, ctx); kicker(slide, ctx, "3-Year Model"); title(slide, ctx, "The directional model reaches EUR 2.7M in Year 3 while keeping usage economics visible.");
  miniTable(slide, ctx, 78, 218, ["Metric", "Year 1", "Year 2", "Year 3"], [
    ["Revenue", "EUR 122k", "EUR 813k", "EUR 2.7M"],
    ["Ending customers", "34", "173", "505"],
    ["Gross margin", "68%", "75%", "80%"],
    ["EBITDA", "EUR -287k", "EUR -450k", "EUR -57k"],
  ], [260, 160, 160, 160]);
  barChart(slide, ctx, 110, 458, 750, 102, [
    { label: "Y1 revenue", value: 122202, note: "EUR 122k", color: STYLE.accent2 },
    { label: "Y2 revenue", value: 812712, note: "EUR 813k", color: STYLE.accent },
    { label: "Y3 revenue", value: 2729130, note: "EUR 2.7M", color: STYLE.accent3 },
  ]);
  rect(slide, ctx, 928, 238, 232, 250, STYLE.panel);
  text(slide, ctx, "Assumption discipline", 956, 270, 166, 24, { size: 16, color: STYLE.ink, bold: true });
  text(slide, ctx, "Subscriptions create recurring base revenue; usage fees scale with analyzed creative volume. COGS improve as model infrastructure becomes less provider-dependent.", 956, 314, 162, 120, { size: 13, color: STYLE.soft });
  footer(slide, ctx, 9, "See editable Excel model for formulas and assumptions");
  return slide;
}
