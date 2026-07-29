/**
 * Tests that the verdict normalisers survive a model that ignored the schema.
 *
 * Run with `npm run test:normalise`. No Groq calls.
 *
 * These exist because a real session died on
 * "(raw ?? []).find is not a function": `??` guards null and undefined, but
 * the model had returned an *object* where the schema asked for an array, and
 * the throw took the entire write-up with it. `groq.ts` falls back to plain
 * JSON mode for models that reject `json_schema`, and in that mode nothing
 * enforces the shape — so every one of these payloads is reachable in
 * production and none of them may throw.
 *
 * The casts are the point: they are what a wrong shape looks like arriving
 * through a type that promised an array.
 */

import {
  normaliseDimensions,
  normaliseFinancials,
  normaliseRisks,
  normaliseSwot,
  normaliseVotes,
} from "@/lib/ai/report-generator";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) console.log(`  [ok]   ${label}`);
  else {
    console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

/** Runs `fn` and reports the throw rather than letting it end the run. */
function survives(label: string, fn: () => void) {
  try {
    fn();
    check(label, true);
  } catch (error) {
    check(label, false, error instanceof Error ? error.message : String(error));
  }
}

/** Every shape a model has any chance of substituting for an array. */
const wrongShapes: Array<[string, unknown]> = [
  ["undefined", undefined],
  ["null", null],
  ["an object", { Strengths: ["a"] }],
  ["a string", "Strengths: strong team"],
  ["a number", 42],
  ["a boolean", true],
  ["an empty object", {}],
];

console.log("\n1. Nothing throws, whatever the model returns");
for (const [name, value] of wrongShapes) {
  survives(`swot survives ${name}`, () => normaliseSwot(value as never));
  survives(`dimensions survives ${name}`, () => normaliseDimensions(value as never, 50));
  survives(`risks survives ${name}`, () => normaliseRisks(value as never));
  survives(`financials survives ${name}`, () => normaliseFinancials(value as never));
  survives(`votes survives ${name}`, () => normaliseVotes(value as never, ["ceo", "cfo"]));
}

console.log("\n2. The report's fixed structure holds regardless");
{
  const swot = normaliseSwot("nonsense" as never);
  check("swot always has four sections", swot.length === 4, String(swot.length));
  check(
    "swot titles stay in order",
    swot.map((s) => s.title).join(",") === "Strengths,Weaknesses,Opportunities,Threats",
  );
  check("every section renders something", swot.every((s) => s.items.length > 0));

  const dimensions = normaliseDimensions(undefined, 63);
  check("all five axes are present", dimensions.length === 5, String(dimensions.length));
  check("missing scores fall back to the investment score",
    dimensions.every((d) => d.score === 63));

  check("risks never render empty", normaliseRisks(7 as never).length === 1);
  check("financials never render empty", normaliseFinancials(null as never).length === 1);

  const votes = normaliseVotes(undefined, ["ceo", "cfo"]);
  check("one vote per seated executive", votes.length === 2, String(votes.length));
  check("an unrecorded vote is conditional, not absent",
    votes.every((v) => v.vote === "conditional"));
  check("unknown ids are dropped rather than seated",
    normaliseVotes(undefined, ["ceo", "not-an-executive"]).length === 1);
}

console.log("\n3. A keyed object is recovered, not discarded");
{
  // The substitute shape a model actually reaches for: the entry's key field
  // promoted to an object key. Guarding alone would render a blank report
  // that claims the board said nothing, which reads as a worse bug than the
  // crash did — so these assert the content survives.
  const swot = normaliseSwot({
    Strengths: ["Strong technical team"],
    Weaknesses: ["No revenue"],
  } as never);
  check("keyed swot keeps its items",
    swot[0]!.items[0] === "Strong technical team", JSON.stringify(swot[0]));
  check("keyed swot fills the sections the model omitted",
    swot[2]!.items.length === 1 && swot[2]!.items[0]!.startsWith("The board did not"));

  const dimensions = normaliseDimensions({ Team: 82, Market: 41 } as never, 50);
  check("keyed dimensions keep their scores",
    dimensions[0]!.score === 82 && dimensions[2]!.score === 41, JSON.stringify(dimensions));

  const financials = normaliseFinancials({ ARR: "$1.2M", Burn: "$90k/mo" } as never);
  check("keyed financials keep label and value",
    financials[0]!.label === "ARR" && financials[0]!.value === "$1.2M",
    JSON.stringify(financials));

  // Nested objects keep their own fields and gain the key.
  const votes = normaliseVotes(
    { ceo: { vote: "yes", rationale: "Clear thesis.", confidence: 80 } } as never,
    ["ceo", "cfo"],
  );
  const ceo = votes.find((v) => v.executiveId === "ceo")!;
  check("a keyed vote is still counted", ceo.vote === "yes", JSON.stringify(ceo));
  check("a keyed vote keeps its rationale", ceo.rationale === "Clear thesis.");
  check("a keyed vote keeps its confidence", ceo.confidence === 80, String(ceo.confidence));
  check("seats the model skipped still get a row",
    votes.find((v) => v.executiveId === "cfo")?.vote === "conditional");

  // Scalar values map onto the entry's primary field.
  const scalarVotes = normaliseVotes({ ceo: "no" } as never, ["ceo"]);
  check("a bare scalar vote is read as the vote", scalarVotes[0]!.vote === "no");
}

console.log("\n4. Correctly shaped input is untouched");
{
  const swot = normaliseSwot([{ title: "Threats", items: ["Incumbent response"] }]);
  check("a real array still matches by title",
    swot[3]!.items[0] === "Incumbent response", JSON.stringify(swot[3]));

  const votes = normaliseVotes(
    [{ executiveId: "Elena Vasquez", vote: "yes", rationale: "Backing it." }],
    ["ceo"],
  );
  check("name-matching still works", votes[0]!.vote === "yes", JSON.stringify(votes[0]));

  const risks = normaliseRisks([{ risk: "Churn", likelihood: "High", impact: "High" }]);
  check("a real risk row survives",
    risks[0]!.risk === "Churn" && risks[0]!.likelihood === "High");

  // An item list that arrived as a string cannot be salvaged, but must not
  // throw either — the section falls back to its placeholder.
  const stringItems = normaliseSwot([{ title: "Strengths", items: "great team" as never }]);
  check("a non-array item list degrades quietly", stringItems[0]!.items.length === 1);
}

console.log(failures === 0 ? "\nALL NORMALISATION TESTS PASSED" : `\n${failures} FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
