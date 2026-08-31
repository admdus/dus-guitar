import type { Finger, SongNote } from "../types";
import { STRING_COLORS } from "./notes";

export type { Finger };

/** Open string, then index, middle, ring, pinky. */
export const FINGERS: Finger[] = [0, 1, 2, 3, 4];

/**
 * One color per left-hand finger so a scrolling note tells you which
 * finger to use. Open strings stay silver — no finger.
 */
export const FINGER_COLORS: Record<Finger, string> = {
  0: "#e2e8f0",
  1: "#22c55e",
  2: "#ef4444",
  3: "#eab308",
  4: "#3b82f6",
};

export const FINGER_LABELS: Record<Finger, string> = {
  0: "Open",
  1: "Index",
  2: "Middle",
  3: "Ring",
  4: "Pinky",
};

/** A 5-fret window still counts as one box so 3NPS 3-5-7 stays together. */
const MAX_BOX_SPAN = 4;
/** Start a new box after a rest so a later riff can shift position. */
const PHRASE_GAP_SEC = 1.5;

export function isFinger(value: unknown): value is Finger {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4;
}

export function fingerColor(finger: Finger | undefined, fallbackString?: number): string {
  if (isFinger(finger)) return FINGER_COLORS[finger];
  if (fallbackString !== undefined) return STRING_COLORS[fallbackString];
  return FINGER_COLORS[0];
}

export function fingerForFret(fret: number, position: number): Finger {
  if (fret <= 0) return 0;
  const finger = fret - position + 1;
  if (finger <= 1) return 1;
  if (finger >= 4) return 4;
  return finger as Finger;
}

/**
 * Fill in left-hand fingers. Open strings are 0. Chords put the index on
 * the lowest fretted note (power-chord shapes). Single-note phrases use a
 * one-finger-per-fret box whose index sits on the lowest fret in that box.
 * Notes that already have a finger keep it unless `overwrite` is set.
 */
export function assignFingers(notes: SongNote[], overwrite = false): SongNote[] {
  const out = notes.map((note) => (overwrite ? { ...note, finger: undefined } : { ...note }));
  const byId = new Map(out.map((note) => [note.id, note]));
  const order = [...out].sort((a, b) => a.time - b.time || a.id - b.id);
  const groups = groupByTime(order);

  const melody: SongNote[] = [];
  for (const group of groups) {
    if (group.length >= 2) {
      applyBox(group, minFretted(group) ?? 1);
    } else {
      melody.push(group[0]);
    }
  }
  applyMelodyBoxes(melody);

  return out.map((note) => byId.get(note.id) ?? note);
}

function groupByTime(notes: SongNote[]): SongNote[][] {
  const groups: SongNote[][] = [];
  for (const note of notes) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(note.time - last[0].time) < 1e-6) {
      last.push(note);
    } else {
      groups.push([note]);
    }
  }
  return groups;
}

function applyMelodyBoxes(notes: SongNote[]) {
  let i = 0;
  while (i < notes.length) {
    const box = [notes[i]];
    let j = i + 1;
    while (j < notes.length) {
      const next = notes[j];
      if (next.time - notes[j - 1].time > PHRASE_GAP_SEC) break;
      if (frettedSpan([...box, next]) > MAX_BOX_SPAN) break;
      box.push(next);
      j += 1;
    }
    applyBox(box, minFretted(box) ?? 1);
    i = j;
  }
}

function applyBox(notes: SongNote[], position: number) {
  for (const note of notes) {
    if (note.finger !== undefined) continue;
    note.finger = fingerForFret(note.fret, position);
  }
}

function minFretted(notes: SongNote[]): number | null {
  let min = Infinity;
  for (const note of notes) {
    if (note.fret > 0 && note.fret < min) min = note.fret;
  }
  return min === Infinity ? null : min;
}

function frettedSpan(notes: SongNote[]): number {
  let min = Infinity;
  let max = -Infinity;
  for (const note of notes) {
    if (note.fret <= 0) continue;
    min = Math.min(min, note.fret);
    max = Math.max(max, note.fret);
  }
  if (min === Infinity) return 0;
  return max - min;
}
