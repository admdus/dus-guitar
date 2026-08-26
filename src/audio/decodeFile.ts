export async function decodeAudioFile(file: File | ArrayBuffer, fallbackName?: string): Promise<{
  samples: Float32Array;
  sampleRate: number;
  name: string;
}> {
  const name = file instanceof File ? file.name : fallbackName ?? "audio";
  const buffer = file instanceof File ? await file.arrayBuffer() : file;
  const ctx = new AudioContext();
  try {
    const audio = await ctx.decodeAudioData(buffer.slice(0));
    return { samples: mixToMono(audio), sampleRate: audio.sampleRate, name };
  } finally {
    await ctx.close();
  }
}

export function mixToMono(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const channels = buffer.numberOfChannels;
  const out = new Float32Array(length);
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) out[i] += data[i] / channels;
  }
  return out;
}
