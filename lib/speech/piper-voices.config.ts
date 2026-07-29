/**
 * Persona → Piper voice mapping.
 *
 * This is the file to edit when a board member should sound different. It is
 * also the manifest `scripts/fetch-piper-voices.ts` downloads from, so adding
 * a voice here and re-running that script is the whole workflow — there is no
 * second list to keep in step.
 *
 * ## Why these eight models
 *
 * Piper ships 38 English voices. Most were disqualified on licence rather
 * than sound, because this app has a paid plan in `workspace_data` and must
 * therefore be treated as commercial:
 *
 *   - `lessac` (all qualities) — Blizzard 2013 research licence, "for
 *     Research Purposes only". The best-known Piper voice and unusable here.
 *   - `ryan`, `hfc_female`, `hfc_male`, `l2arctic`, `semaine` — CC BY-NC.
 *   - `alan`/`apope` and `amy` — distributed by Mycroft under "All Rights
 *     Reserved". `amy` is the common Piper default; it is not free.
 *   - `northern_english_male`, `southern_english_female` — CC BY-SA. Usable,
 *     but ShareAlike on a trained model is unsettled enough that it does not
 *     belong in a product without a deliberate decision. Listed in
 *     `docs/PIPER_VOICES.md` if you want the extra accents.
 *
 * Everything below is public domain, CC0, Apache-2.0 or CC BY 4.0. Only the
 * CC BY entries carry an obligation, and it is attribution — see NOTICE.
 *
 * ## What Piper can and cannot do
 *
 * Piper has no pitch parameter. Each model *is* one speaker, so timbre comes
 * from picking the model, not from shifting a knob. What is tunable:
 *
 *   - `lengthScale` — pace. Below 1 is faster, above 1 is slower. This
 *     carries over the per-persona pacing already tuned in `edge-voices.ts`,
 *     so a seat keeps its rhythm whichever engine speaks.
 *   - `noiseScale` / `noiseW` — how much the delivery varies between runs.
 *     Piper's defaults (0.667 / 0.8) are sane; these move slightly around
 *     them, flatter for the seats that should read as measured.
 *   - `sentenceSilence` — pause between sentences, in seconds.
 *
 * Accents are limited to what Piper actually has for English: en_US and
 * en_GB. There is no en_IN or en_AU model, and pointing a French model at
 * English text mispronounces every word rather than adding an accent — so
 * seats whose Edge voice used a regional accent get a neutral one here
 * instead of an imitation of one.
 */

/** A Piper voice as published in `rhasspy/piper-voices`. */
export interface PiperVoiceModel {
  /** Voice key, e.g. "en_US-joe-medium". Also the on-disk filename stem. */
  key: string;
  /** Path within the HuggingFace repo, used by the fetch script. */
  repoPath: string;
  /** md5 of the `.onnx`, from the upstream `voices.json`. */
  md5: string;
  /** md5 of the companion `.onnx.json` config Piper requires alongside it. */
  configMd5: string;
  approxMb: number;
  accent: "en_US" | "en_GB";
  /** SPDX-ish identifier, or a plain description where there is no SPDX id. */
  licence: string;
  /** Where the training data came from, so the licence can be re-checked. */
  dataset: string;
  /** True when the licence requires crediting the source. See NOTICE. */
  attributionRequired: boolean;
}

/**
 * The eight models, keyed by voice key.
 *
 * `md5` values come from upstream `voices.json` and are verified on download;
 * a truncated or tampered model fails loudly instead of producing noise.
 */
