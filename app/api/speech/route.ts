import { NextResponse } from "next/server";
import { synthesise } from "@/lib/speech/edge-tts";
import { requireUser } from "@/lib/server/auth";
import type { ApiError } from "@/types/api";

/**
 * Speaks one transcript turn in an executive's voice.
 *
 * Returns MP3 bytes on success. On any failure it returns 503 — deliberately
 * a status the client treats as "use the browser's own voice instead" rather
 * than an error to show the founder. The upstream service here is Edge's
 * Read Aloud endpoint, which Microsoft does not publish, so failure is an
 * expected branch and not an exceptional one.
 *
 * Authenticated because it is a free proxy to a third-party synthesiser;
 * without `requireUser` this route is an open TTS API for anyone who finds it.
 */

/** A long executive turn takes a few seconds to synthesise. */
export const maxDuration = 30;

const MAX_CHARS = 1200;

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = (await request.json().catch(() => ({}))) as {
    text?: string;
    executiveId?: string;
  };

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json<ApiError>(
      { error: "Nothing to speak.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  try {
    // Truncation rather than rejection: a turn slightly over the bound should
    // still be heard, and the cap exists to stop one pathological message
    // occupying the whole function budget.
    const audio = await synthesise(text.slice(0, MAX_CHARS), body.executiveId ?? "ceo");

    return new Response(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audio.length),
        // Same turn, same audio — but it is per-user content, so private.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return NextResponse.json<ApiError>(
      {
        error: error instanceof Error ? error.message : "Speech synthesis unavailable.",
        code: "TTS_UNAVAILABLE",
      },
      { status: 503 },
    );
  }
}
