import { comboMultiplier, hitAccuracy, judgeTiming, pointsFor } from "./score";
import { midiToFreq, midiToName, noteMidi, pitchMatches, preferPlayablePosition, starsForAccuracy } from "./notes";
import { DROP_D_TUNING } from "./tuning";

describe("timing windows", () => {
  it("judges perfect / great / good / miss", () => {
    expect(judgeTiming(1, 1.02)).toBe("perfect");
    expect(judgeTiming(1, 1.08)).toBe("great");
    expect(judgeTiming(1, 1.15)).toBe("good");
    expect(judgeTiming(1, 1.3)).toBe("miss");
  });
});

describe("scoring", () => {
  it("applies combo multipliers every 8 hits", () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(8)).toBe(1.5);
    expect(comboMultiplier(16)).toBe(2);
    expect(pointsFor("perfect", 8)).toBe(450);
    expect(pointsFor("miss", 20)).toBe(0);
  });

  it("weights accuracy and maps stars", () => {
    expect(hitAccuracy({ perfect: 10, great: 0, good: 0, miss: 0 })).toBe(100);
    expect(hitAccuracy({ perfect: 0, great: 0, good: 0, miss: 4 })).toBe(0);
    expect(starsForAccuracy(96)).toBe(5);
    expect(starsForAccuracy(86)).toBe(4);
    expect(starsForAccuracy(20)).toBe(0);
  });
});

describe("guitar notes", () => {
  it("maps standard tuning and names", () => {
    expect(noteMidi(6, 0)).toBe(40);
    expect(noteMidi(1, 0)).toBe(64);
    expect(midiToName(40)).toBe("E2");
    expect(midiToName(45)).toBe("A2");
    expect(Math.abs(midiToFreq(69) - 440)).toBeLessThan(0.001);
  });

  it("maps Drop D open D and the same E two frets up", () => {
    expect(noteMidi(6, 0, DROP_D_TUNING)).toBe(38);
    expect(noteMidi(6, 2, DROP_D_TUNING)).toBe(40);
    expect(midiToName(38)).toBe("D2");
  });

  it("matches pitch including octave errors", () => {
    expect(pitchMatches(40, 40.1)).toBe(true);
    expect(pitchMatches(40, 52.05)).toBe(true);
    expect(pitchMatches(40, 42)).toBe(false);
  });

  it("walks the low E string instead of jumping to a distant fingering", () => {
    const openE = preferPlayablePosition(40, null);
    expect(openE).toEqual({ string: 6, fret: 0 });
    expect(preferPlayablePosition(42, openE)).toEqual({ string: 6, fret: 2 });
    expect(preferPlayablePosition(43, { string: 6, fret: 2 })).toEqual({ string: 6, fret: 3 });
  });
});
