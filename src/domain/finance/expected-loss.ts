import { money, moneyToString, type Money } from "./money";

/**
 * Share of a defaulted loan that is not recovered. The same 0.45 the ML
 * service's finance layer assumes, so the two never disagree.
 */
export const LOSS_GIVEN_DEFAULT = "0.45";

/** Expected loss is only reported for a risk score above this. */
export const EXPECTED_LOSS_THRESHOLD = 50;

export type ExpectedLoss = {
  loanAmount: string;
  riskScore: number;
  lossGivenDefault: string;
  threshold: number;
  /** False at or below the threshold; `expectedLoss` is then null. */
  applies: boolean;
  expectedLoss: string | null;
};

/**
 * Expected loss on a prospective loan: loan × (risk score ÷ 100) × loss given
 * default. The risk score stands in for the probability of loss — a stated
 * simplification, not a calibrated default probability.
 */
export function expectedLoss(loanAmount: Money, riskScore: number): ExpectedLoss {
  const applies = riskScore > EXPECTED_LOSS_THRESHOLD;
  return {
    loanAmount: moneyToString(loanAmount),
    riskScore,
    lossGivenDefault: LOSS_GIVEN_DEFAULT,
    threshold: EXPECTED_LOSS_THRESHOLD,
    applies,
    expectedLoss: applies
      ? moneyToString(loanAmount.times(money(riskScore).dividedBy(100)).times(LOSS_GIVEN_DEFAULT))
      : null,
  };
}
