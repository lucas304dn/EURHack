import { bg, text, rect, rule, footer, kicker, title, metricRail, barChart, miniTable, wrap, connector, STYLE, data } from "./shared.mjs";

export async function slide07(presentation, ctx) {
  const slide = presentation.slides.add();

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
  footer(slide, ctx, 7);
  return slide;
}
