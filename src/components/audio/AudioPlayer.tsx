import { Loader2, Play, Pause, AlertCircle } from "lucide-react";
import { useAudioPlayer } from "./AudioPlayerProvider";
import { formatMs } from "@/lib/audioLimits";

export default function AudioPlayer({ url, durationMs = 0 }: { url: string; durationMs?: number }) {
  const ap = useAudioPlayer();
  const isActive = ap.currentUrl === url;
  const playing = isActive && ap.isPlaying;
  const loading = isActive && ap.isLoading;
  const error = isActive ? ap.error : "";
  const cur = isActive ? ap.currentTime * 1000 : 0;
  const durSec = isActive && ap.duration ? ap.duration : (durationMs || 0) / 1000;
  const durMs = durSec * 1000;
  const progress = durMs > 0 ? Math.min(1, cur / durMs) : 0;

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive || durMs <= 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    ap.seek(url, ratio * durSec);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => ap.toggle(url)}
        aria-label={playing ? "Pause" : "Play"}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500 text-white shadow-md transition-transform active:scale-90"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : error ? <AlertCircle className="h-5 w-5" /> : playing ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white translate-x-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div onClick={onSeek} className="h-1.5 w-full cursor-pointer rounded-full bg-rose-100">
          <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-violet-500" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] font-bold text-rose-400">
          <span>{formatMs(cur)}</span>
          <span>{formatMs(durMs)}</span>
        </div>
        {error && <p className="mt-1 text-[11px] text-red-500">We couldn't play this note 💔</p>}
      </div>
    </div>
  );
}