export const piperModels: Record<string, PiperVoiceModel> = {
  "en_US-kristin-medium": {
    key: "en_US-kristin-medium",
    repoPath: "en/en_US/kristin/medium",
    md5: "5fed42d2296baca042e2bf74785db725",
    configMd5: "70bc97d350c796c64ea5e4d08241afac",
    approxMb: 61,
    accent: "en_US",
    licence: "Public domain",
    dataset: "LibriVox — https://librivox.org",
    attributionRequired: false,
  },
  "en_US-ljspeech-medium": {
    key: "en_US-ljspeech-medium",
    repoPath: "en/en_US/ljspeech/medium",
    md5: "109d552e9dd78d92d1169a7edd6de38d",
    configMd5: "0668112b8b3ac5bb4b12c2b1a366776a",
    approxMb: 61,
    accent: "en_US",
    licence: "Public domain",
    dataset: "LJ Speech — https://keithito.com/LJ-Speech-Dataset/",
    attributionRequired: false,
  },
  "en_US-kathleen-low": {
    key: "en_US-kathleen-low",
    repoPath: "en/en_US/kathleen/low",
    md5: "dd1ab131724b1cff76fe388252bec47b",
    configMd5: "d970eebfe8e9f8515e405659da658f9b",
    approxMb: 60,
    accent: "en_US",
    licence: "CC0-1.0",
    dataset: "rhasspy/dataset-voice-kathleen",
    attributionRequired: false,
  },
  "en_GB-cori-medium": {
    key: "en_GB-cori-medium",
    repoPath: "en/en_GB/cori/medium",
    md5: "f143307611eccea9d976235d0895f57c",
    configMd5: "12b1dc45d8919f3475cf296d5f16a4c6",
    approxMb: 61,
    accent: "en_GB",
    licence: "Public domain",
    dataset: "LibriVox — https://librivox.org",
    attributionRequired: false,
  },
  "en_GB-alba-medium": {
    key: "en_GB-alba-medium",
    repoPath: "en/en_GB/alba/medium",
    md5: "c07f313752bb3aba8061041666251654",
    configMd5: "dbb6f2ede31082710665221417906e13",
    approxMb: 60,
    accent: "en_GB",
    licence: "CC-BY-4.0",
    dataset: "University of Edinburgh datashare 10283/3270 (Scottish English)",
    attributionRequired: true,
  },
  "en_US-norman-medium": {
    key: "en_US-norman-medium",
    repoPath: "en/en_US/norman/medium",
    md5: "829cea515dc724d694b83b71e8083f9f",
    configMd5: "975830d6f230f6eccf657d265de99eba",
    approxMb: 61,
    accent: "en_US",
    licence: "Public domain",
    dataset: "LibriVox — https://librivox.org",
    attributionRequired: false,
  },
  "en_US-joe-medium": {
    key: "en_US-joe-medium",
    repoPath: "en/en_US/joe/medium",
    md5: "74fd6a4dc39e0aa9dce145d7f5acd4f6",
    configMd5: "811036b9c1451545f9495fdc1baa0754",
    approxMb: 60,
    accent: "en_US",
    licence: "CC0-1.0",
    dataset: "OHF-Voice/voice-datasets",
    attributionRequired: false,
  },
  "en_US-bryce-medium": {
    key: "en_US-bryce-medium",
    repoPath: "en/en_US/bryce/medium",
    md5: "a8482817c3bdc3d20121a0e31bfa9809",
    configMd5: "a548d1d4ce8579f5a16926bdec77c7bf",
    approxMb: 61,
    accent: "en_US",
    licence: "Public domain",
    dataset: "Not stated upstream; MODEL_CARD declares public domain",
    attributionRequired: false,
  },
};

export interface PersonaVoice {
  /** Roster id in `lib/ai/executives.ts`. */
  executiveId: string;
  /** Display name, exactly as the persona is written. */
  personaName: string;
  model: string;
  /** Pace. <1 faster, >1 slower. Mirrors the Edge rate for this seat. */
  lengthScale: number;
  /** Delivery variability. Piper's default is 0.667. */
  noiseScale: number;
  /** Phoneme-duration variability. Piper's default is 0.8. */
  noiseW: number;
  /** Seconds of silence between sentences. */
  sentenceSilence: number;
  /** Why this seat got this voice — the thing to argue with when re-casting. */
  note: string;
}

/**
 * One entry per seated executive.
 *
 * Gender assignment follows the mapping already in `edge-voices.ts` rather
 * than being re-decided here, so the two engines cast the same board. Pacing
 * is carried across from the same file: Théo is the quickest seat on both,
 * Marcus the slowest.
 */
