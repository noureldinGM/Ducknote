import { formatDistanceToNow } from "date-fns";
import { MessageCircle } from "lucide-react";
import SurfaceCard from "@/components/system/SurfaceCard";
import UserAvatar from "@/components/system/UserAvatar";
import StatusBadge from "./StatusBadge";
import AudioNoteBubble from "./AudioNoteBubble";
import ReactionButton from "./ReactionButton";
import { displayUsername } from "@/lib/username";

type PublicUser = { id: string; username: string; displayName: string; profileImage?: string };
type Note = { id: string; text: string; type: string; status: any; created_at: string; senderId: string; recipientId: string; reaction?: { heart: boolean; at?: string } };

export default function NoteBubble({ note, other, direction, onOpen, onReact }: { note: Note; other?: PublicUser; direction: "received" | "sent"; onOpen?: () => void; onReact?: () => void }) {
  if (note.type === "audio") {
    return <AudioNoteBubble note={note} other={other} direction={direction} onReact={onReact} />;
  }

  const isReceived = direction === "received";
  const name = other?.displayName || "DuckNote friend";
  const reactionHeart = note.reaction?.heart === true;
  const Wrapper: any = onOpen ? "button" : "div";

  return (
    <Wrapper onClick={onOpen} className="block w-full text-left">
      <SurfaceCard className={isReceived && note.status !== "read" ? "ring-2 ring-rose-200" : ""}>
        <div className="flex items-center gap-3">
          <UserAvatar src={other?.profileImage} name={name} className="h-11 w-11" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-rose-950">{isReceived ? `From ${name}` : `To ${name}`}</p>
            <p className="text-xs text-rose-400">{displayUsername(other?.username)}</p>
          </div>
          <div className="flex items-center gap-1 text-rose-300"><MessageCircle className="h-3.5 w-3.5" /><span className="text-[10px] font-bold uppercase">Text</span></div>
          <StatusBadge status={note.status} />
        </div>
        <p className="mt-3 line-clamp-4 whitespace-pre-wrap font-medium leading-relaxed text-rose-950">{note.text}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-rose-300">{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
          {isReceived ? (
            <ReactionButton active={reactionHeart} onToggle={() => onReact?.()} />
          ) : (
            reactionHeart && <span className="text-rose-500" title="They sent a heart">♥</span>
          )}
        </div>
      </SurfaceCard>
    </Wrapper>
  );
}