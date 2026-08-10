import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { callFunction } from "@/lib/callFn";

export function useNotes(mode: "received" | "sent") {
  const { user, token } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user || !token) { setLoading(false); return; }
    try {
      setLoading(true);
      setError("");
      const data = await callFunction("notes", { action: "list", mode, id: user.id, token });
      setNotes(data.notes || []);
    } catch (e: any) {
      setError(e.message || "Couldn't load your notes.");
    } finally {
      setLoading(false);
    }
  }, [user, token, mode]);

  useEffect(() => { load(); }, [load]);

  return { notes, loading, error, reload: load };
}