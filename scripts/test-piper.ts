/**
 * Tests the Piper voice mapping, cache and unavailable-path.
 *
 * Run with `npm run test:piper`. No network and no Groq calls. Synthesis
 * tests are skipped — not failed — when Piper is not installed, so this stays
 * runnable on a machine that has never run `npm run piper:voices`.
 *
 * The licence assertions are the ones that matter most. Piper's best-known
 * English voices (`lessac`, `amy`, `ryan`) are research-only or CC BY-NC, and
 * this app has a paid plan. A future re-cast onto one of those would be an
 * easy mistake to make and an expensive one to discover.
 */

import { existsSync, rmSync } from "node:fs";
import { executivePersonas } from "@/lib/ai/executives";
import {
  DEFAULT_PERSONA_VOICE,
  isKnownPersona,
  personaVoices,
  piperModels,
  requiredModels,
  voiceFor,
} from "@/lib/speech/piper-voices.config";
import {
  cachedFileFor,
  isPiperAvailable,
  piperUnavailableReason,
  synthesise,
} from "@/lib/speech/piper";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) console.log(`  [ok]   ${label}`);
  else {
    console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

const THE_EIGHT = [
  "Elena Vasquez",
  "Priya Nair",
  "Marcus Webb",
  "Aiko Tanaka",
  "Jonah Kessler",
  "Diane Okafor",
  "Nadia Petrov",
  "Théo Marchand",
];

console.log("\n1. Every board member has a voice");
{
  check("eight personas are mapped", personaVoices.length === 8, String(personaVoices.length));

  for (const name of THE_EIGHT) {
    check(`${name} is mapped`, isKnownPersona(name));
  }

  // Cross-file: the roster is the source of truth for who sits on the board.
  for (const persona of executivePersonas) {
    check(
      `roster id "${persona.id}" (${persona.name}) resolves`,
      isKnownPersona(persona.id) && voiceFor(persona.id).personaName === persona.name,
      voiceFor(persona.id).personaName,
    );
  }

  const models = personaVoices.map((v) => v.model);
  check("no two personas share a model", new Set(models).size === models.length,
    models.join(", "));
}

console.log("\n2. Licences are free for commercial use");
{
  // Substring guards rather than an allow-list: the point is to catch a
  // future edit that pastes in a voice without reading its MODEL_CARD.
  for (const model of Object.values(piperModels)) {
    const licence = model.licence.toLowerCase();
    check(
      `${model.key} is not non-commercial (${model.licence})`,
      !licence.includes("nc") && !licence.includes("non-commercial"),
    );
    check(
      `${model.key} is not research-only`,
      !licence.includes("research"),
    );
  }

  const attributed = Object.values(piperModels).filter((m) => m.attributionRequired);
  check("CC BY voices are flagged for attribution",
    attributed.every((m) => m.licence.toLowerCase().includes("by")),
    attributed.map((m) => m.key).join(", "));
  check("every model records a dataset", Object.values(piperModels).every((m) => m.dataset.length > 3));
}

console.log("\n3. Name resolution");
{
  check("display name resolves", voiceFor("Elena Vasquez").executiveId === "ceo");
  check("roster id resolves", voiceFor("ceo").personaName === "Elena Vasquez");
  check("case is ignored", voiceFor("mARCUS wEBB").executiveId === "cfo");
  check("surrounding space is ignored", voiceFor("  Nadia Petrov  ").executiveId === "research");

  // The accented name is the one most likely to arrive mangled from a client.
  check("accented name resolves", voiceFor("Théo Marchand").executiveId === "growth");
  check("unaccented spelling resolves", voiceFor("Theo Marchand").executiveId === "growth");
  check("uppercased accented name resolves", voiceFor("THÉO MARCHAND").executiveId === "growth");

  check("unknown speaker falls back", voiceFor("Some Founder").model === DEFAULT_PERSONA_VOICE.model);
  check("unknown speaker is reported as unknown", !isKnownPersona("Some Founder"));
  check("empty input falls back", voiceFor("").model === DEFAULT_PERSONA_VOICE.model);
  check("null input falls back", voiceFor(null).model === DEFAULT_PERSONA_VOICE.model);
}

console.log("\n4. Voice parameters are in Piper's accepted range");
{
  for (const voice of personaVoices) {
    check(`${voice.personaName}: lengthScale sane`,
      voice.lengthScale >= 0.5 && voice.lengthScale <= 2, String(voice.lengthScale));
    check(`${voice.personaName}: noiseScale sane`,
      voice.noiseScale >= 0 && voice.noiseScale <= 1.5, String(voice.noiseScale));
    check(`${voice.personaName}: model is in the manifest`,
      Boolean(piperModels[voice.model]), voice.model);
  }
  check("requiredModels covers every mapped model",
    requiredModels().length === new Set(personaVoices.map((v) => v.model)).size);
}

console.log("\n5. Missing-install path degrades with an actionable message");
{
  const reason = piperUnavailableReason("definitely-not-a-real-voice");
  if (!isPiperAvailable()) {
    // No binary: the reason should point at the binary, not the voice.
    check("reports the missing binary", reason !== null && /binary/i.test(reason.message),
      reason?.message);
  } else {
    check("reports the missing model", reason !== null && /model missing/i.test(reason.message),
      reason?.message);
  }
  check("failure carries a remedy", Boolean(reason?.remedy), reason?.remedy);
  check("remedy names a command or a doc",
    /npm run|docs\//.test(reason?.remedy ?? ""), reason?.remedy);
}

async function synthesisTests() {
  console.log("\n6. Synthesis and caching");

  if (!isPiperAvailable()) {
    console.log("  [skip] Piper is not installed — run `npm run piper:voices` to cover this.");
    console.log(`  [skip] reason: ${piperUnavailableReason()?.message}`);
    return;
  }

  const line = "The board will now come to order.";

  // A fresh key each run, so the cache assertions test the cache rather than
  // whatever a previous run left behind.
  const unique = `${line} Run ${Date.now()}.`;
  const cachePath = cachedFileFor(unique, "Elena Vasquez");
  rmSync(cachePath, { force: true });

  const first = await synthesise(unique, "Elena Vasquez");
  check("synthesis returns audio", first.audio.length > 1000, `${first.audio.length} bytes`);
  check("output is a RIFF/WAVE file",
    first.audio.subarray(0, 4).toString("ascii") === "RIFF" &&
      first.audio.subarray(8, 12).toString("ascii") === "WAVE");
  check("first call is a cache miss", first.cached === false);
  check("cache file was written", existsSync(cachePath));

  const second = await synthesise(unique, "Elena Vasquez");
  check("second call is a cache hit", second.cached === true);
  check("cached bytes are identical", second.audio.equals(first.audio));

  // Concurrent identical requests must not spawn two processes.
  const concurrentLine = `${line} Concurrent ${Date.now()}.`;
  rmSync(cachedFileFor(concurrentLine, "Marcus Webb"), { force: true });
  const [a, b] = await Promise.all([
    synthesise(concurrentLine, "Marcus Webb"),
    synthesise(concurrentLine, "Marcus Webb"),
  ]);
  check("concurrent identical calls agree", a.audio.equals(b.audio));
  check("one of the concurrent pair was deduped", a.cached !== b.cached,
    `${a.cached} / ${b.cached}`);

  // Every seat must actually produce sound with its assigned model.
  for (const voice of personaVoices) {
    const path = cachedFileFor(line, voice.personaName);
    rmSync(path, { force: true });
    const result = await synthesise(line, voice.personaName);
    check(
      `${voice.personaName} speaks via ${voice.model}`,
      result.audio.length > 1000 && result.voice.model === voice.model,
      `${result.audio.length} bytes`,
    );
  }

  // Different voices must not collide in the cache.
  const elena = await synthesise(line, "Elena Vasquez");
  const marcus = await synthesise(line, "Marcus Webb");
  check("same text in different voices yields different audio",
    !elena.audio.equals(marcus.audio));

  // A multi-line turn must not synthesise only its last sentence.
  const multiline = `Two sentences. ${Date.now()}\nAnd a second line that must also be spoken.`;
  rmSync(cachedFileFor(multiline, "Aiko Tanaka"), { force: true });
  const flat = await synthesise(multiline, "Aiko Tanaka");
  const oneLine = await synthesise(`Two sentences. ${Date.now() - 1}`, "Aiko Tanaka");
  check("a multi-line turn is spoken in full",
    flat.audio.length > oneLine.audio.length,
    `${flat.audio.length} vs ${oneLine.audio.length} bytes`);
}

synthesisTests()
  .catch((error) => {
    console.log(`  [FAIL] synthesis threw — ${error instanceof Error ? error.message : error}`);
    failures += 1;
  })
  .finally(() => {
    console.log(failures === 0 ? "\nALL PIPER TESTS PASSED" : `\n${failures} FAILED`);
    process.exitCode = failures === 0 ? 0 : 1;
  });
