import { bg, text, rect, rule, footer, kicker, title, metricRail, barChart, miniTable, wrap, connector, STYLE, data } from "./shared.mjs";

export async function slide12(presentation, ctx) {
  const slide = presentation.slides.add();

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
  footer(slide, ctx, 12);
  return slide;
}
