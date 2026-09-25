"use client";

import { Building2, ShieldCheck, Sprout, Waves } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { SubdivisionPanel } from "./subdivision-panel";
import { RiskPanel } from "./risk-panel";
import { CashflowPanel } from "./cashflow-panel";
import { ScenarioPanel } from "./scenario-panel";
import { Stat } from "./stat";
import { formatArea, formatPct, formatTRY, formatDateFull } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AccessDto, AssessmentDto, CropDto, FarmDetailDto, LedgerDto, ResourceDto,
  ScenarioRunDto, SubdivisionPreviewDto, WeatherDatasetDto,
} from "@/lib/twin-types";

type Props = {
  farm: FarmDetailDto | null;
  access: AccessDto | null;
  crops: CropDto[];
  loading: boolean;
  ledger: LedgerDto | null;
  creditExposure: string;
  assessment: AssessmentDto | null;
  assessmentBusy: boolean;
  onRunAssessment: () => void;
  preview: SubdivisionPreviewDto | null;
  previewAssignments: string[];
  subdivisionBusy: boolean;
  subdivisionError: string | null;
  maxN: number;
  onPreview: (n: number, weights?: number[]) => void;
  onAssign: (index: number, cropId: string) => void;
  onCancelPreview: () => void;
  onSaveLayout: () => void;
  datasets: WeatherDatasetDto[];
  resources: ResourceDto[];
  scenarioRun: ScenarioRunDto | null;
  scenarioBusy: boolean;
  onRunWeather: (datasetId: string, alignment: string) => void;
  onRunDisruption: (resourceIds: string[], start: string, end: string) => void;
  cursor: string;
};

