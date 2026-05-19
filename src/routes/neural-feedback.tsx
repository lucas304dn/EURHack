import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Shell } from "@/components/cortex/Shell";
import { NeuralFeedback } from "@/components/cortex/NeuralFeedback";

const searchSchema = z.object({
  mediaId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/neural-feedback")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Neural Feedback — Cortex" },
      {
        name: "description",
        content:
          "Analyze ad creative with neuroscience-grade attention, focus, and virality scoring.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { mediaId } = Route.useSearch();
  return (
    <Shell>
      <NeuralFeedback initialMediaId={mediaId} />
    </Shell>
  );
}
