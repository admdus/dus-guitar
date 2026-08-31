import { getSong } from "../data/songs";
import { FINGER_COLORS, FINGERS, assignFingers, fingerForFret, isFinger } from "./fingers";
import { fromBeats } from "./tab";
import { DROP_D_TUNING, songForTuning } from "./tuning";
import type { SongNote } from "../types";

function note(partial: Partial<SongNote> & Pick<SongNote, "id" | "fret">): SongNote {
  return {
    time: partial.time ?? partial.id * 0.5,
    duration: 0.4,
    string: 6,
    ...partial,
  };
}

describe("finger colors", () => {
  it("gives every finger a distinct color", () => {
    const colors = FINGERS.map((finger) => FINGER_COLORS[finger]);
    expect(new Set(colors).size).toBe(5);
    expect(FINGER_COLORS[0]).toBe("#e2e8f0");
    expect(FINGER_COLORS[1]).toBe("#22c55e");
    expect(FINGER_COLORS[2]).toBe("#ef4444");
    expect(FINGER_COLORS[3]).toBe("#eab308");
    expect(FINGER_COLORS[4]).toBe("#3b82f6");
  });
});

describe("fingerForFret", () => {
  it("uses open, then one finger per fret in the box", () => {
    expect(fingerForFret(0, 1)).toBe(0);
    expect(fingerForFret(2, 2)).toBe(1);
    expect(fingerForFret(3, 2)).toBe(2);
    expect(fingerForFret(4, 2)).toBe(3);
    expect(fingerForFret(5, 2)).toBe(4);
    expect(fingerForFret(7, 3)).toBe(4);
  });
});

describe("assignFingers", () => {
  it("leaves open strings without a finger", () => {
    const notes = assignFingers([
      note({ id: 0, fret: 0, string: 6 }),
      note({ id: 1, fret: 0, string: 5 }),
    ]);
    expect(notes.map((n) => n.finger)).toEqual([0, 0]);
  });

  it("puts index on the lowest fretted note of a first-frets walk", () => {
    const notes = assignFingers([
      note({ id: 0, fret: 0, string: 4 }),
      note({ id: 1, fret: 2, string: 4 }),
      note({ id: 2, fret: 3, string: 4 }),
      note({ id: 3, fret: 2, string: 4 }),
    ]);
    expect(notes.map((n) => n.finger)).toEqual([0, 1, 2, 1]);
  });

  it("fingers a two-string power chord as index plus ring", () => {
    const e5 = assignFingers([
      note({ id: 0, time: 0, fret: 0, string: 6 }),
      note({ id: 1, time: 0, fret: 2, string: 5 }),
    ]);
    expect(e5.map((n) => n.finger)).toEqual([0, 1]);

    const g5 = assignFingers([
      note({ id: 0, time: 0, fret: 3, string: 6 }),
      note({ id: 1, time: 0, fret: 5, string: 5 }),
    ]);
    expect(g5.map((n) => n.finger)).toEqual([1, 3]);
  });

  it("uses index-ring-pinky for a three-note-per-string run", () => {
    const notes = assignFingers([
      note({ id: 0, fret: 3 }),
      note({ id: 1, fret: 5 }),
      note({ id: 2, fret: 7 }),
    ]);
    expect(notes.map((n) => n.finger)).toEqual([1, 3, 4]);
  });

  it("keeps a pentatonic box in one four-fret position", () => {
    const notes = assignFingers([
      note({ id: 0, fret: 2, string: 6 }),
      note({ id: 1, fret: 5, string: 6 }),
      note({ id: 2, fret: 2, string: 5 }),
      note({ id: 3, fret: 5, string: 5 }),
    ]);
    expect(notes.map((n) => n.finger)).toEqual([1, 4, 1, 4]);
  });

  it("keeps an explicit finger instead of overwriting it", () => {
    const notes = assignFingers([
      note({ id: 0, fret: 5, finger: 1 }),
      note({ id: 1, fret: 7 }),
    ]);
    expect(notes[0].finger).toBe(1);
    expect(notes[1].finger).toBe(3);
  });

  it("reassigns when overwrite is set", () => {
    const notes = assignFingers([note({ id: 0, fret: 5, finger: 4 })], true);
    expect(notes[0].finger).toBe(1);
  });
});

describe("song notes include fingers", () => {
  it("fills fingers when building from beats", () => {
    const notes = fromBeats(90, [
      [0, 4, 0],
      [1, 4, 2],
      [2, 4, 3],
    ]);
    expect(notes.map((n) => n.finger)).toEqual([0, 1, 2]);
  });

  it("assigns a finger on every library note", () => {
    const spark = getSong("spark")!;
    const firstFrets = getSong("first-frets")!;
    const power = getSong("power-pulse")!;
    expect(spark.notes.every((n) => n.finger === 0)).toBe(true);
    expect(firstFrets.notes.filter((n) => n.fret === 2).every((n) => n.finger === 1)).toBe(true);
    expect(firstFrets.notes.filter((n) => n.fret === 3).every((n) => n.finger === 2)).toBe(true);
    const e5 = power.notes.filter((n) => n.chordGroup === 1);
    expect(e5.map((n) => n.finger).sort()).toEqual([0, 1]);
    const g5 = power.notes.filter((n) => n.chordGroup === 4);
    expect(g5.map((n) => n.finger).sort()).toEqual([1, 3]);
  });

  it("re-fingers Drop D one-finger power chords", () => {
    const song = songForTuning(getSong("power-pulse")!, DROP_D_TUNING);
    const group = song.notes[0].chordGroup;
    const chord = song.notes.filter((n) => n.chordGroup === group);
    expect(new Set(chord.map((n) => n.fret))).toEqual(new Set([2]));
    expect(chord.every((n) => n.finger === 1)).toBe(true);
  });

  it("only stores 0–4 as fingers", () => {
    expect(isFinger(0)).toBe(true);
    expect(isFinger(4)).toBe(true);
    expect(isFinger(5)).toBe(false);
    expect(isFinger(-1)).toBe(false);
  });
});
