"use client";

import type { CropDto } from "@/lib/twin-types";

export function MapLegend({ crops }: { crops: CropDto[] }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white/95 px-3 py-2 backdrop-blur">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Legend</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {crops.map((c) => (
          <span key={c.id} className="flex items-center gap-1 text-[10px] text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm border border-black/10" style={{ backgroundColor: c.colorHex }} />
            {c.nameTr}
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-1.5">
        <span className="flex items-center gap-1 text-[10px] text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-700 outline outline-1 outline-amber-700/40" /> Demo data
        </span>
        <span className="flex items-center gap-1 text-[10px] text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-teal-700 outline outline-1 outline-teal-700/40" /> User data
        </span>
        <span className="flex items-center gap-1 text-[10px] text-slate-600">
          <span className="h-0.5 w-4 bg-sky-700" /> Shared resource
        </span>
      </div>
    </div>
  );
}
