import { describe, expect, it } from "vitest";
import { runLedger, ledgerBalances, type LedgerEvent } from "@/domain/finance/ledger";
import { money, moneyToString } from "@/domain/finance/money";
import { assessPayout, type PolicyTerms } from "@/domain/finance/insurance";
import { addDays, diffDays, toIsoDate, isWithin } from "@/domain/finance/dates";
import { cropMixExposure, sectionRevenue } from "@/domain/vulnerability/crop-mix";
import { resourceExposure, type ExposureLink } from "@/domain/vulnerability/resource-exposure";

const ev = (id: string, kind: LedgerEvent["kind"], date: string, amount: string): LedgerEvent =>
  ({ id, kind, date, amount: money(amount), label: id });

describe("dates", () => {
  it("treats dates as calendar days in the business timezone", () => {
    // 23:30 UTC on the 14th is already the 15th in Istanbul (UTC+3). Getting
    // this wrong moves a payment across its due date.
    expect(toIsoDate(new Date("2026-09-14T23:30:00Z"))).toBe("2026-09-15");
    expect(toIsoDate("2026-09-15")).toBe("2026-09-15");
  });

  it("does day arithmetic without drift", () => {
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
    expect(diffDays("2026-11-20", "2026-09-15")).toBe(66);
    expect(isWithin("2026-07-10", "2026-07-05", "2026-07-25")).toBe(true);
  });
});

describe("money", () => {
  it("does not drift across many small decimal amounts", () => {
    const events: LedgerEvent[] = [ev("open", "OPENING_RESERVE", "2026-01-01", "1000000")];
    for (let i = 0; i < 300; i += 1) events.push(ev(`c${i}`, "OPERATING_COST", "2026-03-01", "0.01"));
    expect(runLedger(events).totalOutflows).toBe("3.00");
  });
});

describe("F1 — the acceptance example", () => {
  const ledger = runLedger([
    ev("reserve", "OPENING_RESERVE", "2026-09-01", "400000"),
    ev("costs", "OPERATING_COST", "2026-09-10", "150000"),
    ev("other", "OTHER_OBLIGATION", "2026-09-12", "70000"),
    ev("due", "LOAN_REPAYMENT_DUE", "2026-09-15", "300000"),
    ev("payout", "INSURANCE_PAYOUT", "2026-11-05", "120000"),
  ]);

  it("reports a TL120,000 shortfall against TL180,000 available", () => {
    const due = ledger.repayments[0];
    expect(due.due).toBe("300000.00");
    expect(due.available).toBe("180000.00");
    expect(due.shortfall).toBe("120000.00");
  });

  it("does not let the later payout erase the due-date gap", () => {
    expect(ledger.repayments[0].shortfall).toBe("120000.00");
    const payoutDay = ledger.days.find((d) => d.date === "2026-11-05");
    expect(payoutDay?.inflows).toBe("120000.00");
  });

  it("conserves every lira", () => expect(ledgerBalances(ledger)).toBe(true));
});

describe("payout timing", () => {
  const base = [
    ev("reserve", "OPENING_RESERVE", "2026-09-01", "180000"),
    ev("due", "LOAN_REPAYMENT_DUE", "2026-09-15", "300000"),
  ];

  it("a payout one day late leaves the gap intact", () => {
    const l = runLedger([...base, ev("p", "INSURANCE_PAYOUT", "2026-09-16", "120000")]);
    expect(l.repayments[0].shortfall).toBe("120000.00");
  });

  it("a payout on the due date closes it", () => {
    const l = runLedger([...base, ev("p", "INSURANCE_PAYOUT", "2026-09-15", "120000")]);
    expect(l.repayments[0].shortfall).toBe("0.00");
  });
});

describe("F2 — September repayment, November proceeds", () => {
  const ledger = runLedger([
    ev("reserve", "OPENING_RESERVE", "2026-09-01", "50000"),
    ev("sep", "LOAN_REPAYMENT_DUE", "2026-09-15", "300000"),
    ev("sale", "SALE_RECEIPT", "2026-11-20", "400000"),
    ev("dec", "LOAN_REPAYMENT_DUE", "2026-12-15", "100000"),
  ]);

  it("flags the September gap", () => expect(ledger.repayments[0].shortfall).toBe("250000.00"));

  it("carries the deficit forward exactly once", () => {
    expect(ledger.repayments[1].carriedIn).toBe("250000.00");
    expect(ledger.repayments[1].required).toBe("350000.00");
    expect(ledger.repayments[1].shortfall).toBe("0.00");
  });

  it("conserves every lira", () => expect(ledgerBalances(ledger)).toBe(true));
});

