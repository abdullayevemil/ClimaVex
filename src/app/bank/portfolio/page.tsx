import { DashboardShell } from "@/components/dashboard-shell";
import { PortfolioPageClient } from "@/components/portfolio-page-client";

export default function PortfolioPage() {
  return (
    <DashboardShell>
      <PortfolioPageClient />
    </DashboardShell>
  );
}
