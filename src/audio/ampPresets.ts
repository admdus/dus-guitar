export type AmpPresetId = "clean" | "chorus" | "crunch" | "blues" | "lead" | "metal" | "fuzz";
export type DriveCurve = "soft" | "hard" | "fuzz";

export interface AmpTone {
  id: AmpPresetId;
  name: string;
  tag: string;
  description: string;
  preGain: number;
  highpass: number;
  compress: boolean;
  compressThreshold: number;
  compressRatio: number;
  drive: number;
  curve: DriveCurve;
  postGain: number;
  bass: number;
  mid: number;
  midFreq: number;
  treble: number;
  presence: number;
  presenceFreq: number;
  cabLowpass: number;
  cabHighpass: number;
  chorus: number;
  reverb: number;
  output: number;
}

export interface AmpPrefs {
  presetId: AmpPresetId;
  volume: number;
  enabled: boolean;
}

export const AMP_PREFS_KEY = "dus-guitar.amp";

export const AMP_TONES: AmpTone[] = [
  {
    id: "clean",
    name: "Clean Studio",
    tag: "sparkle",
    description: "Bright DI clean with light compression and a small room — good for hearing every note.",
    preGain: 1.15,
    highpass: 78,
    compress: true,
    compressThreshold: -22,
    compressRatio: 2.8,
    drive: 0.7,
    curve: "soft",
    postGain: 0.92,
    bass: 1.5,
    mid: 1,
    midFreq: 820,
    treble: 3.2,
    presence: 2.4,
    presenceFreq: 3400,
    cabLowpass: 8200,
    cabHighpass: 68,
    chorus: 0,
    reverb: 0.16,
    output: 0.86,
  },
  {
    id: "chorus",
    name: "Chorus Clean",
    tag: "80s",
    description: "Shimmery clean with chorus and a longer hall — 80s verse and arpeggio tone.",
    preGain: 1.05,
    highpass: 82,
    compress: true,
    compressThreshold: -20,
    compressRatio: 2.4,
    drive: 0.55,
    curve: "soft",
    postGain: 0.9,
    bass: 0.5,
    mid: 0.4,
    midFreq: 900,
    treble: 4.2,
    presence: 3.1,
    presenceFreq: 3600,
    cabLowpass: 9000,
    cabHighpass: 72,
    chorus: 0.46,
    reverb: 0.24,
    output: 0.82,
  },
  {
    id: "crunch",
    name: "Crunch",
    tag: "rock",
    description: "Classic rock overdrive — pick attack stays, chords grind.",
    preGain: 2.15,
    highpass: 88,
    compress: false,
    compressThreshold: 0,
    compressRatio: 1,
    drive: 11,
    curve: "soft",
    postGain: 0.34,
    bass: 2.8,
    mid: 2.2,
    midFreq: 720,
    treble: 1.4,
    presence: 3,
    presenceFreq: 3000,
    cabLowpass: 5200,
    cabHighpass: 88,
    chorus: 0,
    reverb: 0.11,
    output: 0.74,
  },
  {
    id: "blues",
    name: "Blues Breaker",
    tag: "warm",
    description: "Low-gain, woody overdrive that opens up when you pick harder.",
    preGain: 1.7,
    highpass: 74,
    compress: false,
    compressThreshold: 0,
    compressRatio: 1,
    drive: 4.8,
    curve: "soft",
    postGain: 0.48,
    bass: 3.6,
    mid: 3.2,
    midFreq: 540,
    treble: -0.6,
    presence: 1.2,
    presenceFreq: 2600,
    cabLowpass: 4300,
    cabHighpass: 70,
    chorus: 0,
    reverb: 0.15,
    output: 0.78,
  },
  {
    id: "lead",
    name: "Lead",
    tag: "sustain",
    description: "Mid-forward solo tone with extra sustain and a bit of room.",
    preGain: 2.8,
    highpass: 90,
    compress: true,
    compressThreshold: -18,
    compressRatio: 3.4,
    drive: 20,
    curve: "hard",
    postGain: 0.28,
    bass: 1.2,
    mid: 5.2,
    midFreq: 920,
    treble: 2.1,
    presence: 4.4,
    presenceFreq: 2800,
    cabLowpass: 5600,
    cabHighpass: 92,
    chorus: 0,
    reverb: 0.2,
    output: 0.72,
  },
  {
    id: "metal",
    name: "Metal Core",
    tag: "high gain",
    description: "Tight, scooped high-gain for chugs, Venom riffs, and Drop D power chords.",
    preGain: 4.4,
    highpass: 110,
    compress: false,
    compressThreshold: 0,
    compressRatio: 1,
    drive: 48,
    curve: "hard",
    postGain: 0.17,
    bass: 6.2,
    mid: -4.4,
    midFreq: 480,
    treble: 3.8,
    presence: 5.2,
    presenceFreq: 3500,
    cabLowpass: 4700,
    cabHighpass: 105,
    chorus: 0,
    reverb: 0.07,
    output: 0.68,
  },
  {
    id: "fuzz",
    name: "Fuzz",
    tag: "garage",
    description: "Saturated square-ish fuzz — thick single notes, messy chords.",
    preGain: 4.8,
    highpass: 70,
    compress: false,
    compressThreshold: 0,
    compressRatio: 1,
    drive: 36,
    curve: "fuzz",
    postGain: 0.2,
    bass: 5.4,
    mid: -1.6,
    midFreq: 380,
    treble: -1.8,
    presence: 0.4,
    presenceFreq: 2200,
    cabLowpass: 3600,
    cabHighpass: 64,
    chorus: 0,
    reverb: 0.1,
    output: 0.7,
  },
];

