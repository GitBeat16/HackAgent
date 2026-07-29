/**
 * Tests for the eval metrics.
 *
 * Run with `npm run test:metrics`. These are the numbers you would put in
 * front of a judge, so they need to be right on synthetic data before anyone
 * trusts them on real data. No Groq calls.
 */

import {
  consistency,
  deliberationRate,
  rankCorrelation,
  summariseByTier,
  tiersSeparate,
  type RunResult,
} from "@/lib/eval/metrics";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) console.log(`  [ok]   ${label}`);
  else {
    console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

const row = (
  pitchId: string,
  tier: RunResult["tier"],
  investmentScore: number,
  distinctVotes = 2,
): RunResult => ({
  pitchId,
  tier,
  investmentScore,
  distinctVotes,
  verdict: "Conditional",
  meanConfidence: 60,
});

console.log("\n1. Rank correlation");
{
  // Note on the ceiling: the tiers are tied by construction (two pitches per
  // tier) while the board's scores are all distinct, so Spearman cannot reach
  // exactly 1.0 — the board separates s1 from s2 where the grading does not.
  // ~0.96 IS the perfect result for this fixture shape. Asserting 1.0 here
  // would be asserting that the board must score tied pitches identically,
  // which is not something we want.
  const perfect = [
    row("s1", "strong", 85), row("s2", "strong", 80),
    row("m1", "mediocre", 60), row("m2", "mediocre", 55),
    row("w1", "weak", 30), row("w2", "weak", 25),
  ];
  check("perfect ordering hits the tied-rank ceiling", rankCorrelation(perfect) >= 0.95,
    String(rankCorrelation(perfect)));

  const inverted = [
    row("s1", "strong", 20), row("s2", "strong", 25),
    row("m1", "mediocre", 50), row("m2", "mediocre", 55),
    row("w1", "weak", 85), row("w2", "weak", 90),
  ];
  check("exactly inverted ordering is symmetrically negative",
    rankCorrelation(inverted) <= -0.95, String(rankCorrelation(inverted)));
  check("inversion mirrors the perfect case",
    Math.abs(rankCorrelation(inverted)) === Math.abs(rankCorrelation(perfect)),
    `${rankCorrelation(inverted)} vs ${rankCorrelation(perfect)}`);

  // With one pitch per tier there are no ties, so 1.0 is reachable — this is
  // what proves the coefficient itself is not systematically low.
  const untied = [row("s1", "strong", 85), row("m1", "mediocre", 55), row("w1", "weak", 25)];
  check("untied data reaches exactly 1.0", rankCorrelation(untied) === 1,
    String(rankCorrelation(untied)));

  const flat = [row("s1", "strong", 50), row("m1", "mediocre", 50), row("w1", "weak", 50)];
  check("identical scores give 0, not NaN", rankCorrelation(flat) === 0, String(rankCorrelation(flat)));

  check("a single result does not divide by zero", rankCorrelation([row("s1", "strong", 80)]) === 0);
  check("an empty set is 0", rankCorrelation([]) === 0);
}

console.log("\n2. Tier separation");
{
  const clean = [
    row("s1", "strong", 82), row("m1", "mediocre", 58), row("w1", "weak", 31),
  ];
  check("cleanly separated tiers pass", tiersSeparate(clean).separated);

  const overlapping = [
    row("s1", "strong", 55), row("m1", "mediocre", 60), row("w1", "weak", 30),
  ];
  const result = tiersSeparate(overlapping);
  check("an overlap is detected", !result.separated);
  check("the overlap names both pitches",
    Boolean(result.overlaps[0]?.includes("s1") && result.overlaps[0]?.includes("m1")),
    result.overlaps[0] ?? "none");

  const tie = [row("s1", "strong", 60), row("m1", "mediocre", 60)];
  check("an exact tie counts as failing separation", !tiersSeparate(tie).separated);
}

console.log("\n3. Tier summary");
{
  const rows = summariseByTier([
    row("s1", "strong", 80), row("s2", "strong", 90),
    row("w1", "weak", 20),
  ]);
  const strong = rows.find((r) => r.tier === "strong")!;
  check("mean is correct", strong.meanScore === 85, String(strong.meanScore));
  check("range is correct", strong.minScore === 80 && strong.maxScore === 90);
  check("empty tiers are omitted", rows.every((r) => r.count > 0));
  check("tiers with no data do not appear", rows.length === 2, String(rows.length));
}

console.log("\n4. Deliberation rate — the architecture check");
{
  const split = [row("a", "strong", 70, 3), row("b", "weak", 30, 2)];
  check("a fully deliberating board is 100%", deliberationRate(split) === 100);

  const unanimous = [row("a", "strong", 70, 1), row("b", "weak", 30, 1)];
  check("a always-unanimous board is 0%", deliberationRate(unanimous) === 0);

  const mixed = [
    row("a", "strong", 70, 2), row("b", "weak", 30, 1),
    row("c", "mediocre", 50, 1), row("d", "mediocre", 55, 1),
  ];
  check("mixed rounds correctly", deliberationRate(mixed) === 25, String(deliberationRate(mixed)));
  check("an empty set is 0", deliberationRate([]) === 0);
}

console.log("\n5. Consistency across repeat runs");
{
  const stable = consistency([[70, 72, 71], [30, 32, 31]]);
  check("a stable board has a small spread", stable.meanSpread === 2 && stable.worstSpread === 2,
    JSON.stringify(stable));

  const erratic = consistency([[40, 85], [30, 33]]);
  check("an erratic board is flagged", erratic.worstSpread === 45, JSON.stringify(erratic));

  check("single runs report zero rather than NaN",
    consistency([[70], [30]]).meanSpread === 0);
  check("no runs report zero", consistency([]).worstSpread === 0);
}

console.log(failures === 0 ? "\nALL EVAL METRIC TESTS PASSED" : `\n${failures} FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