describe("insurance", () => {
  const policy: PolicyTerms = {
    id: "p1", provider: "Demo", eligibleHazards: ["DROUGHT"],
    coverageLimit: money("400000"), deductible: money("20000"),
    assumedEligibility: true, payoutLagDays: 45, isDemoAssumption: true, source: "demo",
  };

  it("applies the deductible then the limit, and dates the payout by the lag", () => {
    const a = assessPayout(policy, "DROUGHT", money("140000"), "2026-09-30");
    expect(a.payout).toBe("120000.00");
    expect(a.payoutDate).toBe("2026-11-14");
    expect(a.cappedByLimit).toBe(false);
  });

  it("caps at the coverage limit", () => {
    const a = assessPayout(policy, "DROUGHT", money("900000"), "2026-09-30");
    expect(a.payout).toBe("400000.00");
    expect(a.cappedByLimit).toBe(true);
  });

  it("pays nothing for an uncovered hazard, and says why", () => {
    const a = assessPayout(policy, "HAIL", money("140000"), "2026-09-30");
    expect(a.eligible).toBe(false);
    expect(a.payout).toBe("0.00");
    expect(a.ineligibleReason).toMatch(/not in this policy/);
  });

  it("keeps every policy marked as a demo assumption, not a TARSIM rule", () => {
    expect(assessPayout(policy, "DROUGHT", money("100000"), "2026-09-30").isDemoAssumption).toBe(true);
  });
});

describe("F4 — crop-mix vulnerability is revenue-weighted", () => {
  // Three crops, so a crop count says "diversified" — but 70% of the revenue
  // sits in the sections exposed during one dry window.
  const sections = [
    { sectionId: "a", label: "Section A", cropCode: "WHEAT", cropName: "Wheat", areaM2: 700_000, yieldTPerHa: "4.0", priceTryPerT: "10000", costTryPerHa: "14000" },
    { sectionId: "b", label: "Section B", cropCode: "BARLEY", cropName: "Barley", areaM2: 200_000, yieldTPerHa: "4.0", priceTryPerT: "10000", costTryPerHa: "12000" },
    { sectionId: "c", label: "Section C", cropCode: "MAIZE", cropName: "Maize", areaM2: 100_000, yieldTPerHa: "4.0", priceTryPerT: "10000", costTryPerHa: "30000" },
  ];

  it("computes a 70% exposed share from revenue, not crop count", () => {
    const result = cropMixExposure(sections, ["a"]);
    expect(result.exposedShare).toBeCloseTo(0.70, 3);
    expect(result.cropCount).toBe(3);
    expect(result.affectedSections).toHaveLength(1);
  });

  it("exposes the numerator and denominator rather than just a ratio", () => {
    const r = cropMixExposure(sections, ["a"]);
    expect(Number(r.exposedRevenue)).toBeCloseTo(2_800_000, 2);
    expect(Number(r.totalRevenue)).toBeCloseTo(4_000_000, 2);
  });

  it("derives revenue from area x yield x price", () => {
    const r = sectionRevenue(sections[0]);
    expect(r.areaHa).toBeCloseTo(70, 6);
    expect(Number(r.expectedRevenue)).toBeCloseTo(70 * 4 * 10000, 2);
    expect(Number(r.expectedMargin)).toBeCloseTo(2_800_000 - 70 * 14000, 2);
  });
});

describe("F3 — shared-resource exposure is de-duplicated", () => {
  const link = (s: string, farm: string, borrower: string, loan: string | null, amount: string | null): ExposureLink => ({
    sectionId: s, sectionLabel: s, farmId: farm, farmName: farm,
    borrowerId: borrower, borrowerName: borrower, loanId: loan, loanReference: loan, outstandingPrincipal: amount,
  });

  it("counts a loan once however many sections it feeds", () => {
    // Three fields across two borrowers, one of whom has two sections on one loan.
    const e = resourceExposure("canal", "Canal", [
      link("s1", "f1", "b1", "L1", "500000"),
      link("s2", "f1", "b1", "L1", "500000"),
      link("s3", "f2", "b2", "L2", "300000"),
    ]);
    expect(e.distinctSections).toBe(3);
    expect(e.distinctBorrowers).toBe(2);
    expect(e.distinctLoans).toBe(2);
    expect(e.totalOutstanding).toBe("800000.00");
  });

  it("scales to the five-borrower canal without double counting", () => {
    const links = Array.from({ length: 9 }, (_, i) =>
      link(`s${i}`, `f${i % 5}`, `b${i % 5}`, `L${i % 5}`, "100000"),
    );
    const e = resourceExposure("canal", "Canal", links);
    expect(e.distinctSections).toBe(9);
    expect(e.distinctBorrowers).toBe(5);
    expect(e.distinctLoans).toBe(5);
    expect(e.totalOutstanding).toBe("500000.00");
  });
});
