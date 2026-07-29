/**
 * Microsoft Edge neural voices, mapped to the board.
 *
 * These are the voices Edge's Read Aloud uses. They are free and far better
 * than the OS voices the Web Speech API exposes — but they come from an
 * endpoint Microsoft does not document, so this is a best-effort upgrade
 * layered over a guaranteed fallback, never a hard dependency. See
 * `app/api/speech/route.ts` for the risk note.
 *
 * Unlike `voices.ts`, these names are stable: the same voice id works on
 * every machine, because synthesis happens on Microsoft's servers rather
 * than against whatever the local OS happens to have installed. That is the
 * main reason to prefer this path — the board sounds identical on your
 * laptop and on a judge's.
 *
 * Keep this file free of server-only imports; the client reads it to decide
 * which voice to request.
 */

export interface EdgeVoice {
  /** Microsoft voice id, e.g. "en-US-AriaNeural". */
  name: string;
  /** SSML prosody rate, e.g. "+8%". Tuned per persona. */
  rate: string;
  /** SSML prosody pitch, e.g. "-4Hz". */
  pitch: string;
}

/**
 * Keyed by executive id.
 *
 * Voices are chosen for character, not just gender: Guy is measured and low
 * (the conservative CFO), Jenny is warm and quick (growth), Aria is crisp
 * and authoritative (the chair). Regional accents are deliberate where the
 * persona's name suggests one — Neerja for Priya Nair, Prabhat for a second
 * Indian-English voice — because a board that all sounds American undercuts
 * the roster we wrote.
 */
export const edgeVoices: Record<string, EdgeVoice> = {
  ceo:      { name: "en-US-AriaNeural",    rate: "+0%",  pitch: "+0Hz" },
  cto:      { name: "en-IN-NeerjaNeural",  rate: "+6%",  pitch: "+2Hz" },
  cfo:      { name: "en-US-GuyNeural",     rate: "-6%",  pitch: "-4Hz" },
  cmo:      { name: "en-GB-SoniaNeural",   rate: "+3%",  pitch: "+3Hz" },
  vc:       { name: "en-US-ChristopherNeural", rate: "+2%", pitch: "-2Hz" },
  legal:    { name: "en-GB-LibbyNeural",   rate: "-4%",  pitch: "+0Hz" },
  research: { name: "en-US-MichelleNeural", rate: "-2%", pitch: "+1Hz" },
  growth:   { name: "en-AU-WilliamNeural", rate: "+10%", pitch: "+1Hz" },
};

export const DEFAULT_EDGE_VOICE: EdgeVoice = {
  name: "en-US-AriaNeural",
  rate: "+0%",
  pitch: "+0Hz",
};

export function edgeVoiceFor(executiveId: string): EdgeVoice {
  return edgeVoices[executiveId] ?? DEFAULT_EDGE_VOICE;
}
