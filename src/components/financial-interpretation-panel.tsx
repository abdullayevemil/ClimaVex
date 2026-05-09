import { Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/locale-provider";
import type { RiskAssessmentDto } from "@/lib/types";

export function FinancialInterpretationPanel({
  assessment,
}: {
  assessment: RiskAssessmentDto | null;
}) {
  const { dictionary } = useI18n();

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="rounded-md bg-slate-950 p-2 text-white">
          <Landmark className="h-4 w-4" />
        </div>
        <div>
          <CardTitle>{dictionary.panels.financialTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {dictionary.panels.financialSubtitle}
          </p>
        </div>
      </CardHeader>
      <CardContent className="text-sm leading-6 text-slate-700">
        {assessment?.financialInterpretation ??
          dictionary.panels.financialEmpty}
      </CardContent>
    </Card>
  );
}
