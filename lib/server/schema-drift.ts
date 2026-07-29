/**
 * Detects a database that is behind the migrations in `supabase/migrations`.
 *
 * Two migrations add columns to tables an earlier one already created:
 * `verification` on `messages`, and the analysis columns on `reports` and
 * `votes` — `confidence`, `consensus`, `roadmap`, the per-executive vote
 * detail — which arrive in `202607290002_bootstrap_full_schema.sql`. A
 * project that ran `202607260001_initial_schema.sql` and not that one accepts
 * every debate turn and then fails on the last write of the session, which is
 * the most expensive possible place to fail.
 *
 * Callers use this to retry with the columns every deployment is guaranteed
 * to have. That is damage control, not a fix: whatever the newer columns
 * held is dropped, so `warnSchemaBehind` has to be loud enough that someone
 * runs the migration.
 */

/** The one file that reconciles any of the schemas this app has shipped. */
export const BOOTSTRAP_MIGRATION = "supabase/migrations/202607290002_bootstrap_full_schema.sql";

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

/**
 * True when the database rejected a query for naming a column it does not
 * know — `42703` from Postgres directly, `PGRST204` from PostgREST.
 *
 * The message patterns are matched as well because the same condition
 * surfaces from a *stale* schema cache: the column exists, but PostgREST has
 * not reloaded since the migration ran. Both are fixed by the same two steps.
 */
export function isMissingColumn(error: SupabaseErrorLike | null | undefined): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /column .* does not exist/i.test(message) ||
    /could not find the .* column/i.test(message)
  );
}

/** Server-side only. The founder gets the copy in `features/boardroom/error-copy.ts`. */
export function warnSchemaBehind(table: string, detail?: string) {
  console.warn(
    `[schema] "${table}" is missing columns this session needed, so it was saved without them. ` +
      `Run ${BOOTSTRAP_MIGRATION} in the Supabase SQL editor (it is additive and safe to re-run), ` +
      `then reload the schema cache with: notify pgrst, 'reload schema';` +
      (detail ? `\n[schema] PostgREST said: ${detail}` : ""),
  );
}
