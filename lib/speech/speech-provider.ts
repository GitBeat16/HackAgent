"use client";

/**
 * Chooses how the board speaks.
 *
 * Three providers, in order of preference:
 *
 *   1. Piper, fetched from `/api/tts`. Self-hosted, MIT-licensed, free at any
 *      volume, and the only one with no third party in the loop. Preferred
 *      whenever the server has the binary and models installed.
 *   2. Edge neural voices, fetched from `/api/speech`. Free and good, but it
 *      calls an endpoint Microsoft does not publish.
 *   3. The browser's own Web Speech API. Robotic and OS-dependent, but it
 *      cannot fail in a way that leaves the board silent.
 *
 * The fallback chain is the whole point of this file. Piper may be absent in
 * local dev or on a serverless deploy with no binary; Edge may be blocked by
 * a conference network. When either happens the founder should notice a
 * change in voice quality and nothing else.
 *
 * Once a provider has failed, this stops trying it for the rest of the
 * session. Retrying per turn would add the full timeout to every single turn
 * of a debate that is already paced by a rate limit.
 */

import { cancelSpeech, isSpeechSupported, speak as speakLocally } from "@/lib/speech/speech-engine";
import { FOUNDER_VOICE_PROFILE, type VoiceProfile } from "@/lib/speech/voices";

export type SpeechEngine = "piper" | "edge" | "browser" | "none";

/** Set once Edge has failed, so the rest of the session skips straight to the browser. */
let edgeDisabled = false;

/**
 * Set once Piper has failed. A 503 here is the expected answer on any machine
 * that has not run `npm run piper:voices`, so this flips on the first turn
 * and the session pays the cost exactly once.
 */
let piperDisabled = false;

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

/** True when Piper is still worth trying. */
export function piperAvailable(): boolean {
  return !piperDisabled;
}

/** Forces the browser path — used by tests and by an explicit user setting. */
export function disableEdge() {
  edgeDisabled = true;
}

/** Skips the self-hosted engine — used by tests and to force a known path. */
export function disablePiper() {
  piperDisabled = true;
}

export interface SpeakRequest {
  text: string;
  /** Roster id; picks the voice on every path. */
  speakerId: string;
  /** Display name, when the caller has it. Piper accepts either. */
  speakerName?: string;
  /** Overrides the roster profile on the browser path. */
  profile?: VoiceProfile;
  isFounder?: boolean;
  onStart?: () => void;
}

/**
 * Fetches and plays audio from one of the server engines. Resolves when
 * playback finishes.
 *
 * Rejects on any failure so `speak` can fall through — the caller must not
 * be able to tell the difference except by the voice.
 */
async function speakViaServer(
  endpoint: string,
  payload: Record<string, unknown>,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) throw new Error(`${endpoint} unavailable (${response.status})`);

  const blob = await response.blob();
  if (blob.size === 0) throw new Error(`${endpoint} returned empty audio.`);
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
      reject(new Error(`Playback failed for audio from ${endpoint}.`));
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

  // Fired exactly once, whichever engine ends up speaking. Firing it per
  // attempt would flicker the speaking indicator as the chain falls through.
  let announced = false;
  const announce = () => {
    if (announced) return;
    announced = true;
    request.onStart?.();
  };

  // 1. Piper. A 503 here is the ordinary answer on a machine that has not
  //    installed it, so the failure is expected rather than exceptional.
  //
  //    Founder turns deliberately skip it: the mapping covers the eight
  //    board members, and an unmapped speaker resolves to the default voice —
  //    which would make the founder sound exactly like the chair. Until a
  //    `founder` entry exists in `piper-voices.config.ts`, their turns are
  //    better served by Edge, which already has a distinct founder profile.
  if (!piperDisabled && !request.isFounder) {
    try {
      announce();
      await speakViaServer(
        "/api/tts",
        {
          text: request.text,
          personaName: request.speakerName,
          executiveId: request.speakerId,
        },
        signal,
      );
      return "piper";
    } catch {
      if (signal.aborted) return "none";
      // One failure disables it for the session: a missing binary will still
      // be missing on the next turn, and re-asking sixteen times is pure
      // latency.
      piperDisabled = true;
    }
  }

  // 2. Edge.
  if (!edgeDisabled) {
    try {
      announce();
      await speakViaServer(
        "/api/speech",
        { text: request.text, executiveId: request.speakerId },
        signal,
      );
      return "edge";
    } catch {
      // A conference network that blocks it once will block it every turn,
      // and paying the timeout sixteen more times would be worse than the
      // robotic voice.
      if (!signal.aborted) edgeDisabled = true;
      if (signal.aborted) return "none";
    }
  }

  // 3. Whatever the OS has.
  if (!isSpeechSupported()) return "none";

  await speakLocally(request.text, {
    speakerId: request.isFounder ? "founder" : request.speakerId,
    profile: request.isFounder ? FOUNDER_VOICE_PROFILE : request.profile,
    onStart: announced ? undefined : announce,
  });
  return "browser";
}

/** Stops whichever engine is talking. */
export function stop() {
  releaseAudio();
  cancelSpeech();
}
