import { midiToFreq } from "./notes";
import { transcribe, metaFromFilename, parseSongJson } from "./transcribe";

function sineNotes(
  notes: Array<{ midi: number; start: number; duration: number }>,
  sampleRate: number,
): Float32Array {
  const end = Math.max(...notes.map((note) => note.start + note.duration)) + 0.2;
  const samples = new Float32Array(Math.ceil(end * sampleRate));
  for (const note of notes) {
    const freq = midiToFreq(note.midi);
    const i0 = Math.floor(note.start * sampleRate);
    const n = Math.floor(note.duration * sampleRate);
    const fade = Math.min(Math.floor(0.012 * sampleRate), Math.floor(n / 4));
    for (let i = 0; i < n; i++) {
      let amp = 0.48;
      if (i < fade) amp *= i / fade;
      if (i > n - fade) amp *= (n - i) / fade;
      samples[i0 + i] += amp * Math.sin((2 * Math.PI * freq * i) / sampleRate);
    }
  }
  return samples;
}

describe("transcribe", () => {
  const sr = 22050;

  it("turns a slow open-string melody into guitar notes", async () => {
    // E2 A2 D3 G3 at 120 BPM, one beat each — the Spark-style check.
    const samples = sineNotes(
      [
        { midi: 40, start: 0.05, duration: 0.42 },
        { midi: 45, start: 0.55, duration: 0.42 },
        { midi: 50, start: 1.05, duration: 0.42 },
        { midi: 55, start: 1.55, duration: 0.42 },
      ],
      sr,
    );
    const { song, onsetCount } = await transcribe(samples, sr, {
      title: "Open Check",
      bpm: 120,
    });
    expect(song.imported).toBe(true);
    expect(song.bpm).toBe(120);
    expect(song.notes.length).toBeGreaterThanOrEqual(4);
    expect(onsetCount).toBeGreaterThan(0);
    const firstFour = song.notes.slice(0, 4);
    expect(firstFour.map((note) => note.string)).toEqual([6, 5, 4, 3]);
    expect(firstFour.every((note) => note.fret === 0)).toBe(true);
    expect(firstFour[1].time).toBeGreaterThan(firstFour[0].time);
  });

  it("stays on the low E string for a 0-2-3 walk", async () => {
    const samples = sineNotes(
      [
        { midi: 40, start: 0.05, duration: 0.4 },
        { midi: 42, start: 0.55, duration: 0.4 },
        { midi: 43, start: 1.05, duration: 0.4 },
        { midi: 40, start: 1.55, duration: 0.4 },
      ],
      sr,
    );
    const { song } = await transcribe(samples, sr, { bpm: 120, title: "E walk" });
    expect(song.notes.slice(0, 4).map((note) => [note.string, note.fret])).toEqual([
      [6, 0],
      [6, 2],
      [6, 3],
      [6, 0],
    ]);
  });

  it("estimates BPM near 120 from even quarter notes", async () => {
    const samples = sineNotes(
      Array.from({ length: 8 }, (_, i) => ({
        midi: i % 2 === 0 ? 40 : 45,
        start: 0.05 + i * 0.5,
        duration: 0.4,
      })),
      sr,
    );
    const { song } = await transcribe(samples, sr, { title: "Pulse" });
    expect(song.bpm).toBeGreaterThanOrEqual(110);
    expect(song.bpm).toBeLessThanOrEqual(130);
  });

  it("rejects silence", async () => {
    await expect(transcribe(new Float32Array(sr * 2), sr)).rejects.toThrow(/No playable guitar notes/);
  });
});

describe("import helpers", () => {
  it("reads artist and title from a filename", () => {
    expect(metaFromFilename("Adam Dus - Porch Riff.mp3")).toEqual({
      artist: "Adam Dus",
      title: "Porch Riff",
    });
    expect(metaFromFilename("open_roads.wav").title).toBe("Open Roads");
    expect(metaFromFilename("open-check.mp3").title).toBe("Open Check");
  });

  it("round-trips song JSON and marks it imported", () => {
    const song = parseSongJson({
      title: "JSON Riff",
      bpm: 100,
      notes: [
        { time: 0, duration: 0.4, string: 6, fret: 0 },
        { time: 0.5, duration: 0.4, string: 6, fret: 3 },
      ],
    });
    expect(song.imported).toBe(true);
    expect(song.notes).toHaveLength(2);
    expect(song.notes[1].fret).toBe(3);
    expect(song.id.startsWith("import-")).toBe(true);
    expect(parseSongJson(song).title).toBe("JSON Riff");
  });

  it("rejects empty JSON", () => {
    expect(() => parseSongJson({ title: "Nope", bpm: 90, notes: [] })).toThrow(/no notes/);
  });
});
