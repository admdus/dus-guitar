import type { StringIndex } from "../types";
import { STANDARD_TUNING, type Tuning } from "./tuning";

export type { Tuning } from "./tuning";
export {
  STANDARD_TUNING,
  DROP_D_TUNING,
  TUNINGS,
  getTuning,
  songForTuning,
  loadTuningId,
  saveTuningId,
} from "./tuning";

export const STRING_NAMES = STANDARD_TUNING.stringNames;

/** Open-string MIDI numbers. Index is guitar string 1 (high e) through 6 (low E). */
export const OPEN_MIDI = STANDARD_TUNING.openMidi;

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export const STRING_COLORS = [
  "#000000",
  "#c084fc",
  "#38bdf8",
  "#4ade80",
  "#facc15",
  "#fb923c",
  "#f87171",
] as const;

export function noteMidi(string: StringIndex, fret: number, tuning: Tuning = STANDARD_TUNING): number {
  return tuning.openMidi[string] + fret;
}

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

export function midiToName(midi: number): string {
  const rounded = Math.round(midi);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${name}${octave}`;
}

export function centsOff(midi: number): number {
  return (midi - Math.round(midi)) * 100;
}

export function pitchMatches(expectedMidi: number, detectedMidi: number, centsTolerance = 50): boolean {
  const tolerance = centsTolerance / 100;
  const delta = detectedMidi - expectedMidi;
  return (
    Math.abs(delta) <= tolerance ||
    Math.abs(delta - 12) <= tolerance ||
    Math.abs(delta + 12) <= tolerance
  );
}

export function bestPositionForMidi(
  midi: number,
  tuning: Tuning = STANDARD_TUNING,
): { string: StringIndex; fret: number } | null {
  const target = Math.round(midi);
  let best: { string: StringIndex; fret: number } | null = null;
  for (let s = 1; s <= 6; s++) {
    const fret = target - tuning.openMidi[s];
    if (fret < 0 || fret > 15) continue;
    if (!best || fret < best.fret) {
      best = { string: s as StringIndex, fret };
    }
  }
  return best;
}

export function starsForAccuracy(accuracy: number): number {
  if (accuracy >= 95) return 5;
  if (accuracy >= 85) return 4;
  if (accuracy >= 70) return 3;
  if (accuracy >= 50) return 2;
  if (accuracy >= 30) return 1;
  return 0;
}
