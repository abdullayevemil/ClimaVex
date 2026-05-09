"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/locale-provider";
import type { RegionSummary } from "@/lib/types";

export function RegionSelector({
  regions,
  selectedRegionId,
  onSelect,
}: {
  regions: RegionSummary[];
  selectedRegionId: string;
  onSelect: (regionId: string) => void;
}) {
  const { dictionary } = useI18n();

  return (
    <Select value={selectedRegionId} onValueChange={onSelect}>
      <SelectTrigger className="w-full bg-white sm:w-[320px]">
        <SelectValue placeholder={dictionary.selector.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {regions.map((region) => (
          <SelectItem key={region.id} value={region.id}>
            {region.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
