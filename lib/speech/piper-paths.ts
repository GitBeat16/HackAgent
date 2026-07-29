/**
 * Where Piper's binary, voices and audio cache live.
 *
 * Kept in its own module because both the Next server and the standalone
 * setup scripts need it, and the scripts run under `tsx` without Next's env
 * loading. Everything here is optional with a working default, so a fresh
 * clone needs no configuration — only `npm run piper:voices`.
 *
 * Paths resolve against `process.cwd()`, which is the project root for both
 * `next dev` and every `npm run` script.
 */

import path from "node:path";

/** Overridable so a deploy can mount the binary and models anywhere. */
function fromEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/**
 * The piper executable.
 *
 * Default assumes the release archive was extracted into `vendor/piper/`,
 * which is what the setup step in `docs/PIPER_VOICES.md` does. On Windows the
 * binary depends on the DLLs shipped beside it, so it must stay in its
 * extracted directory rather than being copied out on its own.
 */
export function piperBinary(): string {
  const override = fromEnv("PIPER_BIN");
  if (override) return override;
  const name = process.platform === "win32" ? "piper.exe" : "piper";
  return path.join(process.cwd(), "vendor", "piper", name);
}

/** Directory holding `<voice>.onnx` and `<voice>.onnx.json` pairs. */
export function piperVoicesDir(): string {
  return fromEnv("PIPER_VOICES_DIR") ?? path.join(process.cwd(), "vendor", "piper-voices");
}

/**
 * Where synthesised WAVs are cached.
 *
 * Defaults inside the project so a dev can inspect and delete it. On a
 * read-only or ephemeral filesystem — most serverless platforms — point
 * `PIPER_CACHE_DIR` at the writable temp dir, or expect every request to
 * miss and re-synthesise.
 */
export function piperCacheDir(): string {
  return fromEnv("PIPER_CACHE_DIR") ?? path.join(process.cwd(), ".cache", "piper-tts");
}

/** Absolute path to a voice model, given its key. */
export function modelPath(voiceKey: string): string {
  return path.join(piperVoicesDir(), `${voiceKey}.onnx`);
}

/** Piper requires this JSON config to sit beside the `.onnx`. */
export function modelConfigPath(voiceKey: string): string {
  return `${modelPath(voiceKey)}.json`;
}
