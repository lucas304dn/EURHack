import { bg, text, rect, rule, footer, kicker, title, metricRail, barChart, miniTable, wrap, connector, STYLE, data } from "./shared.mjs";

export async function slide02(presentation, ctx) {
  const slide = presentation.slides.add();

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
  footer(slide, ctx, 2);
  return slide;
}
