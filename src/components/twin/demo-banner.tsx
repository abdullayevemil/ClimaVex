import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shown wherever a modelled figure appears. Driven by the provider type rather
 * than hardcoded, so it disappears by itself the day a trained model is wired
 * in — and cannot be forgotten in the meantime.
 */
export function DemoBanner({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 text-amber-900",
        compact ? "px-2 py-1 text-[11px]" : "px-3 py-2 text-xs",
        className,
      )}
    >
      <Info className={compact ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0"} />
      <span className="font-medium">Demo simulation — AI model not connected.</span>
    </div>
  );
}

export function DecisionNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-[11px] leading-relaxed text-slate-500", className)}>
      Decision support only — the bank retains the credit decision. Credit exposed to an event is not
      automatically a credit loss.
    </p>
  );
}
