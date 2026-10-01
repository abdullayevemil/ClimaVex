"use client";

import { useMemo, useState } from "react";
import { MapPin, Search, Layers, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MAP_CONFIG } from "@/config/map";
import type { FarmListItemDto } from "@/lib/twin-types";

type Props = {
  farms: FarmListItemDto[];
  selectedFarmId: string | null;
  onSelect: (id: string) => void;
  onZoomDemo: () => void;
  layers: { sections: boolean; resources: boolean; scenario: boolean; exposure: boolean };
  onToggleLayer: (key: keyof Props["layers"], value: boolean) => void;
};

export function FarmSidebar({ farms, selectedFarmId, onSelect, onZoomDemo, layers, onToggleLayer }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return farms;
    return farms.filter((f) =>
      f.name.toLowerCase().includes(q) ||
      f.parcelRefs.some((r) => r.toLowerCase().includes(q)) ||
      (f.ilce ?? "").toLowerCase().includes(q) ||
      (f.borrower?.name ?? "").toLowerCase().includes(q),
    );
  }, [farms, query]);

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="space-y-3 border-b border-slate-200 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Farm, borrower or 463:21"
            className="pl-8"
            aria-label="Search farms by name, borrower or cadastral reference"
          />
        </div>
        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={onZoomDemo}>
          <Target className="h-3.5 w-3.5" />
          Zoom to {MAP_CONFIG.demoFocus.name} demo farms
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1.5 p-3">
          <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {filtered.length} farm{filtered.length === 1 ? "" : "s"}
          </p>
          {filtered.map((farm) => {
            const selected = farm.id === selectedFarmId;
            return (
              <button
                key={farm.id}
                type="button"
                onClick={() => onSelect(farm.id)}
                className={cn(
                  "w-full rounded-md border px-3 py-2.5 text-left transition",
                  selected
                    ? "border-teal-600 bg-teal-50/70 ring-1 ring-teal-600/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium leading-tight text-slate-950">{farm.name}</span>
                  {farm.isDemo ? (
                    <Badge variant="outline" className="shrink-0 border-amber-200 bg-amber-50 text-[10px] text-amber-800">
                      Demo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-800">
                      User
                    </Badge>
                  )}
                </div>
                <p className="cvx-num mt-1 text-[11px] text-slate-500">
                  {farm.area.dekar.toFixed(1)} dekar · {farm.sectionCount} section{farm.sectionCount === 1 ? "" : "s"}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {farm.parcelRefs.slice(0, 2).map((ref) => (
                    <span key={ref} className="cvx-num rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600">
                      {ref}
                    </span>
                  ))}
                  {farm.ilce ? <span className="text-[10px] text-slate-400">{farm.ilce}</span> : null}
                </div>
                {farm.borrower ? (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                    <MapPin className="h-3 w-3" />
                    {farm.borrower.name}
                  </p>
                ) : null}
              </button>
            );
          })}
          {filtered.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-slate-500">No farms match that search.</p>
          ) : null}
        </div>
      </ScrollArea>

      <div className="space-y-2.5 border-t border-slate-200 p-4">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          <Layers className="h-3 w-3" /> Layers
        </p>
        {([
          ["sections", "Crop sections"],
          ["resources", "Shared resources"],
          ["scenario", "Scenario effects"],
          ["exposure", "Financial exposure"],
        ] as const).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between">
            <Label htmlFor={`layer-${key}`} className="normal-case tracking-normal text-slate-600">{label}</Label>
            <Switch id={`layer-${key}`} checked={layers[key]} onCheckedChange={(v) => onToggleLayer(key, v)} />
          </div>
        ))}
      </div>
    </aside>
  );
}
