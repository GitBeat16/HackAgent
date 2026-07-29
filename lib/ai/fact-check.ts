/**
 * Checks what an executive said against what was actually retrieved.
 *
 * The gap this closes: we hand the Research and VC agents real search
 * results and instruct them to label anything else as an estimate. Nothing
 * enforced it. A model given a genuine market figure can still state a
 * different one, and the report would present both with equal confidence.
 *
 * ## Why this is string work, not a second model call
 *
 * The obvious implementation is "ask the model whether the claim is
 * supported". That costs a request per turn — doubling the debate's traffic
 * against the same rate limit that already forces 15-second pacing — and
 * asks a model to grade its own output, which is exactly the failure mode
 * we are trying to catch.
 *
 * Numeric claims are the ones that matter and the ones that are checkable
 * without judgement: a market size, a funding round, a percentage. If the
 * figure appears in the retrieved text it is supported; if it does not, it
 * came from the model. That is a narrow claim, but it is a *true* one, which
 * is more than the prompt instruction gave us.
 *
 * Keep this file free of server-only imports.
 */

export interface VerificationResult {
  /** Figures that appear in the retrieved evidence. */
  supported: string[];
  /** Figures the executive stated that no source backs. */
  unsupported: string[];
  /** False when there was no evidence to check against. */
  checked: boolean;
}

/**
 * Matches figures a board member would actually cite.
 *
 * Deliberately narrow. Every loosening of this pattern turns ordinary prose
 * into a "claim" and buries the real unsupported figures in noise — "under 3
 * sentences" should never be flagged as an unverified market statistic.
 */
const CLAIM_PATTERNS: RegExp[] = [
  // Currency with optional magnitude: $1.2M, ₹499, €2.5 billion
  /[$₹€£]\s?\d[\d,]*(?:\.\d+)?\s?(?:k|m|b|bn|million|billion|trillion|cr|crore|lakh)?/gi,
  // Bare magnitudes: 4.5 billion, 200 million
  /\b\d[\d,]*(?:\.\d+)?\s?(?:million|billion|trillion|crore|lakh)\b/gi,
  // Percentages: 20%, 15.5 percent.
  // No trailing \b after the `%` alternative — `%` is already a non-word
  // character, so `\b` before a following space can never match and "20%"
  // was being missed entirely.
  /\b\d+(?:\.\d+)?\s?(?:%|percent\b)/gi,
  // Multiples and ratios: 3x, 10X
  /\b\d+(?:\.\d+)?x\b/gi,
];

/** Words that make a nearby number a hedge rather than an assertion. */
const HEDGES = [
  "estimate", "estimated", "estimating", "roughly", "approximately", "around",
  "about", "i'd guess", "i would guess", "assume", "assuming", "ballpark",
  "order of magnitude", "unverified", "my sense", "call it", "somewhere",
  "~", "circa",
];

/** Strips formatting so "1,200" and "1200" compare equal. */
function canonical(figure: string): string {
  return figure
    .toLowerCase()
    .replace(/[\s,]/g, "")
    .replace(/[$₹€£]/g, "")
    .replace(/percent$/, "%")
    .replace(/\bbn\b/, "b")
    .replace(/million/, "m")
    .replace(/billion/, "b")
    .replace(/trillion/, "t");
}

/**
 * Numeric expansions of a figure, so "1.2m" can match "1,200,000" in source
 * text that spells the number out.
 */
function numericForms(figure: string): string[] {
  const canon = canonical(figure);
  const match = canon.match(/^(\d+(?:\.\d+)?)([kmbt])?%?$/);
  if (!match) return [canon];

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return [canon];

  const scale = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[match[2] ?? ""] ?? 1;
  const expanded = value * scale;

  return [
    canon,
    String(expanded),
    // Trailing .0 is an artefact of the multiplication, not a different number.
    expanded % 1 === 0 ? String(Math.round(expanded)) : String(expanded),
  ];
}

/**
 * Every distinct figure asserted in `text`, hedged ones excluded.
 *
 * Overlapping matches are resolved longest-first. The patterns deliberately
 * overlap — "$4.5 billion" is both a currency figure and a bare magnitude —
 * and counting it twice inflated every total, so a single misquoted number
 * was reported as "2 figures not in any source". Claiming a span removes it
 * from consideration for every shorter pattern.
 */
export function extractClaims(text: string): string[] {
  const candidates: Array<{ figure: string; start: number; end: number }> = [];

  for (const pattern of CLAIM_PATTERNS) {
    // `matchAll` needs the global flag, which these carry; reset lastIndex so
    // reusing the module-level regexes across calls cannot skip matches.
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const raw = match[0];
      const start = match.index ?? 0;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      candidates.push({ figure: trimmed, start, end: start + raw.length });
    }
  }

  // Longest first so the more specific pattern wins the overlap; ties broken
  // by position to keep the result deterministic.
  candidates.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);

  const claimed: Array<{ start: number; end: number }> = [];
  const found = new Set<string>();

  for (const candidate of candidates) {
    const overlaps = claimed.some(
      (span) => candidate.start < span.end && candidate.end > span.start,
    );
    if (overlaps) continue;

    // A figure the speaker already flagged as approximate is not a claim
    // to be checked — it is exactly the honest behaviour we asked for.
    const window = text
      .slice(Math.max(0, candidate.start - 60), candidate.end + 20)
      .toLowerCase();
    // The span is consumed either way: a hedged figure must not be re-matched
    // by a shorter pattern that sidesteps the hedge window.
    claimed.push({ start: candidate.start, end: candidate.end });
    if (HEDGES.some((hedge) => window.includes(hedge))) continue;

    found.add(candidate.figure);
  }

  return [...found];
}

/**
 * Splits an executive's figures into those the evidence backs and those it
 * does not.
 *
 * With no evidence, `checked` is false and both lists are empty — silence
 * rather than accusing every figure of being unsupported, because "we did
 * not look" is not the same finding as "we looked and found nothing".
 */
export function verifyAgainstEvidence(
  message: string,
  evidence: Array<{ claim: string }>,
): VerificationResult {
  if (evidence.length === 0) {
    return { supported: [], unsupported: [], checked: false };
  }

  const haystack = evidence.map((finding) => canonical(finding.claim)).join(" | ");
  const supported: string[] = [];
  const unsupported: string[] = [];

  for (const claim of extractClaims(message)) {
    const forms = numericForms(claim);
    if (forms.some((form) => form.length > 1 && haystack.includes(form))) {
      supported.push(claim);
    } else {
      unsupported.push(claim);
    }
  }

  return { supported, unsupported, checked: true };
}

/** One-line summary for the transcript badge. */
export function verificationSummary(result: VerificationResult | null | undefined): string | null {
  if (!result?.checked) return null;
  if (result.unsupported.length === 0) {
    return result.supported.length > 0
      ? `${result.supported.length} figure${result.supported.length === 1 ? "" : "s"} matched a source`
      : null;
  }
  return `${result.unsupported.length} figure${result.unsupported.length === 1 ? "" : "s"} not in any source`;
}
