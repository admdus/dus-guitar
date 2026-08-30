/** Preferred Web Audio output callback period. */
export const OUTPUT_LATENCY_HINT_SEC = 0.005;

/** Preferred getUserMedia capture latency. */
export const INPUT_LATENCY_HINT_SEC = 0.005;

/**
 * Chromium/Electron hardware callback size. 256 samples is ~5.3 ms at 48 kHz —
 * tight enough for guitar monitoring without the default 20–40 ms buffer.
 */
export const ELECTRON_AUDIO_BUFFER_SIZE = 256;

function safeSec(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/** Input + output delay in whole milliseconds. */
export function estimatedRoundTripMs(
  inputLatencySec: number,
  baseLatencySec: number,
  outputLatencySec = 0,
): number {
  return Math.round(
    (safeSec(inputLatencySec) + safeSec(baseLatencySec) + safeSec(outputLatencySec)) * 1000,
  );
}

function inputLatencyFromSettings(settings: unknown): number {
  if (!settings || typeof settings !== "object") return 0;
  const latency = (settings as { latency?: unknown }).latency;
  return typeof latency === "number" && Number.isFinite(latency) ? latency : 0;
}

export function readRoundTripMs(
  ctx: { baseLatency?: number; outputLatency?: number },
  trackSettings: unknown,
): number | null {
  const ms = estimatedRoundTripMs(
    inputLatencyFromSettings(trackSettings),
    ctx.baseLatency ?? 0,
    ctx.outputLatency ?? 0,
  );
  return ms > 0 ? ms : null;
}
