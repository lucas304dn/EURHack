import { bg, text, rect, rule, footer, kicker, title, metricRail, barChart, miniTable, wrap, connector, STYLE, data } from "./shared.mjs";

export async function slide01(presentation, ctx) {
  const slide = presentation.slides.add();

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
  footer(slide, ctx, 1, "Cortex | investor narrative, BMC, and 3-year model");
  return slide;
}
