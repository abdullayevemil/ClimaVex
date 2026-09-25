"use client";

import { useState } from "react";
import { CloudRain, Loader2, Play, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stat } from "./stat";
import { DecisionNote, DemoBanner } from "./demo-banner";
import { formatDateFull, formatPct, formatTRY } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ResourceDto, ScenarioRunDto, WeatherDatasetDto } from "@/lib/twin-types";

type Props = {
  datasets: WeatherDatasetDto[];
  resources: ResourceDto[];
  run: ScenarioRunDto | null;
  busy: boolean;
  canRun: boolean;
  onRunWeather: (datasetId: string, alignment: string) => void;
  onRunDisruption: (resourceIds: string[], startDate: string, endDate: string) => void;
};

/**
 * Weather replay and resource disruption.
 *
 * Weather inputs are kept visibly separate from the method used to estimate
 * their effects: the dataset names its own provenance, and the estimate names
 * its provider and rule version.
 */
export function ScenarioPanel({ datasets, resources, run, busy, canRun, onRunWeather, onRunDisruption }: Props) {
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? "");
  const [alignment, setAlignment] = useState("ALIGN_TO_PLANTING");
  const [resourceId, setResourceId] = useState(resources[0]?.id ?? "");

  const dataset = datasets.find((d) => d.id === datasetId);

  return (
    <div className="space-y-4">
      <section className="space-y-2 rounded-md border border-slate-200 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
          <CloudRain className="h-3.5 w-3.5" /> Historical weather replay
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="dataset">Weather sequence</Label>
          <Select value={datasetId} onValueChange={setDatasetId}>
            <SelectTrigger id="dataset" className="h-8 text-xs"><SelectValue placeholder="Select a dataset" /></SelectTrigger>
            <SelectContent>
              {datasets.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {dataset ? (
          <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
            <Badge variant="outline" className={cn(
              "mb-1 text-[9px]",
              dataset.kind === "DEMO_SYNTHETIC"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800",
            )}>
              {dataset.kind === "DEMO_SYNTHETIC" ? "Demo weather scenario" : "Historical observations"}
            </Badge>
            <p className="text-[10px] leading-snug text-slate-600">{dataset.provenance}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">{dataset.attribution} · {dataset.license}</p>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="alignment">Date alignment</Label>
          <Select value={alignment} onValueChange={setAlignment}>
            <SelectTrigger id="alignment" className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALIGN_TO_PLANTING" className="text-xs">Align to planting date</SelectItem>
              <SelectItem value="CALENDAR_DATE" className="text-xs">Keep calendar dates</SelectItem>
              <SelectItem value="DAY_OF_YEAR" className="text-xs">Match day of year</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] leading-snug text-slate-500">
            Replaying a past season against a current layout is ambiguous, so the alignment is your
            choice rather than a hidden default. Missing observations are skipped, never imputed.
          </p>
        </div>

        <Button size="sm" className="w-full gap-1.5" disabled={busy || !canRun || !datasetId}
          onClick={() => onRunWeather(datasetId, alignment)}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Run weather replay
        </Button>
      </section>

      <section className="space-y-2 rounded-md border border-slate-200 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
          <Waves className="h-3.5 w-3.5" /> Resource disruption
        </p>
        <Select value={resourceId} onValueChange={setResourceId}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select a resource" /></SelectTrigger>
          <SelectContent>
            {resources.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-xs">
                {r.name} · {r.distinctBorrowers} borrower{r.distinctBorrowers === 1 ? "" : "s"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="w-full gap-1.5" disabled={busy || !canRun || !resourceId}
          onClick={() => onRunDisruption([resourceId], "2026-06-01", "2026-06-14")}>
          <Play className="h-3.5 w-3.5" /> Run 14-day supply restriction
        </Button>
      </section>

      {run ? <ScenarioResult run={run} /> : null}
      <DemoBanner compact />
      <DecisionNote />
    </div>
  );
}

function ScenarioResult({ run }: { run: ScenarioRunDto }) {
  const f = run.financial;
  const baselineGap = Number(f.baseline.peakShortfall);
  const scenarioGap = Number(f.scenario.peakShortfall);

  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Result</p>
        {run.reused ? (
          <Badge variant="outline" className="border-slate-200 bg-white text-[9px] text-slate-600">
            reused immutable snapshot
          </Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Baseline gap" value={formatTRY(f.baseline.peakShortfall)} tone={baselineGap > 0 ? "warn" : "good"} />
        <Stat label="Scenario gap" value={formatTRY(f.scenario.peakShortfall)} tone={scenarioGap > baselineGap ? "danger" : "good"}
          hint={scenarioGap > baselineGap ? `+${formatTRY(scenarioGap - baselineGap)}` : "unchanged"} />
        <Stat label="Baseline revenue" value={formatTRY(f.baselineRevenue)} />
        <Stat label="Scenario revenue" value={formatTRY(f.scenarioRevenue)} tone="warn"
          hint={`loss ${formatTRY(f.assessedLoss)}`} />
      </div>

      <div className="rounded border border-slate-200 bg-white px-2.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Revenue exposed</p>
        <p className="cvx-num mt-0.5 text-lg font-semibold text-slate-950">{formatPct(f.exposure.exposedShare)}</p>
        <p className="text-[10px] text-slate-500">
          {formatTRY(f.exposure.exposedRevenue)} of {formatTRY(f.exposure.totalRevenue)} across{" "}
          {f.exposure.affectedSections.length} section{f.exposure.affectedSections.length === 1 ? "" : "s"}
        </p>
      </div>

      {f.payouts.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Insurance</p>
          {f.payouts.map((p) => (
            <div key={p.policyId} className="rounded border border-slate-200 bg-white px-2.5 py-2">
              {p.eligible ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] text-slate-600">Assumed eligible payout</span>
                    <span className="cvx-num text-xs font-semibold text-slate-950">{formatTRY(p.payout)}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Arrives {p.payoutDate ? formatDateFull(p.payoutDate) : "—"}
                    {p.cappedByLimit ? " · capped by coverage limit" : ""}
                  </p>
                  <p className="mt-1 text-[10px] font-medium leading-snug text-amber-800">
                    A payout arriving after a due date does not reduce the gap on that date.
                  </p>
                </>
              ) : (
                <p className="text-[10px] text-slate-500">Not eligible — {p.ineligibleReason}</p>
              )}
              <p className="mt-1 text-[10px] text-slate-400">{p.source}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Affected sections ({run.impact.affectedSections.length})
        </p>
        {run.impact.affectedSections.slice(0, 6).map((s) => (
          <div key={s.sectionId} className="rounded border border-slate-200 bg-white px-2.5 py-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-slate-700">
                {f.exposure.affectedSections.find((a) => a.sectionId === s.sectionId)?.label ?? "Section"}
              </span>
              <span className="cvx-num text-[11px] font-semibold text-red-700">{s.yieldDeltaPct.toFixed(1)}%</span>
            </div>
            <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
              {s.factors.map((x) => x.label).join(" · ")}
            </p>
          </div>
        ))}
      </div>

      <p className="cvx-num text-[10px] text-slate-400">
        {run.impact.providerType} v{run.impact.providerVersion} · hash {run.impact.inputHash.slice(0, 16)}…
      </p>
    </div>
  );
}
