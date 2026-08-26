import { SongEngine } from "./playback";
import { getSong } from "../data/songs";
import { noteMidi } from "./notes";
import { SONGS } from "../data/songs";
import { DROP_D_TUNING, songForTuning } from "./tuning";

describe("song library", () => {
  it("has unique ids and playable notes", () => {
    const ids = new Set(SONGS.map((s) => s.id));
    expect(ids.size).toBe(SONGS.length);
    for (const song of SONGS) {
      expect(song.notes.length).toBeGreaterThan(0);
      expect(song.duration).toBeGreaterThan(song.notes[song.notes.length - 1].time);
      for (const note of song.notes) {
        expect(note.string).toBeGreaterThanOrEqual(1);
        expect(note.string).toBeLessThanOrEqual(6);
        expect(note.fret).toBeGreaterThanOrEqual(0);
        expect(noteMidi(note.string, note.fret)).toBeGreaterThanOrEqual(40);
      }
    }
  });
});

describe("SongEngine", () => {
  const song = getSong("spark")!;
  const countInMs = (60 / song.bpm) * 4 * 1000;

  it("scores a perfect hit on the first note", () => {
    const engine = new SongEngine(song);
    engine.start(0);
    const midi = noteMidi(song.notes[0].string, song.notes[0].fret);
    const judge = engine.feedPitch(midi, countInMs, true);
    expect(judge).toBe("perfect");
    const snap = engine.tick(countInMs);
    expect(snap.counts.perfect).toBe(1);
    expect(snap.combo).toBe(1);
    expect(snap.score).toBeGreaterThan(0);
  });

  it("misses a note that is never played", () => {
    const engine = new SongEngine(song);
    engine.start(0);
    const later = countInMs + (song.notes[0].time + 0.4) * 1000;
    const snap = engine.tick(later);
    expect(snap.counts.miss).toBeGreaterThanOrEqual(1);
    expect(snap.notes[0].status).toBe("miss");
  });

  it("ignores the wrong pitch inside the window", () => {
    const engine = new SongEngine(song);
    engine.start(0);
    const judge = engine.feedPitch(64, countInMs, true);
    expect(judge).toBeNull();
    expect(engine.tick(countInMs).notes[0].status).toBe("pending");
  });

  it("accepts a virtual fret match and practice hits", () => {
    const engine = new SongEngine(song);
    engine.start(0);
    const first = song.notes[0];
    expect(engine.feedFret(first.string, first.fret, countInMs)).toBe("perfect");
    const secondAt = countInMs + song.notes[1].time * 1000;
    expect(engine.feedPractice(secondAt)).toBe("perfect");
    const snap = engine.tick(secondAt);
    expect(snap.counts.perfect).toBe(2);
    expect(snap.combo).toBe(2);
  });

  it("hits a whole chord group from one matching pitch", () => {
    const power = getSong("power-pulse")!;
    const engine = new SongEngine(power);
    const countIn = (60 / power.bpm) * 4 * 1000;
    engine.start(0);
    const midi = noteMidi(power.notes[0].string, power.notes[0].fret);
    engine.feedPitch(midi, countIn, true);
    const group = power.notes[0].chordGroup;
    const same = engine.tick(countIn).notes.filter((n) => n.chordGroup === group);
    expect(same.length).toBeGreaterThan(1);
    expect(same.every((n) => n.status === "perfect")).toBe(true);
  });

  it("loads the metalcore trainer as two-string power chords", () => {
    const venom = getSong("venom-drive")!;
    expect(venom.genre).toBe("Metal");
    expect(venom.bpm).toBe(120);
    expect(venom.notes.length).toBeGreaterThan(40);
    const firstGroup = venom.notes[0].chordGroup;
    const firstChord = venom.notes.filter((n) => n.chordGroup === firstGroup);
    expect(firstChord).toHaveLength(2);
    expect(firstChord.map((n) => n.string).sort()).toEqual([5, 6]);
    const engine = new SongEngine(venom);
    const countIn = (60 / venom.bpm) * 4 * 1000;
    engine.start(0);
    const midi = noteMidi(venom.notes[0].string, venom.notes[0].fret);
    engine.feedPitch(midi, countIn, true);
    expect(engine.tick(countIn).counts.perfect).toBe(1);
  });

  it("scores remapped Drop D tabs from the original concert pitch", () => {
    const spark = getSong("spark")!;
    const drop = songForTuning(spark, DROP_D_TUNING);
    expect(drop.notes[0].fret).toBe(2);
    const engine = new SongEngine(drop, { tuning: DROP_D_TUNING });
    const countIn = (60 / spark.bpm) * 4 * 1000;
    engine.start(0);
    const midi = noteMidi(spark.notes[0].string, spark.notes[0].fret);
    expect(engine.feedPitch(midi, countIn, true)).toBe("perfect");
    expect(engine.tick(countIn).notes[0].fret).toBe(2);
  });

  it("hits Drop D Venom Drive from the same E2 as standard", () => {
    const venom = songForTuning(getSong("venom-drive")!, DROP_D_TUNING);
    const first = venom.notes.find((n) => n.string === 6)!;
    expect(first.fret).toBe(2);
    const engine = new SongEngine(venom, { tuning: DROP_D_TUNING });
    const countIn = (60 / venom.bpm) * 4 * 1000;
    engine.start(0);
    expect(engine.feedPitch(noteMidi(6, 0), countIn, true)).toBe("perfect");
  });
});

