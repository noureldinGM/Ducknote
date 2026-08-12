import { formatDistanceToNow } from "date-fns";
import { Music } from "lucide-react";
import SurfaceCard from "@/components/system/SurfaceCard";
import UserAvatar from "@/components/system/UserAvatar";
import StatusBadge from "./StatusBadge";
import AudioPlayer from "@/components/audio/AudioPlayer";
import ReactionButton from "./ReactionButton";
import { displayUsername } from "@/lib/username";

type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  profileImage?: string;
};

type AudioNote = {
  id: string;
  type: string;
  status: string;
  created_at?: string | null;
  created_date?: string | null;
  audio_url?: string | null;
  audioUrl?: string | null;
  audio_duration?: number | string | null;
  audioDuration?: number | string | null;
  duration_ms?: number | string | null;
  durationMs?: number | string | null;
  reaction?: {
    heart?: boolean;
    at?: string;
  } | null;
};

export default function AudioNoteBubble({
  note,
  other,
  direction,
  onReact,
}: {
  note: AudioNote;
  other?: PublicUser;
  direction: "received" | "sent";
  onReact?: () => void;
}) {
  const isReceived = direction === "received";

  const name = other?.displayName || "DuckNote friend";

  const reactionHeart = note.reaction?.heart === true;

  // Support both the current Supabase field names
  // and the older frontend field names.
  const durationMs =
    Number(note.duration_ms ?? note.durationMs ?? 0) ||
    Number(note.audio_duration ?? note.audioDuration ?? 0) * 1000;

  const audioUrl = note.audio_url ?? note.audioUrl ?? "";

  const createdAt = note.created_at ?? note.created_date ?? null;

  let createdLabel = "Just now";

  if (createdAt) {
    const date = new Date(createdAt);

    if (!Number.isNaN(date.getTime())) {
      createdLabel = formatDistanceToNow(date, {
        addSuffix: true,
      });
    }
  }

  return (
    <SurfaceCard>
      <div className="flex items-center gap-3">
        <UserAvatar
          src={other?.profileImage}
          name={name}
          className="h-11 w-11"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-rose-950">
            {isReceived ? `From ${name}` : `To ${name}`}
          </p>

          <p className="text-xs text-rose-400">
            {displayUsername(other?.username)}
          </p>
        </div>

        <div className="flex items-center gap-1 text-violet-400">
          <Music className="h-3.5 w-3.5" />

          <span className="text-[10px] font-bold uppercase">
            Voice
          </span>
        </div>

        <StatusBadge status={note.status} />
      </div>

      <div className="mt-4">
        {audioUrl ? (
          <AudioPlayer
            url={audioUrl}
            durationMs={durationMs}
          />
        ) : (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-400">
            Audio unavailable.
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-rose-300">
          {createdLabel}
        </span>

        <div className="flex items-center gap-1">
          {isReceived ? (
            <ReactionButton
              active={reactionHeart}
              onToggle={() => onReact?.()}
            />
          ) : (
            reactionHeart && (
              <span
                className="text-rose-500"
                title="They sent a heart"
              >
                ♥
              </span>
            )
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}