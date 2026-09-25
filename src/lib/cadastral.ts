/**
 * Turkish cadastral identifiers.
 *
 * In ClimaVex, the compact form `463:21` means **ada 463, parsel 21** —
 * ada is the cadastral block, parsel the parcel within it.
 *
 * That pair is NOT nationally unique. A complete reference needs the full
 * administrative path: İl / İlçe / Mahalle veya Köy / ada:parsel. Search must
 * never silently pick one of several matching parcels.
 *
 * A colon-separated identifier arriving from an unknown external source is not
 * assumed to follow this convention; import surfaces it for explicit mapping.
 */
export type CadastralRef = { ada: number; parsel: number; originalInput: string };

export type CadastralParseResult =
  | { ok: true; value: CadastralRef }
  | { ok: false; error: string };

const PATTERNS: RegExp[] = [
  // "463 ada, 21 parsel" / "463 Ada 21 Parsel"
  /^\s*(\d{1,6})\s*ada\s*[,/;]?\s*(\d{1,6})\s*parsel\s*$/i,
  // "ada 463 parsel 21"
  /^\s*ada\s*[:.]?\s*(\d{1,6})\s*[,/;]?\s*parsel\s*[:.]?\s*(\d{1,6})\s*$/i,
  // "463:21" / "463/21" / "463-21" / "463 21"
  /^\s*(\d{1,6})\s*[:/\-\s]\s*(\d{1,6})\s*$/,
];

export function parseCadastralRef(input: string): CadastralParseResult {
  const raw = String(input ?? "");
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Enter a cadastral reference, for example 463:21." };

  for (const pattern of PATTERNS) {
    const m = trimmed.match(pattern);
    if (!m) continue;
    const ada = Number(m[1]);
    const parsel = Number(m[2]);
    if (!Number.isInteger(ada) || !Number.isInteger(parsel) || ada <= 0 || parsel <= 0) {
      return { ok: false, error: "Ada and parsel must both be positive whole numbers." };
    }
    return { ok: true, value: { ada, parsel, originalInput: trimmed } };
  }

  return {
    ok: false,
    error: 'Could not read that reference. Accepted formats: "463:21", "463/21", or "463 ada, 21 parsel".',
  };
}

export function formatCompact(ref: { ada: number; parsel: number }): string {
  return `${ref.ada}:${ref.parsel}`;
}

export function formatFull(parcel: { il: string; ilce: string; mahalleKoy: string; ada: number; parsel: number }): string {
  return `${parcel.il} / ${parcel.ilce} / ${parcel.mahalleKoy} / ${formatCompact(parcel)}`;
}

/** True when the reference alone cannot identify a single parcel. */
export function needsDisambiguation(matchCount: number): boolean {
  return matchCount > 1;
}
