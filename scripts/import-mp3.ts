#!/usr/bin/env node
/**
 * Decode an MP3/WAV/M4A file with ffmpeg and write a DUS Guitar song JSON.
 *
 *   npm run import-mp3 -- path/to/riff.mp3
 *   npm run import-mp3 -- path/to/riff.mp3 --bpm 120 --title "Porch Riff" -o porch.dus.json
 */
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { metaFromFilename, transcribe } from "../src/engine/transcribe";

const SAMPLE_RATE = 22050;

async function main() {
  const { input, output, title, artist, bpm } = parseArgs(process.argv.slice(2));
  if (!input) {
    console.error(`Usage: npm run import-mp3 -- <audio-file> [--title NAME] [--artist NAME] [--bpm N] [-o out.json]

Turns a recording into a DUS Guitar practice track (string + fret notes).
Best with isolated guitar or a simple melody — full-band mixes are often too dense.
Requires ffmpeg on PATH.`);
    process.exitCode = 1;
    return;
  }

  process.stderr.write(`Decoding ${path.basename(input)} with ffmpeg…\n`);
  const samples = await decodeWithFfmpeg(input);
  process.stderr.write(`Transcribing ${formatDuration(samples.length / SAMPLE_RATE)} of audio…\n`);
  const meta = metaFromFilename(input);
  const result = await transcribe(samples, SAMPLE_RATE, {
    title: title ?? meta.title,
    artist: artist ?? meta.artist,
    sourceName: path.basename(input),
    bpm,
    onProgress: (fraction) => {
      const pct = Math.round(fraction * 100);
      process.stderr.write(`\rListening for notes… ${pct}%   `);
    },
  });
  process.stderr.write("\n");

  const dest = output ?? defaultOutput(input);
  await writeFile(dest, `${JSON.stringify(result.song, null, 2)}\n`, "utf8");
  process.stderr.write(
    `Wrote ${dest}\n  ${result.song.title} · ${result.song.notes.length} notes · ${result.song.bpm} BPM · difficulty ${result.song.difficulty}/5\n  voiced ${(result.voicedRatio * 100).toFixed(0)}% of frames\n`,
  );
  if (result.voicedRatio < 0.12) {
    process.stderr.write(
      "  Warning: this mix looks busy. Isolated guitar or a hummed melody transcribes much more cleanly.\n",
    );
  }
  process.stderr.write("Open Songs in DUS Guitar and import this .json, or drop the original audio in the app.\n");
}

function parseArgs(argv: string[]) {
  let input: string | undefined;
  let output: string | undefined;
  let title: string | undefined;
  let artist: string | undefined;
  let bpm: number | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-o" || arg === "--output") {
      ({ value: output, index: i } = takeValue(argv, i));
    } else if (arg === "--title") {
      ({ value: title, index: i } = takeValue(argv, i));
    } else if (arg === "--artist") {
      ({ value: artist, index: i } = takeValue(argv, i));
    } else if (arg === "--bpm") {
      const taken = takeValue(argv, i);
      i = taken.index;
      bpm = Number(taken.value);
      if (!Number.isFinite(bpm)) throw new Error("Invalid --bpm");
    } else if (arg === "--help" || arg === "-h") {
      input = undefined;
      break;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown flag ${arg}`);
    } else if (!input) {
      input = arg;
    } else {
      throw new Error(`Unexpected argument ${arg}`);
    }
  }
  return { input, output, title, artist, bpm };
}

function takeValue(argv: string[], flagIndex: number): { value: string; index: number } {
  const parts: string[] = [];
  let i = flagIndex + 1;
  while (i < argv.length && !argv[i].startsWith("-")) {
    parts.push(argv[i]);
    i += 1;
  }
  if (parts.length === 0) throw new Error(`Missing value after ${argv[flagIndex]}`);
  return { value: parts.join(" "), index: i - 1 };
}

function defaultOutput(input: string): string {
  const parsed = path.parse(input);
  return path.join(parsed.dir, `${parsed.name}.dus.json`);
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
}

function decodeWithFfmpeg(file: string): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    const ff = spawn(
      "ffmpeg",
      ["-hide_banner", "-nostdin", "-i", file, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "f32le", "-v", "error", "pipe:1"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    ff.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    ff.stderr.on("data", (chunk: Buffer) => errChunks.push(chunk));
    ff.on("error", (error) => {
      reject(new Error(`Could not start ffmpeg. Install ffmpeg and keep it on PATH. (${error.message})`));
    });
    ff.on("close", (code) => {
      if (code !== 0) {
        const detail = Buffer.concat(errChunks).toString("utf8").trim();
        reject(new Error(detail || `ffmpeg exited with code ${code}`));
        return;
      }
      const raw = Buffer.concat(chunks);
      if (raw.byteLength < 4) {
        reject(new Error("ffmpeg produced no audio."));
        return;
      }
      const aligned = new Float32Array(raw.byteLength / 4);
      new Uint8Array(aligned.buffer).set(raw);
      resolve(aligned);
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
