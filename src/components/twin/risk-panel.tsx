"use client";

import { Gauge, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AiStatusBanner, DecisionNote, DemoBanner, ModelBanner } from "./demo-banner";
import { Stat } from "./stat";
import { formatPct, formatTRY } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AssessmentDto } from "@/lib/twin-types";
import type { ClimateEvidence } from "@/domain/scenario/contract";

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
          Generate an explainable risk score for this farm and season. Every factor is published
          with its weight and contribution.
        </p>
        <Button onClick={onRun} disabled={busy} size="sm" className="w-full gap-1.5">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gauge className="h-3.5 w-3.5" />}
          Calculate risk score
        </Button>
        <AiStatusBanner />
        <DecisionNote />
      </div>
    );
  }

  const a = assessment.assessment;
  const band = BAND_STYLE[a.band];
  const fromModel = a.providerType === "trained-model";

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

      {a.climate ? <ClimateEvidenceCard climate={a.climate} /> : null}

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
        {fromModel
          ? "Identical inputs, observations and model version always produce this same score."
          : "Identical inputs and rule version always produce this same score."}
      </div>

      {fromModel ? <ModelBanner message={a.disclaimer} /> : <DemoBanner compact message={a.disclaimer} />}
      <DecisionNote />
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * What the ML service reported for this farm's region. The measured index and
 * the forecast are shown apart, each labelled for what it is.
 */
function ClimateEvidenceCard({ climate }: { climate: ClimateEvidence }) {
  const { index, forecast, region, model } = climate;
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Climate evidence</p>
      <div className="space-y-3 rounded-md border border-slate-200 bg-white px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium text-slate-900">{region.name}</span>
          <span className="cvx-num shrink-0 text-[10px] text-slate-500">
            measured · {index.asOf ?? "latest"} · {region.distanceKm.toFixed(0)} km away
          </span>
        </div>

        <div className="space-y-1">
          {(Object.entries(index.subScores) as Array<[string, number]>).map(([name, value]) => (
            <div key={name} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[10px] capitalize text-slate-500">{name}</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-teal-600/70" style={{ width: `${Math.min(100, value)}%` }} />
              </div>
              <span className="cvx-num w-8 shrink-0 text-right text-[10px] text-slate-600">{value.toFixed(0)}</span>
            </div>
          ))}
        </div>

        {forecast ? (
          <div className="border-t border-slate-100 pt-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[11px] font-medium text-slate-900">
                Forecast · {MONTHS[forecast.targetMonth - 1]} {forecast.targetYear}
              </span>
              <span className="cvx-num shrink-0 text-xs font-semibold text-slate-950">
                {forecast.predictedSoilAnomaly >= 0 ? "+" : ""}{forecast.predictedSoilAnomaly.toFixed(2)}σ
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-slate-600">{forecast.interpretation}</p>
            <p className="cvx-num mt-1 text-[10px] text-slate-400">
              root-zone soil moisture vs seasonal normal · now {forecast.currentSoilAnomaly >= 0 ? "+" : ""}
              {forecast.currentSoilAnomaly.toFixed(2)}σ, {forecast.direction}
              {forecast.correlation == null ? "" : ` · held-out correlation ${forecast.correlation.toFixed(2)}`}
            </p>
          </div>
        ) : (
          <p className="border-t border-slate-100 pt-2 text-[11px] leading-snug text-slate-500">
            No forecast for this region: its recent satellite record has a gap.
          </p>
        )}

        <p className="cvx-num text-[10px] text-slate-400">
          ClimaVex ML service v{model.serviceVersion}
          {model.trainedAt ? ` · XGBoost trained ${model.trainedAt.slice(0, 10)}` : ""}
        </p>
      </div>
    </div>
  );
}