describe("Venom metal trainers", () => {
  it("includes Venom Drive power-chord chugs", () => {
    const song = getSong("venom-drive")!;
    expect(song.genre).toBe("Metal");
    expect(song.notes.some((n) => n.chordGroup !== undefined)).toBe(true);
    expect(song.notes.length).toBeGreaterThan(40);
  });

  it("includes Venom Coil hammer-ons and pull-offs", () => {
    const song = getSong("venom-coil")!;
    expect(song.difficulty).toBe(4);
    const hammers = song.notes.filter((n) => n.technique === "hammer");
    const pulls = song.notes.filter((n) => n.technique === "pull");
    expect(hammers.length).toBeGreaterThan(8);
    expect(pulls.length).toBeGreaterThan(8);
    expect(hammers.every((n) => n.chordGroup === undefined)).toBe(true);
  });

  it("includes Venom Arc as picked metal arpeggios", () => {
    const song = getSong("venom-arc")!;
    expect(song.genre).toBe("Metal");
    expect(song.bpm).toBe(96);
    expect(song.difficulty).toBe(4);
    expect(song.notes.length).toBeGreaterThan(80);
    expect(song.notes.every((n) => n.chordGroup === undefined)).toBe(true);
    expect(song.notes.every((n) => n.technique === undefined)).toBe(true);
    const stringChanges = song.notes.filter((n, i) => i > 0 && n.string !== song.notes[i - 1].string).length;
    expect(stringChanges).toBeGreaterThan(60);
    const strings = new Set(song.notes.map((n) => n.string));
    expect(strings.size).toBeGreaterThanOrEqual(5);
  });
});

describe("legato scoring", () => {
  const song = getSong("venom-coil")!;
  const countInMs = (60 / song.bpm) * 4 * 1000;

  it("scores a hammer-on from a pitch change without a pick attack", () => {
    const hammer = song.notes.find((n) => n.technique === "hammer")!;
    const engine = new SongEngine(song);
    engine.start(0);
    const at = countInMs + hammer.time * 1000;
    engine.feedPitch(noteMidi(hammer.string, Math.max(0, hammer.fret - 2)), at - 30, false);
    expect(engine.feedPitch(noteMidi(hammer.string, hammer.fret), at, false)).toBe("perfect");
  });

  it("scores a pull-off from a pitch drop without a pick attack", () => {
    const pull = song.notes.find((n) => n.technique === "pull")!;
    const engine = new SongEngine(song);
    engine.start(0);
    const at = countInMs + pull.time * 1000;
    engine.feedPitch(noteMidi(pull.string, pull.fret + 2), at - 30, false);
    expect(engine.feedPitch(noteMidi(pull.string, pull.fret), at, false)).toBe("perfect");
  });

  it("does not score a picked note from a held pitch without onset", () => {
    const engine = new SongEngine(song);
    engine.start(0);
    const first = song.notes[0];
    expect(first.technique).toBeUndefined();
    const at = countInMs + first.time * 1000;
    expect(engine.feedPitch(noteMidi(first.string, first.fret), at, false)).toBeNull();
    expect(engine.tick(at).notes[0].status).toBe("pending");
  });
});
