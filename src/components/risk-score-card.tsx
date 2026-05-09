import { Activity, ArrowUpRight, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";
import { Progress } from "@/components/ui/progress";
import { riskMeta } from "@/lib/risk-ui";
import type { RiskAssessmentDto } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RiskScoreCard({
  assessment,
}: {
  assessment: RiskAssessmentDto | null;
}) {
  const { dictionary } = useI18n();

  if (!assessment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dictionary.riskScore.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {dictionary.riskScore.noAssessment}
        </CardContent>
      </Card>
    );
  }

  const meta = riskMeta[assessment.riskLevel];

  return (
    <Card className={cn("overflow-hidden", meta.borderClass)}>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>{dictionary.riskScore.title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {dictionary.riskScore.engine}
          </p>
        </div>
        <Badge variant="outline" className={meta.badgeClass}>
          {dictionary.risk[assessment.riskLevel]} {dictionary.riskScore.riskSuffix}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-5xl font-semibold", meta.textClass)}>
                {assessment.riskScore.toFixed(0)}
              </span>
              <span className="text-sm font-medium text-slate-500">/ 100</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {dictionary.riskScore.currentAssessment}
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-950 text-white">
            {assessment.riskLevel === "HIGH" ? (
              <ShieldAlert className="h-6 w-6 text-red-300" />
            ) : assessment.riskLevel === "MEDIUM" ? (
              <ArrowUpRight className="h-6 w-6 text-amber-300" />
            ) : (
              <Activity className="h-6 w-6 text-emerald-300" />
            )}
          </div>
        </div>
        <Progress value={assessment.riskScore} className="mt-5" />
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <ComponentMetric
            label={dictionary.riskScore.drought}
            value={assessment.droughtRisk}
          />
          <ComponentMetric
            label={dictionary.riskScore.flood}
            value={assessment.floodRisk}
          />
          <ComponentMetric
            label={dictionary.riskScore.soil}
            value={assessment.soilRisk}
          />
          <ComponentMetric
            label={dictionary.riskScore.yield}
            value={assessment.yieldVolatilityRisk}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ComponentMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">
        {value.toFixed(0)}
      </p>
    </div>
  );
}
