import { SongEngine } from "./playback";
import { getSong } from "../data/songs";
import { noteMidi } from "./notes";
import { SONGS } from "../data/songs";

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
});
