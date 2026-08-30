import { estimatedRoundTripMs, INPUT_LATENCY_HINT_SEC, OUTPUT_LATENCY_HINT_SEC, readRoundTripMs } from "./latency";

describe("round-trip latency", () => {
  it("asks Chromium for a 5 ms capture and playback callback", () => {
    expect(INPUT_LATENCY_HINT_SEC).toBe(0.005);
    expect(OUTPUT_LATENCY_HINT_SEC).toBe(0.005);
  });

  it("adds input and output seconds", () => {
    expect(estimatedRoundTripMs(0.01, 0.005, 0.008)).toBe(23);
    expect(estimatedRoundTripMs(0, 0, 0)).toBe(0);
    expect(estimatedRoundTripMs(Number.NaN, -1, 0.02)).toBe(20);
  });

  it("returns null when the browser reports nothing", () => {
    expect(readRoundTripMs({}, {})).toBeNull();
    expect(readRoundTripMs({ baseLatency: 0.006, outputLatency: 0.01 }, { latency: 0.008 })).toBe(24);
  });
});
