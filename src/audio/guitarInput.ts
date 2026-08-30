import { detectPitchYin, isOnset, rmsAmplitude } from "./pitch";
import { armOnset, isOnsetArmed, ONSET_MAX_CMND, pitchProbabilityThreshold } from "./onset";
import { centsOff, freqToMidi, midiToName } from "../engine/notes";
import {
  openCaptureStream,
  rankInputDevices,
  toInputDevice,
  type CaptureInfo,
  type InputChannel,
  type InputDevice,
} from "./devices";
import type { DetectedPitch } from "../types";
import { AmpMonitor } from "./ampMonitor";
import { loadAmpPrefs, type AmpPrefs } from "./ampPresets";
import { OUTPUT_LATENCY_HINT_SEC, readRoundTripMs } from "./latency";

export type { InputDevice, InputChannel, CaptureInfo } from "./devices";
export type PitchListener = (pitch: DetectedPitch | null) => void;
export type DeviceListener = () => void;

export class GuitarInput {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private buffer: Float32Array | null = null;
  private raf = 0;
  private previousRms = 0;
  private listeners = new Set<PitchListener>();
  private deviceListeners = new Set<DeviceListener>();
  private deviceId: string | undefined;
  private channel: InputChannel = 0;
  private lastPitch: DetectedPitch | null = null;
  private onsetArmedUntilMs = 0;
  private onsetDelivered = false;
  private watchingDevices = false;
  private monitor: AmpMonitor | null = null;
  private monitorPrefs: AmpPrefs = loadAmpPrefs();
  running = false;

  async listDevices(): Promise<InputDevice[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    await this.ensureDeviceLabels();
    const devices = await navigator.mediaDevices.enumerateDevices();
    return rankInputDevices(
      devices
        .filter((device) => device.kind === "audioinput")
        .map((device, index) => toInputDevice(device, index)),
    );
  }

  watchDevices(listener: DeviceListener) {
    this.deviceListeners.add(listener);
    this.ensureDeviceWatch();
    return () => {
      this.deviceListeners.delete(listener);
    };
  }

  async start(deviceId?: string, channel: InputChannel = 0) {
    await this.stop();
    this.deviceId = deviceId;
    this.channel = channel;
    this.stream = await openCaptureStream(deviceId);
    const track = this.stream.getAudioTracks()[0];
    if (track) {
      this.deviceId = track.getSettings().deviceId || deviceId;
      try {
        await track.applyConstraints({
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        });
      } catch {
        /* some Core Audio / WASAPI endpoints reject post-open constraint updates */
      }
    }

    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const sampleRate = track?.getSettings().sampleRate;
    try {
      this.ctx = sampleRate
        ? new Ctx({ latencyHint: OUTPUT_LATENCY_HINT_SEC, sampleRate })
        : new Ctx({ latencyHint: OUTPUT_LATENCY_HINT_SEC });
    } catch {
      this.ctx = new Ctx({ latencyHint: OUTPUT_LATENCY_HINT_SEC });
    }
    await this.ctx.resume();

    this.source = this.ctx.createMediaStreamSource(this.stream);
    const reported = Math.max(1, this.source.channelCount || 1);
    this.splitter = this.ctx.createChannelSplitter(Math.max(2, reported));
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0;
    this.source.connect(this.splitter);
    this.monitor = new AmpMonitor(this.ctx, this.monitorPrefs);
    this.routeChannel();
    this.buffer = new Float32Array(this.analyser.fftSize);
    this.running = true;
    this.loop();
  }

  setChannel(channel: InputChannel) {
    this.channel = channel;
    this.routeChannel();
  }

  getChannel() {
    return this.channel;
  }

  setMonitor(prefs: AmpPrefs) {
    this.monitorPrefs = prefs;
    this.monitor?.apply(prefs);
  }

  getCaptureInfo(): CaptureInfo | null {
    if (!this.running || !this.ctx || !this.stream) return null;
    const track = this.stream.getAudioTracks()[0];
    const settings = track?.getSettings() ?? {};
    return {
      deviceId: this.deviceId,
      label: track?.label || "Audio interface",
      channel: this.channel,
      sampleRate: this.ctx.sampleRate || settings.sampleRate || 0,
      channelCount: this.source?.channelCount || settings.channelCount || 1,
      roundTripMs: readRoundTripMs(this.ctx, settings),
    };
  }

  async stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.monitor?.dispose();
    this.monitor = null;
    this.splitter?.disconnect();
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.source = null;
    this.splitter = null;
    await this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.analyser = null;
    this.buffer = null;
    this.lastPitch = null;
    this.previousRms = 0;
    this.onsetArmedUntilMs = 0;
    this.onsetDelivered = false;
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

  private routeChannel() {
    if (!this.splitter || !this.analyser) return;
    const maxIndex = Math.max(0, this.splitter.numberOfOutputs - 1);
    const index = Math.min(this.channel, maxIndex);
    this.splitter.disconnect();
    this.splitter.connect(this.analyser, index, 0);
    this.monitor?.attach(this.splitter, index);
  }

  private async ensureDeviceLabels() {
    if (this.running) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((device) => device.kind === "audioinput");
      if (inputs.length > 0 && inputs.every((device) => device.label)) return;
      const probe = await openCaptureStream();
      probe.getTracks().forEach((track) => track.stop());
    } catch {
      /* permission prompt may be pending; labels stay generic until then */
    }
  }

  private ensureDeviceWatch() {
    if (this.watchingDevices || !navigator.mediaDevices?.addEventListener) return;
    this.watchingDevices = true;
    navigator.mediaDevices.addEventListener("devicechange", () => {
      for (const listener of this.deviceListeners) listener();
    });
  }

  private loop = () => {
    if (!this.running || !this.analyser || !this.buffer || !this.ctx) return;
    this.analyser.getFloatTimeDomainData(this.buffer as Float32Array<ArrayBuffer>);
    const amplitude = rmsAmplitude(this.buffer);
    const onset = isOnset(amplitude, this.previousRms);
    this.previousRms = amplitude * 0.7 + this.previousRms * 0.3;
    const nowMs = performance.now();
    if (onset) this.onsetDelivered = false;
    this.onsetArmedUntilMs = armOnset(onset, this.onsetArmedUntilMs, nowMs);
    // Two-string picks often fail YIN on the attack frame. Keep the pick live
    // until a pitch locks, then emit onset once so ringing cannot retrigger.
    const armed = isOnsetArmed(nowMs, this.onsetArmedUntilMs);
    const emitOnset = !this.onsetDelivered && (onset || armed);

    let detected: DetectedPitch | null = null;
    if (amplitude > 0.006) {
      const pitch = detectPitchYin(this.buffer, this.ctx.sampleRate, 60, 1200, {
        maxCmnd: armed ? ONSET_MAX_CMND : undefined,
      });
      if (pitch && pitch.probability > pitchProbabilityThreshold(armed)) {
        const midi = freqToMidi(pitch.frequency);
        detected = {
          frequency: pitch.frequency,
          midi,
          noteName: midiToName(midi),
          cents: centsOff(midi),
          amplitude,
          onset: emitOnset,
          time: this.ctx.currentTime,
        };
      }
    }
    this.lastPitch = detected
      ? detected
      : this.lastPitch && amplitude > 0.004
        ? { ...this.lastPitch, amplitude, onset: emitOnset }
        : null;
    if (this.lastPitch?.onset) this.onsetDelivered = true;

    for (const listener of this.listeners) listener(this.lastPitch);
    this.raf = requestAnimationFrame(this.loop);
  };
}

export const guitarInput = new GuitarInput();
