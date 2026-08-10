import { audioBufferToWavBlob } from "./wavEncoder";

function getAudioContext(): AudioContext {
  const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
  return new Ctx();
}

function getOfflineContext(channels: number, length: number, sampleRate: number): OfflineAudioContext {
  const Ctx = (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext);
  return new Ctx(channels, length, sampleRate);
}

export async function loadAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = getAudioContext();
  try {
    return await ctx.decodeAudioData(arrayBuffer);
  } finally {
    ctx.close();
  }
}

export function buildWaveform(audioBuffer: AudioBuffer, bars = 64): number[] {
  const channel = audioBuffer.getChannelData(0);
  const block = Math.max(1, Math.floor(channel.length / bars));
  const peaks: number[] = [];
  for (let i = 0; i < bars; i++) {
    let max = 0;
    const start = i * block;
    for (let j = 0; j < block; j += 64) {
      const v = Math.abs(channel[start + j] || 0);
      if (v > max) max = v;
    }
    peaks.push(max);
  }
  const norm = Math.max(...peaks, 0.0001);
  return peaks.map((p) => p / norm);
}

export async function renderClip(
  audioBuffer: AudioBuffer,
  startMs: number,
  endMs: number
): Promise<{ blob: Blob; durationMs: number }> {
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.max(0, Math.floor((startMs / 1000) * sampleRate));
  const endSample = Math.min(audioBuffer.length, Math.floor((endMs / 1000) * sampleRate));
  const length = Math.max(1, endSample - startSample);
  const channels = Math.min(2, audioBuffer.numberOfChannels);

  const offline = getOfflineContext(channels, length, sampleRate);
  const source = offline.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offline.destination);
  source.start(0, startSample / sampleRate, length / sampleRate);

  const rendered = await offline.startRendering();
  const blob = audioBufferToWavBlob(rendered);
  const durationMs = Math.round((rendered.length / rendered.sampleRate) * 1000);
  return { blob, durationMs };
}