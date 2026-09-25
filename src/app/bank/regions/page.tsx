import { DashboardShell } from "@/components/dashboard-shell";
import { RegionsPageClient } from "@/components/regions-page-client";

export default function RegionsPage() {
  return (
    <DashboardShell>
      <RegionsPageClient />
    </DashboardShell>
  );
}
