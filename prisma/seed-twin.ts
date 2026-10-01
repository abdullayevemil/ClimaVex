/**
 * Deterministic demo data for the ClimaVex digital twin.
 *
 * Nothing here is random: every geometry, price and date is a literal, and
 * sections are produced by calling the real subdivision algorithm rather than
 * being hand-typed, so the seed doubles as a reproducibility check on it.
 *
 * The four farms deliberately cover the geometry edge cases (convex, concave,
 * holed, weighted split) and the financial fixtures reproduce the exact
 * figures used in the ClimaVex concept documents.
 *
 * Every outline sits on real cropland, placed against satellite imagery: two
 * on the Harran Plain south of Şanlıurfa, one on the Çumra plain in Konya and
 * one on the Kumkale plain in Çanakkale. The outlines are demo fixtures — real
 * fields, but not anyone's surveyed parcel boundaries. Spreading them across
 * three provinces also puts them in three different model regions, so their
 * climate factors genuinely differ.
 */
import { PrismaClient, Prisma, type UserRole } from "@prisma/client";
import { subdivide } from "../src/domain/geometry/subdivide";
import { isoDateToUtcDate, addDays } from "../src/domain/finance/dates";
import { hashPassword } from "../src/server/auth/session";
import type { ArealGeometry } from "../src/domain/geometry/types";

const db = new PrismaClient();
const D = (v: string | number) => new Prisma.Decimal(v);
// ponytail: one crop calendar and one assumption set for every province,
// filed under Konya's code. Per-region calendars when a second one is sourced.
const REGION = "TR-42";

/* ── Crops ────────────────────────────────────────────────────────────────
 * PROVISIONAL demo catalogue. Regional crop statistics could not be verified —
 * the official sources were unreachable — so no ranking claim is made. The
 * catalogue is data, not code: changing it is a seed edit.
 * ─────────────────────────────────────────────────────────────────────── */
const CROPS = [
  { code: "WHEAT",      nameEn: "Wheat",      nameTr: "Buğday",        colorHex: "#b45309", isIrrigated: false, sortOrder: 1,
    heatThresholdC: 30, heatPctPerDay: 0.9, heatCapPct: 26, frostThresholdC: -4, frostPctPerEvent: 5,
    waterRequirementMm: 340, droughtMaxPct: 38, waterloggingPct: 9, irrigationPctPerDay: 0.8, irrigationCapPct: 22,
    yieldTPerHa: "4.20", priceTryPerT: "9500.00", costTryPerHa: "14500.00" },
  { code: "BARLEY",     nameEn: "Barley",     nameTr: "Arpa",          colorHex: "#a16207", isIrrigated: false, sortOrder: 2,
    heatThresholdC: 29, heatPctPerDay: 1.0, heatCapPct: 28, frostThresholdC: -5, frostPctPerEvent: 4,
    waterRequirementMm: 300, droughtMaxPct: 34, waterloggingPct: 10, irrigationPctPerDay: 0.8, irrigationCapPct: 20,
    yieldTPerHa: "3.60", priceTryPerT: "8200.00", costTryPerHa: "12000.00" },
  { code: "MAIZE",      nameEn: "Maize",      nameTr: "Mısır",         colorHex: "#ca8a04", isIrrigated: true,  sortOrder: 3,
    heatThresholdC: 33, heatPctPerDay: 1.4, heatCapPct: 34, frostThresholdC: 0, frostPctPerEvent: 9,
    waterRequirementMm: 620, droughtMaxPct: 46, waterloggingPct: 12, irrigationPctPerDay: 1.8, irrigationCapPct: 44,
    yieldTPerHa: "11.50", priceTryPerT: "7400.00", costTryPerHa: "32000.00" },
  { code: "SUGAR_BEET", nameEn: "Sugar beet", nameTr: "Şeker pancarı", colorHex: "#15803d", isIrrigated: true,  sortOrder: 4,
    heatThresholdC: 32, heatPctPerDay: 1.1, heatCapPct: 30, frostThresholdC: -2, frostPctPerEvent: 8,
    waterRequirementMm: 700, droughtMaxPct: 44, waterloggingPct: 8, irrigationPctPerDay: 1.9, irrigationCapPct: 46,
    yieldTPerHa: "62.00", priceTryPerT: "2150.00", costTryPerHa: "48000.00" },
  { code: "SUNFLOWER",  nameEn: "Sunflower",  nameTr: "Ayçiçeği",      colorHex: "#0f766e", isIrrigated: true,  sortOrder: 5,
    heatThresholdC: 34, heatPctPerDay: 1.2, heatCapPct: 30, frostThresholdC: -1, frostPctPerEvent: 7,
    waterRequirementMm: 480, droughtMaxPct: 40, waterloggingPct: 11, irrigationPctPerDay: 1.5, irrigationCapPct: 38,
    yieldTPerHa: "3.10", priceTryPerT: "17500.00", costTryPerHa: "21000.00" },
  // Seed cotton: the Harran Plain's main irrigated crop.
  { code: "COTTON",     nameEn: "Cotton",     nameTr: "Pamuk",         colorHex: "#7c3aed", isIrrigated: true,  sortOrder: 6,
    heatThresholdC: 38, heatPctPerDay: 0.8, heatCapPct: 24, frostThresholdC: 2, frostPctPerEvent: 10,
    waterRequirementMm: 800, droughtMaxPct: 48, waterloggingPct: 10, irrigationPctPerDay: 2.0, irrigationCapPct: 50,
    yieldTPerHa: "5.00", priceTryPerT: "28000.00", costTryPerHa: "78000.00" },
] as const;

