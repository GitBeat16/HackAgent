import { executiveRoster } from "@/features/executives/roster";

export async function listExecutives() {
  // Executive personas are product configuration, not user-owned data. They
  // can move to a Supabase table later without changing the API contract.
  return executiveRoster;
}
