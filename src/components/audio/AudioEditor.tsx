import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Scissors, Check, Loader2, FileAudio } from "lucide-react";
import { loadAudioFile, buildWaveform, renderClip } from "@/lib/audioClip";
import { MAX_AUDIO_MS, TOO_LONG_MESSAGE, AUDIO_READ_ERROR, formatMs, isTooLong } from "@/lib/audioLimits";

export type ClipResult = {
  blob: Blob;
  originalFileName: string;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  mimeType: string;
};

const BARS = 56;

export default function AudioEditor({ file, onConfirm, onCancel }: { file: File; onConfirm: (r: ClipResult) => void; onCancel: () => void }) {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [durationMs, setDurationMs] = useState(0);
  const [startMs, setStartMs] = useState(0);
  const [endMs, setEndMs] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [url, setUrl] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    (async () => {
      try {
        const buf = await loadAudioFile(file);
        if (!active) return;
        setBuffer(buf);
        setWaveform(buildWaveform(buf, BARS));
        const durMs = Math.round((buf.length / buf.sampleRate) * 1000);
        setDurationMs(durMs);
        const initEnd = Math.min(durMs, MAX_AUDIO_MS);
        setStartMs(0);
        setEndMs(initEnd);
        objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
      } catch {
        if (active) setError(AUDIO_READ_ERROR);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      if (a.currentTime * 1000 >= endMs) {
        a.pause();
        setPreviewPlaying(false);
      }
    };
    a.addEventListener("timeupdate", onTime);
    return () => a.removeEventListener("timeupdate", onTime);
  }, [endMs]);

  const preview = () => {
    const a = audioRef.current;
    if (!a) {
      setError(AUDIO_READ_ERROR);
      return;
    }
    if (previewPlaying) {
      a.pause();
      setPreviewPlaying(false);
      return;
    }
    if (!isFinite(startMs) || !isFinite(endMs) || endMs <= startMs) {
      setError("Move the End slider past the Start to preview.");
      return;
    }
    try {
      a.currentTime = startMs / 1000;
    } catch {
      setError(AUDIO_READ_ERROR);
      return;
    }
    a.play()
      .then(() => setPreviewPlaying(true))
      .catch(() => setError(AUDIO_READ_ERROR));
  };

  const onStart = (v: number) => {
    setStartMs(v);
    if (v > endMs) setEndMs(v);
  };
  const onEnd = (v: number) => {
    setEndMs(v);
    if (v < startMs) setStartMs(v);
  };

  const tooLong = isTooLong(startMs, endMs);

  const confirm = async () => {
    if (!buffer || tooLong || processing) return;
    setProcessing(true);
    setError("");
    try {
      const { blob, durationMs: clipMs } = await renderClip(buffer, startMs, endMs);
      onConfirm({ blob, originalFileName: file.name, startTimeMs: startMs, endTimeMs: endMs, durationMs: clipMs, mimeType: "audio/wav" });
    } catch {
      setError(AUDIO_READ_ERROR);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-rose-400">
        <Loader2 className="h-7 w-7 animate-spin" />
        <p className="text-sm font-medium">Reading your audio…</p>
      </div>
    );
  }

  if (error && !buffer) {
    return (
      <div className="space-y-4 py-2 text-center">
        <p className="whitespace-pre-line text-sm font-medium text-rose-500">{error}</p>
        <button onClick={onCancel} className="text-sm font-bold text-rose-600 underline">Choose another file</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <audio
        ref={audioRef}
        src={url || undefined}
        preload="auto"
        onEnded={() => setPreviewPlaying(false)}
        onPlay={() => setPreviewPlaying(true)}
        onPause={() => setPreviewPlaying(false)}
        className="hidden"
      />
      <div className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-rose-600">
        <FileAudio className="h-4 w-4" />
        <span className="truncate text-sm font-bold">{file.name}</span>
      </div>

      <div className="rounded-[1.5rem] border border-rose-100 bg-white/70 p-4">
        <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-rose-400">
          <span>0:00</span>
          <span>{formatMs(durationMs)}</span>
        </div>
        <div className="flex h-20 items-end gap-0.5">
          {waveform.map((p, i) => {
            const t = (i / BARS) * durationMs;
            const inSel = t >= startMs && t <= endMs;
            return (
              <div
                key={i}
                style={{ height: `${Math.max(8, p * 100)}%` }}
                className={`flex-1 rounded-full ${inSel ? "bg-gradient-to-t from-rose-400 to-violet-400" : "bg-rose-200/70"}`}
              />
            );
          })}
        </div>
        <div className="relative -mt-20 mb-1 h-20">
          <div
            className="pointer-events-none absolute top-0 bottom-0 rounded-full border-2 border-rose-400 bg-rose-400/10"
            style={{ left: `${(startMs / Math.max(1, durationMs)) * 100}%`, width: `${((endMs - startMs) / Math.max(1, durationMs)) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-12 text-xs font-bold text-rose-400">Start</span>
          <input type="range" min={0} max={durationMs} step={50} value={startMs} onChange={(e) => onStart(+e.target.value)} className="flex-1 accent-rose-500" />
          <span className="w-12 text-right text-xs font-bold text-rose-600">{formatMs(startMs)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-12 text-xs font-bold text-rose-400">End</span>
          <input type="range" min={0} max={durationMs} step={50} value={endMs} onChange={(e) => onEnd(+e.target.value)} className="flex-1 accent-rose-500" />
          <span className="w-12 text-right text-xs font-bold text-rose-600">{formatMs(endMs)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-violet-50 px-4 py-3 text-violet-600">
        <span className="text-xs font-bold uppercase tracking-wide">Selection</span>
        <span className="text-sm font-black">{formatMs(endMs - startMs)}</span>
      </div>

      {tooLong && (
        <div className="whitespace-pre-line rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-600">
          {TOO_LONG_MESSAGE}
        </div>
      )}

      <button
        onClick={preview}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white py-3 font-bold text-rose-600 transition-transform active:scale-[.98]"
      >
        {previewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {previewPlaying ? "Pause preview" : "Preview selected"}
      </button>

      {error && <p className="whitespace-pre-line text-center text-sm font-medium text-rose-500">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 rounded-2xl border border-rose-200 py-3 font-bold text-rose-500">Back</button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={confirm}
          disabled={tooLong || processing}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-violet-500 py-3 font-bold text-white disabled:opacity-50"
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {processing ? "Clipping…" : "Confirm clip"}
        </motion.button>
      </div>
      <p className="flex items-center justify-center gap-1 text-center text-[11px] text-rose-300"><Scissors className="h-3 w-3" /> Only the selected part is kept — your original stays private on your device.</p>
    </div>
  );
}