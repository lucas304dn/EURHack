import { createFileRoute } from "@tanstack/react-router";
import { Plug } from "lucide-react";
import { Shell } from "@/components/cortex/Shell";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — Cortex" },
      { name: "description", content: "Connect Cortex to your ad platforms." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <Shell>
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Plug className="h-10 w-10 text-muted-foreground/60" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          Integrations coming soon.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Soon you'll be able to connect Meta, TikTok, Google Ads and more.
        </p>
      </div>
    </Shell>
  );
}
