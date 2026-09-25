import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getImpactProvider, getRiskProvider } from "@/domain/scenario/providers";
import { RULESET_VERSION } from "@/domain/scenario/deterministic-provider";
import { RISK_RULESET_VERSION } from "@/domain/scenario/risk-provider";
import { IMPACT_CONTRACT_VERSION, type CropCoefficients, type ImpactRequest, type SectionSnapshot, type StageWindow } from "@/domain/scenario/contract";
import { addDays, toIsoDate, type IsoDate } from "@/domain/finance/dates";
import { money, moneyToString, sum, ZERO } from "@/domain/finance/money";
import { cropMixExposure, sectionRevenue, type SectionRevenueInput } from "@/domain/vulnerability/crop-mix";
import { assessPayout, policyFromRow } from "@/domain/finance/insurance";
import { computeLedger } from "./cashflow-repo";
import type { LedgerEvent } from "@/domain/finance/ledger";
import type { MultiPolygonGeometry } from "@/domain/geometry/types";

const HAZARD_BY_KIND: Record<string, string> = {
  WEATHER_REPLAY: "DROUGHT",
  RESOURCE_DISRUPTION: "IRRIGATION_FAILURE",
  BASELINE: "NONE",
};

export async function loadSectionSnapshots(farmId: string, seasonId: string) {
  const [sections, crops] = await Promise.all([
    prisma.cultivationSection.findMany({
      where: { seasonId, farmId },
      orderBy: { ordinal: "asc" },
      include: { crop: { include: { stages: { where: { regionCode: "TR-42" } } } }, resourceLinks: true },
    }),
    prisma.crop.findMany({ include: { stages: { where: { regionCode: "TR-42" } } } }),
  ]);

  const snapshots: SectionSnapshot[] = sections.map((s) => {
    const planting = toIsoDate(s.plantingDate);
    const stages: StageWindow[] = s.crop.stages
      .slice()
      .sort((a, b) => a.startOffsetDays - b.startOffsetDays)
      .map((st) => ({
        stage: st.stage,
        start: addDays(planting, st.startOffsetDays),
        end: addDays(planting, st.endOffsetDays),
        isSensitive: st.isSensitive,
      }));

    return {
      sectionId: s.id,
      ordinal: s.ordinal,
      label: s.label,
      cropCode: s.crop.code,
      geometry: s.geojson as unknown as MultiPolygonGeometry,
      areaM2: Number(s.areaM2),
      plantingDate: planting,
      harvestWindow: { start: toIsoDate(s.harvestWindowStart), end: toIsoDate(s.harvestWindowEnd) },
      expectedSaleDate: toIsoDate(s.expectedSaleDate),
      stages,
      resourceDependencies: s.resourceLinks.map((l) => ({ resourceId: l.resourceId, type: "RESOURCE", sharePct: l.sharePct })),
    };
  });

  const coefficients: CropCoefficients[] = crops.map((c) => ({
    cropCode: c.code, cropName: c.nameEn, isIrrigated: c.isIrrigated,
    heatThresholdC: c.heatThresholdC, heatPctPerDay: c.heatPctPerDay, heatCapPct: c.heatCapPct,
    frostThresholdC: c.frostThresholdC, frostPctPerEvent: c.frostPctPerEvent,
    waterRequirementMm: c.waterRequirementMm, droughtMaxPct: c.droughtMaxPct,
    waterloggingPct: c.waterloggingPct, irrigationPctPerDay: c.irrigationPctPerDay,
    irrigationCapPct: c.irrigationCapPct,
  }));

  const revenueInputs: SectionRevenueInput[] = sections.map((s) => ({
    sectionId: s.id, label: s.label, cropCode: s.crop.code, cropName: s.crop.nameEn,
    areaM2: Number(s.areaM2), yieldTPerHa: s.yieldTPerHa.toString(),
    priceTryPerT: s.priceTryPerT.toString(), costTryPerHa: s.costTryPerHa.toString(),
  }));

  return { sections, snapshots, coefficients, revenueInputs };
}

/**
 * Run one scenario end to end: provider → revenue effect → insurance → ledger.
 *
 * Note the ordering and the separation. The provider supplies percentage
 * deltas and nothing else; this function turns those into money using the
 * deterministic finance modules. A future trained model changes the first step
 * and cannot touch the second.
 */
