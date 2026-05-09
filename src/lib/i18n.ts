import type { Locale } from "./types";

export const DEFAULT_LOCALE: Locale = "en";
export const supportedLocales: Locale[] = ["en", "az", "tr"];

export const localeLabels: Record<Locale, string> = {
  en: "English",
  az: "Azərbaycanca",
  tr: "Türkçe",
};

export const localeShortLabels: Record<Locale, string> = {
  en: "EN",
  az: "AZ",
  tr: "TR",
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  az: "Azerbaijani",
  tr: "Turkish",
};

export const intlLocales: Record<Locale, string> = {
  en: "en-US",
  az: "az-AZ",
  tr: "tr-TR",
};

export const dbLocales: Record<Locale, "EN" | "AZ" | "TR"> = {
  en: "EN",
  az: "AZ",
  tr: "TR",
};

export function normalizeLocale(value: string | null | undefined): Locale {
  const normalized = value?.toLowerCase();
  return supportedLocales.includes(normalized as Locale)
    ? (normalized as Locale)
    : DEFAULT_LOCALE;
}

export function localeSearchParam(locale: Locale) {
  return `locale=${encodeURIComponent(locale)}`;
}
