"use client";

/**
 * Chooses how the board speaks.
 *
 * Two providers, in order of preference:
 *
 *   1. Edge neural voices, fetched from `/api/speech`. Free, consistent
 *      across machines, and genuinely good.
 *   2. The browser's own Web Speech API. Robotic and OS-dependent, but it
 *      cannot fail in a way that leaves the board silent.
 *
 * The fallback is the whole point of this file. Edge's endpoint is not a
 * published API, so it may fail at any time — including in a conference
 * hall that blocks the request. When that happens the founder should notice
 * a change in voice quality and nothing else.
 *
 * Once Edge has failed, this stops trying for the rest of the session.
 * Retrying per turn would add the full timeout to every single turn of a
 * debate that is already paced by a rate limit.
 */

import { cancelSpeech, isSpeechSupported, speak as speakLocally } from "@/lib/speech/speech-engine";
import { FOUNDER_VOICE_PROFILE, type VoiceProfile } from "@/lib/speech/voices";

export type SpeechEngine = "edge" | "browser" | "none";

/** Set once Edge has failed, so the rest of the session skips straight to the browser. */
let edgeDisabled = false;

/** The element currently playing Edge audio, so it can be stopped mid-word. */
let currentAudio: HTMLAudioElement | null = null;
/** Object URL behind `currentAudio`, revoked on cleanup to avoid a leak. */
let currentObjectUrl: string | null = null;

function releaseAudio() {
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

/** True when Edge is still worth trying. */
export function edgeAvailable(): boolean {
  return !edgeDisabled;
}

/** Forces the browser path — used by tests and by an explicit user setting. */
export function disableEdge() {
  edgeDisabled = true;
}

export interface SpeakRequest {
  text: string;
  /** Roster id; picks the voice on both paths. */
  speakerId: string;
  /** Overrides the roster profile on the browser path. */
  profile?: VoiceProfile;
  isFounder?: boolean;
  onStart?: () => void;
}

/**
 * Fetches and plays Edge audio. Resolves when playback finishes.
 *
 * Rejects on any failure so `speak` can fall through — the caller must not
 * be able to tell the difference except by the voice.
 */
async function speakViaEdge(request: SpeakRequest, signal: AbortSignal): Promise<void> {
  const response = await fetch("/api/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: request.text, executiveId: request.speakerId }),
    signal,
  });

  if (!response.ok) throw new Error(`Edge TTS unavailable (${response.status})`);

  const blob = await response.blob();
  if (blob.size === 0) throw new Error("Edge TTS returned empty audio.");
  if (signal.aborted) throw new Error("Aborted.");

  releaseAudio();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  currentObjectUrl = url;

  await new Promise<void>((resolve, reject) => {
    const done = () => {
      releaseAudio();
      resolve();
    };
    audio.onended = done;
    audio.onerror = () => {
      releaseAudio();
      reject(new Error("Edge TTS playback failed."));
    };
    signal.addEventListener("abort", done, { once: true });

    // Autoplay can be blocked when no user gesture has unlocked audio yet.
    // That is a browser-path problem too, so treat it as a normal failure
    // and let the fallback try rather than surfacing it.
    audio.play().catch(() => {
      releaseAudio();
      reject(new Error("Audio playback was blocked."));
    });
  });
}

/**
 * Speaks one message and resolves when it finishes or is cancelled.
 *
 * Never rejects: callers use this to pace the debate, and a rejection would
 * stall a session on something as ordinary as a blocked autoplay.
 *
 * Returns which engine actually spoke, so the UI can be honest about it.
 */
export async function speak(request: SpeakRequest, signal: AbortSignal): Promise<SpeechEngine> {
  if (!request.text.trim()) return "none";

  if (!edgeDisabled) {
    try {
      request.onStart?.();
      await speakViaEdge(request, signal);
      return "edge";
    } catch {
      // One failure disables Edge for the session. A conference network that
      // blocks it once will block it every turn, and paying the timeout
      // sixteen more times would be worse than the robotic voice.
      if (!signal.aborted) edgeDisabled = true;
      if (signal.aborted) return "none";
    }
  }

  if (!isSpeechSupported()) return "none";

  await speakLocally(request.text, {
    speakerId: request.isFounder ? "founder" : request.speakerId,
    profile: request.isFounder ? FOUNDER_VOICE_PROFILE : request.profile,
    // `onStart` already fired on the Edge attempt above; firing it twice
    // would make the speaking indicator flicker.
    onStart: edgeDisabled ? request.onStart : undefined,
  });
  return "browser";
}

/** Stops whichever engine is talking. */
export function stop() {
  releaseAudio();
  cancelSpeech();
}
