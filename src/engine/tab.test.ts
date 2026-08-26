import { fromBeats, legatoPhrase, techniqueFromFrets } from "./tab";

describe("techniqueFromFrets", () => {
  it("classifies hammer, pull, and same-fret", () => {
    expect(techniqueFromFrets(0, 2)).toBe("hammer");
    expect(techniqueFromFrets(3, 0)).toBe("pull");
    expect(techniqueFromFrets(2, 2)).toBeUndefined();
  });
});

describe("legatoPhrase", () => {
  it("picks the first note and marks hammers and pulls from fret direction", () => {
    const phrase = legatoPhrase(2, 6, [
      [0, 0.25],
      [2, 0.25],
      [0, 0.5],
    ]);
    expect(phrase[0]).toMatchObject({ beat: 2, fret: 0, duration: 0.25 });
    expect(phrase[0].technique).toBeUndefined();
    expect(phrase[1]).toMatchObject({ beat: 2.25, fret: 2, technique: "hammer" });
    expect(phrase[2]).toMatchObject({ beat: 2.5, fret: 0, technique: "pull" });
  });

  it("round-trips into timed song notes", () => {
    const notes = fromBeats(
      120,
      legatoPhrase(0, 6, [
        [0, 0.5],
        [3, 0.5],
      ]),
    );
    expect(notes[0].technique).toBeUndefined();
    expect(notes[1].technique).toBe("hammer");
    expect(notes[1].fret).toBe(3);
    expect(notes[1].time).toBeCloseTo(0.25);
  });
});
