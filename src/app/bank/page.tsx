import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardClient } from "@/components/dashboard-client";

/** The pre-existing bank climate-risk dashboard, retained alongside the twin. */
export default function BankDashboardPage() {
  return (
    <DashboardShell>
      <DashboardClient />
    </DashboardShell>
  );
}
