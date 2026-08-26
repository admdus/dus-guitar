import { arpeggioSweep, fromBeats, legatoPhrase, techniqueFromFrets } from "./tab";

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

describe("arpeggioSweep", () => {
  const em: Array<[number, number]> = [
    [4, 2],
    [3, 0],
    [2, 0],
    [1, 0],
  ];

  it("turns around so a 4-note shape fills 8 slots", () => {
    const events = arpeggioSweep(0, em, 0.25);
    expect(events).toHaveLength(8);
    expect(events[0]).toMatchObject({ beat: 0, string: 4, fret: 2 });
    expect(events[3]).toMatchObject({ beat: 0.75, string: 1, fret: 0 });
    expect(events[4]).toMatchObject({ beat: 1, string: 1, fret: 0 });
    expect(events[7]).toMatchObject({ beat: 1.75, string: 4, fret: 2 });
    expect(events.every((e) => e.technique === undefined)).toBe(true);
  });

  it("can run one direction only", () => {
    const events = arpeggioSweep(8, em, 0.5, false);
    expect(events).toHaveLength(4);
    expect(events.map((e) => e.beat)).toEqual([8, 8.5, 9, 9.5]);
  });

  it("produces playable notes", () => {
    const notes = fromBeats(96, arpeggioSweep(0, em, 0.25));
    expect(notes).toHaveLength(8);
    expect(notes[0].time).toBe(0);
    expect(notes[1].time).toBeCloseTo(60 / 96 / 4);
  });
});