export const personaVoices: PersonaVoice[] = [
  {
    executiveId: "ceo",
    personaName: "Elena Vasquez",
    model: "en_US-kristin-medium",
    lengthScale: 1.0,
    noiseScale: 0.6,
    noiseW: 0.8,
    sentenceSilence: 0.25,
    note: "Chairs the session, so the clearest of the US voices at a neutral pace. Slightly flattened variability to read as composed rather than chatty.",
  },
  {
    executiveId: "cto",
    personaName: "Priya Nair",
    model: "en_US-kathleen-low",
    lengthScale: 0.94,
    noiseScale: 0.667,
    noiseW: 0.8,
    sentenceSilence: 0.2,
    note: "Quick, precise delivery matching the +6% Edge rate. The only 'low' quality model in the set — audibly less crisp; swap to a CC-BY multi-speaker voice if that bothers you.",
  },
  {
    executiveId: "cfo",
    personaName: "Marcus Webb",
    model: "en_US-norman-medium",
    lengthScale: 1.06,
    noiseScale: 0.55,
    noiseW: 0.7,
    sentenceSilence: 0.3,
    note: "Slowest seat and the flattest variability — the CFO's scepticism reads better measured than animated.",
  },
  {
    executiveId: "cmo",
    personaName: "Aiko Tanaka",
    model: "en_GB-cori-medium",
    lengthScale: 0.97,
    noiseScale: 0.7,
    noiseW: 0.85,
    sentenceSilence: 0.2,
    note: "British English, a shade quicker than neutral with more variability — marketing should sound the least flat in the room.",
  },
  {
    executiveId: "vc",
    personaName: "Jonah Kessler",
    model: "en_US-joe-medium",
    lengthScale: 0.98,
    noiseScale: 0.62,
    noiseW: 0.8,
    sentenceSilence: 0.25,
    note: "Second US male, distinct from Marcus by model rather than by parameter, so the two never blur on a long debate.",
  },
  {
    executiveId: "legal",
    personaName: "Diane Okafor",
    model: "en_GB-alba-medium",
    lengthScale: 1.04,
    noiseScale: 0.58,
    noiseW: 0.75,
    sentenceSilence: 0.3,
    note: "Scottish English — the most distinct voice in the set, which suits the seat that interrupts to raise a caveat. Deliberate, with the longest sentence gaps. CC BY: see NOTICE.",
  },
  {
    executiveId: "research",
    personaName: "Nadia Petrov",
    model: "en_US-ljspeech-medium",
    lengthScale: 1.02,
    noiseScale: 0.6,
    noiseW: 0.8,
    sentenceSilence: 0.25,
    note: "Even, unhurried narration for the seat that reads out retrieved evidence.",
  },
  {
    executiveId: "growth",
    personaName: "Théo Marchand",
    model: "en_US-bryce-medium",
    lengthScale: 0.91,
    noiseScale: 0.7,
    noiseW: 0.85,
    sentenceSilence: 0.15,
    note: "Fastest seat with the shortest gaps, carrying over the +10% Edge rate. Growth talks quickly.",
  },
];

/** Fallback for the founder's own turns and any unmapped speaker. */
export const DEFAULT_PERSONA_VOICE: PersonaVoice = {
  executiveId: "ceo",
  personaName: "Elena Vasquez",
  model: "en_US-kristin-medium",
  lengthScale: 1.0,
  noiseScale: 0.667,
  noiseW: 0.8,
  sentenceSilence: 0.2,
  note: "Default when a speaker is not on the roster.",
};

/**
 * Strips diacritics and case so "Théo Marchand", "theo marchand" and
 * "THEO MARCHAND" all resolve. The API takes a display name from the client,
 * and a name with an accent in it must not be the reason a seat goes silent.
 */
function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const byName = new Map(personaVoices.map((voice) => [normalise(voice.personaName), voice]));
const byId = new Map(personaVoices.map((voice) => [normalise(voice.executiveId), voice]));

/**
 * Resolves a persona name ("Elena Vasquez") or a roster id ("ceo") to a voice.
 *
 * Accepts both because the API is specified in terms of `personaName` while
 * every client in this repo already holds the roster id.
 */
export function voiceFor(nameOrId: string | undefined | null): PersonaVoice {
  if (!nameOrId) return DEFAULT_PERSONA_VOICE;
  const key = normalise(nameOrId);
  return byName.get(key) ?? byId.get(key) ?? DEFAULT_PERSONA_VOICE;
}

/** True when the given name or id is actually on the roster. */
export function isKnownPersona(nameOrId: string | undefined | null): boolean {
  if (!nameOrId) return false;
  const key = normalise(nameOrId);
  return byName.has(key) || byId.has(key);
}

/** Every model the mapping references — what the fetch script downloads. */
export function requiredModels(): PiperVoiceModel[] {
  const keys = new Set(personaVoices.map((voice) => voice.model));
  keys.add(DEFAULT_PERSONA_VOICE.model);
  return [...keys].map((key) => {
    const model = piperModels[key];
    if (!model) throw new Error(`personaVoices references unknown model "${key}".`);
    return model;
  });
}