const TONE_IDS = new Set<AmpPresetId>(AMP_TONES.map((tone) => tone.id));

export const DEFAULT_AMP_PREFS: AmpPrefs = {
  presetId: "clean",
  volume: 0.62,
  enabled: true,
};

export function isAmpPresetId(value: string): value is AmpPresetId {
  return TONE_IDS.has(value as AmpPresetId);
}

export function getAmpTone(id: AmpPresetId | string | undefined): AmpTone {
  return AMP_TONES.find((tone) => tone.id === id) ?? AMP_TONES[0];
}

export function clampAmpVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_AMP_PREFS.volume;
  return Math.min(1, Math.max(0, value));
}

export function normalizeAmpPrefs(raw: Partial<AmpPrefs> | null | undefined): AmpPrefs {
  return {
    presetId: raw && typeof raw.presetId === "string" && isAmpPresetId(raw.presetId)
      ? raw.presetId
      : DEFAULT_AMP_PREFS.presetId,
    volume: clampAmpVolume(raw?.volume ?? DEFAULT_AMP_PREFS.volume),
    enabled: raw?.enabled !== false,
  };
}

export function monitorOutputGain(prefs: AmpPrefs): number {
  const tone = getAmpTone(prefs.presetId);
  if (!prefs.enabled) return 0;
  return clampAmpVolume(prefs.volume) * tone.output;
}

export function saturateSample(x: number, amount: number, kind: DriveCurve): number {
  const a = Math.max(0.01, amount);
  if (kind === "soft") {
    return ((1 + a) * x) / (1 + a * Math.abs(x));
  }
  if (kind === "hard") {
    return Math.tanh(x * (0.35 + a * 0.12));
  }
  const folded = Math.sign(x) * (1 - Math.exp(-Math.abs(x) * a * 0.35));
  return Math.max(-1, Math.min(1, folded * 1.12 - x * 0.08));
}

export function makeDriveCurve(amount: number, kind: DriveCurve, samples = 2048): Float32Array {
  const n = Math.max(32, samples);
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    curve[i] = saturateSample(x, amount, kind);
  }
  return curve;
}

export function loadAmpPrefs(): AmpPrefs {
  try {
    const raw = globalThis.localStorage?.getItem(AMP_PREFS_KEY);
    if (!raw) return { ...DEFAULT_AMP_PREFS };
    return normalizeAmpPrefs(JSON.parse(raw) as Partial<AmpPrefs>);
  } catch {
    return { ...DEFAULT_AMP_PREFS };
  }
}

export function saveAmpPrefs(prefs: AmpPrefs) {
  try {
    globalThis.localStorage?.setItem(AMP_PREFS_KEY, JSON.stringify(normalizeAmpPrefs(prefs)));
  } catch {
    /* ignore quota / private mode */
  }
}
