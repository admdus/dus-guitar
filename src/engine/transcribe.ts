import { detectPitchYin, isOnset, rmsAmplitude } from "../audio/pitch";
import type { Difficulty, Song, SongCover, SongNote, StringIndex, Technique } from "../types";
import { assignFingers, isFinger } from "./fingers";
import { freqToMidi, preferPlayablePosition } from "./notes";
import { fromBeats, songDuration, techniqueFromFrets, type TabEvent } from "./tab";
import { STANDARD_TUNING } from "./tuning";

export interface TranscribeOptions {
  title?: string;
  artist?: string;
  sourceName?: string;
  bpm?: number;
  hopSize?: number;
  frameSize?: number;
  minNoteSec?: number;
  maxDurationSec?: number;
  onProgress?: (fraction: number) => void;
}

export interface TranscribeResult {
  song: Song;
  voicedRatio: number;
  onsetCount: number;
}

interface RawNote {
  start: number;
  end: number;
  midiSamples: number[];
  peakRms: number;
  hadOnset: boolean;
}

const COVERS: SongCover[] = [
  { from: "#0ea5e9", to: "#818cf8", motif: "waves" },
  { from: "#f43f5e", to: "#f97316", motif: "bolts" },
  { from: "#7f1d1d", to: "#111827", motif: "slash" },
  { from: "#38bdf8", to: "#818cf8", motif: "rings" },
  { from: "#6366f1", to: "#22d3ee", motif: "grid" },
  { from: "#b45309", to: "#65a30d", motif: "flame" },
];

const NOISE_FLOOR = 0.008;
const YIELD_EVERY = 96;

export async function transcribe(
  samples: Float32Array,
  sampleRate: number,
  options: TranscribeOptions = {},
): Promise<TranscribeResult> {
  if (sampleRate < 8000 || samples.length < sampleRate * 0.2) {
    throw new Error("Audio is too short or at an unsupported sample rate.");
  }

  const trimmed = capDuration(samples, sampleRate, options.maxDurationSec ?? 480);
  const down = downsampleForPitch(trimmed, sampleRate);
  const frameSize = options.frameSize ?? 2048;
  const hopSize = options.hopSize ?? 512;
  const minNoteSec = options.minNoteSec ?? 0.09;
  const hopSec = hopSize / down.sampleRate;

  const { notes: rawNotes, onsetTimes, voicedRatio } = await collectNotes(
    down.samples,
    down.sampleRate,
    frameSize,
    hopSize,
    hopSec,
    options.onProgress,
  );

  const notes = mergeAndFilter(rawNotes, minNoteSec);
  if (notes.length === 0) {
    throw new Error(
      "No playable guitar notes found. Isolated guitar, a hummed melody, or a simple riff works best — full-band mixes usually hide the pitch.",
    );
  }

  const bpm = clampBpm(options.bpm ?? estimateBpm(onsetTimes, notes));
  const events = toTabEvents(notes, bpm);
  if (events.length === 0) {
    throw new Error("Notes were detected but none landed on a playable guitar position.");
  }

  const timed = fromBeats(bpm, events);
  const title = options.title?.trim() || "Imported track";
  const artist = options.artist?.trim() || "Imported";
  const song: Song = {
    id: importedSongId(title),
    title,
    artist,
    difficulty: estimateDifficulty(timed, bpm),
    bpm,
    genre: "Imported",
    category: "exercise",
    description: descriptionFor(options.sourceName, timed.length, bpm),
    duration: songDuration(timed),
    cover: coverFor(title),
    notes: timed,
    imported: true,
    sourceName: options.sourceName,
    tuning: "standard",
  };

  options.onProgress?.(1);
  return { song, voicedRatio, onsetCount: onsetTimes.length };
}

export function metaFromFilename(filename: string): { title: string; artist: string } {
  const base = filename.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "").trim();
  const parts = base.split(/\s+-\s+/);
  if (parts.length >= 2) {
    return {
      artist: prettyWords(parts[0]),
      title: prettyWords(parts.slice(1).join(" - ")),
    };
  }
  return { artist: "Imported", title: prettyWords(base) || "Imported track" };
}

