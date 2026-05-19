import { bg, text, rect, rule, footer, kicker, title, metricRail, barChart, miniTable, wrap, connector, STYLE, data } from "./shared.mjs";

export async function slide08(presentation, ctx) {
  const slide = presentation.slides.add();

  bg(slide, ctx); kicker(slide, ctx, "Go To Market"); title(slide, ctx, "The first sales motion is a paid pilot that converts creative volume into recurring usage.");
  const lanes = [
    ["Hackathon proof", "Demo the live loop and collect judge/mentor intros."],
    ["Agency pilots", "3-5 teams test live campaigns, export reports, and compare with platform outcomes."],
    ["Self-serve SaaS", "Package templates, benchmarks, and usage limits by tier."],
    ["Platform integrations", "Meta/TikTok/Instagram handoff turns insight into execution."],
  ];
  lanes.forEach((l,i)=>{ const y=205+i*96; text(slide, ctx, String(i+1).padStart(2,"0"), 78, y, 48, 34, { size: 28, color: i%2?STYLE.accent2:STYLE.accent, face: STYLE.serif, bold: true }); rule(slide, ctx, 142, y+18, 740, i%2?STYLE.accent2:STYLE.accent, 1); text(slide, ctx, l[0], 164, y, 250, 28, { size: 18, color: STYLE.ink, bold: true }); text(slide, ctx, l[1], 440, y+2, 460, 40, { size: 13, color: STYLE.soft }); });
  rect(slide, ctx, 940, 220, 210, 220, "#203141");
  text(slide, ctx, "Paid pilot package", 966, 252, 160, 24, { size: 17, color: STYLE.accent, bold: true });
  text(slide, ctx, "EUR 5k-15k\nper agency pilot\nwith success metrics tied to saved creative decisions.", 966, 300, 150, 100, { size: 18, color: STYLE.ink, face: STYLE.serif, bold: true });
  footer(slide, ctx, 8);
  return slide;
}