/** Stage offsets in days from planting. `isSensitive` marks yield-critical windows. */
const STAGES: Record<string, Array<[string, number, number, boolean]>> = {
  WHEAT: [["SOWING",0,14,false],["EMERGENCE",15,45,false],["VEGETATIVE",46,150,false],["FLOWERING",151,185,true],["GRAIN_FILL",186,220,true],["MATURITY",221,245,false],["HARVEST",246,265,false]],
  BARLEY: [["SOWING",0,14,false],["EMERGENCE",15,42,false],["VEGETATIVE",43,140,false],["FLOWERING",141,170,true],["GRAIN_FILL",171,200,true],["MATURITY",201,225,false],["HARVEST",226,242,false]],
  MAIZE: [["SOWING",0,10,false],["EMERGENCE",11,30,false],["VEGETATIVE",31,70,false],["FLOWERING",71,95,true],["GRAIN_FILL",96,130,true],["MATURITY",131,150,false],["HARVEST",151,170,false]],
  SUGAR_BEET: [["SOWING",0,12,false],["EMERGENCE",13,40,false],["VEGETATIVE",41,120,true],["GRAIN_FILL",121,180,true],["MATURITY",181,200,false],["HARVEST",201,225,false]],
  SUNFLOWER: [["SOWING",0,12,false],["EMERGENCE",13,32,false],["VEGETATIVE",33,65,false],["FLOWERING",66,92,true],["GRAIN_FILL",93,120,true],["MATURITY",121,140,false],["HARVEST",141,160,false]],
  // GRAIN_FILL stands in for boll development: the stage enum is cereal-shaped.
  COTTON: [["SOWING",0,12,false],["EMERGENCE",13,35,false],["VEGETATIVE",36,65,false],["FLOWERING",66,105,true],["GRAIN_FILL",106,145,true],["MATURITY",146,160,false],["HARVEST",161,185,false]],
};

/** Planting dates and sale lags for the 2025-26 season. */
const CALENDAR: Record<string, { planting: string; harvest: [string, string]; saleLagDays: number }> = {
  WHEAT:      { planting: "2025-10-12", harvest: ["2026-07-05","2026-07-25"], saleLagDays: 30 },
  BARLEY:     { planting: "2025-10-05", harvest: ["2026-06-20","2026-07-08"], saleLagDays: 28 },
  MAIZE:      { planting: "2026-04-18", harvest: ["2026-09-20","2026-10-10"], saleLagDays: 45 },
  SUGAR_BEET: { planting: "2026-03-28", harvest: ["2026-10-12","2026-11-05"], saleLagDays: 60 },
  SUNFLOWER:  { planting: "2026-04-25", harvest: ["2026-09-12","2026-09-28"], saleLagDays: 40 },
  COTTON:     { planting: "2026-04-28", harvest: ["2026-10-06","2026-10-30"], saleLagDays: 30 },
};

const SEASON = { name: "2025-26", start: "2025-10-01", end: "2026-09-30" };

