import { midiToFreq, noteMidi, STANDARD_TUNING, type Tuning } from "../engine/notes";
import type { StringIndex } from "../types";

let shared: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!shared || shared.state === "closed") {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    shared = new Ctx();
  }
  return shared;
}

export async function resumeAudio() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}

export function pluckMidi(midi: number, when?: number, gain = 0.18) {
  const ctx = getAudioContext();
  const t = when ?? ctx.currentTime;
  const freq = midiToFreq(midi);

  const noiseLen = Math.floor(ctx.sampleRate * 0.03);
  const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / noiseLen);

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(gain * 0.35, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, t);
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 2, t);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(gain * 0.35, t + 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);

  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(gain * 0.12, t);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.min(4200, freq * 8), t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(600, freq * 2), t + 0.4);

  noise.connect(noiseGain).connect(filter);
  osc.connect(g).connect(filter);
  osc2.connect(g2).connect(filter);
  filter.connect(ctx.destination);

  noise.start(t);
  osc.start(t);
  osc2.start(t);
  osc.stop(t + 1.2);
  osc2.stop(t + 0.4);
  noise.stop(t + 0.05);
}

export function pluckFret(string: StringIndex, fret: number, gain = 0.18, tuning: Tuning = STANDARD_TUNING) {
  pluckMidi(noteMidi(string, fret, tuning), undefined, gain);
}

export function click(accent = false) {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.value = accent ? 1400 : 900;
  const g = ctx.createGain();
  g.gain.setValueAtTime(accent ? 0.08 : 0.045, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}
