import { CortexSidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <CortexSidebar />
      <main className="md:pl-64">
        <div className="mx-auto max-w-[1400px] px-6 pb-10 md:px-12">
          <header className="flex justify-end px-0 py-4 md:py-5">
            <TopBar />
          </header>
          <div className="pt-2 md:pt-4">{children}</div>
        </div>
      </main>
    </div>
  );
}
