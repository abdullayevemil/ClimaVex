import { ClipboardCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useI18n } from "@/components/locale-provider";
import type { RiskAssessmentDto } from "@/lib/types";

export function RecommendationPanel({
  assessment,
}: {
  assessment: RiskAssessmentDto | null;
}) {
  const { dictionary } = useI18n();

  return (
    <Alert className="border-teal-200 bg-teal-50 text-teal-950">
      <ClipboardCheck className="absolute left-4 top-4 h-4 w-4 text-teal-700" />
      <div className="pl-7">
        <AlertTitle>{dictionary.panels.recommendationTitle}</AlertTitle>
        <AlertDescription>
          {assessment?.recommendation ??
            dictionary.panels.recommendationEmpty}
        </AlertDescription>
      </div>
    </Alert>
  );
}
