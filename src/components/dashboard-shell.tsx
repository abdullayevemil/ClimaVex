import { AppSidebar } from "@/components/app-sidebar";
import { TopNavbar } from "@/components/top-navbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopNavbar />
      <div className="flex">
        <AppSidebar />
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
