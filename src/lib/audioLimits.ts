export const MAX_AUDIO_MS = 30_000;
export const MAX_AUDIO_SECONDS = 30;

export const TOO_LONG_MESSAGE =
  "That's a little too long 💗\nKeep your note under 30 seconds.";
export const AUDIO_READ_ERROR = "We couldn't read that audio 💔\nTry another file.";
export const UPLOAD_FAILED_MESSAGE =
  "Your note couldn't be sent.\nWe'll keep it here so you don't lose it.";

export function formatMs(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

export function isTooLong(startMs: number, endMs: number): boolean {
  return endMs - startMs > MAX_AUDIO_MS;
}