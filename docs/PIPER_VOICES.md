# Board voices (Piper TTS)

Self-hosted speech for the eight board members. No API key, no per-call cost,
no third party in the request path.

## Setup

Two steps, both idempotent.

**1. The binary.** Download the release for your platform and extract it into
`vendor/piper/`, so the executable lands at `vendor/piper/piper[.exe]`:

| Platform | Asset |
| --- | --- |
| Windows x64 | `piper_windows_amd64.zip` |
| Linux x64 | `piper_linux_x86_64.tar.gz` |
| Linux arm64 | `piper_linux_aarch64.tar.gz` |
| macOS Apple silicon | `piper_macos_aarch64.tar.gz` |
| macOS Intel | `piper_macos_x64.tar.gz` |

All from `https://github.com/rhasspy/piper/releases/tag/2023.11.14-2`.

Keep the whole extracted directory. On Windows `piper.exe` loads
`onnxruntime.dll` and `piper_phonemize.dll` from beside itself; moving the
executable out on its own breaks it. Set `PIPER_BIN` if you install it
elsewhere (a system package, a Docker layer).

**2. The voices.**

```bash
npm run piper:voices
```

~484MB across eight models, md5-verified against upstream, into
`vendor/piper-voices/` (gitignored). Re-running skips what is already valid.

Then check it:

```bash
npm run test:piper
```

and, to judge the casting by ear:

```bash
npm run piper:samples
```

which writes one audition clip per seat to `vendor/piper-samples/`.

## Which version of Piper

This project pins **`rhasspy/piper` 2023.11.14-2, MIT**. Piper's active
successor is `piper1-gpl`, which — as the name says — is GPL-3.0. If you
upgrade, that licence change is the thing to think about first, not the API.

## The casting

Set in `lib/speech/piper-voices.config.ts`. Edit there and re-run
`npm run piper:voices`; the mapping is the download manifest, so there is no
second list.

| Seat | Persona | Model | Accent | Pace | Licence |
| --- | --- | --- | --- | --- | --- |
| CEO | Elena Vasquez | `en_US-kristin-medium` | en_US | 1.00 | Public domain |
| CTO | Priya Nair | `en_US-kathleen-low` | en_US | 0.94 | CC0-1.0 |
| CFO | Marcus Webb | `en_US-norman-medium` | en_US | 1.06 | Public domain |
| CMO | Aiko Tanaka | `en_GB-cori-medium` | en_GB | 0.97 | Public domain |
| VC | Jonah Kessler | `en_US-joe-medium` | en_US | 0.98 | CC0-1.0 |
| Legal | Diane Okafor | `en_GB-alba-medium` | en_GB (Scottish) | 1.04 | CC BY 4.0 |
| Research | Nadia Petrov | `en_US-ljspeech-medium` | en_US | 1.02 | Public domain |
| Growth | Théo Marchand | `en_US-bryce-medium` | en_US | 0.91 | Public domain |

Pace is `lengthScale` — below 1 is faster. The values carry over the per-seat
rates already tuned in `edge-voices.ts`, so a seat keeps its rhythm whichever
engine speaks.

### Two things Piper will not do

**No pitch control.** Piper has no pitch parameter. Each model *is* one
speaker; timbre comes from picking a different model, not from shifting a
knob. `noiseScale` and `noiseW` adjust how much delivery varies, which is the
nearest available expressive control.

**No Indian, Australian or French-accented English.** Piper's English
inventory is `en_US` and `en_GB` only. Pointing a `fr_FR` model at English
text does not add a French accent — it mispronounces every word, because the
phonemiser is language-specific. Seats whose Edge voice used a regional accent
therefore get a neutral one here rather than an imitation of one.

## Licence audit

The app ships a paid plan, so it is treated as commercial and non-commercial
voices are excluded. Every voice below was checked against its upstream
`MODEL_CARD` on the date this was written; re-check if you re-cast.

### Shipped