type FarmSpec = {
  id: string; name: string; note: string; borrower: string;
  geometry: ArealGeometry; n: number; weights?: number[]; crops: string[];
  parcels: Array<{ il: string; ilce: string; mahalleKoy: string; ada: number; parsel: number; input: string; officialAreaM2?: string }>;
};

/* Four farms, each chosen to exercise a different geometry case. */
const FARMS: FarmSpec[] = [
  {
    // Harran Plain: irrigated cotton, maize and winter cereals.
    id: "farm-harran-yildiz", name: "Yıldız Tarım — Harran", note: "Convex block, four crops",
    borrower: "borrower-yildiz",
    geometry: { type: "Polygon", coordinates: [[[38.9425,36.8930],[38.9645,36.8930],[38.9645,36.9070],[38.9425,36.9070],[38.9425,36.8930]]] },
    n: 6, crops: ["COTTON","COTTON","WHEAT","MAIZE","BARLEY","WHEAT"],
    parcels: [
      { il:"Şanlıurfa", ilce:"Harran", mahalleKoy:"Yardımcı", ada:463, parsel:21, input:"463:21", officialAreaM2:"1955000.00" },
      { il:"Şanlıurfa", ilce:"Harran", mahalleKoy:"Yardımcı", ada:463, parsel:22, input:"463/22" },
    ],
  },
  {
    // The neighbouring block to the south-east, on the same canal.
    id: "farm-harran-demir", name: "Demir Çiftliği — Harran", note: "Concave L-shape",
    borrower: "borrower-demir",
    geometry: { type: "Polygon", coordinates: [[[38.9530,36.8744],[38.9722,36.8744],[38.9722,36.8824],[38.9626,36.8824],[38.9626,36.8920],[38.9530,36.8920],[38.9530,36.8744]]] },
    n: 4, crops: ["COTTON","WHEAT","MAIZE","COTTON"],
    parcels: [{ il:"Şanlıurfa", ilce:"Harran", mahalleKoy:"Bozyazı", ada:463, parsel:21, input:"463 ada, 21 parsel" }],
  },
  {
    // Çumra plain, Konya. The hole is the pond and well site in the middle of the block.
    id: "farm-cumra-ova", name: "Ova Tarım — Çumra", note: "Polygon with an unusable hole",
    borrower: "borrower-ova",
    geometry: { type: "Polygon", coordinates: [
      [[32.7854,37.6308],[32.8094,37.6308],[32.8094,37.6468],[32.7854,37.6468],[32.7854,37.6308]],
      [[32.7944,37.6368],[32.8004,37.6368],[32.8004,37.6408],[32.7944,37.6408],[32.7944,37.6368]]] },
    n: 4, crops: ["SUGAR_BEET","MAIZE","WHEAT","BARLEY"],
    parcels: [{ il:"Konya", ilce:"Çumra", mahalleKoy:"Alibeyhüyüğü", ada:512, parsel:7, input:"512:7" }],
  },
  {
    // Kumkale plain, Çanakkale: a 500 m x 400 m block beside the Karamenderes.
    id: "farm-kumkale-genis", name: "Geniş Ova — Kumkale", note: "20 ha split 12 wheat / 8 maize",
    borrower: "borrower-genis",
    geometry: { type: "Polygon", coordinates: [[[26.2200,39.9564],[26.2259,39.9564],[26.2259,39.9600],[26.2200,39.9600],[26.2200,39.9564]]] },
    n: 2, weights: [0.6, 0.4], crops: ["WHEAT","MAIZE"],
    parcels: [{ il:"Çanakkale", ilce:"Merkez", mahalleKoy:"Kumkale", ada:118, parsel:4, input:"118:4" }],
  },
];

const BORROWERS = [
  { id: "borrower-yildiz", name: "Yıldız Tarım Ltd.", institutionName: "Şanlıurfa Ziraat Odası" },
  { id: "borrower-demir",  name: "Mustafa Demir",     institutionName: null },
  { id: "borrower-ova",    name: "Ova Tarım A.Ş.",    institutionName: null },
  { id: "borrower-genis",  name: "Geniş Ova Koop.",   institutionName: null },
];

