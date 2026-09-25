/** 1 hectare = 10,000 m². */
export const M2_PER_HECTARE = 10_000;
/** 1 dekar = 1,000 m². The working unit for Turkish farmers (dönüm). */
export const M2_PER_DEKAR = 1_000;

export type AreaBreakdown = {
  m2: number;
  hectares: number;
  dekar: number;
};

export function areaBreakdown(m2: number): AreaBreakdown {
  return {
    m2: round(m2, 2),
    hectares: round(m2 / M2_PER_HECTARE, 4),
    dekar: round(m2 / M2_PER_DEKAR, 3),
  };
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
