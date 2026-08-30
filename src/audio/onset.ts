/** How long a pick stays "live" while pitch locks in (power chords, muted chugs). */
export const ONSET_HOLD_MS = 120;

/** YIN probability needed for a clean single note. */
export const PITCH_PROBABILITY = 0.7;

/**
 * Two-string hits are less periodic than a single string, so YIN confidence
 * drops. Accept a weaker lock in the short window after a pick.
 */
export const ONSET_PITCH_PROBABILITY = 0.3;

/** Relaxed CMND cap used while a pick is locking in a dyad. */
export const ONSET_MAX_CMND = 0.68;

export function armOnset(
  onset: boolean,
  armedUntilMs: number,
  nowMs: number,
  holdMs = ONSET_HOLD_MS,
): number {
  return onset ? nowMs + holdMs : armedUntilMs;
}

export function isOnsetArmed(nowMs: number, armedUntilMs: number): boolean {
  return nowMs <= armedUntilMs;
}

export function pitchProbabilityThreshold(recentOnset: boolean): number {
  return recentOnset ? ONSET_PITCH_PROBABILITY : PITCH_PROBABILITY;
}
