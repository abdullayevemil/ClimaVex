"use client";

import { Gauge, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DecisionNote, DemoBanner } from "./demo-banner";
import { Stat } from "./stat";
import { formatPct, formatTRY } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AssessmentDto } from "@/lib/twin-types";

const BAND_STYLE = {
  LOW: { chip: "border-emerald-200 bg-emerald-50 text-emerald-800", bar: "bg-emerald-600", label: "Low" },
  MEDIUM: { chip: "border-amber-200 bg-amber-50 text-amber-800", bar: "bg-amber-500", label: "Medium" },
  HIGH: { chip: "border-red-200 bg-red-50 text-red-800", bar: "bg-red-600", label: "High" },
} as const;

/**
 * The headline output for bank and insurance users.
 *
 * Every factor is shown with its weight, value and contribution, so the score
 * can be read rather than trusted. Notably absent: any approve/decline verdict.
 */
export function RiskPanel({
  assessment, busy, onRun,
}: {
  assessment: AssessmentDto | null; busy: boolean; onRun: () => void;
}) {
  if (!assessment) {
    return (
      <div className="space-y-3">
        <p className="text-xs leading-relaxed text-slate-600">
          Generate a deterministic, explainable risk score for this farm and season. Every factor is
          published with its weight and contribution.
        </p>
        <Button onClick={onRun} disabled={busy} size="sm" className="w-full gap-1.5">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gauge className="h-3.5 w-3.5" />}
          Calculate risk score
        </Button>
        <DemoBanner compact />
        <DecisionNote />
      </div>
    );
  }

  const a = assessment.assessment;
  const band = BAND_STYLE[a.band];

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Risk score</p>
            <p className="cvx-num mt-1 text-4xl font-semibold leading-none text-slate-950">{a.score.toFixed(1)}</p>
            <p className="mt-1 text-[11px] text-slate-500">out of 100 · higher is riskier</p>
          </div>
          <Badge variant="outline" className={cn("text-[11px]", band.chip)}>{band.label} risk</Badge>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={cn("h-full rounded-full transition-all duration-500", band.bar)} style={{ width: `${a.score}%` }} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Contributing factors</p>
        <div className="space-y-1.5">
          {a.factors.map((f) => (
            <div key={f.code} className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-slate-900">{f.label}</span>
                <span className="cvx-num shrink-0 text-xs font-semibold text-slate-950">+{f.contribution.toFixed(1)}</span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-teal-600/70" style={{ width: `${Math.min(100, f.value)}%` }} />
              </div>
              <p className="cvx-num mt-1 text-[10px] text-slate-400">
                value {f.value.toFixed(1)} × weight {f.weight}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-slate-600">{f.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat
          label="Revenue exposed"
          value={formatPct(assessment.exposure.exposedShare)}
          hint={`${assessment.exposure.cropCount} crops across ${assessment.exposure.sectionCount} sections`}
          tone={assessment.exposure.exposedShare > 0.6 ? "warn" : "default"}
        />
        <Stat
          label="Peak shortfall"
          value={formatTRY(assessment.ledger.peakShortfall)}
          hint="Simulated timing gap"
          tone={Number(assessment.ledger.peakShortfall) > 0 ? "danger" : "good"}
        />
      </div>

      <div className="cvx-num rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
        provider {a.providerType} v{a.providerVersion} · input hash {a.inputHash.slice(0, 16)}…
        <br />
        Identical inputs and rule version always produce this same score.
      </div>

      <DemoBanner compact />
      <DecisionNote />
    </div>
  );
}
