/**
 * Downloads every Piper voice model the persona mapping references.
 *
 * Run with `npm run piper:voices`. Idempotent — a model that is already
 * present with the right md5 is skipped, so re-running after editing
 * `piper-voices.config.ts` fetches only what changed.
 *
 * The manifest is `requiredModels()`, not a list in this file. Adding a voice
 * is therefore a one-file change: map a persona to it and re-run this.
 *
 * Models are ~60MB each and must not be committed — they live in
 * `vendor/piper-voices/`, which is gitignored. This script is how a new
 * machine or a deploy gets them.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { requiredModels, type PiperVoiceModel } from "@/lib/speech/piper-voices.config";
import { piperVoicesDir } from "@/lib/speech/piper-paths";

const BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main";

async function md5Of(file: string): Promise<string> {
  return createHash("md5").update(await readFile(file)).digest("hex");
}

/**
 * Downloads to a temp name and renames on success.
 *
 * A half-written 60MB file that keeps its final name is worse than no file:
 * the next run sees it, and Piper fails at synthesis time with an opaque
 * onnxruntime error instead of here with a checksum mismatch.
 */
async function download(url: string, target: string, expectedMd5: string, label: string) {
  if (existsSync(target)) {
    if ((await md5Of(target)) === expectedMd5) {
      console.log(`  [skip] ${label} — already present`);
      return;
    }
    console.log(`  [redo] ${label} — checksum mismatch, re-downloading`);
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status} from ${url}`);

  const bytes = Buffer.from(await response.arrayBuffer());
  const temp = `${target}.partial`;
  await writeFile(temp, bytes);

  const actual = createHash("md5").update(bytes).digest("hex");
  if (actual !== expectedMd5) {
    throw new Error(`${label}: checksum mismatch — expected ${expectedMd5}, got ${actual}`);
  }

  await rename(temp, target);
  console.log(`  [ok]   ${label} — ${(bytes.length / 1048576).toFixed(1)}MB`);
}

async function fetchModel(model: PiperVoiceModel, dir: string) {
  console.log(`\n${model.key}  (${model.licence}, ${model.accent})`);
  await download(
    `${BASE}/${model.repoPath}/${model.key}.onnx`,
    path.join(dir, `${model.key}.onnx`),
    model.md5,
    `${model.key}.onnx`,
  );
  await download(
    `${BASE}/${model.repoPath}/${model.key}.onnx.json`,
    path.join(dir, `${model.key}.onnx.json`),
    model.configMd5,
    `${model.key}.onnx.json`,
  );
}

async function main() {
  const dir = piperVoicesDir();
  await mkdir(dir, { recursive: true });

  const models = requiredModels();
  const totalMb = models.reduce((sum, model) => sum + model.approxMb, 0);
  console.log(`Fetching ${models.length} Piper voices (~${totalMb}MB) into ${dir}`);

  for (const model of models) {
    await fetchModel(model, dir);
  }

  const attributed = models.filter((model) => model.attributionRequired);
  console.log(`\nDone. ${models.length} voices ready.`);
  if (attributed.length) {
    console.log(
      `Attribution required for: ${attributed.map((m) => m.key).join(", ")} — see NOTICE.`,
    );
  }
}

main().catch((error) => {
  console.error(`\nFailed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
