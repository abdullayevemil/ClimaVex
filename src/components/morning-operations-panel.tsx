"use client";

import {
  Bell,
  Clock3,
  KeyRound,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";
import type { WorkflowSummary } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function MorningOperationsPanel({
  workflow,
}: {
  workflow: WorkflowSummary | null;
}) {
  const { dictionary, locale } = useI18n();

  if (!workflow) {
    return (
      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-md bg-slate-100" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const loginTime = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(workflow.user.loginTime));

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="flex-col gap-3 space-y-0 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-teal-700">
            <Clock3 className="h-4 w-4" />
            {dictionary.workflow.morningTitle}
          </div>
          <CardTitle className="mt-2 text-xl text-slate-950">
            {workflow.user.name} | {workflow.user.role}
          </CardTitle>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {dictionary.workflow.morningSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
            <UserCheck className="mr-1 h-3.5 w-3.5" />
            {loginTime}
          </Badge>
          <Badge className="border-slate-200 bg-slate-50 text-slate-700" variant="outline">
            {workflow.user.institutionName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MorningMetric
          icon={KeyRound}
          label={dictionary.workflow.sso}
          value={workflow.user.authProvider}
        />
        <MorningMetric
          icon={ShieldCheck}
          label={dictionary.workflow.license}
          value={workflow.user.licenseTier}
        />
        <MorningMetric
          label={dictionary.workflow.activeRisk}
          value={`${workflow.portfolio.weightedAverageRisk.toFixed(1)} / 100`}
          subValue={formatCurrency(workflow.portfolio.totalExposure, locale)}
        />
        <MorningMetric
          icon={Bell}
          label={dictionary.workflow.overnightAlerts}
          value={formatNumber(workflow.portfolio.overnightAlerts, 0, locale)}
        />
        <MorningMetric
          label={dictionary.workflow.pendingQueue}
          value={formatNumber(workflow.portfolio.pendingApplications, 0, locale)}
          subValue={`${formatNumber(workflow.portfolio.activeLoans, 0, locale)} active loans`}
        />
      </CardContent>
    </Card>
  );
}

function MorningMetric({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon?: LucideIcon;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
        {Icon ? <Icon className="h-3.5 w-3.5 text-teal-700" /> : null}
        {label}
      </div>
      <p className="mt-2 text-base font-semibold text-slate-950">{value}</p>
      {subValue ? <p className="mt-1 text-xs text-slate-500">{subValue}</p> : null}
    </div>
  );
}
