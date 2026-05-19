import { bg, text, rect, rule, footer, kicker, title, metricRail, barChart, miniTable, wrap, connector, STYLE, data } from "./shared.mjs";

export async function slide10(presentation, ctx) {
  const slide = presentation.slides.add();

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
  footer(slide, ctx, 10, "Source: attached TRIBE v2 licensing PDF");
  return slide;
}
