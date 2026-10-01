import { z } from "zod";
import { N_MAX, N_MIN } from "@/domain/geometry/tolerances";
import { isWithinOperatingExtent } from "@/config/map";

/**
 * Coordinates are validated as [longitude, latitude] AND checked against the
 * operating extent. The range check alone cannot catch a lat/lng transposition,
 * because a swapped Konya coordinate is still a valid point — just one in
 * northern Iraq. The extent check is what actually catches it.
 */
const position = z
  .tuple([z.number().finite(), z.number().finite()])
  .refine(([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90, {
    message: "Coordinate must be [longitude, latitude] within valid ranges.",
  });

const ring = z.array(position).min(4, "A ring needs at least four positions, closing back on itself.");
const polygonCoords = z.array(ring).min(1);

export const polygonGeometrySchema = z.object({
  type: z.literal("Polygon"),
  coordinates: polygonCoords,
});

export const multiPolygonGeometrySchema = z.object({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(polygonCoords).min(1),
});

export const arealGeometrySchema = z
  .union([polygonGeometrySchema, multiPolygonGeometrySchema])
  .refine(
    (g) => {
      const rings = g.type === "Polygon" ? g.coordinates : g.coordinates.flat();
      return rings.every((r) => r.every(([lng, lat]) => isWithinOperatingExtent(lng, lat)));
    },
    {
      message:
        "Geometry falls outside the Anatolia operating extent. Check that coordinates are [longitude, latitude] and not transposed.",
    },
  );

export const resourceGeometrySchema = z.union([
  z.object({ type: z.literal("Point"), coordinates: position }),
  z.object({ type: z.literal("LineString"), coordinates: z.array(position).min(2) }),
]);

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");
export const moneyString = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => /^-?\d+(\.\d{1,2})?$/.test(v), "Amounts use at most two decimal places.");

export const subdividePreviewSchema = z.object({
  geometry: arealGeometrySchema,
  n: z.number().int().min(N_MIN).max(N_MAX),
  weights: z.array(z.number().positive()).optional(),
});

export const sectionInputSchema = z.object({
  id: z.string().optional(),
  ordinal: z.number().int().min(0),
  label: z.string().min(1).max(64),
  geometry: arealGeometrySchema,
  cropId: z.string().min(1),
  parcelId: z.string().nullable().optional(),
  plantingDate: isoDate,
  harvestWindowStart: isoDate,
  harvestWindowEnd: isoDate,
  expectedSaleDate: isoDate,
  yieldTPerHa: z.union([z.string(), z.number()]).transform(String),
  priceTryPerT: z.union([z.string(), z.number()]).transform(String),
  costTryPerHa: z.union([z.string(), z.number()]).transform(String),
  isMultipart: z.boolean().optional(),
});

export const saveLayoutSchema = z.object({
  expectedVersion: z.number().int().positive(),
  seasonId: z.string().min(1),
  farmGeometry: arealGeometrySchema.optional(),
  sections: z.array(sectionInputSchema).max(N_MAX),
});

export const createFarmSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  geometry: arealGeometrySchema,
  il: z.string().max(60).optional(),
  ilce: z.string().max(60).optional(),
  seasonName: z.string().min(1).max(60).optional(),
  seasonStart: isoDate.optional(),
  seasonEnd: isoDate.optional(),
});

export const createParcelSchema = z.object({
  reference: z.string().min(1).max(64),
  il: z.string().min(1).max(60),
  ilce: z.string().min(1).max(60),
  mahalleKoy: z.string().min(1).max(80),
  officialAreaM2: z.union([z.string(), z.number()]).optional(),
});

export const parcelSearchSchema = z.object({
  reference: z.string().min(1).max(64),
  il: z.string().optional(),
  ilce: z.string().optional(),
  mahalleKoy: z.string().optional(),
});

export const createResourceSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["WELL", "PUMP", "CANAL_CONNECTION"]),
  geometry: resourceGeometrySchema,
  capacityLpm: z.number().int().positive().optional(),
});

export const linkResourceSchema = z.object({
  sectionIds: z.array(z.string().min(1)).min(1),
  sharePct: z.number().min(0).max(100).optional(),
});

export const runScenarioSchema = z.object({
  seasonId: z.string().min(1),
  name: z.string().min(1).max(120),
  kind: z.enum(["BASELINE", "WEATHER_REPLAY", "RESOURCE_DISRUPTION"]),
  weatherDatasetId: z.string().optional(),
  dateAlignment: z.enum(["CALENDAR_DATE", "DAY_OF_YEAR", "ALIGN_TO_PLANTING"]).optional(),
  disruption: z
    .object({ resourceIds: z.array(z.string().min(1)).min(1), startDate: isoDate, endDate: isoDate })
    .optional(),
});

export const createLoanSchema = z.object({
  reference: z.string().min(1).max(60),
  principal: moneyString,
  interestRatePct: z.union([z.string(), z.number()]).transform(String),
  startDate: isoDate,
  endDate: isoDate,
  instalments: z
    .array(z.object({ sequence: z.number().int().min(1), dueDate: isoDate, amount: moneyString }))
    .min(1),
});

export const createCashFlowSchema = z.object({
  seasonId: z.string().min(1),
  kind: z.enum([
    "OPENING_RESERVE", "LOAN_DISBURSEMENT", "SALE_RECEIPT", "INSURANCE_PAYOUT",
    "OPERATING_COST", "OTHER_OBLIGATION",
  ]),
  date: isoDate,
  amount: moneyString,
  label: z.string().min(1).max(160),
  loanId: z.string().optional(),
});

export const createPolicySchema = z.object({
  provider: z.string().min(1).max(120),
  eligibleHazards: z.array(z.string().min(1)).min(1),
  coverageLimit: moneyString,
  deductible: moneyString,
  assumedEligibility: z.boolean().optional(),
  payoutLagDays: z.number().int().min(0).max(365).optional(),
});

export const expectedLossSchema = z.object({
  runId: z.string().min(1),
  loanAmount: moneyString.refine((v) => Number(v) > 0 && Number(v) <= 1e12, "Enter a loan amount above zero."),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
