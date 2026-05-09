import { DashboardClient } from "@/components/dashboard-client";
import { DashboardShell } from "@/components/dashboard-shell";

export default function Home() {
  return (
    <DashboardShell>
      <DashboardClient />
    </DashboardShell>
  );
}
