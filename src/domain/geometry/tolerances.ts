/**
 * Measurable geometry tolerances. Every invariant in the subdivision pipeline
 * is stated against one of these constants — none of them are inline magic
 * numbers, so a tolerance change is a one-line, reviewable diff.
 */
export const TOLERANCES = {
  /** Union of sections vs usable parent, relative. */
  AREA_CONSERVATION_REL: 0.005,
  /** Union of sections vs usable parent, absolute floor (m²). */
  AREA_CONSERVATION_ABS_M2: 50,
  /** Each section vs A_total / n. */
  EQUAL_AREA_TARGET_REL: 0.01,
  /** Largest tolerated pairwise section overlap (m²). */
  OVERLAP_MAX_M2: 1,
  /** Slack when testing that a section lies within its parent (m). */
  CONTAINMENT_BUFFER_M: 0.05,
  /**
   * Storage rounding for lon/lat, in decimal places (~1.1 mm).
   *
   * 8 rather than the more common 7: sections share boundaries, and rounding
   * each vertex independently shifts a shared edge by up to half a step. At 7
   * dp (~1.1 cm) that produced ~1.4 m² of phantom overlap along a 2 km shared
   * edge — inside the physical noise floor, but enough to trip the 1 m²
   * invariant. 8 dp puts the artefact an order of magnitude below it.
   */
  SNAP_PRECISION_DEG: 8,
  /** Snapping in the projected plane (m). */
  SNAP_PRECISION_M: 0.001,
  /** Smallest usable section: 1 dekar, the working unit in Turkish agriculture. */
  MIN_SECTION_AREA_M2: 1000,
  /** Fixed iteration count keeps bisection deterministic. */
  BISECTION_ITERS: 60,
  /** Relative convergence target for the bisection. */
  BISECTION_REL_TOL: 1e-4,
} as const;

/**
 * Maximum sections per farm.
 *
 * Chosen, not guessed: at the 1-dekar floor, 24 sections require a 24-dekar
 * farm, and Konya parcels commonly run 20–200 dekar, so 24 stays reachable
 * without producing unfarmable slivers. Labels A–X remain legible at zoom
 * 15–17, and recursion depth is ceil(log2 24) = 5, which keeps a live preview
 * well under a frame budget.
 */
export const N_MAX = Number(process.env.SUBDIVISION_MAX_N ?? 24);
export const N_MIN = 1;
