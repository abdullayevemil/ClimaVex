import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/components/locale-provider";
import { riskMeta } from "@/lib/risk-ui";
import type { RiskAssessmentDto } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function RecentAssessmentsTable({
  assessments,
}: {
  assessments: RiskAssessmentDto[];
}) {
  const { dictionary, locale } = useI18n();

  if (assessments.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 p-6 text-sm text-slate-500">
        {dictionary.assessmentsTable.empty}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{dictionary.assessmentsTable.date}</TableHead>
          <TableHead>{dictionary.assessmentsTable.level}</TableHead>
          <TableHead className="text-right">
            {dictionary.assessmentsTable.score}
          </TableHead>
          <TableHead className="hidden text-right md:table-cell">
            {dictionary.assessmentsTable.drought}
          </TableHead>
          <TableHead className="hidden text-right md:table-cell">
            {dictionary.assessmentsTable.flood}
          </TableHead>
          <TableHead className="hidden text-right lg:table-cell">
            {dictionary.assessmentsTable.yield}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assessments.map((assessment) => {
          const meta = riskMeta[assessment.riskLevel];

          return (
            <TableRow key={assessment.id}>
              <TableCell>
                {formatDate(assessment.assessmentDate, locale)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={meta.badgeClass}>
                  {dictionary.risk[assessment.riskLevel]}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {assessment.riskScore.toFixed(0)}
              </TableCell>
              <TableCell className="hidden text-right md:table-cell">
                {assessment.droughtRisk.toFixed(0)}
              </TableCell>
              <TableCell className="hidden text-right md:table-cell">
                {assessment.floodRisk.toFixed(0)}
              </TableCell>
              <TableCell className="hidden text-right lg:table-cell">
                {assessment.yieldVolatilityRisk.toFixed(0)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