export async function runScenario(scenarioId: string) {
  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: { weatherDataset: { include: { observations: { orderBy: { date: "asc" } } } }, season: true },
  });
  if (!scenario) throw new Error("Scenario not found");

  const { snapshots, coefficients, revenueInputs } = await loadSectionSnapshots(scenario.farmId, scenario.seasonId);

  const params = (scenario.params ?? {}) as { disruption?: { resourceIds: string[]; startDate: IsoDate; endDate: IsoDate } };

  const request: ImpactRequest = {
    contractVersion: IMPACT_CONTRACT_VERSION,
    scenarioId: scenario.id,
    seasonId: scenario.seasonId,
    farm: { id: scenario.farmId, sections: snapshots },
    season: { startDate: toIsoDate(scenario.season.startDate), endDate: toIsoDate(scenario.season.endDate) },
    scenarioInputs: {
      kind: scenario.kind,
      weather: scenario.weatherDataset
        ? {
            datasetId: scenario.weatherDataset.id,
            kind: scenario.weatherDataset.kind,
            provenance: scenario.weatherDataset.provenance,
            alignment: scenario.dateAlignment,
            observations: scenario.weatherDataset.observations.map((o) => ({
              date: toIsoDate(o.date), tMaxC: o.tMaxC, tMinC: o.tMinC, precipMm: o.precipMm,
            })),
            missingDates: [],
          }
        : undefined,
      disruption: params.disruption,
    },
    assumptions: { rulesetVersion: RULESET_VERSION, crops: coefficients },
  };

  const provider = getImpactProvider();
  const impact = await provider.estimate(request);

  // An unchanged re-run returns the stored snapshot rather than recomputing:
  // scenario results are immutable and reproducible by construction.
  const existing = await prisma.scenarioRun.findUnique({
    where: {
      scenarioId_inputHash_providerVersion: {
        scenarioId: scenario.id, inputHash: impact.inputHash, providerVersion: impact.providerVersion,
      },
    },
  });
  if (existing) {
    return { run: existing, impact, reused: true };
  }

  const deltaBySection = new Map(impact.affectedSections.map((a) => [a.sectionId, a.revenueDeltaPct]));
  const baselineRows = revenueInputs.map(sectionRevenue);

  const baselineRevenue = sum(baselineRows.map((r) => money(r.expectedRevenue)));
  const scenarioRevenue = sum(
    baselineRows.map((r) => money(r.expectedRevenue).times(1 + (deltaBySection.get(r.sectionId) ?? 0) / 100)),
  );
  const assessedLoss = baselineRevenue.minus(scenarioRevenue);

  const affectedIds = impact.affectedSections.map((a) => a.sectionId);
  const exposure = cropMixExposure(revenueInputs, affectedIds);

  const hazard = HAZARD_BY_KIND[scenario.kind] ?? "NONE";
  const hazardEnd = params.disruption?.endDate ?? toIsoDate(scenario.season.endDate);

  const policies = await prisma.insurancePolicy.findMany({ where: { farmId: scenario.farmId } });
  const payouts = policies.map((p) => assessPayout(policyFromRow(p), hazard, assessedLoss, hazardEnd));

  // Scenario effects enter the ledger as extra dated events. They are never
  // written to the CashFlowEvent table, so a scenario can never contaminate
  // the farm's real recorded cash flow.
  const extras: LedgerEvent[] = [];

  for (const row of baselineRows) {
    const delta = deltaBySection.get(row.sectionId);
    if (!delta) continue;
    const loss = money(row.expectedRevenue).times(Math.abs(delta) / 100);
    if (loss.lessThanOrEqualTo(0)) continue;
    const section = snapshots.find((s) => s.sectionId === row.sectionId);
    extras.push({
      id: `scenario-loss-${row.sectionId}`,
      kind: "OTHER_OBLIGATION",
      date: section?.expectedSaleDate ?? toIsoDate(scenario.season.endDate),
      amount: loss,
      label: `${row.label}: modelled revenue reduction`,
    });
  }

  for (const payout of payouts) {
    if (!payout.eligible || !payout.payoutDate || money(payout.payout).lessThanOrEqualTo(0)) continue;
    extras.push({
      id: `scenario-payout-${payout.policyId}`,
      kind: "INSURANCE_PAYOUT",
      date: payout.payoutDate,
      amount: money(payout.payout),
      label: `Assumed eligible payout (${payout.hazard})`,
    });
  }

  const [baselineLedger, scenarioLedger] = await Promise.all([
    computeLedger(scenario.farmId, scenario.seasonId),
    computeLedger(scenario.farmId, scenario.seasonId, extras),
  ]);

  const financial = {
    baselineRevenue: moneyToString(baselineRevenue),
    scenarioRevenue: moneyToString(scenarioRevenue),
    assessedLoss: moneyToString(assessedLoss),
    payouts,
    baseline: baselineLedger,
    scenario: scenarioLedger,
    exposure,
    hazard,
  };

  const run = await prisma.scenarioRun.create({
    data: {
      scenarioId: scenario.id,
      inputHash: impact.inputHash,
      providerType: impact.providerType,
      providerVersion: impact.providerVersion,
      rulesetVersion: RULESET_VERSION,
      resultJson: impact as unknown as Prisma.InputJsonValue,
      financialResultJson: financial as unknown as Prisma.InputJsonValue,
    },
  });

  return { run, impact, financial, reused: false };
}