async function main() {
  console.log("Seeding ClimaVex digital twin…");

  await db.$transaction([
    db.riskAssessmentRun.deleteMany(), db.scenarioRun.deleteMany(), db.scenario.deleteMany(),
    db.weatherObservation.deleteMany(), db.weatherDataset.deleteMany(),
    db.cashFlowEvent.deleteMany(), db.repaymentScheduleItem.deleteMany(), db.loan.deleteMany(),
    db.insurancePolicy.deleteMany(), db.resourceLink.deleteMany(), db.resource.deleteMany(),
    db.cultivationSection.deleteMany(), db.season.deleteMany(), db.cadastralParcel.deleteMany(),
    db.accessGrant.deleteMany(), db.farm.deleteMany(), db.borrower.deleteMany(),
    db.regionalCropDefault.deleteMany(), db.cropCalendarStage.deleteMany(), db.cropAssumption.deleteMany(),
    db.crop.deleteMany(), db.session.deleteMany(), db.user.deleteMany(),
  ]);

  /* Users — one per role. Demo passwords only; dev environment. */
  const password = await hashPassword("climavex");
  const users: Array<{ id: string; email: string; name: string; role: UserRole; organisation: string | null }> = [
    { id: "user-farmer", email: "farmer@climavex.test", name: "Ayşe Yıldız", role: "FARMER", organisation: "Yıldız Tarım Ltd." },
    { id: "user-farmer-2", email: "demir@climavex.test", name: "Mustafa Demir", role: "FARMER", organisation: null },
    { id: "user-bank", email: "bank@climavex.test", name: "Elif Kaya", role: "BANK_USER", organisation: "Demo Agricultural Bank" },
    { id: "user-insurer", email: "insurer@climavex.test", name: "Cem Arslan", role: "INSURER", organisation: "Demo Agri Insurance" },
    { id: "user-admin", email: "admin@climavex.test", name: "Platform Admin", role: "ADMIN", organisation: "ClimaVex" },
  ];
  for (const u of users) {
    await db.user.create({ data: { ...u, passwordHash: password, locale: "EN", isDemo: true } });
  }

  for (const b of BORROWERS) await db.borrower.create({ data: { ...b, isDemo: true } });

  /* Crop catalogue, assumptions and calendars. */
  const cropIds = new Map<string, string>();
  for (const c of CROPS) {
    const crop = await db.crop.create({
      data: {
        code: c.code, nameEn: c.nameEn, nameTr: c.nameTr, colorHex: c.colorHex,
        isIrrigated: c.isIrrigated, sortOrder: c.sortOrder,
        heatThresholdC: c.heatThresholdC, heatPctPerDay: c.heatPctPerDay, heatCapPct: c.heatCapPct,
        frostThresholdC: c.frostThresholdC, frostPctPerEvent: c.frostPctPerEvent,
        waterRequirementMm: c.waterRequirementMm, droughtMaxPct: c.droughtMaxPct,
        waterloggingPct: c.waterloggingPct, irrigationPctPerDay: c.irrigationPctPerDay,
        irrigationCapPct: c.irrigationCapPct,
      },
    });
    cropIds.set(c.code, crop.id);

    await db.cropAssumption.create({
      data: {
        cropId: crop.id, regionCode: REGION, year: 2026,
        yieldTPerHa: D(c.yieldTPerHa), priceTryPerT: D(c.priceTryPerT), costTryPerHa: D(c.costTryPerHa),
        source: "Editable demo assumption — not a verified regional statistic",
        isDemoAssumption: true,
      },
    });

    for (const [stage, start, end, sensitive] of STAGES[c.code]) {
      await db.cropCalendarStage.create({
        data: {
          cropId: crop.id, regionCode: REGION, stage: stage as never,
          startOffsetDays: start, endOffsetDays: end, isSensitive: sensitive,
          source: "Editable demo crop calendar", isDemoAssumption: true,
        },
      });
    }
  }

  // Wheat is preselected: the best-supported single claim in the evidence found.
  for (const [rank, code] of ["WHEAT","BARLEY","SUGAR_BEET","MAIZE","SUNFLOWER","COTTON"].entries()) {
    await db.regionalCropDefault.create({ data: { regionCode: REGION, cropId: cropIds.get(code)!, rank: rank + 1 } });
  }

  /* Farms, parcels, seasons and sections. */
  const ownerFor: Record<string, string> = {
    "farm-harran-yildiz": "user-farmer", "farm-harran-demir": "user-farmer-2",
    "farm-cumra-ova": "user-farmer", "farm-kumkale-genis": "user-farmer",
  };
  const seasonIds = new Map<string, string>();
  const sectionIds = new Map<string, string[]>();

  for (const spec of FARMS) {
    const farm = await db.farm.create({
      data: {
        id: spec.id, ownerUserId: ownerFor[spec.id], borrowerId: spec.borrower,
        name: spec.name, description: spec.note, il: spec.parcels[0].il, ilce: spec.parcels[0].ilce,
        geojson: spec.geometry as unknown as Prisma.InputJsonValue,
        geometrySource: "DEMO_FIXTURE", verificationStatus: "UNVERIFIED_DRAFT", isDemo: true,
      },
    });

    for (const p of spec.parcels) {
      await db.cadastralParcel.create({
        data: {
          farmId: farm.id, il: p.il, ilce: p.ilce, mahalleKoy: p.mahalleKoy,
          ada: p.ada, parsel: p.parsel, originalInput: p.input,
          officialAreaM2: p.officialAreaM2 ? D(p.officialAreaM2) : null,
          geometrySource: "DEMO_FIXTURE", verificationStatus: "UNVERIFIED_DRAFT",
        },
      });
    }

    const season = await db.season.create({
      data: {
        farmId: farm.id, name: SEASON.name,
        startDate: isoDateToUtcDate(SEASON.start), endDate: isoDateToUtcDate(SEASON.end), isActive: true,
      },
    });
    seasonIds.set(spec.id, season.id);

    // Sections come from the real algorithm, not hand-typed coordinates.
    const divided = subdivide(spec.geometry, spec.n, spec.weights);
    const ids: string[] = [];

    for (const [index, section] of divided.sections.entries()) {
      const code = spec.crops[index % spec.crops.length];
      const crop = CROPS.find((c) => c.code === code)!;
      const cal = CALENDAR[code];
      const created = await db.cultivationSection.create({
        data: {
          seasonId: season.id, farmId: farm.id, ordinal: section.ordinal, label: section.label,
          geojson: section.geometry as unknown as Prisma.InputJsonValue,
          isMultipart: section.isMultipart, cropId: cropIds.get(code)!,
          plantingDate: isoDateToUtcDate(cal.planting),
          harvestWindowStart: isoDateToUtcDate(cal.harvest[0]),
          harvestWindowEnd: isoDateToUtcDate(cal.harvest[1]),
          expectedSaleDate: isoDateToUtcDate(addDays(cal.harvest[1], cal.saleLagDays)),
          yieldTPerHa: D(crop.yieldTPerHa), priceTryPerT: D(crop.priceTryPerT), costTryPerHa: D(crop.costTryPerHa),
        },
      });
      ids.push(created.id);
    }
    sectionIds.set(spec.id, ids);
    console.log(`  ${spec.name}: ${divided.sections.length} sections, conserved=${divided.report.areaConserved}`);
  }

  await seedResources(sectionIds);
  await seedFinance(seasonIds);
  await seedWeather();
  await seedGrants();

  console.log("Seed complete.");
}

