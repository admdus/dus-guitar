import {
  getAmpTone,
  makeDriveCurve,
  monitorOutputGain,
  type AmpPrefs,
} from "./ampPresets";

function setParam(param: AudioParam, value: number, ctx: AudioContext) {
  const t = ctx.currentTime;
  param.cancelScheduledValues(t);
  param.setTargetAtTime(value, t, 0.018);
}

function makeRoomImpulse(ctx: AudioContext, seconds = 1.35): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.55) * (ch === 0 ? 1 : 0.9);
    }
  }
  return buffer;
}

/**
 * Software amp / cab / room for hearing a DI electric guitar.
 * Pitch detection stays on the dry splitter tap — this chain is speakers only.
 */
export class AmpMonitor {
  private readonly ctx: AudioContext;
  readonly input: GainNode;
  private readonly highpass: BiquadFilterNode;
  private readonly compressor: DynamicsCompressorNode;
  private readonly driveGain: GainNode;
  private readonly shaper: WaveShaperNode;
  private readonly postGain: GainNode;
  private readonly bass: BiquadFilterNode;
  private readonly mid: BiquadFilterNode;
  private readonly treble: BiquadFilterNode;
  private readonly presence: BiquadFilterNode;
  private readonly cabHp: BiquadFilterNode;
  private readonly cabLp: BiquadFilterNode;
  private readonly chorusDry: GainNode;
  private readonly chorusDelay: DelayNode;
  private readonly chorusWet: GainNode;
  private readonly chorusLfo: OscillatorNode;
  private readonly chorusDepth: GainNode;
  private readonly chorusSum: GainNode;
  private readonly reverbDry: GainNode;
  private readonly convolver: ConvolverNode;
  private readonly reverbWet: GainNode;
  private readonly limiter: WaveShaperNode;
  private readonly output: GainNode;
  private disposed = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.highpass = ctx.createBiquadFilter();
    this.compressor = ctx.createDynamicsCompressor();
    this.driveGain = ctx.createGain();
    this.shaper = ctx.createWaveShaper();
    this.postGain = ctx.createGain();
    this.bass = ctx.createBiquadFilter();
    this.mid = ctx.createBiquadFilter();
    this.treble = ctx.createBiquadFilter();
    this.presence = ctx.createBiquadFilter();
    this.cabHp = ctx.createBiquadFilter();
    this.cabLp = ctx.createBiquadFilter();
    this.chorusDry = ctx.createGain();
    this.chorusDelay = ctx.createDelay(0.05);
    this.chorusWet = ctx.createGain();
    this.chorusLfo = ctx.createOscillator();
    this.chorusDepth = ctx.createGain();
    this.chorusSum = ctx.createGain();
    this.reverbDry = ctx.createGain();
    this.convolver = ctx.createConvolver();
    this.reverbWet = ctx.createGain();
    this.limiter = ctx.createWaveShaper();
    this.output = ctx.createGain();

    this.highpass.type = "highpass";
    this.highpass.Q.value = 0.7;
    this.bass.type = "lowshelf";
    this.bass.frequency.value = 120;
    this.mid.type = "peaking";
    this.mid.Q.value = 0.85;
    this.treble.type = "highshelf";
    this.treble.frequency.value = 2400;
    this.presence.type = "peaking";
    this.presence.Q.value = 0.7;
    this.cabHp.type = "highpass";
    this.cabHp.Q.value = 0.65;
    this.cabLp.type = "lowpass";
    this.cabLp.Q.value = 0.75;
    this.shaper.oversample = "4x";
    this.limiter.oversample = "2x";
    this.limiter.curve = makeDriveCurve(1.6, "hard", 1024) as Float32Array<ArrayBuffer>;
    this.convolver.normalize = true;
    this.convolver.buffer = makeRoomImpulse(ctx);
    this.chorusDelay.delayTime.value = 0.013;
    this.chorusLfo.type = "sine";
    this.chorusLfo.frequency.value = 0.75;
    this.chorusDepth.gain.value = 0.0036;
    this.compressor.knee.value = 18;
    this.compressor.attack.value = 0.006;
    this.compressor.release.value = 0.12;

