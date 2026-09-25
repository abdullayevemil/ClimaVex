import { maxMoney, minMoney, money, moneyToString, ZERO, type Money } from "./money";
import { addDays, type IsoDate } from "./dates";

/**
 * Insurance terms are user-entered or fixture data. They are NOT current
 * TARSIM rules and nothing here encodes a real product. `isDemoAssumption`
 * travels with every policy so the interface can say so plainly.
 */
export type PolicyTerms = {
  id: string;
  provider: string;
  eligibleHazards: string[];
  coverageLimit: Money;
  deductible: Money;
  assumedEligibility: boolean;
  payoutLagDays: number;
  isDemoAssumption: boolean;
  source: string;
};

export type PayoutAssessment = {
  policyId: string;
  hazard: string;
  eligible: boolean;
  ineligibleReason: string | null;
  assessedLoss: string;
  deductibleApplied: string;
  cappedByLimit: boolean;
  payout: string;
  payoutDate: IsoDate | null;
  isDemoAssumption: boolean;
  source: string;
};

/**
 * payout = min( max(assessedLoss − deductible, 0), coverageLimit )
 * payoutDate = hazardEndDate + payoutLagDays
 *
 * The payout date is deliberately independent of the repayment schedule: a
 * payout that lands after a due date must show up on its own date, where the
 * ledger will treat it as arriving too late to help.
 */
export function assessPayout(
  policy: PolicyTerms,
  hazard: string,
  assessedLoss: Money,
  hazardEndDate: IsoDate,
): PayoutAssessment {
  const hazardCovered = policy.eligibleHazards.includes(hazard);
  const eligible = hazardCovered && policy.assumedEligibility && assessedLoss.greaterThan(0);

  let ineligibleReason: string | null = null;
  if (!hazardCovered) ineligibleReason = `Hazard "${hazard}" is not in this policy's eligible hazards.`;
  else if (!policy.assumedEligibility) ineligibleReason = "Policy is recorded as not assumed eligible.";
  else if (!assessedLoss.greaterThan(0)) ineligibleReason = "No assessed loss for this scenario.";

  if (!eligible) {
    return {
      policyId: policy.id,
      hazard,
      eligible: false,
      ineligibleReason,
      assessedLoss: moneyToString(assessedLoss),
      deductibleApplied: moneyToString(ZERO),
      cappedByLimit: false,
      payout: moneyToString(ZERO),
      payoutDate: null,
      isDemoAssumption: policy.isDemoAssumption,
      source: policy.source,
    };
  }

  const afterDeductible = maxMoney(assessedLoss.minus(policy.deductible), ZERO);
  const payout = minMoney(afterDeductible, policy.coverageLimit);

  return {
    policyId: policy.id,
    hazard,
    eligible: true,
    ineligibleReason: null,
    assessedLoss: moneyToString(assessedLoss),
    deductibleApplied: moneyToString(minMoney(policy.deductible, assessedLoss)),
    cappedByLimit: afterDeductible.greaterThan(policy.coverageLimit),
    payout: moneyToString(payout),
    payoutDate: addDays(hazardEndDate, policy.payoutLagDays),
    isDemoAssumption: policy.isDemoAssumption,
    source: policy.source,
  };
}

export function policyFromRow(row: {
  id: string;
  provider: string;
  eligibleHazards: string[];
  coverageLimit: unknown;
  deductible: unknown;
  assumedEligibility: boolean;
  payoutLagDays: number;
  isDemoAssumption: boolean;
  source: string;
}): PolicyTerms {
  return {
    id: row.id,
    provider: row.provider,
    eligibleHazards: row.eligibleHazards,
    coverageLimit: money(String(row.coverageLimit)),
    deductible: money(String(row.deductible)),
    assumedEligibility: row.assumedEligibility,
    payoutLagDays: row.payoutLagDays,
    isDemoAssumption: row.isDemoAssumption,
    source: row.source,
  };
}
