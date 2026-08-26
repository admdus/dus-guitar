import type { SongNote, StringIndex, Technique } from "../types";

export type BeatTuple = [
  beat: number,
  string: number,
  fret: number,
  durationBeats?: number,
  chordGroup?: number,
];

export interface TabEvent {
  beat: number;
  string: number;
  fret: number;
  duration?: number;
  chordGroup?: number;
  technique?: Technique;
}

export type BeatEvent = BeatTuple | TabEvent;

export function isLegato(technique?: Technique): boolean {
  return technique === "hammer" || technique === "pull";
}

export function techniqueFromFrets(fromFret: number, toFret: number): Technique | undefined {
  if (toFret > fromFret) return "hammer";
  if (toFret < fromFret) return "pull";
  return undefined;
}

export function asTabEvent(event: BeatEvent): TabEvent {
  if (Array.isArray(event)) {
    const [beat, string, fret, duration, chordGroup] = event;
    return { beat, string, fret, duration, chordGroup };
  }
  return event;
}

export function fromBeats(bpm: number, events: BeatEvent[]): SongNote[] {
  const beatDur = 60 / bpm;
  return events.map((raw, id) => {
    const event = asTabEvent(raw);
    const s = event.string as StringIndex;
    if (s < 1 || s > 6) {
      throw new Error(`Invalid string ${event.string}`);
    }
    if (event.fret < 0 || event.fret > 24) {
      throw new Error(`Invalid fret ${event.fret}`);
    }
    return {
      id,
      time: event.beat * beatDur,
      duration: (event.duration ?? 0.75) * beatDur,
      string: s,
      fret: event.fret,
      ...(event.chordGroup !== undefined ? { chordGroup: event.chordGroup } : {}),
      ...(event.technique ? { technique: event.technique } : {}),
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
    for (const event of pattern) {
      const next = asTabEvent(event);
      out.push({ ...next, beat: next.beat + offset });
    }
  }
  return out;
}

export function shiftBeats(events: BeatEvent[], beatOffset: number, groupOffset = 0): BeatEvent[] {
  return events.map((event) => {
    const next = asTabEvent(event);
    return {
      ...next,
      beat: next.beat + beatOffset,
      ...(next.chordGroup !== undefined ? { chordGroup: next.chordGroup + groupOffset } : {}),
    };
  });
}

/**
 * Build a same-string phrase. The first note is picked; later notes become
 * hammer-ons (higher fret) or pull-offs (lower fret) automatically.
 */
export function legatoPhrase(
  startBeat: number,
  string: number,
  sequence: Array<[fret: number, duration: number]>,
): TabEvent[] {
  const events: TabEvent[] = [];
  let beat = startBeat;
  let prevFret: number | null = null;
  for (const [fret, duration] of sequence) {
    const technique = prevFret === null ? undefined : techniqueFromFrets(prevFret, fret);
    events.push({
      beat,
      string,
      fret,
      duration,
      ...(technique ? { technique } : {}),
    });
    beat += duration;
    prevFret = fret;
  }
  return events;
}

export type ArpeggioShape = Array<[string: number, fret: number]>;

/**
 * Cross-string arpeggio. Every note is picked (not legato).
 * `shape` runs bass toward treble. When `turnaround` is true the shape
 * comes back down, doubling the peak so 4-note shapes fill 8 slots.
 */
export function arpeggioSweep(
  startBeat: number,
  shape: ArpeggioShape,
  step: number,
  turnaround = true,
): TabEvent[] {
  if (shape.length === 0) return [];
  const path = turnaround ? [...shape, ...[...shape].reverse()] : [...shape];
  return path.map(([string, fret], i) => ({
    beat: startBeat + i * step,
    string,
    fret,
    duration: step * 0.9,
  }));
}

/**
 * One-note-per-string metal sweep with a hammer-on at the peak.
 * Pick bass → treble, hammer a higher fret on the top string, pull off,
 * then descend. Cross-string notes are picked; only the peak is legato.
 */
export function sweepWithHammer(
  startBeat: number,
  shape: ArpeggioShape,
  step: number,
  peakFret: number,
): TabEvent[] {
  if (shape.length === 0) return [];
  const [topString, topFret] = shape[shape.length - 1];
  const up = arpeggioSweep(startBeat, shape, step, false);
  const hammerAt = startBeat + shape.length * step;
  const peak: TabEvent[] = [
    {
      beat: hammerAt,
      string: topString,
      fret: peakFret,
      duration: step * 0.9,
      technique: "hammer",
    },
    {
      beat: hammerAt + step,
      string: topString,
      fret: topFret,
      duration: step * 0.9,
      technique: "pull",
    },
  ];
  const downShape: ArpeggioShape = [...shape].reverse().slice(1);
  const down = arpeggioSweep(hammerAt + 2 * step, downShape, step, false);
  return [...up, ...peak, ...down];
}
