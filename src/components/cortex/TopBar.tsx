import { Bell } from "lucide-react";
import avatar from "@/assets/avatar.jpg";

export function TopBar() {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Notifications"
        className="relative grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-card/60 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Bell className="h-4.5 w-4.5" strokeWidth={1.75} />
        <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
      </button>

      <div className="flex items-center gap-3 rounded-full border border-border/70 bg-card/60 py-1.5 pl-1.5 pr-4">
        <img
          src={avatar}
          alt="Nikitas Papadopoulos"
          width={32}
          height={32}
          loading="lazy"
          className="h-8 w-8 rounded-full object-cover"
        />
        <div className="hidden flex-col leading-tight sm:flex">
          <span className="text-sm font-medium">Nikitas Papadopoulos</span>
          <span className="text-[11px] text-muted-foreground">Marketing Lead</span>
        </div>
      </div>
    </div>
  );
}
