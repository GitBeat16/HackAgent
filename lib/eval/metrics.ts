/**
 * Metrics for judging the board's judgement.
 *
 * All pure — the harness supplies scores, this decides what they mean. That
 * split exists so the metrics can be tested without spending Groq quota, and
 * so the definitions are auditable rather than buried in a script.
 *
 * Keep this file free of server-only imports.
 */

import type { PitchTier } from "@/lib/eval/fixtures";

export interface RunResult {
  pitchId: string;
  tier: PitchTier;
  investmentScore: number;
  /** Distinct vote values cast, e.g. 2 when the board split yes/conditional. */
  distinctVotes: number;
  verdict: string;
  /** Mean per-executive confidence, 0–100. */
  meanConfidence: number;
}

/** Spearman rank correlation between the board's ranking and the tier ranking. */
export function rankCorrelation(results: RunResult[]): number {
  if (results.length < 2) return 0;

  const tierValue: Record<PitchTier, number> = { weak: 0, mediocre: 1, strong: 2 };

  // Average ranks, so ties (which tiers produce by construction) do not skew
  // the coefficient the way a naive positional rank would.
  const ranked = (values: number[]) => {
    const sorted = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
    const ranks = new Array<number>(values.length);
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j + 1 < sorted.length && sorted[j + 1]!.value === sorted[i]!.value) j += 1;
      const average = (i + j) / 2 + 1;
      for (let k = i; k <= j; k += 1) ranks[sorted[k]!.index] = average;
      i = j + 1;
    }
    return ranks;
  };

  const boardRanks = ranked(results.map((r) => r.investmentScore));
  const tierRanks = ranked(results.map((r) => tierValue[r.tier]));

  const n = results.length;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const mb = mean(boardRanks);
  const mt = mean(tierRanks);

  let num = 0;
  let db = 0;
  let dt = 0;
  for (let i = 0; i < n; i += 1) {
    const x = boardRanks[i]! - mb;
    const y = tierRanks[i]! - mt;
    num += x * y;
    db += x * x;
    dt += y * y;
  }
  const denom = Math.sqrt(db * dt);
  return denom === 0 ? 0 : Math.round((num / denom) * 100) / 100;
}

export interface TierSummary {
  tier: PitchTier;
  count: number
  meanScore: number;
  minScore: number;
  maxScore: number;
}

export function summariseByTier(results: RunResult[]): TierSummary[] {
  const tiers: PitchTier[] = ["strong", "mediocre", "weak"];
  return tiers
    .map((tier) => {
      const rows = results.filter((r) => r.tier === tier);
      const scores = rows.map((r) => r.investmentScore);
      return {
        tier,
        count: rows.length,
        meanScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        minScore: scores.length ? Math.min(...scores) : 0,
        maxScore: scores.length ? Math.max(...scores) : 0,
      };
    })
    .filter((row) => row.count > 0);
}

/**
 * Whether the tier bands separate at all.
 *
 * Cleanly separated means every strong pitch outscored every mediocre one,
 * and every mediocre one outscored every weak one. It is a strict test and
 * failing it is not damning — but passing it is the clearest single sentence
 * you can say about the board's discrimination.
 */
export function tiersSeparate(results: RunResult[]): { separated: boolean; overlaps: string[] } {
  const overlaps: string[] = [];
  const bands: Array<[PitchTier, PitchTier]> = [
    ["strong", "mediocre"],
    ["mediocre", "weak"],
  ];

  for (const [higher, lower] of bands) {
    const highs = results.filter((r) => r.tier === higher);
    const lows = results.filter((r) => r.tier === lower);
    for (const high of highs) {
      for (const low of lows) {
        if (high.investmentScore <= low.investmentScore) {
          overlaps.push(
            `${high.pitchId} (${higher}, ${high.investmentScore}) did not beat ${low.pitchId} (${lower}, ${low.investmentScore})`,
          );
        }
      }
    }
  }

  return { separated: overlaps.length === 0, overlaps };
}

/**
 * Spread of scores for the same pitch across repeated runs.
 *
 * The board runs at temperature > 0, so some variation is expected and
 * healthy. A large spread means the score is closer to a coin flip than a
 * judgement, and no amount of separation between tiers rescues that.
 */
export function consistency(runs: number[][]): { meanSpread: number; worstSpread: number } {
  const spreads = runs
    .filter((scores) => scores.length > 1)
    .map((scores) => Math.max(...scores) - Math.min(...scores));
  if (spreads.length === 0) return { meanSpread: 0, worstSpread: 0 };
  return {
    meanSpread: Math.round((spreads.reduce((a, b) => a + b, 0) / spreads.length) * 10) / 10,
    worstSpread: Math.max(...spreads),
  };
}

/**
 * How often the board genuinely disagreed with itself.
 *
 * A board that returns unanimous votes on every pitch is not deliberating —
 * it is one voice wearing eight hats, which is precisely the failure the
 * multi-agent architecture exists to avoid. This is the metric that tests the
 * architecture rather than the judgement.
 */
export function deliberationRate(results: RunResult[]): number {
  if (results.length === 0) return 0;
  const split = results.filter((r) => r.distinctVotes > 1).length;
  return Math.round((split / results.length) * 100);
}
