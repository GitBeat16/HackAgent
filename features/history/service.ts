import type { VersionEntry } from "@/features/history/types";

export async function fetchHistory(): Promise<VersionEntry[]> {
  const res = await fetch("/api/history", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load history (${res.status})`);
  const data = (await res.json()) as { entries: VersionEntry[] };
  return data.entries;
}
