import type { Song, SongNote, StringIndex, TuningId } from "../types";
import { assignFingers } from "./fingers";

export interface Tuning {
  id: TuningId;
  name: string;
  notation: string;
  /** Open-string MIDI numbers. Index is guitar string 1 (high e) through 6 (low). */
  openMidi: readonly [0, number, number, number, number, number, number];
  stringNames: readonly ["", string, string, string, string, string, string];
  hint: string;
}

export const STANDARD_TUNING: Tuning = {
  id: "standard",
  name: "Standard",
  notation: "EADGBE",
  openMidi: [0, 64, 59, 55, 50, 45, 40],
  stringNames: ["", "e", "B", "G", "D", "A", "E"],
  hint: "Tune every open string to E A D G B e.",
};

export const DROP_D_TUNING: Tuning = {
  id: "drop-d",
  name: "Drop D",
  notation: "DADGBE",
  openMidi: [0, 64, 59, 55, 50, 45, 38],
  stringNames: ["", "e", "B", "G", "D", "A", "D"],
  hint: "Drop the low E a whole step to D. A through high e stay the same.",
};

export const TUNINGS: Tuning[] = [STANDARD_TUNING, DROP_D_TUNING];

export const TUNING_PREFS_KEY = "dus-guitar.tuning";

export function getTuning(id: TuningId | string | undefined): Tuning {
  return TUNINGS.find((tuning) => tuning.id === id) ?? STANDARD_TUNING;
}

export function nativeTuning(song: Pick<Song, "tuning">): Tuning {
  return getTuning(song.tuning);
}

/** Fret on `to` that produces the same pitch as `from` at `fret`. */
export function fretInTuning(
  string: StringIndex,
  fret: number,
  from: Tuning,
  to: Tuning,
): number {
  return from.openMidi[string] + fret - to.openMidi[string];
}

function remapNote(note: SongNote, from: Tuning, to: Tuning): SongNote {
  const fret = fretInTuning(note.string, note.fret, from, to);
  if (fret < 0 || fret > 24) {
    throw new Error(
      `Cannot retune string ${note.string} fret ${note.fret} from ${from.id} to ${to.id}`,
    );
  }
  if (fret === note.fret) return note;
  return { ...note, fret, finger: undefined };
}

/**
 * Rewrite a song so it sounds the same in another tuning.
 * Drop D moves low-string notes up 2 frets (open E → 2nd fret), which also
 * turns standard two-string power chords into one-finger shapes.
 */
export function songForTuning(song: Song, tuning: Tuning): Song {
  const from = nativeTuning(song);
  if (from.id === tuning.id) return song;
  return {
    ...song,
    notes: assignFingers(song.notes.map((note) => remapNote(note, from, tuning)), true),
  };
}

export function loadTuningId(): TuningId {
  try {
    const raw = globalThis.localStorage?.getItem(TUNING_PREFS_KEY);
    if (raw === "drop-d") return "drop-d";
    return "standard";
  } catch {
    return "standard";
  }
}

export function saveTuningId(id: TuningId) {
  try {
    globalThis.localStorage?.setItem(TUNING_PREFS_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}

export function closestOpenString(midi: number, tuning: Tuning): StringIndex | null {
  let best: StringIndex | null = null;
  let bestDelta = Infinity;
  for (let s = 1; s <= 6; s++) {
    const delta = Math.abs(midi - tuning.openMidi[s]);
    if (delta < bestDelta) {
      best = s as StringIndex;
      bestDelta = delta;
    }
  }
  return bestDelta <= 0.5 ? best : null;
}
