import { NextResponse } from "next/server";
import { MAX_CHARS, PiperUnavailableError, synthesise } from "@/lib/speech/piper";
import { isKnownPersona } from "@/lib/speech/piper-voices.config";
import { requireUser } from "@/lib/server/auth";
import type { ApiError } from "@/types/api";

/**
 * Speaks one transcript turn in a board member's own voice, using Piper.
 *
 * `POST { personaName, text }` → WAV bytes. `personaName` accepts either the
 * display name ("Elena Vasquez") or the roster id ("ceo"), because the spec
 * for this endpoint is written in names while every client in this repo holds
 * ids.
 *
 * ## Status codes, and why 503 is not an error
 *
 * A missing binary or model returns 503 with `PIPER_UNAVAILABLE` and a
 * `remedy` field naming the command to fix it. The client treats that as
 * "try the next engine" — Edge, then the browser's own voice — so local dev
 * without Piper installed is a quieter board, never a broken one. Anything
 * genuinely wrong during synthesis is a 500.
 *
 * Authenticated for the same reason `/api/speech` is: an open synthesis
 * endpoint is free CPU for whoever finds it.
 */

/** Synthesis is fast, but a long turn plus a cold model load needs headroom. */
export const maxDuration = 30;

/** Piper spawns a process and writes to disk — neither works on the edge runtime. */
export const runtime = "nodejs";

interface TtsRequest {
  personaName?: string;
  /** Accepted as an alias so existing callers can pass what they already have. */
  executiveId?: string;
  text?: string;
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json().catch(() => ({}))) as TtsRequest;
  const text = body.text?.trim();
  const speaker = body.personaName?.trim() || body.executiveId?.trim();

  if (!text) {
    return NextResponse.json<ApiError>(
      { error: "Nothing to speak.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  // An unknown name is not rejected — it falls back to the default voice, so
  // a founder turn or a renamed persona is still audible. Reporting it in a
  // header keeps the silent-substitution debuggable.
  const recognised = isKnownPersona(speaker);

  try {
    const { audio, cached, voice } = await synthesise(text.slice(0, MAX_CHARS), speaker ?? "");

    return new Response(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(audio.length),
        "X-Piper-Voice": voice.model,
        "X-Piper-Cache": cached ? "hit" : "miss",
        ...(recognised ? {} : { "X-Piper-Fallback-Voice": "true" }),
        // Deterministic for a given persona + text, and not user-specific:
        // the same line in the same voice is the same bytes for everyone.
        "Cache-Control": "private, max-age=86400, immutable",
      },
    });
  } catch (error) {
    if (error instanceof PiperUnavailableError) {
      return NextResponse.json<ApiError & { remedy: string }>(
        { error: error.message, code: "PIPER_UNAVAILABLE", remedy: error.remedy },
        { status: 503 },
      );
    }

    return NextResponse.json<ApiError>(
      {
        error: error instanceof Error ? error.message : "Speech synthesis failed.",
        code: "TTS_FAILED",
      },
      { status: 500 },
    );
  }
}
