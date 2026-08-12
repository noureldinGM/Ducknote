import { useEffect, useState, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
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

    // =====================================================
    // Authenticate Supabase Realtime with current session
    // =====================================================

    supabase.realtime.setAuth(token);

    // =====================================================
    // Load existing notes first
    // =====================================================

    callFunction("notes", {
      action: "list",
      mode: "received",
      id: user.id,
      token,
    })
      .then((data) => {
        if (!mounted) return;

        (data.notes || []).forEach((note) => {
          knownIds.current.add(note.id);
        });
      })
      .catch(() => { });

    // =====================================================
    // Show notification for a new note
    // =====================================================

    const notify = (note) => {
      if (!note) return;

      const recipientId =
        note.recipientId ||
        note.recipient_id;

      if (recipientId !== user.id) {
        return;
      }

      if (knownIds.current.has(note.id)) {
        return;
      }

      knownIds.current.add(note.id);

      const isAudio = note.type === "audio";

      const enabled = isAudio
        ? userRef.current?.notifyAudio !== false
        : userRef.current?.notifyText !== false;

      if (!enabled) {
        return;
      }

      const username =
        note.sender?.username ||
        note.sender_username ||
        "friend";

      const text = isAudio
        ? `🎵 @${username} sent you an audio note`
        : `💌 @${username} sent you a note`;

      // ===================================================
      // Browser notification
      // ===================================================

      if (
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          const notification = new Notification(
            "DuckNote",
            {
              body: text,
              tag: note.id,
            }
          );

          notification.onclick = () => {
            window.focus();
            navigate(`/note/${note.id}`);
            notification.close();
          };
        } catch {
          // Ignore browser notification errors.
        }
      }

      // ===================================================
      // In-app toast
      // ===================================================

      setToast({
        text,
        noteId: note.id,
      });

      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }

      toastTimer.current = setTimeout(() => {
        setToast(null);
      }, 6000);
    };

    // =====================================================
    // Supabase Realtime
    // =====================================================

    const channel = supabase
      .channel(`ducknote-notes-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notes",
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          if (!mounted) return;

          const noteId = payload.new?.id;

          if (!noteId) {
            return;
          }

          console.log(
            "[DuckNote Realtime] New note event:",
            noteId
          );

          try {
            const data = await callFunction("notes", {
              action: "getNote",
              noteId,
              id: user.id,
              token,
            });

            if (data?.note) {
              notify(data.note);
            }
          } catch {
            notify(payload.new);
          }
        }
      )
      .subscribe((status, error) => {
        console.log(
          "[DuckNote Realtime] notes subscription:",
          status,
          error || ""
        );
      });

    // =====================================================
    // Fallback polling
    // =====================================================

    const interval = setInterval(async () => {
      try {
        const data = await callFunction("notes", {
          action: "list",
          mode: "received",
          id: user.id,
          token,
        });

        (data.notes || []).forEach((note) => {
          if (!knownIds.current.has(note.id)) {
            notify(note);
          }
        });
      } catch {
        // Ignore polling errors.
      }
    }, 60000);

    // =====================================================
    // Cleanup
    // =====================================================

    return () => {
      mounted = false;

      supabase.removeChannel(channel);

      clearInterval(interval);

      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, [user?.id, token, navigate]);

  return (
    <>
      <Outlet />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{
              opacity: 0,
              y: -20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -20,
            }}
            className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 cursor-pointer"
            onClick={() => {
              navigate(`/note/${toast.noteId}`);
              setToast(null);
            }}
          >
            <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg">
              <Sparkles className="h-4 w-4" />

              {toast.text}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToast(null);
                }}
              >
                <X className="h-4 w-4 opacity-70" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}