import { useEffect, useState, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { callFunction } from "@/lib/callFn";

export default function NotificationProvider() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const knownIds = useRef(new Set());
  const toastTimer = useRef(null);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (!user?.id || !token) return;
    let mounted = true;

    callFunction("notes", { action: "list", mode: "received", id: user.id, token })
      .then((data) => {
        if (!mounted) return;
        (data.notes || []).forEach((n) => knownIds.current.add(n.id));
      })
      .catch(() => {});

    const notify = (note) => {
      if (!note || note.recipientId !== user.id) return;
      if (knownIds.current.has(note.id)) return;
      knownIds.current.add(note.id);

      const isAudio = note.type === "audio";
      const enabled = isAudio ? userRef.current.notifyAudio !== false : userRef.current.notifyText !== false;
      if (!enabled) return;

      const username = note.sender?.username || "friend";
      const text = isAudio
        ? `🎵 @${username} sent you an audio note`
        : `💌 @${username} sent you a note`;

      if ("Notification" in window && Notification.permission === "granted") {
        try {
          const n = new Notification("DuckNote", { body: text, tag: note.id });
          n.onclick = () => { window.focus(); navigate(`/note/${note.id}`); n.close(); };
        } catch {}
      }

      setToast({ text, noteId: note.id });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 6000);
    };

    let unsubscribe = () => {};
    try {
      unsubscribe = base44.entities.Note.subscribe((event) => {
        if (event.type !== "create" || event.data?.recipientId !== user.id) return;
        callFunction("notes", { action: "getNote", noteId: event.data.id, id: user.id, token })
          .then((data) => { if (data.note) notify(data.note); })
          .catch(() => { if (event.data) notify(event.data); });
      });
    } catch {}

    const interval = setInterval(async () => {
      try {
        const data = await callFunction("notes", { action: "list", mode: "received", id: user.id, token });
        (data.notes || []).forEach((n) => { if (!knownIds.current.has(n.id)) notify(n); });
      } catch {}
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(interval);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      mounted = false;
    };
  }, [user?.id, token, navigate]);

  return (
    <>
      <Outlet />
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 cursor-pointer"
            onClick={() => { navigate(`/note/${toast.noteId}`); setToast(null); }}
          >
            <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg">
              <Sparkles className="h-4 w-4" />
              {toast.text}
              <button onClick={(e) => { e.stopPropagation(); setToast(null); }}>
                <X className="h-4 w-4 opacity-70" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}