/* ── Shared resources ──────────────────────────────────────────────────────
 * Two canals reproducing both concept examples: three fields across two
 * borrowers, and a five-borrower canal for the de-duplication stress case.
 * ─────────────────────────────────────────────────────────────────────── */
async function seedResources(sectionIds: Map<string, string[]>) {
  const canalA = await db.resource.create({
    data: {
      id: "resource-canal-harran", ownerUserId: "user-farmer", name: "Harran Main Canal Connection",
      type: "CANAL_CONNECTION", isDemo: true, capacityLpm: 4200,
      // Runs along the gap between the two Harran farms, then down the L's inner edge.
      geojson: { type: "LineString", coordinates: [[38.9400,36.8925],[38.9650,36.8925],[38.9740,36.8830]] } as unknown as Prisma.InputJsonValue,
    },
  });

  const canalB = await db.resource.create({
    data: {
      id: "resource-canal-kumkale", ownerUserId: "user-farmer", name: "Kumkale Feeder Canal",
      type: "CANAL_CONNECTION", isDemo: true, capacityLpm: 2600,
      geojson: { type: "LineString", coordinates: [[26.2188,39.9556],[26.2270,39.9606]] } as unknown as Prisma.InputJsonValue,
    },
  });

  await db.resource.create({
    data: {
      id: "resource-well-cumra", ownerUserId: "user-farmer", name: "Çumra Deep Well 1",
      type: "WELL", isDemo: true, capacityLpm: 900,
      geojson: { type: "Point", coordinates: [32.7974, 37.6388] } as unknown as Prisma.InputJsonValue,
    },
  });

  // Canal A: three fields spanning two borrowers.
  const a = [
    ...(sectionIds.get("farm-harran-yildiz") ?? []).slice(0, 2),
    ...(sectionIds.get("farm-harran-demir") ?? []).slice(0, 1),
  ];
  for (const sectionId of a) {
    await db.resourceLink.create({ data: { resourceId: canalA.id, sectionId, sharePct: 100 } });
  }

  // Canal B plus the Çumra well widen the portfolio case.
  for (const sectionId of (sectionIds.get("farm-kumkale-genis") ?? [])) {
    await db.resourceLink.create({ data: { resourceId: canalB.id, sectionId, sharePct: 100 } });
  }
  for (const sectionId of (sectionIds.get("farm-cumra-ova") ?? []).slice(0, 2)) {
    await db.resourceLink.create({ data: { resourceId: "resource-well-cumra", sectionId, sharePct: 100 } });
  }
}

