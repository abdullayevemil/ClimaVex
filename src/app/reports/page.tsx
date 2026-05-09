import { DashboardShell } from "@/components/dashboard-shell";
import { ReportsPageClient } from "@/components/reports-page-client";

export default function ReportsPage() {
  return (
    <DashboardShell>
      <ReportsPageClient />
    </DashboardShell>
  );
}
