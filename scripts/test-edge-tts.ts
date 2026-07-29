/**
 * Tests for the Edge TTS protocol pieces.
 *
 * Run with `npm run test:tts`. This does NOT reach Microsoft — the WebSocket
 * handshake needs network and would make the suite flaky against an endpoint
 * that is not ours. What it does cover is everything that fails *silently*:
 * a malformed SSML document plays as noise, and a mis-parsed frame header
 * corrupts the MP3 stream. Both are miserable to debug from the browser.
 *
 * End-to-end verification is a manual step — see the note at the bottom.
 */

import { __internals } from "@/lib/speech/edge-tts";
import { edgeVoiceFor, edgeVoices } from "@/lib/speech/edge-voices";
import { executivePersonas } from "@/lib/ai/executives";

const { buildSsml, audioFromFrame, generateSecMsGec, escapeXml } = __internals;

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) console.log(`  [ok]   ${label}`);
  else {
    console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

console.log("\n1. Every seated executive has a voice");
{
  for (const persona of executivePersonas) {
    const voice = edgeVoiceFor(persona.id);
    check(`${persona.id} -> ${voice.name}`, Boolean(edgeVoices[persona.id]), "falls back to default");
  }
  const names = Object.values(edgeVoices).map((v) => v.name);
  check("no two executives share a voice", new Set(names).size === names.length,
    `${names.length - new Set(names).size} duplicate(s)`);
}

console.log("\n2. SSML is well-formed and escaped");
{
  const ssml = buildSsml("Churn is 20% and CAC is high", "cfo");
  check("declares the speak envelope", ssml.startsWith("<speak") && ssml.endsWith("</speak>"));
  check("names the right voice", ssml.includes("en-US-GuyNeural"), ssml.slice(0, 120));
  check("carries prosody", ssml.includes("<prosody") && ssml.includes("</prosody>"));

  // The killer case: an unescaped ampersand makes the whole document invalid
  // and the service returns nothing at all.
  const risky = buildSsml(`R&D spend is <5% & "unclear"`, "cto");
  check("escapes ampersands", !/&(?!amp;|lt;|gt;|quot;|apos;)/.test(risky), risky);
  check("escapes angle brackets in the payload",
    !risky.includes("<5%"), risky.slice(risky.indexOf("<prosody")));

  const tagCount = (s: string, tag: string) => s.split(`<${tag}`).length - 1;
  check("exactly one voice element", tagCount(risky, "voice") === 1);
  check("exactly one prosody element", tagCount(risky, "prosody") === 1);

  check("escapeXml is idempotent on clean text",
    escapeXml("plain text 20 percent") === "plain text 20 percent");
}

console.log("\n3. Sec-MS-GEC signature format");
{
  const token = generateSecMsGec();
  check("is 64 hex characters", /^[0-9A-F]{64}$/.test(token), token.slice(0, 20));
  check("is stable within a 5-minute window", token === generateSecMsGec());
}

console.log("\n4. Binary frame parsing");
{
  const frame = (header: string, payload: Buffer) => {
    const head = Buffer.from(header, "utf8");
    const len = Buffer.alloc(2);
    len.writeUInt16BE(head.length, 0);
    return Buffer.concat([len, head, payload]);
  };

  const mp3 = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x11, 0x22]);
  const audioFrame = frame("X-RequestId:abc\r\nPath:audio\r\n\r\n", mp3);
  const parsed = audioFromFrame(audioFrame);
  check("extracts the audio payload", parsed?.equals(mp3) === true,
    parsed ? [...parsed].join(",") : "null");

  const metaFrame = frame("Path:audio.metadata\r\n\r\n", Buffer.from("{}"));
  check("skips metadata frames", audioFromFrame(metaFrame) === null);

  check("survives a truncated frame", audioFromFrame(Buffer.from([0x00])) === null);
  check("survives a lying header length",
    audioFromFrame(Buffer.concat([Buffer.from([0xff, 0xff]), Buffer.from("short")])) === null);
  check("survives an empty buffer", audioFromFrame(Buffer.alloc(0)) === null);
}

console.log("\n5. Voice tuning is within SSML bounds");
{
  for (const [id, voice] of Object.entries(edgeVoices)) {
    check(`${id} rate is a signed percentage`, /^[+-]\d+%$/.test(voice.rate), voice.rate);
    check(`${id} pitch is a signed Hz value`, /^[+-]\d+Hz$/.test(voice.pitch), voice.pitch);
  }
}

console.log(
  failures === 0
    ? "\nALL EDGE TTS UNIT TESTS PASSED" +
        "\n\nNote: this suite never contacts Microsoft. Verify end-to-end by running" +
        "\nthe app and listening — if Edge is unreachable the board falls back to the" +
        "\nbrowser voice automatically, which is the designed behaviour, not a failure."
    : `\n${failures} FAILED`,
);
process.exitCode = failures === 0 ? 0 : 1;