/* ── Finance ───────────────────────────────────────────────────────────────
 * The Yıldız farm reproduces the concept document's arithmetic exactly:
 * TL300,000 due, TL180,000 available, a TL120,000 gap on the due date, and an
 * assumed eligible TL120,000 payout that arrives afterwards.
 * ─────────────────────────────────────────────────────────────────────── */
async function seedFinance(seasonIds: Map<string, string>) {
  const yildizSeason = seasonIds.get("farm-harran-yildiz")!;

  const loan = await db.loan.create({
    data: {
      id: "loan-yildiz-2026", borrowerId: "borrower-yildiz", farmId: "farm-harran-yildiz",
      reference: "ZRT-2026-0413", principal: D("1200000.00"), outstandingPrincipal: D("900000.00"),
      interestRatePct: D("31.5000"), startDate: isoDateToUtcDate("2025-10-15"), endDate: isoDateToUtcDate("2028-09-15"),
      createdByUserId: "user-bank", createdByRole: "BANK_USER",
      schedule: { create: [
        { sequence: 1, dueDate: isoDateToUtcDate("2026-09-15"), amount: D("300000.00") },
        { sequence: 2, dueDate: isoDateToUtcDate("2026-09-30"), amount: D("120000.00") },
      ] },
    },
  });

  // Opening reserve 400k, costs 150k, other obligations 70k -> 180k available
  // on the 15 September due date, against a 300k instalment.
  const events: Array<[string, string, string, string]> = [
    ["OPENING_RESERVE",  "2025-10-01", "400000.00", "Opening cash reserve"],
    ["OPERATING_COST",   "2026-04-20", "150000.00", "Spring inputs and fuel"],
    ["OTHER_OBLIGATION", "2026-08-01", "70000.00",  "Machinery lease"],
  ];
  for (const [kind, date, amount, label] of events) {
    await db.cashFlowEvent.create({
      data: {
        seasonId: yildizSeason, farmId: "farm-harran-yildiz", kind: kind as never,
        date: isoDateToUtcDate(date), amount: D(amount), label, source: "FIXTURE",
      },
    });
  }

  await db.insurancePolicy.create({
    data: {
      farmId: "farm-harran-yildiz", provider: "Demo Agri Insurance",
      eligibleHazards: ["DROUGHT", "HAIL", "FROST"],
      coverageLimit: D("400000.00"), deductible: D("20000.00"),
      assumedEligibility: true, payoutLagDays: 45, isDemoAssumption: true,
      source: "User-entered assumption — not current TARSIM rules",
      createdByUserId: "user-insurer", createdByRole: "INSURER",
    },
  });

  // Demir: the September-due / November-proceeds timing gap.
  const demirSeason = seasonIds.get("farm-harran-demir")!;
  await db.loan.create({
    data: {
      borrowerId: "borrower-demir", farmId: "farm-harran-demir", reference: "ZRT-2026-0771",
      principal: D("650000.00"), outstandingPrincipal: D("520000.00"), interestRatePct: D("29.0000"),
      startDate: isoDateToUtcDate("2025-11-01"), endDate: isoDateToUtcDate("2028-11-01"),
      createdByUserId: "user-bank", createdByRole: "BANK_USER",
      schedule: { create: [{ sequence: 1, dueDate: isoDateToUtcDate("2026-09-20"), amount: D("220000.00") }] },
    },
  });
  await db.cashFlowEvent.create({
    data: { seasonId: demirSeason, farmId: "farm-harran-demir", kind: "OPENING_RESERVE",
      date: isoDateToUtcDate("2025-11-01"), amount: D("60000.00"), label: "Opening cash reserve", source: "FIXTURE" },
  });

  for (const [farmId, ref, principal, outstanding, due, amount] of [
    ["farm-cumra-ova", "ZRT-2026-0902", "880000.00", "700000.00", "2026-09-25", "260000.00"],
    ["farm-kumkale-genis", "ZRT-2026-1044", "540000.00", "430000.00", "2026-09-18", "150000.00"],
  ] as const) {
    await db.loan.create({
      data: {
        borrowerId: FARMS.find((f) => f.id === farmId)!.borrower, farmId, reference: ref,
        principal: D(principal), outstandingPrincipal: D(outstanding), interestRatePct: D("30.0000"),
        startDate: isoDateToUtcDate("2025-10-20"), endDate: isoDateToUtcDate("2028-10-20"),
        createdByUserId: "user-bank", createdByRole: "BANK_USER",
        schedule: { create: [{ sequence: 1, dueDate: isoDateToUtcDate(due), amount: D(amount) }] },
      },
    });
    await db.cashFlowEvent.create({
      data: { seasonId: seasonIds.get(farmId)!, farmId, kind: "OPENING_RESERVE",
        date: isoDateToUtcDate("2025-10-20"), amount: D("120000.00"), label: "Opening cash reserve", source: "FIXTURE" },
    });
  }

  void loan;
}

