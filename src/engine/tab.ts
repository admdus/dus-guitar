import type { SongNote, StringIndex } from "../types";

export type BeatEvent = [
  beat: number,
  string: number,
  fret: number,
  durationBeats?: number,
  chordGroup?: number,
];

export function fromBeats(bpm: number, events: BeatEvent[]): SongNote[] {
  const beatDur = 60 / bpm;
  return events.map(([beat, string, fret, durationBeats = 0.75, chordGroup], id) => {
    const s = string as StringIndex;
    if (s < 1 || s > 6) {
      throw new Error(`Invalid string ${string}`);
    }
    if (fret < 0 || fret > 24) {
      throw new Error(`Invalid fret ${fret}`);
    }
    return {
      id,
      time: beat * beatDur,
      duration: durationBeats * beatDur,
      string: s,
      fret,
      ...(chordGroup !== undefined ? { chordGroup } : {}),
    };
  });
}

export function songDuration(notes: SongNote[]): number {
  if (notes.length === 0) return 0;
  return Math.max(...notes.map((note) => note.time + Math.max(note.duration, 0.25))) + 0.4;
}

/** Repeat a one-bar pattern across `bars` bars. Pattern beats are 0..barBeats. */
export function loopBar(bars: number, barBeats: number, pattern: BeatEvent[]): BeatEvent[] {
  const out: BeatEvent[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const offset = bar * barBeats;
    for (const [beat, string, fret, duration, chord] of pattern) {
      out.push([beat + offset, string, fret, duration, chord]);
    }
  }
  return out;
}
