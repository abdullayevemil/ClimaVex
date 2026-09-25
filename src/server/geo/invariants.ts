import type { Prisma, PrismaClient } from "@prisma/client";
import { TOLERANCES } from "@/domain/geometry/tolerances";

type Tx = Prisma.TransactionClient | PrismaClient;

export type InvariantReport = {
  allValid: boolean;
  allWithinParent: boolean;
  maxOutsideM2: number;
  maxOverlapM2: number;
  parentAreaM2: number;
  sectionsAreaM2: number;
  gapM2: number;
  minSectionAreaM2: number;
  passed: boolean;
  violations: string[];
};

/**
 * Re-check every geometry invariant inside the save transaction, after the
 * writes have landed.
 *
 * Doing it here rather than only in the client means a buggy or hostile client
 * cannot persist a layout with overlapping sections, sections outside the farm
 * boundary, or missing land. If anything fails the caller throws and the whole
 * transaction rolls back, so the database is never left holding a layout that
 * violates its own rules.
 */
export async function checkSectionInvariants(tx: Tx, farmId: string, seasonId: string): Promise<InvariantReport> {
  const rows = await tx.$queryRaw<
    Array<{
      all_valid: boolean | null;
      max_outside_m2: number | null;
      max_overlap_m2: number | null;
      parent_area_m2: number | null;
      sections_area_m2: number | null;
      gap_m2: number | null;
      min_section_area_m2: number | null;
    }>
  >`
    WITH s AS (
      SELECT "id", "geom" FROM "CultivationSection" WHERE "seasonId" = ${seasonId}
    ),
    f AS (
      SELECT "geom" FROM "Farm" WHERE "id" = ${farmId}
    ),
    u AS (
      SELECT ST_Union("geom") AS g FROM s
    )
    SELECT
      (SELECT bool_and(ST_IsValid("geom")) FROM s)                                    AS all_valid,
      COALESCE((SELECT MAX(ST_Area(ST_Difference(s."geom", f."geom")::geography))
         FROM s, f), 0)                                                                AS max_outside_m2,
      COALESCE((SELECT MAX(ST_Area(ST_Intersection(a."geom", b."geom")::geography))
         FROM s a JOIN s b ON a."id" < b."id"
        WHERE ST_Intersects(a."geom", b."geom")), 0)                                   AS max_overlap_m2,
      (SELECT ST_Area("geom"::geography) FROM f)                                       AS parent_area_m2,
      COALESCE((SELECT ST_Area(g::geography) FROM u), 0)                               AS sections_area_m2,
      COALESCE((SELECT ST_Area(ST_Difference(f."geom", u.g)::geography) FROM f, u), 0)  AS gap_m2,
      COALESCE((SELECT MIN(ST_Area("geom"::geography)) FROM s), 0)                     AS min_section_area_m2
  `;

  const r = rows[0] ?? {};
  const parentAreaM2 = Number(r.parent_area_m2 ?? 0);
  const sectionsAreaM2 = Number(r.sections_area_m2 ?? 0);
  const gapM2 = Number(r.gap_m2 ?? 0);
  const maxOverlapM2 = Number(r.max_overlap_m2 ?? 0);
  const minSectionAreaM2 = Number(r.min_section_area_m2 ?? 0);
  const allValid = r.all_valid ?? true;
  const maxOutsideM2 = Number(r.max_outside_m2 ?? 0);
  // Sections are clipped to the parent when they are generated, so anything
  // outside is boundary-representation noise. Tolerate it on the same
  // perimeter-driven scale as the conservation gap.
  const outsideAllowance = Math.max(TOLERANCES.AREA_CONSERVATION_ABS_M2, parentAreaM2 * TOLERANCES.AREA_CONSERVATION_REL);
  const allWithinParent = maxOutsideM2 <= outsideAllowance;

  const violations: string[] = [];
  if (!allValid) violations.push("One or more sections have invalid geometry.");
  if (!allWithinParent) {
    violations.push(`A section extends ${maxOutsideM2.toFixed(2)} m² outside the farm boundary.`);
  }
  if (maxOverlapM2 > TOLERANCES.OVERLAP_MAX_M2) {
    violations.push(`Sections overlap by ${maxOverlapM2.toFixed(2)} m², above the ${TOLERANCES.OVERLAP_MAX_M2} m² limit.`);
  }

  const allowedGap = Math.max(TOLERANCES.AREA_CONSERVATION_ABS_M2, parentAreaM2 * TOLERANCES.AREA_CONSERVATION_REL);
  if (Math.abs(gapM2) > allowedGap) {
    violations.push(
      `Sections leave ${gapM2.toFixed(2)} m² of the field uncovered, above the ${allowedGap.toFixed(0)} m² tolerance.`,
    );
  }
  if (minSectionAreaM2 > 0 && minSectionAreaM2 < TOLERANCES.MIN_SECTION_AREA_M2) {
    violations.push(
      `Smallest section is ${(minSectionAreaM2 / 1000).toFixed(2)} dekar, below the ${TOLERANCES.MIN_SECTION_AREA_M2 / 1000} dekar minimum.`,
    );
  }

  return {
    allValid, allWithinParent, maxOutsideM2, maxOverlapM2, parentAreaM2, sectionsAreaM2, gapM2, minSectionAreaM2,
    passed: violations.length === 0,
    violations,
  };
}

/** PostGIS's own reason string, surfaced verbatim so the user sees the real problem. */
export async function geometryValidity(tx: Tx, geojson: unknown): Promise<{ valid: boolean; reason: string | null }> {
  const rows = await tx.$queryRaw<Array<{ valid: boolean; reason: string | null }>>`
    SELECT ST_IsValid(g) AS valid, ST_IsValidReason(g) AS reason
    FROM (SELECT ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geojson)}::text), 4326) AS g) t
  `;
  const row = rows[0];
  return { valid: row?.valid ?? false, reason: row?.reason ?? null };
}
