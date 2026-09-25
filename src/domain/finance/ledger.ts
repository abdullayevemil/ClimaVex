import { maxMoney, minMoney, money, moneyToString, sum, toKurus, ZERO, type Money } from "./money";
import type { IsoDate } from "./dates";

export type CashFlowKind =
  | "OPENING_RESERVE"
  | "LOAN_DISBURSEMENT"
  | "SALE_RECEIPT"
  | "INSURANCE_PAYOUT"
  | "OPERATING_COST"
  | "OTHER_OBLIGATION"
  | "LOAN_REPAYMENT_DUE";

/**
 * Same-day settlement order. Inflows and costs land before the repayment test,
 * so money that genuinely arrives on the due date can be used to pay it — but
 * ordering within a day never lets a *later-dated* event reach back in time.
 */
export const KIND_PRIORITY: Record<CashFlowKind, number> = {
  OPENING_RESERVE: 0,
  LOAN_DISBURSEMENT: 1,
  SALE_RECEIPT: 2,
  INSURANCE_PAYOUT: 3,
  OPERATING_COST: 4,
  OTHER_OBLIGATION: 5,
  LOAN_REPAYMENT_DUE: 6,
};

const INFLOW_KINDS: CashFlowKind[] = ["OPENING_RESERVE", "LOAN_DISBURSEMENT", "SALE_RECEIPT", "INSURANCE_PAYOUT"];
const OUTFLOW_KINDS: CashFlowKind[] = ["OPERATING_COST", "OTHER_OBLIGATION"];

export type LedgerEvent = {
  id: string;
  kind: CashFlowKind;
  date: IsoDate;
  amount: Money;
  label: string;
  loanId?: string | null;
};

export type RepaymentRow = {
  date: IsoDate;
  loanId: string | null;
  label: string;
  /** This instalment alone. */
  due: string;
  /** Unmet amount brought forward from earlier due dates. */
  carriedIn: string;
  /** due + carriedIn. */
  required: string;
  /** Cash on hand at the moment of the test. */
  available: string;
  paid: string;
  /** required − paid. The funding gap on this date. */
  shortfall: string;
  carriedOut: string;
};

export type LedgerDayRow = {
  date: IsoDate;
  inflows: string;
  outflows: string;
  /** Balance after the day's inflows, outflows and repayments. */
  closingBalance: string;
  events: Array<{ kind: CashFlowKind; label: string; amount: string }>;
};

export type LedgerResult = {
  days: LedgerDayRow[];
  repayments: RepaymentRow[];
  totalInflows: string;
  totalOutflows: string;
  totalRepaid: string;
  /** Unmet amount still outstanding at the end of the horizon. */
  closingDeficit: string;
  closingBalance: string;
  /** The largest single-date funding gap. */
  peakShortfall: string;
  /** Sum of every dated shortfall. Not a loss — a timing measure. */
  totalShortfall: string;
};

export type LedgerOptions = {
  /** When false (default) the balance floors at zero and unmet amounts carry forward. */
  allowNegativeBalance?: boolean;
};

/**
 * Run a dated cash-flow ledger and test each repayment against the cash
 * actually available on its due date.
 *
 * The invariant that matters: the repayment test reads the balance *as of that
 * calendar date*. An insurance payout dated after the due date sits in a later
 * bucket and has not yet touched the balance, so it cannot retroactively close
 * an earlier gap. That is the difference between a liquidity model that is
 * useful to a lender and one that quietly flatters the borrower.
 *
 * No event is counted twice: each contributes to `balance` exactly once, in its
 * own date bucket. `shortfall` is a derived report, not a second mutation of
 * balance, and `carriedDeficit` is assigned rather than accumulated, so an
 * unmet payment carries forward exactly once.
 */
export function runLedger(events: LedgerEvent[], options: LedgerOptions = {}): LedgerResult {
  const allowNegative = options.allowNegativeBalance ?? false;

  const sorted = [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const p = KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind];
    if (p !== 0) return p;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const byDate = new Map<IsoDate, LedgerEvent[]>();
  for (const e of sorted) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }

  let balance = ZERO;
  let carriedDeficit = ZERO;
  let totalInflows = ZERO;
  let totalOutflows = ZERO;
  let totalRepaid = ZERO;
  let peakShortfall = ZERO;
  let totalShortfall = ZERO;

  const days: LedgerDayRow[] = [];
  const repayments: RepaymentRow[] = [];

  for (const date of [...byDate.keys()].sort()) {
    const dayEvents = byDate.get(date)!;

    const inflows = sum(dayEvents.filter((e) => INFLOW_KINDS.includes(e.kind)).map((e) => e.amount));
    const outflows = sum(dayEvents.filter((e) => OUTFLOW_KINDS.includes(e.kind)).map((e) => e.amount));

    balance = balance.plus(inflows).minus(outflows);
    totalInflows = totalInflows.plus(inflows);
    totalOutflows = totalOutflows.plus(outflows);

    for (const repayment of dayEvents.filter((e) => e.kind === "LOAN_REPAYMENT_DUE")) {
      const available = allowNegative ? balance : maxMoney(balance, ZERO);
      const carriedIn = carriedDeficit;
      const required = repayment.amount.plus(carriedIn);
      const paid = minMoney(maxMoney(available, ZERO), required);
      const shortfall = required.minus(paid);

      balance = balance.minus(paid);
      carriedDeficit = shortfall;
      totalRepaid = totalRepaid.plus(paid);
      totalShortfall = totalShortfall.plus(shortfall);
      if (shortfall.greaterThan(peakShortfall)) peakShortfall = shortfall;

      repayments.push({
        date,
        loanId: repayment.loanId ?? null,
        label: repayment.label,
        due: moneyToString(repayment.amount),
        carriedIn: moneyToString(carriedIn),
        required: moneyToString(required),
        available: moneyToString(available),
        paid: moneyToString(paid),
        shortfall: moneyToString(shortfall),
        carriedOut: moneyToString(shortfall),
      });
    }

    days.push({
      date,
      inflows: moneyToString(inflows),
      outflows: moneyToString(outflows),
      closingBalance: moneyToString(balance),
      events: dayEvents.map((e) => ({ kind: e.kind, label: e.label, amount: moneyToString(e.amount) })),
    });
  }

  return {
    days,
    repayments,
    totalInflows: moneyToString(totalInflows),
    totalOutflows: moneyToString(totalOutflows),
    totalRepaid: moneyToString(totalRepaid),
    closingDeficit: moneyToString(carriedDeficit),
    closingBalance: moneyToString(balance),
    peakShortfall: moneyToString(peakShortfall),
    totalShortfall: moneyToString(totalShortfall),
  };
}

/**
 * Conservation check used by the tests: every lira that entered the ledger is
 * accounted for by exactly one of outflows, repayments, or the closing balance.
 */
export function ledgerBalances(result: LedgerResult): boolean {
  const lhs = money(result.totalInflows).minus(result.totalOutflows).minus(result.totalRepaid);
  return toKurus(lhs).equals(toKurus(money(result.closingBalance)));
}