/* ── Weather ───────────────────────────────────────────────────────────────
 * A synthetic sequence, labelled as such. It does NOT claim to represent a
 * real historical year. Real reanalysis can be imported from Open-Meteo
 * (CC-BY-4.0) or NASA POWER (public domain), both free and key-less.
 * ─────────────────────────────────────────────────────────────────────── */
async function seedWeather() {
  const dataset = await db.weatherDataset.create({
    data: {
      id: "weather-demo-dry", name: "Demo weather scenario — dry season",
      kind: "DEMO_SYNTHETIC",
      provenance: "Synthetic demo sequence generated for ClimaVex. Does not represent a real historical year.",
      attribution: "ClimaVex demo fixture",
      stationOrGrid: "None (synthetic)",
      startDate: isoDateToUtcDate("2025-10-01"), endDate: isoDateToUtcDate("2026-09-30"),
      license: "Demo fixture — no external data used",
    },
  });

  // A deterministic dry, hot profile: no RNG, just a closed-form seasonal curve.
  const rows: Prisma.WeatherObservationCreateManyInput[] = [];
  let date = "2025-10-01";
  for (let i = 0; i < 365; i += 1) {
    const phase = (i / 365) * Math.PI * 2;
    const seasonal = -Math.cos(phase - 0.6);
    const tMax = Math.round((17 + seasonal * 16) * 10) / 10;
    const tMin = Math.round((tMax - 11) * 10) / 10;
    // Dry through the spring and summer sensitive windows.
    const wet = i < 150 ? 1 : 0.18;
    const precip = Math.round(Math.max(0, (1.6 + Math.sin(i / 11) * 1.6) * wet) * 10) / 10;
    rows.push({ datasetId: dataset.id, date: isoDateToUtcDate(date), tMaxC: tMax, tMinC: tMin, precipMm: precip });
    date = addDays(date, 1);
  }
  await db.weatherObservation.createMany({ data: rows });
}

/* ── Access grants ─────────────────────────────────────────────────────────
 * The bank writes finance; the insurer reads and runs scenarios. Neither can
 * write geometry, whatever their scope.
 * ─────────────────────────────────────────────────────────────────────── */
async function seedGrants() {
  for (const borrowerId of BORROWERS.map((b) => b.id)) {
    await db.accessGrant.create({
      data: { grantedToId: "user-bank", borrowerId, scope: "FINANCE_WRITE" },
    });
    await db.accessGrant.create({
      data: { grantedToId: "user-insurer", borrowerId, scope: "READ_SCENARIO" },
    });
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
