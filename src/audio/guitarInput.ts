import { detectPitchYin, isOnset, rmsAmplitude } from "./pitch";
import { centsOff, freqToMidi, midiToName } from "../engine/notes";
import type { DetectedPitch } from "../types";

export interface InputDevice {
  deviceId: string;
  label: string;
}

export type PitchListener = (pitch: DetectedPitch | null) => void;

export class GuitarInput {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Float32Array | null = null;
  private raf = 0;
  private previousRms = 0;
  private listeners = new Set<PitchListener>();
  private deviceId: string | undefined;
  private lastPitch: DetectedPitch | null = null;
  running = false;

  async listDevices(): Promise<InputDevice[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === "audioinput")
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${i + 1}`,
      }));
  }

  async start(deviceId?: string) {
    await this.stop();
    this.deviceId = deviceId;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx({ latencyHint: "interactive" });
    await this.ctx.resume();
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 4096;
    this.analyser.smoothingTimeConstant = 0;
    source.connect(this.analyser);
    this.buffer = new Float32Array(this.analyser.fftSize);
    this.running = true;
    this.loop();
  }

  async stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    await this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.analyser = null;
    this.buffer = null;
    this.lastPitch = null;
    this.previousRms = 0;
  }

  getCurrent() {
    return this.lastPitch;
  }

  getDeviceId() {
    return this.deviceId;
  }

  subscribe(listener: PitchListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private loop = () => {
    if (!this.running || !this.analyser || !this.buffer || !this.ctx) return;
    this.analyser.getFloatTimeDomainData(this.buffer as Float32Array<ArrayBuffer>);
    const amplitude = rmsAmplitude(this.buffer);
    const onset = isOnset(amplitude, this.previousRms);
    this.previousRms = amplitude * 0.7 + this.previousRms * 0.3;

    let detected: DetectedPitch | null = null;
    if (amplitude > 0.006) {
      const pitch = detectPitchYin(this.buffer, this.ctx.sampleRate);
      if (pitch && pitch.probability > 0.7) {
        const midi = freqToMidi(pitch.frequency);
        detected = {
          frequency: pitch.frequency,
          midi,
          noteName: midiToName(midi),
          cents: centsOff(midi),
          amplitude,
          onset,
          time: this.ctx.currentTime,
        };
      }
    }
    this.lastPitch = detected
      ? detected
      : this.lastPitch && amplitude > 0.004
        ? { ...this.lastPitch, amplitude, onset: false }
        : null;

    for (const listener of this.listeners) listener(this.lastPitch);
    this.raf = requestAnimationFrame(this.loop);
  };
}

export const guitarInput = new GuitarInput();
