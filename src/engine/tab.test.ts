import { arpeggioSweep, fromBeats, legatoPhrase, scalePhrase, sweepWithHammer, techniqueFromFrets } from "./tab";

describe("scalePhrase", () => {
  it("walks neck positions with a default step, or a per-note duration", () => {
    const events = scalePhrase(
      4,
      [
        [6, 0],
        [6, 3],
        [5, 2, 1],
      ],
      0.5,
    );
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ beat: 4, string: 6, fret: 0, duration: 0.45 });
    expect(events[1]).toMatchObject({ beat: 4.5, string: 6, fret: 3 });
    expect(events[2]).toMatchObject({ beat: 5, string: 5, fret: 2, duration: 0.9 });
  });
});

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

describe("sweepWithHammer", () => {
  const em5: Array<[number, number]> = [
    [5, 7],
    [4, 9],
    [3, 9],
    [2, 8],
    [1, 7],
  ];

  it("picks up the shape, hammers the peak, pulls, then descends", () => {
    const events = sweepWithHammer(0, em5, 0.25, 12);
    expect(events).toHaveLength(11);
    expect(events[0]).toMatchObject({ beat: 0, string: 5, fret: 7 });
    expect(events[4]).toMatchObject({ beat: 1, string: 1, fret: 7 });
    expect(events[4].technique).toBeUndefined();
    expect(events[5]).toMatchObject({ beat: 1.25, string: 1, fret: 12, technique: "hammer" });
    expect(events[6]).toMatchObject({ beat: 1.5, string: 1, fret: 7, technique: "pull" });
    expect(events[7]).toMatchObject({ beat: 1.75, string: 2, fret: 8 });
    expect(events[10]).toMatchObject({ beat: 2.5, string: 5, fret: 7 });
    expect(events.filter((e) => e.technique === "hammer")).toHaveLength(1);
    expect(events.filter((e) => e.technique === "pull")).toHaveLength(1);
  });

  it("keeps cross-string motion adjacent", () => {
    const events = sweepWithHammer(4, em5, 0.2, 12);
    for (let i = 1; i < events.length; i++) {
      expect(Math.abs(events[i].string - events[i - 1].string)).toBeLessThanOrEqual(1);
    }
  });
});
