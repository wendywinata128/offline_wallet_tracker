import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";
import { Fab } from "./Fab";
import { StorageWatcher } from "./StorageWatcher";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { Skeleton } from "@/components/ui/skeleton";

function PageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-48" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function AppShell() {
  useGlobalShortcuts();
  return (
    <div className="min-h-full">
      <StorageWatcher />
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar />
        <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <MobileNav />
      <Fab />
    </div>
  );
}
