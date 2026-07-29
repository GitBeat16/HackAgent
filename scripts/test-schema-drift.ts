/**
 * Tests the unmigrated-database detection and the copy it produces.
 *
 * Run with `npm run test:schema`. No Supabase or Groq calls.
 *
 * A session died at the final write with "Could not find the 'confidence'
 * column of 'reports' in the schema cache" — the database had taken
 * `202607260001_initial_schema.sql` but not the bootstrap that adds the
 * analysis columns. The whole debate was discarded at the last step.
 *
 * Two things have to hold. `isMissingColumn` must recognise that failure so
 * the writers can retry with the core columns, and it must NOT fire on
 * ordinary failures — a false positive there would silently drop the
 * analysis on a database that was fine, which is the harder bug to notice.
 */

import { isMissingColumn } from "@/lib/server/schema-drift";
import { boardErrorCopy } from "@/features/boardroom/error-copy";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) console.log(`  [ok]   ${label}`);
  else {
    console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

/** The exact error the stalled session reported. */
const REPORTED = "Could not find the 'confidence' column of 'reports' in the schema cache";

console.log("\n1. The failure that stalled the board is recognised");
{
  check("the reported message, by text alone",
    isMissingColumn({ message: REPORTED }));
  check("the reported message, with PostgREST's code",
    isMissingColumn({ code: "PGRST204", message: REPORTED }));
  check("PGRST204 even if the wording changes",
    isMissingColumn({ code: "PGRST204", message: "something new" }));
  check("Postgres' own undefined-column code",
    isMissingColumn({ code: "42703", message: 'column "confidence" does not exist' }));
  check("Postgres' wording without the code",
    isMissingColumn({ message: 'column "roadmap" does not exist' }));
  check("a stale cache after the migration ran",
    isMissingColumn({ code: "PGRST204", message: "Could not find the 'sources' column of 'reports' in the schema cache" }));
}

console.log("\n2. Ordinary failures are left alone");
{
  const unrelated: Array<[string, { code?: string; message?: string }]> = [
    ["no error at all", {}],
    ["a row-level-security rejection", { code: "42501", message: "new row violates row-level security policy" }],
    ["a foreign key violation", { code: "23503", message: 'insert or update on table "reports" violates foreign key constraint' }],
    ["a duplicate key", { code: "23505", message: "duplicate key value violates unique constraint" }],
    ["a network failure", { message: "fetch failed" }],
    ["a rate limit", { message: "Rate limit reached for model" }],
    ["a missing model", { message: "The model `llama-x` does not exist or you do not have access to it" }],
  ];
  for (const [label, error] of unrelated) {
    check(`${label} is not treated as schema drift`, !isMissingColumn(error));
  }
  check("null is not treated as schema drift", !isMissingColumn(null));
  check("undefined is not treated as schema drift", !isMissingColumn(undefined));
}

console.log("\n3. The founder is told what to run");
{
  const copy = boardErrorCopy(REPORTED);
  check("the title names the real cause",
    copy.title === "The database is a migration behind", copy.title);
  check("the description names the migration file",
    copy.description.includes("202607290002_bootstrap_full_schema.sql"), copy.description);
  check("the original error is kept for the detail panel", copy.detail === REPORTED);
  check("it does not tell them to resume, which would fail identically",
    !/resuming will retry/i.test(copy.description));
}

console.log("\n4. The new branch does not hijack the others");
{
  check("a rate limit still reads as a rate limit",
    boardErrorCopy("Groq request failed (429): Rate limit reached").title.includes("faster than your plan"));
  check("a missing key still reads as a missing key",
    boardErrorCopy("GROQ_API_KEY is not set").title === "No API key configured");
  check("a rejected key still reads as a rejected key",
    boardErrorCopy("Groq request failed (401): invalid api key").title === "That API key was rejected");
  check("a timeout still reads as a timeout",
    boardErrorCopy("The request timed out").description.includes("too long to come back"));

  // The one that motivated narrowing the pattern: a missing *model* is not a
  // missing *column*, and sending someone to the SQL editor for it wastes
  // their time.
  const missingModel = boardErrorCopy("The model `llama-x` does not exist");
  check("a missing model is not diagnosed as a schema problem",
    missingModel.title === "The board stalled", missingModel.title);
}

console.log(failures === 0 ? "\nALL SCHEMA DRIFT TESTS PASSED" : `\n${failures} FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
