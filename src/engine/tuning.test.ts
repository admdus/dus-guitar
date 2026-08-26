import { getSong, SONGS } from "../data/songs";
import { noteMidi } from "./notes";
import {
  closestOpenString,
  DROP_D_TUNING,
  fretInTuning,
  getTuning,
  songForTuning,
  STANDARD_TUNING,
} from "./tuning";

describe("tunings", () => {
  it("keeps standard EADGBE and drops the sixth string to D", () => {
    expect(STANDARD_TUNING.openMidi[6]).toBe(40);
    expect(DROP_D_TUNING.openMidi[6]).toBe(38);
    expect(DROP_D_TUNING.openMidi[5]).toBe(45);
    expect(DROP_D_TUNING.stringNames[6]).toBe("D");
    expect(getTuning("drop-d").id).toBe("drop-d");
    expect(getTuning("mystery").id).toBe("standard");
  });

  it("maps Drop D open strings to D2 and E4", () => {
    expect(noteMidi(6, 0, DROP_D_TUNING)).toBe(38);
    expect(noteMidi(6, 2, DROP_D_TUNING)).toBe(40);
    expect(noteMidi(1, 0, DROP_D_TUNING)).toBe(64);
  });

  it("highlights the nearest open string within 50 cents", () => {
    expect(closestOpenString(38, DROP_D_TUNING)).toBe(6);
    expect(closestOpenString(50, DROP_D_TUNING)).toBe(4);
    expect(closestOpenString(40.1, STANDARD_TUNING)).toBe(6);
    expect(closestOpenString(42, STANDARD_TUNING)).toBeNull();
  });
});

describe("songForTuning", () => {
  it("shifts standard low-E notes up two frets in Drop D and keeps pitch", () => {
    const spark = getSong("spark")!;
    const drop = songForTuning(spark, DROP_D_TUNING);
    const first = spark.notes[0];
    expect(first.string).toBe(6);
    expect(first.fret).toBe(0);
    expect(drop.notes[0].fret).toBe(2);
    expect(noteMidi(drop.notes[0].string, drop.notes[0].fret, DROP_D_TUNING)).toBe(
      noteMidi(first.string, first.fret, STANDARD_TUNING),
    );
    expect(songForTuning(spark, STANDARD_TUNING)).toBe(spark);
  });

  it("turns Power Pulse E5 into a one-finger Drop D shape", () => {
    const song = songForTuning(getSong("power-pulse")!, DROP_D_TUNING);
    const group = song.notes[0].chordGroup;
    const chord = song.notes.filter((n) => n.chordGroup === group);
    expect(chord).toHaveLength(2);
    expect(chord.map((n) => n.string).sort()).toEqual([5, 6]);
    expect(new Set(chord.map((n) => n.fret))).toEqual(new Set([2]));
  });

  it("rewrites every library song without leaving the neck", () => {
    for (const song of SONGS) {
      const drop = songForTuning(song, DROP_D_TUNING);
      for (let i = 0; i < song.notes.length; i++) {
        const original = song.notes[i];
        const remapped = drop.notes[i];
        expect(remapped.fret).toBeGreaterThanOrEqual(0);
        expect(remapped.fret).toBeLessThanOrEqual(15);
        expect(noteMidi(remapped.string, remapped.fret, DROP_D_TUNING)).toBe(
          noteMidi(original.string, original.fret, STANDARD_TUNING),
        );
        expect(fretInTuning(original.string, original.fret, STANDARD_TUNING, DROP_D_TUNING)).toBe(remapped.fret);
      }
    }
  });
});
