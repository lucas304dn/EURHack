import { bg, text, rect, rule, footer, kicker, title, metricRail, barChart, miniTable, wrap, connector, STYLE, data } from "./shared.mjs";

export async function slide06(presentation, ctx) {
  const slide = presentation.slides.add();

  bg(slide, ctx); kicker(slide, ctx, "Business Model Canvas"); title(slide, ctx, "The model is a SaaS-plus-usage workflow for marketers and agencies.");
  const blocks = [
    ["Key Partners", "Model/data licensors\nCloud + GPU providers\nOpenRouter/Gemini/ElevenLabs\nAgency partners"],
    ["Key Activities", "Generate creative\nPredict neural response\nInterpret scores\nExport/report"],
    ["Value Proposition", "Pre-spend creative intelligence: generate and rank ads before paid budget is committed."],
    ["Customer Relationships", "Self-serve onboarding\nAgency pilots\nQuarterly creative reviews"],
    ["Customer Segments", "SMB marketers\nPerformance agencies\nDTC brands\nBrand labs"],
    ["Key Resources", "Cortex app\nAnalysis data\nCommercial model rights\nML/product team"],
    ["Channels", "Hackathon demo\nFounder-led outbound\nAgency partnerships\nPlatform integrations"],
    ["Cost Structure", "Inference/API costs\nGPU/model infra\nEngineering\nLegal/licensing\nGTM"],
    ["Revenue Streams", "Subscriptions\nUsage per analysis\nPilot packages\nReports/API fees"],
  ];
  const pos = [[58,188,218,210],[292,188,218,100],[526,188,228,210],[770,188,210,100],[996,188,210,210],[292,304,218,94],[770,304,210,94],[58,520,552,94],[634,520,572,94]];
  blocks.forEach((b,i)=>{ const [x,y,w,h]=pos[i]; rect(slide, ctx, x, y, w, h, i===2 ? "#203141" : STYLE.panel); text(slide, ctx, b[0], x+16, y+14, w-32, 20, { size: 13, color: i===2 ? STYLE.accent : STYLE.ink, bold: true }); text(slide, ctx, b[1], x+16, y+44, w-32, h-58, { size: i===2 ? 14 : 10.5, color: i===2 ? STYLE.ink : STYLE.soft }); });
  footer(slide, ctx, 6);
  return slide;
}
