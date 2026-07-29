import type { ExecutiveProfile } from "@/features/executives/types";

export async function fetchExecutives(): Promise<ExecutiveProfile[]> {
  const res = await fetch("/api/executives", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load executives (${res.status})`);
  const data = (await res.json()) as { executives: ExecutiveProfile[] };
  return data.executives;
}
