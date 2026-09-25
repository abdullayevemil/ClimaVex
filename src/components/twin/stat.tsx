import { cn } from "@/lib/utils";

export function Stat({
  label, value, hint, tone = "default", className,
}: {
  label: string; value: string; hint?: string;
  tone?: "default" | "warn" | "danger" | "good"; className?: string;
}) {
  const toneClass = {
    default: "text-slate-950",
    good: "text-emerald-700",
    warn: "text-amber-700",
    danger: "text-red-700",
  }[tone];

  return (
    <div className={cn("rounded-md border border-slate-200 bg-white px-3 py-2.5", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("cvx-num mt-1 text-lg font-semibold leading-tight", toneClass)}>{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{hint}</p> : null}
    </div>
  );
}
