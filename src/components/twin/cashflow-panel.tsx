"use client";

import { Badge } from "@/components/ui/badge";
import { Stat } from "./stat";
import { DecisionNote } from "./demo-banner";
import { formatDateFull, formatTRY } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LedgerDto } from "@/lib/twin-types";

/**
 * The dated ledger and the repayment test.
 *
 * The three measures are deliberately kept apart: credit exposure is the
 * bank's book, a simulated shortfall is a timing gap, and actual credit loss
 * is not modelled at all. Collapsing them is how a liquidity model turns into
 * a false loss forecast.
 */
export function CashflowPanel({
  ledger, creditExposure, cursor,
}: {
  ledger: LedgerDto | null; creditExposure: string; cursor: string;
}) {
  if (!ledger) return <p className="text-xs text-slate-500">No season selected.</p>;

  const hasGap = Number(ledger.peakShortfall) > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Stat label="Credit exposure" value={formatTRY(creditExposure)} hint="Outstanding principal" />
        <Stat
          label="Simulated shortfall"
          value={formatTRY(ledger.peakShortfall)}
          hint="Peak funding gap"
          tone={hasGap ? "warn" : "good"}
        />
        <Stat label="Actual credit loss" value="—" hint="Not modelled" />
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Repayment tests
        </p>
        <div className="space-y-1.5">
          {ledger.repayments.map((r, i) => {
            const short = Number(r.shortfall) > 0;
            const isPast = r.date <= cursor;
            return (
              <div
                key={`${r.date}-${i}`}
                className={cn(
                  "rounded-md border px-2.5 py-2",
                  short ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-white",
                  !isPast && "opacity-55",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="cvx-num text-[11px] font-medium text-slate-900">{formatDateFull(r.date)}</span>
                  <span className="truncate text-[10px] text-slate-400">{r.label}</span>
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {([
                    ["Due", r.due, "text-slate-900"],
                    ["Available", r.available, "text-slate-600"],
                    ["Shortfall", short ? r.shortfall : null, short ? "text-red-700" : "text-emerald-700"],
                  ] as const).map(([label, value, tone]) => (
                    <div key={label}>
                      <p className="text-[9px] uppercase tracking-wide text-slate-400">{label}</p>
                      <p className={cn("cvx-num text-[11px] font-semibold", tone)}>
                        {value === null ? "none" : formatTRY(value)}
                      </p>
                    </div>
                  ))}
                </div>
                {Number(r.carriedIn) > 0 ? (
                  <p className="cvx-num mt-1 text-[10px] text-amber-800">
                    carried forward from an earlier due date: {formatTRY(r.carriedIn)}
                  </p>
                ) : null}
              </div>
            );
          })}
          {ledger.repayments.length === 0 ? (
            <p className="rounded-md border border-slate-200 px-2.5 py-4 text-center text-[11px] text-slate-500">
              No repayments fall inside this season.
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Dated cash flow</p>
        <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200">
          {ledger.days.map((day) => (
            <div key={day.date} className={cn("border-b border-slate-100 px-2.5 py-1.5 last:border-b-0", day.date > cursor && "opacity-55")}>
              <div className="flex items-baseline justify-between">
                <span className="cvx-num text-[11px] font-medium text-slate-900">{formatDateFull(day.date)}</span>
                <span className="cvx-num text-[11px] text-slate-500">balance {formatTRY(day.closingBalance)}</span>
              </div>
              {day.events.map((e, i) => (
                <div key={i} className="mt-0.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-[10px] text-slate-500">{e.label}</span>
                  <Badge variant="outline" className={cn(
                    "shrink-0 text-[9px]",
                    e.kind === "LOAN_REPAYMENT_DUE" ? "border-red-200 bg-red-50 text-red-800"
                      : e.kind === "INSURANCE_PAYOUT" ? "border-sky-200 bg-sky-50 text-sky-800"
                      : e.kind.includes("COST") || e.kind.includes("OBLIGATION") ? "border-slate-200 bg-slate-50 text-slate-600"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800",
                  )}>
                    <span className="cvx-num">{formatTRY(e.amount)}</span>
                  </Badge>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <DecisionNote />
    </div>
  );
}
