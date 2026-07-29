/**
 * Configuration probe, not a database client.
 *
 * Supabase is this app's database, and its clients are constructed in
 * `lib/supabase/{client,server,proxy}.ts` — nothing else should build one.
 * Queries belong in `lib/server/*`, which route handlers call.
 *
 * This exists so `/api/health` can report whether the project is wired up
 * without opening a connection or requiring a session.
 */
export const db = {
  /** True only when the browser-safe Supabase project variables are present. */
  isConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
};