    this.input
      .connect(this.highpass)
      .connect(this.compressor)
      .connect(this.driveGain)
      .connect(this.shaper)
      .connect(this.postGain)
      .connect(this.bass)
      .connect(this.mid)
      .connect(this.treble)
      .connect(this.presence)
      .connect(this.cabHp)
      .connect(this.cabLp);

    this.cabLp.connect(this.chorusDry).connect(this.chorusSum);
    this.cabLp.connect(this.chorusDelay).connect(this.chorusWet).connect(this.chorusSum);
    this.chorusLfo.connect(this.chorusDepth).connect(this.chorusDelay.delayTime);
    this.chorusSum.connect(this.reverbDry).connect(this.limiter);
    this.chorusSum.connect(this.convolver).connect(this.reverbWet).connect(this.limiter);
    this.limiter.connect(this.output).connect(ctx.destination);
    this.chorusLfo.start();
  }

  attach(splitter: ChannelSplitterNode, channel: number) {
    if (this.disposed) return;
    const index = Math.min(Math.max(0, channel), Math.max(0, splitter.numberOfOutputs - 1));
    splitter.connect(this.input, index, 0);
  }

  apply(prefs: AmpPrefs) {
    if (this.disposed) return;
    const tone = getAmpTone(prefs.presetId);
    const ctx = this.ctx;
    setParam(this.input.gain, tone.preGain, ctx);
    setParam(this.highpass.frequency, tone.highpass, ctx);
    setParam(this.compressor.threshold, tone.compress ? tone.compressThreshold : 0, ctx);
    setParam(this.compressor.ratio, tone.compress ? tone.compressRatio : 1, ctx);
    setParam(this.driveGain.gain, 1, ctx);
    this.shaper.curve = makeDriveCurve(tone.drive, tone.curve) as Float32Array<ArrayBuffer>;
    setParam(this.postGain.gain, tone.postGain, ctx);
    setParam(this.bass.gain, tone.bass, ctx);
    setParam(this.mid.gain, tone.mid, ctx);
    setParam(this.mid.frequency, tone.midFreq, ctx);
    setParam(this.treble.gain, tone.treble, ctx);
    setParam(this.presence.gain, tone.presence, ctx);
    setParam(this.presence.frequency, tone.presenceFreq, ctx);
    setParam(this.cabHp.frequency, tone.cabHighpass, ctx);
    setParam(this.cabLp.frequency, tone.cabLowpass, ctx);
    setParam(this.chorusDry.gain, 1 - tone.chorus * 0.42, ctx);
    setParam(this.chorusWet.gain, tone.chorus, ctx);
    setParam(this.reverbDry.gain, 1 - tone.reverb * 0.5, ctx);
    setParam(this.reverbWet.gain, tone.reverb, ctx);
    setParam(this.output.gain, monitorOutputGain(prefs), ctx);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    try {
      this.chorusLfo.stop();
    } catch {
      /* already stopped */
    }
    const nodes: AudioNode[] = [
      this.input,
      this.highpass,
      this.compressor,
      this.driveGain,
      this.shaper,
      this.postGain,
      this.bass,
      this.mid,
      this.treble,
      this.presence,
      this.cabHp,
      this.cabLp,
      this.chorusDry,
      this.chorusDelay,
      this.chorusWet,
      this.chorusLfo,
      this.chorusDepth,
      this.chorusSum,
      this.reverbDry,
      this.convolver,
      this.reverbWet,
      this.limiter,
      this.output,
    ];
    for (const node of nodes) {
      try {
        node.disconnect();
      } catch {
        /* already disconnected */
      }
    }
  }
}
