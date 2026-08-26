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

  it("detects low E2 (82.41 Hz)", () => {
    const result = detectPitchYin(sine(82.41, sr, n), sr);
    expect(result).not.toBeNull();
    expect(result!.frequency).toBeGreaterThan(80);
    expect(result!.frequency).toBeLessThan(85);
  });

  it("detects high E4 (329.63 Hz)", () => {
    const result = detectPitchYin(sine(329.63, sr, n), sr);
    expect(result).not.toBeNull();
    expect(Math.abs(result!.frequency - 329.63)).toBeLessThan(3);
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
