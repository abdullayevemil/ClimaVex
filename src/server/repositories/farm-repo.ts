import { prisma } from "@/lib/prisma";
import { areaBreakdown } from "@/domain/geometry/units";
import { formatCompact, formatFull } from "@/lib/cadastral";
import { toIsoDate } from "@/domain/finance/dates";
import type { Prisma } from "@prisma/client";

export type FarmListItem = ReturnType<typeof serializeFarmListItem>;

export function serializeFarmListItem(farm: {
  id: string; name: string; centroidLat: number; centroidLng: number;
  areaM2: Prisma.Decimal; isDemo: boolean; verificationStatus: string;
  geometrySource: string; il: string | null; ilce: string | null;
  borrower: { id: string; name: string } | null;
  parcels: Array<{ ada: number; parsel: number }>;
  _count?: { sections: number };
}) {
  const areaM2 = Number(farm.areaM2);
  return {
    id: farm.id,
    name: farm.name,
    centroid: { lat: farm.centroidLat, lng: farm.centroidLng },
    area: areaBreakdown(areaM2),
    isDemo: farm.isDemo,
    verificationStatus: farm.verificationStatus,
    geometrySource: farm.geometrySource,
    il: farm.il,
    ilce: farm.ilce,
    borrower: farm.borrower,
    parcelRefs: farm.parcels.map((p) => formatCompact(p)),
    sectionCount: farm._count?.sections ?? 0,
  };
}

export async function loadFarmDetail(farmId: string, seasonId?: string) {
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    include: {
      borrower: { select: { id: true, name: true, institutionName: true } },
      owner: { select: { id: true, name: true } },
      parcels: { orderBy: [{ ada: "asc" }, { parsel: "asc" }] },
      seasons: { orderBy: { startDate: "desc" } },
      insurancePolicies: true,
      loans: { include: { schedule: { orderBy: { sequence: "asc" } } }, orderBy: { reference: "asc" } },
    },
  });
  if (!farm) return null;

  const activeSeason =
    farm.seasons.find((s) => s.id === seasonId) ?? farm.seasons.find((s) => s.isActive) ?? farm.seasons[0] ?? null;

  const sections = activeSeason
    ? await prisma.cultivationSection.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { ordinal: "asc" },
        include: {
          crop: true,
          resourceLinks: { include: { resource: { select: { id: true, name: true, type: true } } } },
        },
      })
    : [];

  return {
    id: farm.id,
    name: farm.name,
    description: farm.description,
    il: farm.il,
    ilce: farm.ilce,
    geometry: farm.geojson,
    area: areaBreakdown(Number(farm.areaM2)),
    centroid: { lat: farm.centroidLat, lng: farm.centroidLng },
    geometrySource: farm.geometrySource,
    verificationStatus: farm.verificationStatus,
    isDemo: farm.isDemo,
    version: farm.version,
    owner: farm.owner,
    borrower: farm.borrower,
    parcels: farm.parcels.map((p) => ({
      id: p.id,
      ada: p.ada,
      parsel: p.parsel,
      compact: formatCompact(p),
      full: formatFull(p),
      il: p.il,
      ilce: p.ilce,
      mahalleKoy: p.mahalleKoy,
      originalInput: p.originalInput,
      /** Official recorded area, deliberately kept apart from the drawn area. */
      officialAreaM2: p.officialAreaM2 ? Number(p.officialAreaM2) : null,
      computedArea: areaBreakdown(Number(p.areaM2)),
      verificationStatus: p.verificationStatus,
    })),
    seasons: farm.seasons.map((s) => ({
      id: s.id,
      name: s.name,
      startDate: toIsoDate(s.startDate),
      endDate: toIsoDate(s.endDate),
      isActive: s.isActive,
    })),
    activeSeasonId: activeSeason?.id ?? null,
    sections: sections.map((s) => ({
      id: s.id,
      ordinal: s.ordinal,
      label: s.label,
      geometry: s.geojson,
      area: areaBreakdown(Number(s.areaM2)),
      shareOfFarm: Number(farm.areaM2) > 0 ? Number(s.areaM2) / Number(farm.areaM2) : 0,
      isMultipart: s.isMultipart,
      parcelId: s.parcelId,
      crop: { id: s.crop.id, code: s.crop.code, nameEn: s.crop.nameEn, nameTr: s.crop.nameTr, colorHex: s.crop.colorHex, isIrrigated: s.crop.isIrrigated },
      plantingDate: toIsoDate(s.plantingDate),
      harvestWindowStart: toIsoDate(s.harvestWindowStart),
      harvestWindowEnd: toIsoDate(s.harvestWindowEnd),
      expectedSaleDate: toIsoDate(s.expectedSaleDate),
      yieldTPerHa: s.yieldTPerHa.toString(),
      priceTryPerT: s.priceTryPerT.toString(),
      costTryPerHa: s.costTryPerHa.toString(),
      resources: s.resourceLinks.map((l) => ({
        linkId: l.id, resourceId: l.resource.id, name: l.resource.name, type: l.resource.type, sharePct: l.sharePct,
      })),
    })),
    loans: farm.loans.map((l) => ({
      id: l.id,
      reference: l.reference,
      principal: l.principal.toString(),
      outstandingPrincipal: l.outstandingPrincipal.toString(),
      interestRatePct: l.interestRatePct.toString(),
      startDate: toIsoDate(l.startDate),
      endDate: toIsoDate(l.endDate),
      createdByRole: l.createdByRole,
      schedule: l.schedule.map((i) => ({ id: i.id, sequence: i.sequence, dueDate: toIsoDate(i.dueDate), amount: i.amount.toString() })),
    })),
    insurancePolicies: farm.insurancePolicies.map((p) => ({
      id: p.id,
      provider: p.provider,
      eligibleHazards: p.eligibleHazards,
      coverageLimit: p.coverageLimit.toString(),
      deductible: p.deductible.toString(),
      assumedEligibility: p.assumedEligibility,
      payoutLagDays: p.payoutLagDays,
      isDemoAssumption: p.isDemoAssumption,
      source: p.source,
      createdByRole: p.createdByRole,
    })),
  };
}
