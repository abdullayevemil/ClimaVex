import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { intlLocales } from "./i18n";
import type { Locale } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, locale: Locale = "en") {
  return new Intl.NumberFormat(intlLocales[locale], {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | Date, locale: Locale = "en") {
  return new Intl.DateTimeFormat(intlLocales[locale], {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatNumber(
  value: number,
  maximumFractionDigits = 0,
  locale: Locale = "en",
) {
  return new Intl.NumberFormat(intlLocales[locale], {
    maximumFractionDigits,
  }).format(value);
}
