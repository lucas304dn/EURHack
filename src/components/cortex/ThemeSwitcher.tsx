import { Moon, Sun, Layers, Check, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "./ThemeProvider";

const THEMES: {
  id: Theme;
  label: string;
  icon: typeof Moon;
  swatch: { bg: string; fg: string };
}[] = [
  { id: "dark", label: "Cortex Dark", icon: Moon, swatch: { bg: "#0F1115", fg: "#6D5BD0" } },
  { id: "light", label: "Enterprise Light", icon: Sun, swatch: { bg: "#F7F7FA", fg: "#4F46E5" } },
  { id: "slate", label: "Cortex Graphite", icon: Layers, swatch: { bg: "#1A1F26", fg: "#3FA9C9" } },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const active = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  const ActiveIcon = active.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="group flex h-auto w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <span className="flex items-center gap-3">
            <ActiveIcon className="h-4 w-4" />
            <span className="font-medium">{active.label}</span>
          </span>
          <ChevronUp className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="w-56 rounded-2xl p-1.5"
      >
        <div className="px-2 pb-1.5 pt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          Theme
        </div>
        {THEMES.map((t) => {
          const Icon = t.icon;
          const isActive = t.id === theme;
          return (
            <DropdownMenuItem
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl py-2",
                isActive && "bg-primary/15 text-foreground",
              )}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md border border-border/60"
                style={{ background: t.swatch.bg }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: t.swatch.fg }}
                />
              </span>
              <Icon className="h-3.5 w-3.5" />
              <span className="flex-1 text-sm">{t.label}</span>
              {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
