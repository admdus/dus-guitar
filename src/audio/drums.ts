import { getAudioContext } from "./synth";

export type DrumVoice = "kick" | "snare" | "hat" | "openHat";
export type DrumKitId = "off" | "kick" | "rock" | "pop" | "metal" | "shuffle";

export interface DrumHit {
  voice: DrumVoice;
  accent?: boolean;
}

export interface DrumKitOption {
  id: DrumKitId;
  label: string;
  hint: string;
}

const DRUM_PREFS_KEY = "dus-guitar.drums";
const STEPS_PER_BAR = 16;

/** One 4/4 bar of 16th notes. Empty slots are rest. */
type DrumPattern = DrumHit[][];

export const DRUM_KIT_OPTIONS: DrumKitOption[] = [
  { id: "off", label: "Off", hint: "No backing drums" },
  { id: "kick", label: "Kick", hint: "Bass drum on every beat" },
  { id: "rock", label: "Rock", hint: "Kick, snare backbeat, and 8th hats" },
  { id: "pop", label: "Pop", hint: "Four-on-the-floor with a snare backbeat" },
  { id: "metal", label: "Metal", hint: "Double-kick pulse and 16th hats" },
  { id: "shuffle", label: "Shuffle", hint: "Swung 8ths for a looser groove" },
];

const KIT_IDS = new Set<DrumKitId>(DRUM_KIT_OPTIONS.map((kit) => kit.id));

function step(...hits: DrumHit[]): DrumHit[] {
  return hits;
}

function kitPattern(id: Exclude<DrumKitId, "off">): DrumPattern {
  const kick: DrumHit = { voice: "kick" };
  const snare: DrumHit = { voice: "snare" };
  const hat: DrumHit = { voice: "hat" };
  const hatAccent: DrumHit = { voice: "hat", accent: true };
  const openHat: DrumHit = { voice: "openHat" };

  if (id === "kick") {
    return Array.from({ length: STEPS_PER_BAR }, (_, i) => (i % 4 === 0 ? step(kick) : step()));
  }

  if (id === "rock") {
    return [
      step(kick, hatAccent),
      step(),
      step(hat),
      step(),
      step(snare, hat),
      step(),
      step(hat),
      step(),
      step(kick, hatAccent),
      step(),
      step(hat),
      step(),
      step(snare, hat),
      step(),
      step(openHat),
      step(),
    ];
  }

  if (id === "pop") {
    return [
      step(kick, hatAccent),
      step(),
      step(hat),
      step(),
      step(kick, snare, hat),
      step(),
      step(hat),
      step(),
      step(kick, hatAccent),
      step(),
      step(hat),
      step(),
      step(kick, snare, hat),
      step(),
      step(openHat),
      step(),
    ];
  }

  if (id === "metal") {
    return [
      step(kick, hatAccent),
      step(hat),
      step(kick, hat),
      step(hat),
      step(snare, hat),
      step(hat),
      step(kick, hat),
      step(hat),
      step(kick, hatAccent),
      step(hat),
      step(kick, hat),
      step(hat),
      step(snare, hat),
      step(hat),
      step(kick, hat),
      step(hat),
    ];
  }

  // Shuffle: swung 8ths land on 16th steps 0 and 3 of each beat.
  return [
    step(kick, hatAccent),
    step(),
    step(),
    step(hat),
    step(snare, hatAccent),
    step(),
    step(),
    step(hat),
    step(kick, hatAccent),
    step(),
    step(),
    step(hat),
    step(snare, hatAccent),
    step(),
    step(),
    step(openHat),
  ];
}

const PATTERNS: Record<Exclude<DrumKitId, "off">, DrumPattern> = {
  kick: kitPattern("kick"),
  rock: kitPattern("rock"),
  pop: kitPattern("pop"),
  metal: kitPattern("metal"),
  shuffle: kitPattern("shuffle"),
};

export function isDrumKitId(value: string): value is DrumKitId {
  return KIT_IDS.has(value as DrumKitId);
}

export function hitsForStep(kit: DrumKitId, stepIndex: number): DrumHit[] {
  if (kit === "off") return [];
  const pattern = PATTERNS[kit];
  const index = ((stepIndex % STEPS_PER_BAR) + STEPS_PER_BAR) % STEPS_PER_BAR;
  return pattern[index] ?? [];
}

export function loadDrumKit(): DrumKitId {
  try {
    const raw = globalThis.localStorage?.getItem(DRUM_PREFS_KEY);
    if (raw && isDrumKitId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "off";
}

export function saveDrumKit(id: DrumKitId) {
  try {
    globalThis.localStorage?.setItem(DRUM_PREFS_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}

let noiseBuffer: AudioBuffer | null = null;

function noise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const length = Math.floor(ctx.sampleRate * 0.4);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

function playKick(ctx: AudioContext, t: number, gain: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(148, t);
  osc.frequency.exponentialRampToValueAtTime(44, t + 0.11);

  const body = ctx.createGain();
  body.gain.setValueAtTime(gain, t);
  body.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);

  const click = ctx.createOscillator();
  click.type = "square";
  click.frequency.setValueAtTime(72, t);
  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(gain * 0.22, t);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);

  osc.connect(body).connect(ctx.destination);
  click.connect(clickGain).connect(ctx.destination);
  osc.start(t);
  click.start(t);
  osc.stop(t + 0.36);
  click.stop(t + 0.03);
}

function playSnare(ctx: AudioContext, t: number, gain: number) {
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1800, t);
  filter.Q.value = 0.9;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(gain, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  source.connect(filter).connect(noiseGain).connect(ctx.destination);

  const body = ctx.createOscillator();
  body.type = "triangle";
  body.frequency.setValueAtTime(198, t);
  body.frequency.exponentialRampToValueAtTime(120, t + 0.08);
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(gain * 0.45, t);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  body.connect(bodyGain).connect(ctx.destination);

  source.start(t);
  body.start(t);
  source.stop(t + 0.2);
  body.stop(t + 0.14);
}

function playHat(ctx: AudioContext, t: number, gain: number, open: boolean) {
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(open ? 6200 : 7800, t);
  const hatGain = ctx.createGain();
  hatGain.gain.setValueAtTime(gain, t);
  hatGain.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.22 : 0.045));
  source.connect(filter).connect(hatGain).connect(ctx.destination);
  source.start(t);
  source.stop(t + (open ? 0.26 : 0.06));
}

export function playDrumHits(hits: readonly DrumHit[]) {
  if (hits.length === 0) return;
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  for (const hit of hits) {
    const accent = hit.accent ? 1.2 : 1;
    if (hit.voice === "kick") playKick(ctx, t, 0.26 * accent);
    else if (hit.voice === "snare") playSnare(ctx, t, 0.16 * accent);
    else if (hit.voice === "openHat") playHat(ctx, t, 0.055 * accent, true);
    else playHat(ctx, t, 0.045 * accent, false);
  }
}
