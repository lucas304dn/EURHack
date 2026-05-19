import { bg, text, rect, rule, footer, kicker, title, metricRail, barChart, miniTable, wrap, connector, STYLE, data } from "./shared.mjs";

export async function slide11(presentation, ctx) {
  const slide = presentation.slides.add();

  bg(slide, ctx); kicker(slide, ctx, "Roadmap"); title(slide, ctx, "Milestones move from demo novelty to defensible commercial creative intelligence.");
  const ms = [
    ["0-3 mo", "Hackathon polish", "Tighten UX, demo data, export reports, legal memo."],
    ["3-6 mo", "Pilot proof", "Run agency pilots and compare predicted scores with campaign outcomes."],
    ["6-12 mo", "Model route", "License, partner, or replace the neural model for commercial use."],
    ["12-24 mo", "Workflow moat", "Benchmarks, templates, integrations, and account-level learning loops."],
  ];
  ms.forEach((m,i)=>{ const x=86+i*280; rule(slide, ctx, x, 346, 230, i%2?STYLE.accent2:STYLE.accent, 2); rect(slide, ctx, x, 337, 18, 18, i%2?STYLE.accent2:STYLE.accent, { geometry: "ellipse" }); text(slide, ctx, m[0], x, 270, 110, 24, { size: 18, color: STYLE.ink, face: STYLE.serif, bold: true }); text(slide, ctx, m[1], x, 306, 180, 22, { size: 15, color: STYLE.accent, bold: true }); text(slide, ctx, m[2], x, 378, 190, 70, { size: 12.5, color: STYLE.soft }); });
  rect(slide, ctx, 92, 520, 1030, 58, STYLE.panel);
  text(slide, ctx, "North-star KPI: share of creative decisions made with pre-spend Cortex evidence before campaign launch.", 120, 540, 950, 24, { size: 18, color: STYLE.ink, bold: true });
  footer(slide, ctx, 11);
  return slide;
}
