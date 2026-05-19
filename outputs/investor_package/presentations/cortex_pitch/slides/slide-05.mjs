import { bg, text, rect, rule, footer, kicker, title, metricRail, barChart, miniTable, wrap, connector, STYLE, data } from "./shared.mjs";

export async function slide05(presentation, ctx) {
  const slide = presentation.slides.add();

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
  footer(slide, ctx, 5, "Source: TRIBE v2 PDF and local app implementation");
  return slide;
}