/** The headline risk score for bank and insurance users. */
export async function assessFarmRisk(farmId: string, seasonId: string, requestedById: string | null) {
  const { revenueInputs, snapshots } = await loadSectionSnapshots(farmId, seasonId);
  if (revenueInputs.length === 0) throw new Error("This season has no cultivation sections to assess.");

  const rows = revenueInputs.map(sectionRevenue);
  const totalRevenue = sum(rows.map((r) => money(r.expectedRevenue)));

  const sharedSectionIds = new Set(snapshots.filter((s) => s.resourceDependencies.length > 0).map((s) => s.sectionId));
  const sharedRevenue = sum(rows.filter((r) => sharedSectionIds.has(r.sectionId)).map((r) => money(r.expectedRevenue)));

  // Exposure to the single most crowded sensitive window, revenue-weighted.
  const windowRevenue = new Map<string, ReturnType<typeof money>>();
  for (const snapshot of snapshots) {
    const row = rows.find((r) => r.sectionId === snapshot.sectionId);
    if (!row) continue;
    for (const stage of snapshot.stages.filter((s) => s.isSensitive)) {
      const key = `${stage.start.slice(0, 7)}`;
      windowRevenue.set(key, (windowRevenue.get(key) ?? ZERO).plus(money(row.expectedRevenue)));
    }
  }
  const peakWindow = [...windowRevenue.values()].reduce((a, b) => (a.greaterThan(b) ? a : b), ZERO);

  const exposure = cropMixExposure(
    revenueInputs,
    rows.filter((r) => sharedSectionIds.has(r.sectionId)).map((r) => r.sectionId),
  );

  const ledger = await computeLedger(farmId, seasonId);
  const scheduledTotal = ledger.repayments.reduce((acc, r) => acc.plus(money(r.due)), ZERO);
  const repaymentStressShare = scheduledTotal.isZero()
    ? 0
    : Math.min(Number(money(ledger.peakShortfall).dividedBy(scheduledTotal).toFixed(6)), 1);

  const provider = getRiskProvider();
  const response = await provider.assess({
    contractVersion: IMPACT_CONTRACT_VERSION,
    farmId,
    seasonId,
    sections: rows.map((r, i) => ({ ...snapshots[i], expectedRevenue: r.expectedRevenue })),
    cropMixExposedShare: totalRevenue.isZero() ? 0 : Number(peakWindow.dividedBy(totalRevenue).toFixed(6)),
    topCropShare: exposure.topCropShare,
    sharedResourceShare: totalRevenue.isZero() ? 0 : Number(sharedRevenue.dividedBy(totalRevenue).toFixed(6)),
    repaymentStressShare,
    weatherStressPct: 0,
    assumptions: { rulesetVersion: RISK_RULESET_VERSION },
  });

  const saved = await prisma.riskAssessmentRun.upsert({
    where: {
      farmId_seasonId_inputHash_providerVersion: {
        farmId, seasonId, inputHash: response.inputHash, providerVersion: response.providerVersion,
      },
    },
    create: {
      farmId, seasonId, requestedById,
      inputHash: response.inputHash,
      providerType: response.providerType,
      providerVersion: response.providerVersion,
      score: response.score,
      band: response.band,
      resultJson: response as unknown as Prisma.InputJsonValue,
    },
    update: {},
  });

  return { assessment: response, runId: saved.id, exposure, ledger };
}
