import type { Judge } from "../types";

export const JUDGE_WINDOWS = {
  perfect: 0.055,
  great: 0.11,
  good: 0.18,
} as const;

export const JUDGE_POINTS: Record<Judge, number> = {
  perfect: 300,
  great: 200,
  good: 100,
  miss: 0,
};

export function judgeTiming(noteTime: number, playTime: number): Judge {
  const delta = Math.abs(playTime - noteTime);
  if (delta <= JUDGE_WINDOWS.perfect) return "perfect";
  if (delta <= JUDGE_WINDOWS.great) return "great";
  if (delta <= JUDGE_WINDOWS.good) return "good";
  return "miss";
}

export function comboMultiplier(combo: number): number {
  return 1 + Math.floor(Math.max(0, combo) / 8) * 0.5;
}

export function pointsFor(judge: Judge, combo: number): number {
  return Math.round(JUDGE_POINTS[judge] * (judge === "miss" ? 1 : comboMultiplier(combo)));
}

export function hitAccuracy(counts: Record<Judge, number>): number {
  const total = counts.perfect + counts.great + counts.good + counts.miss;
  if (total === 0) return 0;
  const weighted = counts.perfect * 1 + counts.great * 0.85 + counts.good * 0.65;
  return (weighted / total) * 100;
}
