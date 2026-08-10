import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Music } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import { callFunction } from "@/lib/callFn";
import SurfaceCard from "@/components/system/SurfaceCard";
import UserAvatar from "@/components/system/UserAvatar";
import LoadingState from "@/components/system/LoadingState";
import { displayUsername } from "@/lib/username";

export default function NoteDetail() {
  const { noteId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!noteId || !user?.id || !token) return;
    let mounted = true;
    setLoading(true);
    callFunction("notes", { action: "getNote", noteId, id: user.id, token })
      .then((data) => {
        if (!mounted) return;
        if (data.expired) { setExpired(true); return; }
        if (data.note) {
          setNote(data.note);
          if (data.note.recipientId === user.id && data.note.status !== "read") {
            callFunction("notes", { action: "markRead", noteId, id: user.id, token }).catch(() => {});
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [noteId, user?.id, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff9f6]">
        <LoadingState label="Finding that little note…" />
      </div>
    );
  }

  if (expired || !note) {
    return (
      <div className="min-h-screen bg-[#fff9f6] px-4 py-8">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm font-bold text-rose-500">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <SurfaceCard className="mt-8 text-center">
          <div className="mb-4 mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-50">
            <Heart className="h-8 w-8 text-rose-300" />
          </div>
          <h2 className="font-heading text-2xl font-black text-rose-950">That little note has disappeared 💗</h2>
          <p className="mt-2 text-sm text-rose-400">Notes only live for 24 hours.</p>
        </SurfaceCard>
      </div>
    );
  }

  const isReceived = note.recipientId === user.id;
  const other = isReceived ? note.sender : note.recipient;
  const name = other?.displayName || "DuckNote friend";

  return (
    <div className="min-h-screen bg-[#fff9f6] px-4 py-8">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm font-bold text-rose-500">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <SurfaceCard>
        <div className="flex items-center gap-3">
          <UserAvatar src={other?.profileImage} name={name} className="h-11 w-11" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-rose-950">{isReceived ? `From ${name}` : `To ${name}`}</p>
            <p className="text-xs text-rose-400">{displayUsername(other?.username)}</p>
          </div>
          {note.type === "audio" ? (
            <div className="flex items-center gap-1 text-violet-400">
              <Music className="h-3.5 w-3.5" /><span className="text-[10px] font-bold uppercase">Voice</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-rose-300">
              <Heart className="h-3.5 w-3.5" /><span className="text-[10px] font-bold uppercase">Text</span>
            </div>
          )}
        </div>
        {note.type === "audio" && note.audioUrl ? (
          <div className="mt-4 rounded-2xl bg-rose-50 p-4">
            <audio controls src={note.audioUrl} className="w-full" />
          </div>
        ) : note.type === "audio" ? (
          <p className="mt-3 text-sm text-rose-400">Audio unavailable.</p>
        ) : (
          <p className="mt-3 whitespace-pre-wrap font-medium leading-relaxed text-rose-950">{note.text}</p>
        )}
        <p className="mt-3 text-xs text-rose-300">{formatDistanceToNow(new Date(note.created_date), { addSuffix: true })}</p>
      </SurfaceCard>
    </div>
  );
}