import { formatDistanceToNow } from "date-fns";
import { Music } from "lucide-react";
import SurfaceCard from "@/components/system/SurfaceCard";
import UserAvatar from "@/components/system/UserAvatar";
import StatusBadge from "./StatusBadge";
import AudioPlayer from "@/components/audio/AudioPlayer";
import ReactionButton from "./ReactionButton";
import { displayUsername } from "@/lib/username";

type PublicUser = { id: string; username: string; displayName: string; profileImage?: string };

export default function AudioNoteBubble({ note, other, direction, onReact }: { note: any; other?: PublicUser; direction: "received" | "sent"; onReact?: () => void }) {
  const isReceived = direction === "received";
  const name = other?.displayName || "DuckNote friend";
  const reactionHeart = note.reaction?.heart === true;
  const durationMs = note.durationMs || (note.audioDuration ? note.audioDuration * 1000 : 0);

  return (
    <SurfaceCard>
      <div className="flex items-center gap-3">
        <UserAvatar src={other?.profileImage} name={name} className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-rose-950">{isReceived ? `From ${name}` : `To ${name}`}</p>
          <p className="text-xs text-rose-400">{displayUsername(other?.username)}</p>
        </div>
        <div className="flex items-center gap-1 text-violet-400"><Music className="h-3.5 w-3.5" /><span className="text-[10px] font-bold uppercase">Voice</span></div>
        <StatusBadge status={note.status} />
      </div>

      <div className="mt-4">
        <AudioPlayer url={note.audioUrl} durationMs={durationMs} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-rose-300">{formatDistanceToNow(new Date(note.created_date), { addSuffix: true })}</span>
        <div className="flex items-center gap-1">
          {isReceived ? (
            <ReactionButton active={reactionHeart} onToggle={() => onReact?.()} />
          ) : (
            reactionHeart && <span className="text-rose-500" title="They sent a heart">♥</span>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}