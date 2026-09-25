import Decimal from "decimal.js";

/**
 * Money is decimal, never float. Every amount in the twin is TRY with two
 * decimal places; binary floating point cannot represent 0.01 exactly and the
 * error compounds across a season's worth of dated events.
 */
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type Money = Decimal;

export function money(value: Decimal.Value): Money {
  return new Decimal(value ?? 0);
}

export const ZERO = money(0);

export function sum(values: Money[]): Money {
  return values.reduce<Money>((acc, v) => acc.plus(v), money(0));
}

export function maxMoney(a: Money, b: Money): Money {
  return a.greaterThan(b) ? a : b;
}

export function minMoney(a: Money, b: Money): Money {
  return a.lessThan(b) ? a : b;
}

/** Round to kuruş for storage and display. */
export function toKurus(value: Money): Money {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Serialise for the wire as a fixed-2 string, so no float ever touches JSON. */
export function moneyToString(value: Money): string {
  return toKurus(value).toFixed(2);
}

export function moneyToNumber(value: Money): number {
  return toKurus(value).toNumber();
}
