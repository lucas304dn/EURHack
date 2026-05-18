import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/cortex/Shell";
import { Dashboard } from "@/components/cortex/Dashboard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Cortex" },
      { name: "description", content: "Generate and manage neuroscience-powered ad creative." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <Shell>
      <Dashboard />
    </Shell>
  );
}
