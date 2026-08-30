import { detectPitchYin, isOnset, rmsAmplitude } from "../audio/pitch";

function sine(freq: number, sampleRate: number, n: number): Float32Array {
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = 0.6 * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  return buf;
}

describe("YIN pitch detection", () => {
  const sr = 44100;
  const n = 4096;

  it("detects guitar A2 (110 Hz)", () => {
    const result = detectPitchYin(sine(110, sr, n), sr);
    expect(result).not.toBeNull();
    expect(result!.frequency).toBeGreaterThan(108);
    expect(result!.frequency).toBeLessThan(112);
    expect(result!.probability).toBeGreaterThan(0.8);
  });

  it("detects Drop D low D2 (73.42 Hz)", () => {
    const result = detectPitchYin(sine(73.42, sr, n), sr);
    expect(result).not.toBeNull();
    expect(result!.frequency).toBeGreaterThan(71);
    expect(result!.frequency).toBeLessThan(76);
  });

  it("still locks low D2 on a 2048-sample live window", () => {
    const result = detectPitchYin(sine(73.42, sr, 2048), sr);
    expect(result).not.toBeNull();
    expect(result!.frequency).toBeGreaterThan(71);
    expect(result!.frequency).toBeLessThan(76);
  });

  it("detects high E4 (329.63 Hz)", () => {
    const result = detectPitchYin(sine(329.63, sr, n), sr);
    expect(result).not.toBeNull();
    expect(Math.abs(result!.frequency - 329.63)).toBeLessThan(3);
  });

  it("detects a root-heavy E5 dyad near E2", () => {
    const e2 = 82.41;
    const b2 = 123.47;
    const buf = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      buf[i] =
        0.7 * Math.sin((2 * Math.PI * e2 * i) / sr) + 0.28 * Math.sin((2 * Math.PI * b2 * i) / sr);
    }
    const result = detectPitchYin(buf, sr);
    expect(result).not.toBeNull();
    expect(result!.frequency).toBeGreaterThan(76);
    expect(result!.frequency).toBeLessThan(90);
  });

  it("locks an equal E5 dyad after a pick using the loose CMND cap", () => {
    const e2 = 82.41;
    const b2 = 123.47;
    const buf = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = (2 * Math.PI * i) / sr;
      buf[i] =
        0.5 * (Math.sin(t * e2) + 0.45 * Math.sin(t * e2 * 2) + 0.22 * Math.sin(t * e2 * 3)) +
        0.5 * (Math.sin(t * b2) + 0.45 * Math.sin(t * b2 * 2) + 0.22 * Math.sin(t * b2 * 3));
    }
    expect(detectPitchYin(buf, sr)).toBeNull();
    const result = detectPitchYin(buf, sr, 60, 1200, { maxCmnd: 0.68 });
    expect(result).not.toBeNull();
    const midi = 69 + 12 * Math.log2(result!.frequency / 440);
    // Equal-mix fifths often report the fifth (B) or its octave, not the root.
    const nearFifth = Math.abs(midi - 47) <= 0.6 || Math.abs(midi - 35) <= 0.6;
    const nearRoot = Math.abs(midi - 40) <= 0.6 || Math.abs(midi - 28) <= 0.6;
    expect(nearFifth || nearRoot).toBe(true);
    expect(result!.probability).toBeGreaterThan(0.3);
  });

  it("returns null on silence", () => {
    expect(detectPitchYin(new Float32Array(n), sr)).toBeNull();
  });
});

describe("onset and amplitude", () => {
  it("computes RMS of a constant signal", () => {
    const buf = new Float32Array(100).fill(0.5);
    expect(rmsAmplitude(buf)).toBeCloseTo(0.5, 5);
  });

  it("flags a sudden amplitude jump as an onset", () => {
    expect(isOnset(0.05, 0.01)).toBe(true);
    expect(isOnset(0.011, 0.01)).toBe(false);
    expect(isOnset(0.002, 0.0001)).toBe(false);
  });
});