export function Inspector(props: Props) {
  const { farm, access, loading } = props;

  if (loading) {
    return (
      <aside className="flex w-[400px] shrink-0 flex-col gap-3 border-l border-slate-200 bg-white p-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </aside>
    );
  }

  if (!farm) {
    return (
      <aside className="flex w-[400px] shrink-0 flex-col items-center justify-center gap-2 border-l border-slate-200 bg-white p-8 text-center">
        <Sprout className="h-8 w-8 text-slate-300" />
        <p className="text-sm font-medium text-slate-900">No farm selected</p>
        <p className="text-xs leading-relaxed text-slate-500">
          Pick a farm from the list or a pin on the map to inspect its sections, cash flow and risk score.
        </p>
      </aside>
    );
  }

  const verified = farm.verificationStatus === "OFFICIALLY_VERIFIED";

  return (
    <aside className="flex w-[400px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="space-y-2 border-b border-slate-200 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold leading-tight text-slate-950">{farm.name}</h2>
          <Badge variant="outline" className={cn(
            "shrink-0 text-[10px]",
            verified ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800",
          )}>
            {verified ? "Verified" : "Unverified draft"}
          </Badge>
        </div>

        {farm.parcels.length > 0 ? (
          <div className="space-y-1">
            {farm.parcels.map((p) => (
              <p key={p.id} className="cvx-num text-[11px] text-slate-600">{p.full}</p>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">No cadastral reference recorded.</p>
        )}

        <p className="cvx-num text-[11px] text-slate-500">{formatArea(farm.area)}</p>

        {farm.parcels.some((p) => p.officialAreaM2) ? (
          <p className="cvx-num text-[11px] text-slate-500">
            Official recorded area:{" "}
            {farm.parcels.filter((p) => p.officialAreaM2).map((p) => `${((p.officialAreaM2 ?? 0) / 1000).toFixed(1)} dekar`).join(", ")}
            <span className="text-slate-400"> · kept separate from the drawn area</span>
          </p>
        ) : null}

        {farm.borrower ? (
          <p className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <Building2 className="h-3 w-3" /> {farm.borrower.name}
          </p>
        ) : null}

        {access && !access.canWriteTwin && access.canWriteFinance ? (
          <Badge variant="outline" className="border-sky-200 bg-sky-50 text-[10px] text-sky-800">
            <ShieldCheck className="mr-1 h-3 w-3" /> Finance write access
          </Badge>
        ) : null}
      </div>

      <Tabs defaultValue="risk" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-3 grid w-auto grid-cols-5">
          {["risk", "sections", "divide", "finance", "scenario"].map((v) => (
            <TabsTrigger key={v} value={v} className="text-[11px] capitalize">{v}</TabsTrigger>
          ))}
        </TabsList>

        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">
            <TabsContent value="risk" className="mt-0">
              <RiskPanel assessment={props.assessment} busy={props.assessmentBusy} onRun={props.onRunAssessment} />
            </TabsContent>

            <TabsContent value="sections" className="mt-0">
              <SectionList farm={farm} cursor={props.cursor} />
            </TabsContent>

            <TabsContent value="divide" className="mt-0">
              <SubdivisionPanel
                maxN={props.maxN} crops={props.crops} preview={props.preview}
                previewAssignments={props.previewAssignments} busy={props.subdivisionBusy}
                error={props.subdivisionError} canWrite={access?.canWriteTwin ?? false}
                onPreview={props.onPreview} onAssign={props.onAssign}
                onCancel={props.onCancelPreview} onSave={props.onSaveLayout}
              />
            </TabsContent>

            <TabsContent value="finance" className="mt-0">
              <CashflowPanel ledger={props.ledger} creditExposure={props.creditExposure} cursor={props.cursor} />
            </TabsContent>

            <TabsContent value="scenario" className="mt-0">
              <ScenarioPanel
                datasets={props.datasets} resources={props.resources} run={props.scenarioRun}
                busy={props.scenarioBusy} canRun={access?.canRunScenario ?? false}
                onRunWeather={props.onRunWeather} onRunDisruption={props.onRunDisruption}
              />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </aside>
  );
}

function SectionList({ farm, cursor }: { farm: FarmDetailDto; cursor: string }) {
  if (farm.sections.length === 0) {
    return <p className="text-xs text-slate-500">This season has no cultivation sections yet. Use the Divide tab.</p>;
  }

  return (
    <div className="space-y-2">
      {farm.sections.map((s) => {
        const revenue = Number(s.yieldTPerHa) * Number(s.priceTryPerT) * (s.area.hectares);
        const stage = cursor < s.plantingDate ? "before planting"
          : cursor <= s.harvestWindowStart ? "growing"
          : cursor <= s.harvestWindowEnd ? "harvest window"
          : cursor <= s.expectedSaleDate ? "awaiting sale" : "sold";
        return (
          <div key={s.id} className="rounded-md border border-slate-200 bg-white p-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10" style={{ backgroundColor: s.crop.colorHex }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-950">{s.label}</p>
                  <Badge variant="outline" className="shrink-0 text-[9px] capitalize">{stage}</Badge>
                </div>
                <p className="text-[11px] text-slate-600">{s.crop.nameTr} · {s.crop.nameEn}</p>
                <p className="cvx-num mt-1 text-[10px] text-slate-500">
                  {s.area.dekar.toFixed(1)} dekar · {formatPct(s.shareOfFarm)} of farm
                  {s.isMultipart ? " · multipart" : ""}
                </p>
                <dl className="cvx-num mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                  <div><dt className="inline text-slate-400">Planted </dt><dd className="inline">{formatDateFull(s.plantingDate)}</dd></div>
                  <div><dt className="inline text-slate-400">Harvest </dt><dd className="inline">{formatDateFull(s.harvestWindowEnd)}</dd></div>
                  <div><dt className="inline text-slate-400">Sale </dt><dd className="inline">{formatDateFull(s.expectedSaleDate)}</dd></div>
                  <div><dt className="inline text-slate-400">Revenue </dt><dd className="inline">{formatTRY(revenue)}</dd></div>
                </dl>
                {s.resources.length > 0 ? (
                  <p className="mt-1.5 flex items-center gap-1 text-[10px] text-sky-700">
                    <Waves className="h-3 w-3" /> {s.resources.map((r) => r.name).join(", ")}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
      <Stat
        label="Total expected revenue"
        value={formatTRY(farm.sections.reduce((sum, s) => sum + Number(s.yieldTPerHa) * Number(s.priceTryPerT) * s.area.hectares, 0))}
        hint="Editable demo assumptions — yield, price and cost"
      />
    </div>
  );
}
