/**
 * YIN pitch detection (de Cheveigné & Kawahara).
 * Tuned for guitar: roughly D2 (73 Hz, Drop D) through E6.
 */
export interface PitchResult {
  frequency: number;
  probability: number;
}

const THRESHOLD = 0.13;

export function detectPitchYin(
  samples: ArrayLike<number>,
  sampleRate: number,
  minHz = 60,
  maxHz = 1200,
  options: { maxCmnd?: number } = {},
): PitchResult | null {
  const n = samples.length;
  if (n < 256) return null;
  const maxCmnd = options.maxCmnd ?? 0.35;

  const tauMin = Math.max(2, Math.floor(sampleRate / maxHz));
  const tauMax = Math.min(Math.floor(n / 2) - 2, Math.floor(sampleRate / minHz));
  if (tauMax <= tauMin + 2) return null;

  const diff = new Float32Array(tauMax + 1);
  for (let tau = tauMin; tau <= tauMax; tau++) {
    let sum = 0;
    const limit = n - tau;
    for (let i = 0; i < limit; i++) {
      const d = samples[i] - samples[i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }

  const cmnd = new Float32Array(tauMax + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += diff[tau];
    cmnd[tau] = running > 0 ? (diff[tau] * tau) / running : 1;
  }

  let tau = tauMin;
  for (; tau + 1 <= tauMax; tau++) {
    if (cmnd[tau] < THRESHOLD && cmnd[tau] < cmnd[tau + 1]) {
      while (tau > tauMin && cmnd[tau - 1] < cmnd[tau]) tau -= 1;
      break;
    }
  }

  if (tau === tauMax || cmnd[tau] >= THRESHOLD) {
    let bestTau = tauMin;
    let bestVal = cmnd[tauMin];
    for (let t = tauMin + 1; t <= tauMax; t++) {
      if (cmnd[t] < bestVal) {
        bestVal = cmnd[t];
        bestTau = t;
      }
    }
    if (bestVal > maxCmnd) return null;
    tau = bestTau;
  }

  const betterTau = parabolicInterpolation(cmnd, tau);
  if (betterTau <= 0) return null;

  return {
    frequency: sampleRate / betterTau,
    probability: 1 - cmnd[tau],
  };
}

function parabolicInterpolation(cmnd: Float32Array, tau: number): number {
  if (tau <= 0 || tau >= cmnd.length - 1) return tau;
  const s0 = cmnd[tau - 1];
  const s1 = cmnd[tau];
  const s2 = cmnd[tau + 1];
  const denom = 2 * s1 - s2 - s0;
  if (denom === 0) return tau;
  return tau + (s2 - s0) / (2 * denom);
}

export function rmsAmplitude(samples: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    sum += v * v;
  }
  return Math.sqrt(sum / samples.length);
}

export function isOnset(currentRms: number, previousRms: number, noiseFloor = 0.008): boolean {
  if (currentRms < noiseFloor) return false;
  return currentRms > previousRms * 1.85 && currentRms - previousRms > 0.01;
}
