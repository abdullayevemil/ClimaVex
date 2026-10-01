"use client";

import { useEffect, useState } from "react";
import { Info, Sparkles } from "lucide-react";
import { DEMO_DISCLAIMER } from "@/domain/scenario/contract";
import { fetchJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";

type AiStatus = { mode: string; connected: boolean; modelTrainedAt?: string | null; reason?: string };

// ponytail: asked once per page load. Each risk score carries its own provider, so a stale banner cannot mislabel a result.
let statusRequest: Promise<AiStatus> | null = null;

function useAiStatus(): AiStatus | null {
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    statusRequest ??= fetchJson<AiStatus>("/api/ai/status").catch(() => ({ mode: "deterministic", connected: false }));
    void statusRequest.then(setStatus);
  }, []);
  return status;
}

/** An amber notice for any figure that did not come from the AI model. */
export function DemoBanner({ className, compact, message = DEMO_DISCLAIMER }: { className?: string; compact?: boolean; message?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 text-amber-900",
        compact ? "px-2 py-1 text-[11px]" : "px-3 py-2 text-xs",
        className,
      )}
    >
      <Info className={compact ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0"} />
      <span className="font-medium">{message}</span>
    </div>
  );
}

export function ModelBanner({ className, message }: { className?: string; message: string }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-900", className)}>
      <Sparkles className="h-3 w-3 shrink-0" />
      <span className="font-medium">{message}</span>
    </div>
  );
}

/**
 * Reports whether the ML service is answering right now — not what was
 * configured — so the demo notice disappears only when a model is really
 * behind the score, and comes back by itself if the service goes down.
 */
export function AiStatusBanner({ className }: { className?: string }) {
  const status = useAiStatus();
  if (!status) return null;
  if (status.connected) {
    const trained = status.modelTrainedAt ? ` · trained ${status.modelTrainedAt.slice(0, 10)}` : "";
    return <ModelBanner className={className} message={`AI model connected${trained}`} />;
  }
  return (
    <DemoBanner
      compact
      className={className}
      message={status.mode === "trained-model" ? "AI model unreachable — rule-based fallback in use." : DEMO_DISCLAIMER}
    />
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
