import {
  armOnset,
  isOnsetArmed,
  ONSET_HOLD_MS,
  ONSET_MAX_CMND,
  ONSET_PITCH_PROBABILITY,
  PITCH_PROBABILITY,
  pitchProbabilityThreshold,
} from "./onset";

describe("onset latch", () => {
  it("arms a pick window from an amplitude jump", () => {
    const armedUntil = armOnset(true, 0, 1000);
    expect(armedUntil).toBe(1000 + ONSET_HOLD_MS);
    expect(isOnsetArmed(1000 + 40, armedUntil)).toBe(true);
    expect(isOnsetArmed(1000 + ONSET_HOLD_MS + 1, armedUntil)).toBe(false);
  });

  it("keeps the previous window when this frame is not an onset", () => {
    expect(armOnset(false, 1800, 1700)).toBe(1800);
  });

  it("lowers the YIN threshold while a pick is locking in", () => {
    expect(pitchProbabilityThreshold(false)).toBe(PITCH_PROBABILITY);
    expect(pitchProbabilityThreshold(true)).toBe(ONSET_PITCH_PROBABILITY);
    expect(ONSET_PITCH_PROBABILITY).toBeLessThan(PITCH_PROBABILITY);
    expect(ONSET_MAX_CMND).toBeGreaterThan(0.35);
  });
});
