import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Heart } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNotes } from "@/hooks/useNotes";
import { useFriends } from "@/hooks/useFriends";
import { toggleReaction } from "@/lib/notes";
import { callFunction } from "@/lib/callFn";
import NoteBubble from "@/components/notes/NoteBubble";
import SurfaceCard from "@/components/system/SurfaceCard";
import AppDialog from "@/components/system/AppDialog";
import EmptyState from "@/components/system/EmptyState";
import LoadingState from "@/components/system/LoadingState";
import ErrorState from "@/components/system/ErrorState";
import UserAvatar from "@/components/system/UserAvatar";
import { displayUsername } from "@/lib/username";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { user, token } = useAuth();
  const { notes, loading, error, reload } = useNotes("received");
  const { friends } = useFriends();
  const [openId, setOpenId] = useState<string | null>(null);
  const openNote = notes.find((n) => n.id === openId) || null;

  useEffect(() => {
    const unsubscribe = base44.entities.Note.subscribe((event) => {
      if (event.type === "create" && event.data?.recipientId === user?.id) {
        reload();
      }
    });
    return unsubscribe;
  }, [user, reload]);

  const unread = notes.filter((n) => n.status !== "read").length;

  const open = async (note: any) => {
    setOpenId(note.id);
    if (note.status !== "read") {
      try {
        await callFunction("notes", { action: "markRead", noteId: note.id, id: user.id, token });
        reload();
      } catch { }
    }
  };

  if (loading) return <LoadingState label="Gathering your little notes…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-5">
      <div className="px-1">
        <p className="text-sm font-bold text-rose-400">{greeting()}, {user?.displayName || user?.full_name || "lovely"} 💗</p>
        <h2 className="font-heading text-3xl font-black text-rose-950">{unread > 0 ? "You have something new..." : "Your little notes"}</h2>
      </div>

      {friends.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-bold uppercase tracking-wide text-rose-400">My People</p>
            <Link to="/people" className="text-xs font-bold text-rose-500">See all</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {friends.slice(0, 8).map((f) => (
              <Link key={f.id} to="/create" state={{ recipient: { id: f.targetId, username: f.targetUsername, displayName: f.targetDisplayName, profileImage: f.targetProfileImage } }} className="flex w-16 shrink-0 flex-col items-center gap-1">
                <UserAvatar src={f.targetProfileImage} name={f.targetDisplayName} className="h-14 w-14" />
                <span className="w-full truncate text-center text-[10px] font-bold text-rose-700">{f.targetDisplayName}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <SurfaceCard><EmptyState icon={Heart} title="Nothing here yet 💗" message="Someone might be thinking about you." /></SurfaceCard>
      ) : (
        <div className="space-y-4">
          {notes.map((n, i) => (
            <motion.div key={n.id} initial={i === 0 && n.status !== "read" ? { opacity: 0, scale: 0.96 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
              <NoteBubble note={n} other={n.sender} direction="received" onOpen={() => open(n)} onReact={() => toggleReaction(n, user.id, token).then(() => reload()).catch(() => { })} />
            </motion.div>
          ))}
        </div>
      )}

      <AppDialog open={!!openNote} onOpenChange={(o) => !o && setOpenId(null)} title="A little something for you">
        {openNote && (
          <div>
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12 }} className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-rose-500">
              <Heart className="h-6 w-6 fill-rose-400 text-rose-400" />
            </motion.div>
            <div className="flex items-center gap-3">
              <UserAvatar src={openNote.sender?.profileImage} name={openNote.sender?.displayName} className="h-10 w-10" />
              <div>
                <p className="font-bold text-rose-950">{openNote.sender?.displayName || "Someone"}</p>
                <p className="text-xs text-rose-400">{displayUsername(openNote.sender?.username)}</p>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-lg font-medium leading-relaxed text-rose-950">{openNote.text}</p>
            <p className="mt-4 text-xs text-rose-300">
              {openNote.created_at
                ? formatDistanceToNow(new Date(openNote.created_at), {
                  addSuffix: true,
                })
                : "Just now"}
            </p>
          </div>
        )}
      </AppDialog>
    </div>
  );
}