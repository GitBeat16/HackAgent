/**
 * Voice assignment for the board.
 *
 * The Web Speech API hands back whatever voices the operating system has
 * installed, so the roster can't name a voice directly — the list on macOS,
 * Windows, Android and Linux share almost nothing. Instead each executive
 * declares the *character* it wants and we resolve that against whatever the
 * machine actually offers at runtime.
 *
 * `pitch` and `rate` are the part that survives everywhere. Even where two
 * executives end up sharing an underlying voice, the offsets keep them
 * telling apart by ear, which is the whole point of speaking the debate
 * aloud rather than just showing who has the floor.
 */

export type VoiceGender = "female" | "male";

export interface VoiceProfile {
  gender: VoiceGender;
  /** 0–2, where 1 is the voice's natural pitch. */
  pitch: number;
  /** 0.1–10, where 1 is the voice's natural speed. */
  rate: number;
}

/**
 * Keyed by executive id from `features/executives/roster.ts`.
 *
 * The values are tuned to the persona, not chosen at random: the CFO is the
 * board's most conservative vote and reads slower and lower, growth talks
 * fast, the researcher is measured. An executive missing from this map still
 * speaks — see `DEFAULT_VOICE_PROFILE`.
 */
export const voiceProfiles: Record<string, VoiceProfile> = {
  ceo: { gender: "female", pitch: 1.0, rate: 1.0 },
  cto: { gender: "female", pitch: 1.15, rate: 1.08 },
  cfo: { gender: "male", pitch: 0.85, rate: 0.94 },
  cmo: { gender: "female", pitch: 1.22, rate: 1.04 },
  vc: { gender: "male", pitch: 0.92, rate: 1.02 },
  legal: { gender: "female", pitch: 0.95, rate: 0.92 },
  research: { gender: "female", pitch: 1.08, rate: 0.96 },
  growth: { gender: "male", pitch: 1.05, rate: 1.12 },
};

export const DEFAULT_VOICE_PROFILE: VoiceProfile = { gender: "female", pitch: 1, rate: 1 };

/** The founder's own replies, when read back. Deliberately neutral. */
export const FOUNDER_VOICE_PROFILE: VoiceProfile = { gender: "male", pitch: 1, rate: 1.05 };

/**
 * Voice names that are reliably one gender, as a fallback for platforms that
 * don't expose gender on `SpeechSynthesisVoice` — which is all of them, since
 * the spec has no such field. Matched case-insensitively as substrings.
 */
const FEMALE_HINTS = [
  "female", "samantha", "victoria", "karen", "moira", "tessa", "fiona", "serena",
  "allison", "ava", "susan", "zira", "hazel", "joanna", "salli", "kimberly", "amy",
  "emma", "google uk english female", "google us english",
];

const MALE_HINTS = [
  "male", "daniel", "alex", "fred", "tom", "oliver", "rishi", "aaron", "david",
  "mark", "george", "matthew", "brian", "arthur", "google uk english male",
];

function scoreGender(voiceName: string, want: VoiceGender): number {
  const name = voiceName.toLowerCase();
  const wanted = want === "female" ? FEMALE_HINTS : MALE_HINTS;
  const other = want === "female" ? MALE_HINTS : FEMALE_HINTS;
  if (other.some((hint) => name.includes(hint))) return -1;
  if (wanted.some((hint) => name.includes(hint))) return 2;
  return 0;
}

/**
 * Picks a concrete voice for `profile` out of `available`, preferring voices
 * not already handed to another speaker in `taken` so the board doesn't sound
 * like one person doing every part.
 *
 * Priority is gender first, uniqueness second — and that order matters. The
 * roster is five women and three men, so on a machine offering only four
 * female voices someone has to double up. Ranking uniqueness first meant the
 * fifth woman got handed an unused *male* voice, which is far more jarring
 * than two women sharing a voice at different pitches. Every profile carries
 * a distinct pitch/rate pair precisely so sharing stays survivable.
 *
 * Falls back through: right gender and unused → right gender, reused →
 * unused → anything. The last branch matters on Linux, where the list is
 * often a single voice.
 */
export function pickVoice(
  available: SpeechSynthesisVoice[],
  profile: VoiceProfile,
  taken: ReadonlySet<string>,
): SpeechSynthesisVoice | null {
  if (available.length === 0) return null;

  // Prefer English voices — the transcript is English, and a non-English
  // voice reading it produces the wrong phonemes rather than an accent.
  const english = available.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const pool = english.length > 0 ? english : available;

  const byQuality = (a: SpeechSynthesisVoice, b: SpeechSynthesisVoice) => {
    // `localService` voices work offline and have no per-utterance network
    // latency, which matters when a turn should start speaking immediately.
    if (a.localService !== b.localService) return a.localService ? -1 : 1;
    return a.name.localeCompare(b.name);
  };

  // Anything not positively identified as the opposite gender is fair game;
  // most voice names carry no hint either way and reading them as neutral is
  // better than discarding them.
  const sameGender = pool.filter((voice) => scoreGender(voice.name, profile.gender) >= 0).sort((a, b) => {
    const delta = scoreGender(b.name, profile.gender) - scoreGender(a.name, profile.gender);
    return delta !== 0 ? delta : byQuality(a, b);
  });

  const unusedSameGender = sameGender.find((voice) => !taken.has(voice.voiceURI));
  if (unusedSameGender) return unusedSameGender;
  // Indexing is checked rather than length-guarded because the project runs
  // `noUncheckedIndexedAccess`, under which `sameGender[0]` is still optional.
  const reusableSameGender = sameGender[0];
  if (reusableSameGender) return reusableSameGender;

  const ranked = [...pool].sort(byQuality);
  return ranked.find((voice) => !taken.has(voice.voiceURI)) ?? ranked[0] ?? null;
}