export function parseSongJson(raw: unknown): Song {
  if (!raw || typeof raw !== "object") throw new Error("Not a DUS Guitar song file.");
  const data = raw as Record<string, unknown>;
  if (typeof data.title !== "string" || !data.title.trim()) throw new Error("Song JSON is missing a title.");
  if (typeof data.bpm !== "number" || data.bpm < 40 || data.bpm > 240) {
    throw new Error("Song JSON has an invalid BPM.");
  }
  if (!Array.isArray(data.notes) || data.notes.length === 0) {
    throw new Error("Song JSON has no notes.");
  }
  const notes = data.notes.map((item, id) => {
    if (!item || typeof item !== "object") throw new Error(`Note ${id} is invalid.`);
    const note = item as Record<string, unknown>;
    const string = Number(note.string) as StringIndex;
    const fret = Number(note.fret);
    const time = Number(note.time);
    const duration = Number(note.duration);
    if (string < 1 || string > 6) throw new Error(`Note ${id} has an invalid string.`);
    if (!Number.isFinite(fret) || fret < 0 || fret > 24) throw new Error(`Note ${id} has an invalid fret.`);
    if (!Number.isFinite(time) || time < 0) throw new Error(`Note ${id} has an invalid time.`);
    if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Note ${id} has an invalid duration.`);
    const technique: Technique | undefined =
      note.technique === "hammer" || note.technique === "pull" ? note.technique : undefined;
    const chordGroup = typeof note.chordGroup === "number" ? note.chordGroup : undefined;
    const parsed: SongNote = {
      id,
      time,
      duration,
      string,
      fret,
      ...(chordGroup !== undefined ? { chordGroup } : {}),
      ...(technique ? { technique } : {}),
      ...(isFinger(note.finger) ? { finger: note.finger } : {}),
    };
    return parsed;
  });
  const title = data.title.trim();
  const cover =
    data.cover && typeof data.cover === "object"
      ? (data.cover as SongCover)
      : coverFor(title);
  return {
    id: typeof data.id === "string" && data.id.startsWith("import-") ? data.id : importedSongId(title),
    title,
    artist: typeof data.artist === "string" && data.artist.trim() ? data.artist.trim() : "Imported",
    difficulty: isDifficulty(data.difficulty) ? data.difficulty : estimateDifficulty(notes, data.bpm),
    bpm: Math.round(data.bpm),
    genre: typeof data.genre === "string" ? data.genre : "Imported",
    category: "exercise",
    description:
      typeof data.description === "string" && data.description.trim()
        ? data.description
        : descriptionFor(typeof data.sourceName === "string" ? data.sourceName : undefined, notes.length, data.bpm),
    duration: typeof data.duration === "number" && data.duration > 0 ? data.duration : songDuration(notes),
    cover,
    notes: assignFingers(notes),
    imported: true,
    sourceName: typeof data.sourceName === "string" ? data.sourceName : undefined,
    tuning: data.tuning === "drop-d" ? "drop-d" : "standard",
  };
}

export function downsampleForPitch(
  samples: Float32Array,
  sampleRate: number,
  targetRate = 22050,
): { samples: Float32Array; sampleRate: number } {
  if (sampleRate <= targetRate + 50) return { samples, sampleRate };
  const step = sampleRate / targetRate;
  const out = new Float32Array(Math.floor(samples.length / step));
  for (let i = 0; i < out.length; i++) {
    const src = i * step;
    const a = Math.min(Math.floor(src), samples.length - 1);
    const b = Math.min(a + 1, samples.length - 1);
    const t = src - a;
    out[i] = samples[a] * (1 - t) + samples[b] * t;
  }
  return { samples: out, sampleRate: targetRate };
}

function capDuration(samples: Float32Array, sampleRate: number, maxSec: number): Float32Array {
  const max = Math.floor(maxSec * sampleRate);
  return samples.length > max ? samples.subarray(0, max) : samples;
}

async function collectNotes(
  samples: Float32Array,
  sampleRate: number,
  frameSize: number,
  hopSize: number,
  hopSec: number,
  onProgress?: (fraction: number) => void,
): Promise<{ notes: RawNote[]; onsetTimes: number[]; voicedRatio: number }> {
  const notes: RawNote[] = [];
  const onsetTimes: number[] = [];
  let current: RawNote | null = null;
  let prevRms = 0;
  let voiced = 0;
  let examined = 0;
  let hop = 0;

  for (let offset = 0; offset + frameSize < samples.length; offset += hopSize) {
    const time = offset / sampleRate;
    const frame = samples.subarray(offset, offset + frameSize);
    const rms = rmsAmplitude(frame);
    examined += 1;

    if (onProgress && hop % YIELD_EVERY === 0) {
      onProgress(Math.min(0.92, (offset / samples.length) * 0.92));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    hop += 1;

    if (rms < NOISE_FLOOR) {
      if (current && time - current.end > hopSec * 2) {
        notes.push(current);
        current = null;
      }
      prevRms = rms;
      continue;
    }

    const pitch = detectPitchYin(frame, sampleRate);
    if (!pitch || pitch.probability < 0.72) {
      if (current && time - current.end > hopSec * 2) {
        notes.push(current);
        current = null;
      }
      prevRms = rms;
      continue;
    }

    voiced += 1;
    const midi = freqToMidi(pitch.frequency);
    const onset = isOnset(rms, prevRms, NOISE_FLOOR);
    if (onset) onsetTimes.push(time);

    if (!current) {
      current = { start: time, end: time + hopSec, midiSamples: [midi], peakRms: rms, hadOnset: onset };
    } else if (Math.abs(midi - median(current.midiSamples)) >= 0.7) {
      notes.push(current);
      current = {
        start: time,
        end: time + hopSec,
        midiSamples: [midi],
        peakRms: rms,
        hadOnset: onset,
      };
    } else {
      current.end = time + hopSec;
      current.midiSamples.push(midi);
      current.peakRms = Math.max(current.peakRms, rms);
      current.hadOnset = current.hadOnset || onset;
    }
    prevRms = rms;
  }
  if (current) notes.push(current);

  return {
    notes,
    onsetTimes,
    voicedRatio: examined === 0 ? 0 : voiced / examined,
  };
}

function mergeAndFilter(notes: RawNote[], minNoteSec: number): RawNote[] {
  const kept: RawNote[] = [];
  for (const note of notes) {
    if (note.end - note.start < minNoteSec) continue;
    const prev = kept[kept.length - 1];
    const midi = Math.round(median(note.midiSamples));
    if (prev && Math.round(median(prev.midiSamples)) === midi && note.start - prev.end < 0.1) {
      prev.end = note.end;
      prev.midiSamples.push(...note.midiSamples);
      prev.peakRms = Math.max(prev.peakRms, note.peakRms);
      prev.hadOnset = prev.hadOnset || note.hadOnset;
      continue;
    }
    kept.push({ ...note, midiSamples: [...note.midiSamples] });
  }
  if (kept.length === 0) return kept;
  const start = kept[0].start;
  return kept.map((note) => ({
    ...note,
    start: Math.max(0, note.start - start),
    end: Math.max(0.05, note.end - start),
  }));
}

function toTabEvents(notes: RawNote[], bpm: number): TabEvent[] {
  const beatDur = 60 / bpm;
  const grid = 0.25;
  const events: TabEvent[] = [];
  let prevPos: { string: StringIndex; fret: number } | null = null;
  let prevBeat = -grid;

  for (const note of notes) {
    const midi = Math.round(median(note.midiSamples));
    const pos = preferPlayablePosition(midi, prevPos, STANDARD_TUNING);
    if (!pos) continue;
    let beat = Math.round(note.start / beatDur / grid) * grid;
    if (beat < prevBeat + grid) beat = prevBeat + grid;
    const durationBeats = Math.max(grid, Math.round(((note.end - note.start) / beatDur) / grid) * grid);
    let technique: Technique | undefined;
    if (prevPos && pos.string === prevPos.string && !note.hadOnset) {
      technique = techniqueFromFrets(prevPos.fret, pos.fret);
    }
    events.push({
      beat,
      string: pos.string,
      fret: pos.fret,
      duration: durationBeats,
      ...(technique ? { technique } : {}),
    });
    prevPos = pos;
    prevBeat = beat;
  }
  return events;
}

function estimateBpm(onsetTimes: number[], notes: RawNote[]): number {
  const iois: number[] = [];
  for (let i = 1; i < onsetTimes.length; i++) {
    const dt = onsetTimes[i] - onsetTimes[i - 1];
    if (dt >= 0.18 && dt <= 1.4) iois.push(dt);
  }
  if (iois.length >= 3) {
    const folded = iois.map((dt) => foldBpm(60 / dt));
    const bins = new Map<number, number>();
    for (const bpm of folded) {
      const key = Math.round(bpm);
      bins.set(key, (bins.get(key) ?? 0) + 1);
    }
    let best = 100;
    let bestScore = 0;
    for (const [bpm, count] of bins) {
      const score = count + (bins.get(bpm - 1) ?? 0) * 0.45 + (bins.get(bpm + 1) ?? 0) * 0.45;
      if (score > bestScore) {
        bestScore = score;
        best = bpm;
      }
    }
    return best;
  }
  if (notes.length >= 4) {
    const spans = notes.slice(1).map((note, i) => note.start - notes[i].start).filter((dt) => dt >= 0.2 && dt <= 1.4);
    if (spans.length) return foldBpm(60 / median(spans));
  }
  return 100;
}

function estimateDifficulty(notes: Song["notes"], bpm: number): Difficulty {
  if (notes.length === 0) return 1;
  const duration = Math.max(songDuration(notes), 0.5);
  const nps = notes.length / duration;
  const maxFret = Math.max(...notes.map((note) => note.fret));
  let score = 1;
  if (nps > 1.3 || maxFret > 3 || bpm >= 110) score = 2;
  if (nps > 2.2 || maxFret > 5 || bpm >= 130) score = 3;
  if (nps > 3.4 || maxFret > 8) score = 4;
  if (nps > 5 || maxFret > 12) score = 5;
  return score as Difficulty;
}

function descriptionFor(sourceName: string | undefined, noteCount: number, bpm: number): string {
  const from = sourceName ? `Imported from ${sourceName}. ` : "Imported audio. ";
  return `${from}${noteCount} notes at ${bpm} BPM. Isolated guitar and simple melodies transcribe most cleanly.`;
}

function coverFor(title: string): SongCover {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  return COVERS[hash % COVERS.length];
}

function importedSongId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `import-${slug || "track"}-${Date.now().toString(36)}`;
}

function prettyWords(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function foldBpm(bpm: number): number {
  let tempo = bpm;
  while (tempo < 70) tempo *= 2;
  while (tempo > 168) tempo /= 2;
  return tempo;
}

function clampBpm(bpm: number): number {
  return Math.max(60, Math.min(180, Math.round(bpm)));
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}
