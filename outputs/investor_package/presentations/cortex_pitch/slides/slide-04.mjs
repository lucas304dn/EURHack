import { bg, text, rect, rule, footer, kicker, title, metricRail, barChart, miniTable, wrap, connector, STYLE, data } from "./shared.mjs";

export async function slide04(presentation, ctx) {
  const slide = presentation.slides.add();

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
  footer(slide, ctx, 4, "Source: local EURHack repository");
  return slide;
}
