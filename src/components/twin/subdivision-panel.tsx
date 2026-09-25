"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Scissors, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CropDto, SubdivisionPreviewDto } from "@/lib/twin-types";

type Props = {
  maxN: number;
  crops: CropDto[];
  preview: SubdivisionPreviewDto | null;
  previewAssignments: string[];
  busy: boolean;
  error: string | null;
  canWrite: boolean;
  onPreview: (n: number, weights?: number[]) => void;
  onAssign: (index: number, cropId: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

/**
 * Divide the field into N sections and assign crops.
 *
 * N is deliberately independent of crop count — ten sections may reuse the
 * same five crops — and the invariant report is shown rather than hidden, so
 * the user can see the division is sound before committing it.
 */
export function SubdivisionPanel({
  maxN, crops, preview, previewAssignments, busy, error, canWrite,
  onPreview, onAssign, onCancel, onSave,
}: Props) {
  const [n, setN] = useState(6);
  const [mode, setMode] = useState<"equal" | "custom">("equal");
  const [weightText, setWeightText] = useState("60, 40");

  const submit = () => {
    if (mode === "equal") return onPreview(n);
    const weights = weightText.split(/[,\s]+/).filter(Boolean).map(Number);
    onPreview(weights.length, weights);
  };

  const report = preview?.report;

  return (
    <div className="space-y-4">
      {!canWrite ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Field geometry and crop sections are owned by the farmer. Your access covers financial terms
          and scenarios.
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Division mode</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button" size="sm" variant={mode === "equal" ? "default" : "outline"}
            onClick={() => setMode("equal")} disabled={!canWrite}
          >
            Equal areas
          </Button>
          <Button
            type="button" size="sm" variant={mode === "custom" ? "default" : "outline"}
            onClick={() => setMode("custom")} disabled={!canWrite}
          >
            Custom shares
          </Button>
        </div>
      </div>

      {mode === "equal" ? (
        <div className="space-y-2">
          <Label htmlFor="section-count">Number of sections (1–{maxN})</Label>
          <div className="flex items-center gap-2">
            <Input
              id="section-count" type="number" min={1} max={maxN} value={n}
              onChange={(e) => setN(Math.max(1, Math.min(maxN, Number(e.target.value) || 1)))}
              className="w-24" disabled={!canWrite}
            />
            <Button type="button" size="sm" onClick={submit} disabled={busy || !canWrite} className="gap-1.5">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5" />}
              Preview division
            </Button>
          </div>
          <p className="text-[11px] leading-snug text-slate-500">
            Sections are cut perpendicular to the field&apos;s longest axis, so each is a compact,
            workable strip rather than a sliver.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="weights">Relative shares</Label>
          <div className="flex items-center gap-2">
            <Input
              id="weights" value={weightText} onChange={(e) => setWeightText(e.target.value)}
              placeholder="60, 40" disabled={!canWrite}
            />
            <Button type="button" size="sm" onClick={submit} disabled={busy || !canWrite} className="gap-1.5">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5" />}
              Preview
            </Button>
          </div>
          <p className="text-[11px] leading-snug text-slate-500">
            Comma-separated. <span className="cvx-num">60, 40</span> on a 20 ha field gives 12 ha and 8 ha.
          </p>
        </div>
      )}

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {preview && report ? (
        <>
          <div className="rounded-md border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Preview · {preview.sections.length} sections
              </span>
              <div className="flex gap-1">
                <InvariantChip ok={report.areaConserved} label="area conserved" />
                <InvariantChip ok={report.noOverlaps} label="no overlap" />
                <InvariantChip ok={report.withinEqualAreaTolerance} label="within tolerance" />
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {preview.sections.map((section, index) => {
                const cropId = previewAssignments[index] ?? crops[0]?.id ?? "";
                const crop = crops.find((c) => c.id === cropId);
                return (
                  <div key={section.ordinal} className="flex items-center gap-2 px-3 py-2">
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10"
                      style={{ backgroundColor: crop?.colorHex ?? "#cbd5e1" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-900">{section.label}</p>
                      <p className="cvx-num text-[10px] text-slate-500">
                        {section.area.dekar.toFixed(1)} dekar
                        {section.isMultipart ? " · multipart" : ""}
                      </p>
                    </div>
                    <Select value={cropId} onValueChange={(v) => onAssign(index, v)} disabled={!canWrite}>
                      <SelectTrigger className="h-8 w-[132px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {crops.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">
                            {c.nameTr} · {c.nameEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
            <div className="cvx-num border-t border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
              parent {report.parentArea.dekar.toFixed(1)} dekar · unassigned gap {report.gapM2.toFixed(1)} m² ·
              max overlap {report.maxOverlapM2.toFixed(2)} m² · largest deviation from target{" "}
              {(report.maxEqualAreaDeviationRel * 100).toFixed(3)}%
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel} className="gap-1.5">
              <Undo2 className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button
              type="button" size="sm" onClick={onSave} className="flex-1 gap-1.5"
              disabled={busy || !canWrite || !report.areaConserved || !report.noOverlaps}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save layout
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function InvariantChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[9px] font-medium",
        ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800",
      )}
    >
      {ok ? "✓" : "✕"} {label}
    </Badge>
  );
}
