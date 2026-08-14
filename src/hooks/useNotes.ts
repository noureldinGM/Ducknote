import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { callFunction } from "@/lib/callFn";

export function useNotes(mode: "received" | "sent") {
  const { user, token } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const latestRequestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequestRef.current;

    if (!user || !token) {
      if (requestId === latestRequestRef.current) {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await callFunction("notes", { action: "list", mode, id: user.id, token });

      if (requestId === latestRequestRef.current) {
        setNotes(data.notes || []);
      }
    } catch (e: any) {
      if (requestId === latestRequestRef.current) {
        setError(e.message || "Couldn't load your notes.");
      }
    } finally {
      if (requestId === latestRequestRef.current) {
        setLoading(false);
      }
    }
  }, [user, token, mode]);

  useEffect(() => { load(); }, [load]);

  return { notes, loading, error, reload: load };
}
