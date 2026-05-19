import { bg, text, rect, rule, footer, kicker, title, metricRail, barChart, miniTable, wrap, connector, STYLE, data } from "./shared.mjs";

export async function slide03(presentation, ctx) {
  const slide = presentation.slides.add();

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
  footer(slide, ctx, 3);
  return slide;
}
