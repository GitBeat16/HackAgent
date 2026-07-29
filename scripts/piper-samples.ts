/**
 * Renders one audition line per persona so the casting can be judged by ear.
 *
 * Run with `npm run piper:samples`. Writes `vendor/piper-samples/NN-name.wav`
 * — numbered so a file manager sorts them in roster order.
 *
 * Each clip opens by naming the seat, then reads an identical second
 * sentence. The shared sentence is the useful part: played back to back it
 * isolates timbre and pace from the words, which is what you actually need
 * when deciding whether two seats are distinguishable.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { personaVoices, piperModels } from "@/lib/speech/piper-voices.config";
import { getPersona } from "@/lib/ai/executives";
import { isPiperAvailable, piperUnavailableReason, synthesise } from "@/lib/speech/piper";

/** Identical across seats, so the comparison is of voices and not of scripts. */
const SHARED_LINE =
  "Before we get excited about the market, I want to see the retention numbers for the last two quarters.";

const OUT_DIR = path.join(process.cwd(), "vendor", "piper-samples");

async function main() {
  if (!isPiperAvailable()) {
    const reason = piperUnavailableReason();
    console.error(`Piper is not available: ${reason?.message}`);
    console.error(reason?.remedy);
    process.exitCode = 1;
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Writing ${personaVoices.length} samples to ${OUT_DIR}\n`);

  for (const [index, voice] of personaVoices.entries()) {
    let role = "";
    try {
      role = getPersona(voice.executiveId).role;
    } catch {
      // A persona removed from the roster but left in the mapping should not
      // stop the audition of the other seven.
      role = "Executive";
    }

    const line = `This is ${voice.personaName}, ${role}. ${SHARED_LINE}`;
    const { audio, voice: used } = await synthesise(line, voice.personaName);

    // Fold the accent before stripping, so "Théo" becomes "theo" and not "th-o".
    const slug = voice.personaName
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z]+/g, "-")
      .replace(/^-|-$/g, "");
    const file = path.join(OUT_DIR, `${String(index + 1).padStart(2, "0")}-${slug}.wav`);
    await writeFile(file, audio);

    // Rough duration from the WAV header: bytes of PCM ÷ byte rate.
    const byteRate = audio.readUInt32LE(28) || 1;
    const seconds = ((audio.length - 44) / byteRate).toFixed(1);
    const accent = piperModels[used.model]?.accent ?? "";
    console.log(
      `  ${path.basename(file).padEnd(24)} ${used.model.padEnd(24)} ${seconds}s  ${accent}`.trimEnd(),
    );
  }

  console.log(`\nDone. Play them in roster order to compare.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
