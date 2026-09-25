"use client";

import { useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { formatDateFull, formatDateShort, formatCompactTRY } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LedgerDto, SectionDto } from "@/lib/twin-types";

type Props = {
  seasonStart: string;
  seasonEnd: string;
  cursor: string;
  onCursorChange: (iso: string) => void;
  sections: SectionDto[];
  ledger: LedgerDto | null;
};

const DAY = 86_400_000;
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * The season timeline. Moving the cursor drives the map styling and every
 * panel's "as of" date, so time is a first-class dimension of the twin rather
 * than a decoration.
 *
 * Marks come from the crop calendars and the repayment schedule — never
 * presented as observations.
 */
export function SeasonTimeline({ seasonStart, seasonEnd, cursor, onCursorChange, sections, ledger }: Props) {
  const start = toDate(seasonStart);
  const end = toDate(seasonEnd);
  const total = Math.max(1, Math.round((end - start) / DAY));
  const position = Math.min(total, Math.max(0, Math.round((toDate(cursor) - start) / DAY)));

  const pct = (iso: string) => {
    const v = ((toDate(iso) - start) / DAY / total) * 100;
    return Math.min(100, Math.max(0, v));
  };

  const marks = useMemo(() => {
    const items: Array<{ iso: string; kind: "plant" | "harvest" | "sale" | "repay"; label: string; color: string }> = [];
    for (const s of sections) {
      items.push({ iso: s.plantingDate, kind: "plant", label: `${s.label} planting`, color: s.crop.colorHex });
      items.push({ iso: s.harvestWindowEnd, kind: "harvest", label: `${s.label} harvest`, color: s.crop.colorHex });
      items.push({ iso: s.expectedSaleDate, kind: "sale", label: `${s.label} expected sale`, color: "#0369a1" });
    }
    for (const r of ledger?.repayments ?? []) {
      items.push({ iso: r.date, kind: "repay", label: `${r.label} · ${formatCompactTRY(r.due)}`, color: "#b91c1c" });
    }
    return items.filter((m) => m.iso >= seasonStart && m.iso <= seasonEnd);
  }, [sections, ledger, seasonStart, seasonEnd]);

  const harvestBands = useMemo(
    () => sections.map((s) => ({
      id: s.id, color: s.crop.colorHex, label: s.label,
      left: pct(s.harvestWindowStart), width: Math.max(0.6, pct(s.harvestWindowEnd) - pct(s.harvestWindowStart)),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sections, seasonStart, seasonEnd],
  );

  const months = useMemo(() => {
    const out: Array<{ iso: string; label: string }> = [];
    const d = new Date(start);
    d.setUTCDate(1);
    while (d.getTime() <= end) {
      const iso = d.toISOString().slice(0, 10);
      if (iso >= seasonStart) out.push({ iso, label: new Date(iso).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }) });
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
    return out;
  }, [start, end, seasonStart]);

  return (
    <div className="border-t border-slate-200 bg-white px-5 py-3">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Season</span>
          <span className="cvx-num text-sm font-semibold text-slate-950">{formatDateFull(cursor)}</span>
          <span className="text-[11px] text-slate-500">day {position + 1} of {total + 1}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
          <LegendDot className="bg-slate-400" label="planting" />
          <LegendBar label="harvest window" />
          <LegendDot className="bg-sky-600" label="expected sale" />
          <LegendDot className="bg-red-700" label="repayment due" />
        </div>
      </div>

      <div className="relative mt-3 h-11">
        {/* Harvest windows as bands behind the track. */}
        <div className="absolute inset-x-0 top-0 h-3.5 rounded bg-slate-100">
          {harvestBands.map((b) => (
            <div
              key={b.id}
              title={`${b.label} harvest window`}
              className="absolute top-0 h-3.5 rounded-sm opacity-70"
              style={{ left: `${b.left}%`, width: `${b.width}%`, backgroundColor: b.color }}
            />
          ))}
        </div>

        {/* Event marks. */}
        <div className="absolute inset-x-0 top-4 h-4">
          {marks.map((m, i) => (
            <span
              key={`${m.kind}-${m.iso}-${i}`}
              title={`${m.label} · ${formatDateShort(m.iso)}`}
              className={cn(
                "absolute top-0 -translate-x-1/2",
                m.kind === "repay" ? "h-4 w-[2px]" : "h-2 w-2 rounded-full",
              )}
              style={{ left: `${pct(m.iso)}%`, backgroundColor: m.color }}
            />
          ))}
        </div>

        <Slider
          className="absolute inset-x-0 top-7"
          value={[position]}
          min={0}
          max={total}
          step={1}
          onValueChange={([v]) => onCursorChange(toIso(start + v * DAY))}
          aria-label="Season date"
        />
      </div>

      <div className="mt-1 flex justify-between">
        {months.map((m) => (
          <span key={m.iso} className="text-[10px] text-slate-400">{m.label}</span>
        ))}
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("h-2 w-2 rounded-full", className)} />
      {label}
    </span>
  );
}

function LegendBar({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2 w-4 rounded-sm bg-gradient-to-r from-amber-600 to-teal-700 opacity-70" />
      {label}
    </span>
  );
}
