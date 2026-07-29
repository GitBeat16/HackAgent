/**
 * Web search behind a provider interface.
 *
 * The interface exists so the board is never coupled to one vendor: Tavily is
 * what ships, but the seam is one file wide and swapping in Serper, Brave or
 * an internal index means implementing `search` and nothing else.
 *
 * Server-only — it reads an API key.
 */

import { serverEnv } from "@/lib/server/env";

export interface SearchResult {
  title: string;
  /** Extracted content, already summarised by the provider where possible. */
  snippet: string;
  url: string;
  /** 0–1 provider-assigned relevance, used to drop weak hits. */
  score: number;
}

export interface SearchProvider {
  readonly name: string;
  search(query: string, options?: { maxResults?: number }): Promise<SearchResult[]>;
}

/** Cap on characters kept per result — these ride in a system prompt. */
const MAX_SNIPPET = 320;

/**
 * A search must never be able to hang a debate turn.
 *
 * The turn is already waiting on a model call with its own retry budget;
 * adding an unbounded second network wait in front of it means one slow
 * lookup stalls the whole meeting. Past this, the executive speaks from
 * reasoning and says so.
 */
const SEARCH_TIMEOUT_MS = 6_000;

class TavilyProvider implements SearchProvider {
  readonly name = "tavily";

  constructor(private readonly apiKey: string) {}

  async search(query: string, options?: { maxResults?: number }): Promise<SearchResult[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query,
          // "basic" is 1 API credit against the free tier's 1,000/month;
          // "advanced" is 2 and buys depth this use case does not need.
          search_depth: "basic",
          max_results: options?.maxResults ?? 4,
          include_answer: false,
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) return [];

      const payload = (await response.json().catch(() => null)) as {
        results?: Array<{ title?: string; content?: string; url?: string; score?: number }>;
      } | null;

      return (payload?.results ?? [])
        .filter((result) => result.url && result.content)
        .map((result) => ({
          title: (result.title ?? "").trim(),
          snippet: (result.content ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_SNIPPET),
          url: result.url!,
          score: typeof result.score === "number" ? result.score : 0,
        }));
    } catch {
      // Timeout, abort, network failure, malformed JSON — all mean the same
      // thing to the caller: no verified data this turn.
      return [];
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Returns null when no provider is configured — callers must handle it. */
export function getSearchProvider(): SearchProvider | null {
  const key = serverEnv.tavilyApiKey;
  return key ? new TavilyProvider(key) : null;
}
