import type { Locale } from "./types";
import { intlLocales } from "./i18n";

/** Money is carried as a decimal string end-to-end; only formatting turns it into a number. */
export function formatTRY(value: string | number, locale: Locale = "en", fractionDigits = 0): string {
  return new Intl.NumberFormat(intlLocales[locale], {
    style: "currency",
    currency: "TRY",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(value));
}

export function formatCompactTRY(value: string | number, locale: Locale = "en"): string {
  const n = Number(value);
  if (Math.abs(n) >= 1_000_000) return `₺${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `₺${(n / 1_000).toFixed(0)}k`;
  return formatTRY(n, locale);
}

export function formatPct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatArea(area: { m2: number; hectares: number; dekar: number }): string {
  return `${area.dekar.toFixed(1)} dekar · ${area.hectares.toFixed(2)} ha · ${Math.round(area.m2).toLocaleString("en-US")} m²`;
}

export function formatDateShort(iso: string, locale: Locale = "en"): string {
  return new Intl.DateTimeFormat(intlLocales[locale], { day: "numeric", month: "short" }).format(new Date(`${iso}T00:00:00Z`));
}

export function formatDateFull(iso: string, locale: Locale = "en"): string {
  return new Intl.DateTimeFormat(intlLocales[locale], { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${iso}T00:00:00Z`));
}