| Model | Licence | Dataset |
| --- | --- | --- |
| `en_US-kristin-medium` | Public domain | LibriVox |
| `en_US-ljspeech-medium` | Public domain | LJ Speech |
| `en_US-norman-medium` | Public domain | LibriVox |
| `en_US-bryce-medium` | Public domain | not stated upstream |
| `en_GB-cori-medium` | Public domain | LibriVox |
| `en_US-kathleen-low` | CC0-1.0 | rhasspy/dataset-voice-kathleen |
| `en_US-joe-medium` | CC0-1.0 | OHF-Voice/voice-datasets |
| `en_GB-alba-medium` | CC BY 4.0 | Edinburgh datashare 10283/3270 |

Only `alba` carries an obligation, and it is attribution — see `NOTICE`.

### Rejected, and why

| Model | Why not |
| --- | --- |
| `en_US-lessac-*` | Blizzard 2013 **research licence only**. The best-known Piper voice and unusable in a product. |
| `en_US-ryan-*` | CC BY-NC-SA 4.0 |
| `en_US-hfc_female`, `en_US-hfc_male` | CC BY-NC-SA 4.0 |
| `en_US-l2arctic-medium` | CC BY-NC 4.0 |
| `en_GB-semaine-medium` | CC BY-NC-SA 4.0 |
| `en_GB-alan-*`, `en_US-amy-*` | Distributed by Mycroft as "All Rights Reserved". `amy` is a common Piper default; it is not free. |
| `en_GB-northern_english_male`, `en_GB-southern_english_female` | CC BY-SA 4.0. Usable, but ShareAlike applied to a trained model is unsettled — a deliberate decision, not a default. These are the two easiest ways to add more British accents if you want them. |

Also available and clean if you need more seats: `en_US-john-medium`,
`en_US-mike-medium` (CC0), `en_US-sam-medium` (Apache-2.0),
`en_US-reza_ibrahim-medium` (CC0), `en_GB-vctk-medium` and
`en_US-libritts_r-medium` (CC BY 4.0, multi-speaker — one file, many voices,
selected with `--speaker`).

## How it fits together

```
speech-provider.ts  →  1. POST /api/tts     (Piper, self-hosted)
                       2. POST /api/speech  (Edge, unofficial endpoint)
                       3. Web Speech API    (whatever the OS has)
```

Each stage falls through to the next on any failure, and a failed stage is
disabled for the rest of the session rather than retried per turn. A machine
without Piper installed gets Edge; a network that blocks Edge gets the browser
voice. The board is never silent and nothing surfaces as an error.

`GET /api/health` reports `piperAvailable`, which is the quickest way to
answer "why does this deploy sound different".

**Founder turns deliberately skip Piper.** The mapping covers the eight board
members; an unmapped speaker resolves to the default voice, which would make
the founder sound exactly like the chair. Add a `founder` entry to
`personaVoices` (and a ninth model) if you want them on Piper too.

## Endpoint

```
POST /api/tts
{ "personaName": "Elena Vasquez", "text": "..." }   → 200 audio/wav
```

`personaName` accepts the display name or the roster id (`ceo`). Diacritics
and case are folded, so `Théo Marchand`, `Theo Marchand` and `THEO MARCHAND`
all resolve. Authenticated, and capped at 1200 characters per request.

Response headers: `X-Piper-Voice` (model used), `X-Piper-Cache` (`hit`/`miss`),
and `X-Piper-Fallback-Voice: true` when the speaker was not recognised.

`503 PIPER_UNAVAILABLE` means not installed, and carries a `remedy` field
naming the fix. It is the expected answer on a machine that has not run the
setup, which is why the client treats it as "try the next engine" rather than
as an error.

## Caching

Synthesised WAVs are cached on disk under `.cache/piper-tts/`, keyed by
SHA-256 of persona name, text **and** the voice parameters — so re-casting a
persona invalidates only that persona's audio instead of serving the old voice
forever. Concurrent identical requests share one synthesis rather than
spawning two processes, and writes go to a temp name and are renamed, so a
reader can never pick up a half-written file.

On a read-only or ephemeral filesystem (most serverless platforms) point
`PIPER_CACHE_DIR` at the writable temp dir, or accept that every request
re-synthesises. Deleting the directory is always safe.
