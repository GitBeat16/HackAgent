/**
 * Tests for the fact-checking loop.
 *
 * Run with `npm run test:factcheck`. The risk this guards against is false
 * positives: a checker that flags ordinary prose as an unverified statistic
 * is worse than no checker, because it trains the reader to ignore the badge.
 */

import { extractClaims, verifyAgainstEvidence, verificationSummary } from "@/lib/ai/fact-check";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) console.log(`  [ok]   ${label}`);
  else {
    console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

console.log("\n1. Extracting real claims");
{
  const claims = extractClaims(
    "The market is $4.5 billion and growing. Churn sits at 20% monthly with a 3x LTV to CAC ratio, " +
      "and they raised ₹12 crore last year.",
  );
  console.log(`     found: ${claims.join(" | ")}`);
  check("finds the currency figure", claims.some((c) => c.includes("4.5")), claims.join());
  check("finds the percentage", claims.some((c) => c.includes("20")), claims.join());
  check("finds the multiple", claims.some((c) => c.toLowerCase().includes("3x")), claims.join());
  check("finds the rupee figure", claims.some((c) => c.includes("12")), claims.join());
}

console.log("\n2. NOT flagging ordinary prose (the false-positive risk)");
{
  const cases: Array<[string, string]> = [
    ["sentence-count instruction", "Keep your answer under 3 sentences please."],
    ["plain narrative", "I disagree with Marcus. The technical risk is the binding constraint here."],
    ["a date", "They plan to launch in 2026 after the pilot."],
    ["small counting number", "There are 4 people on the founding team."],
    ["ordinal", "This is the 2nd time we have discussed retention."],
  ];
  for (const [label, text] of cases) {
    const claims = extractClaims(text);
    check(`no claims in ${label}`, claims.length === 0, `got ${JSON.stringify(claims)}`);
  }
}

console.log("\n3. Hedged figures are left alone");
{
  const hedged = [
    "I'd estimate the market is around $2 billion.",
    "Roughly 30% of users churn, though that is unverified.",
    "Call it ~$500K of burn a year.",
    "Approximately 15 percent, assuming the cohort holds.",
  ];
  for (const text of hedged) {
    const claims = extractClaims(text);
    check(`hedged figure not treated as an assertion: "${text.slice(0, 34)}…"`,
      claims.length === 0, `got ${JSON.stringify(claims)}`);
  }
}

console.log("\n4. Verification against evidence");
{
  const evidence = [
    { claim: "The global AI healthcare market was valued at $4.5 billion in 2025 and is growing fast." },
    { claim: "Average seed rounds in the sector are around 20% dilution." },
  ];

  const good = verifyAgainstEvidence("The market is $4.5 billion, which supports the thesis.", evidence);
  check("a figure present in the evidence is supported",
    good.supported.length === 1 && good.unsupported.length === 0,
    JSON.stringify(good));

  const bad = verifyAgainstEvidence("The market is $50 billion by my read.", evidence);
  check("a figure absent from the evidence is unsupported",
    bad.unsupported.length === 1 && bad.supported.length === 0,
    JSON.stringify(bad));

  const mixed = verifyAgainstEvidence(
    "The market is $4.5 billion but I think we capture $900 million of it.",
    evidence,
  );
  check("a mixed message splits correctly",
    mixed.supported.length === 1 && mixed.unsupported.length === 1,
    JSON.stringify(mixed));
}

console.log("\n5. No evidence means no verdict, not a blanket accusation");
{
  const none = verifyAgainstEvidence("The market is $4.5 billion.", []);
  check("checked is false", none.checked === false);
  check("nothing is marked unsupported", none.unsupported.length === 0, JSON.stringify(none));
  check("summary stays silent", verificationSummary(none) === null);
}

console.log("\n6. Magnitude forms match across notations");
{
  const evidence = [{ claim: "Revenue reached 1,200,000 dollars in the last fiscal year." }];
  const result = verifyAgainstEvidence("They are at $1.2M in revenue.", evidence);
  check("$1.2M matches 1,200,000 in the source",
    result.supported.length === 1, JSON.stringify(result));
}

console.log("\n7. Summary wording");
{
  const clean = verifyAgainstEvidence("The market is $4.5 billion.",
    [{ claim: "valued at $4.5 billion" }]);
  check("clean check reports matches", (verificationSummary(clean) ?? "").includes("matched"),
    String(verificationSummary(clean)));

  const dirty = verifyAgainstEvidence("It is a $50 billion market.",
    [{ claim: "valued at $4.5 billion" }]);
  check("dirty check reports the gap", (verificationSummary(dirty) ?? "").includes("not in any source"),
    String(verificationSummary(dirty)));
  check("singular grammar", (verificationSummary(dirty) ?? "").includes("1 figure "),
    String(verificationSummary(dirty)));
}

console.log(failures === 0 ? "\nALL FACT-CHECK TESTS PASSED" : `\n${failures} FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
