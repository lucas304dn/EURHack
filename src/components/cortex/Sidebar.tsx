import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Brain, Plug } from "lucide-react";
import { cn } from "@/lib/utils";
import cortexLogo from "@/assets/cortex-logo-mark.svg";
import { ThemeSwitcher } from "./ThemeSwitcher";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/neural-feedback", label: "Neural Feedback", icon: Brain },
  { to: "/integrations", label: "Integrations", icon: Plug },
] as const;

export function CortexSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/60 bg-sidebar p-6 md:flex">
      <Link to="/dashboard" className="mb-12 flex items-center leading-none">
        <img src={cortexLogo} alt="Cortex" className="h-10 w-10 object-contain" />
      </Link>

      <nav className="flex flex-1 flex-col gap-1.5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors",
                active
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon className={cn("h-4 w-4", active && "text-primary")} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-border/60 pt-3">
        <ThemeSwitcher />
      </div>
    </aside>
  );
}
