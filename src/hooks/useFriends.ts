import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { callFunction } from "@/lib/callFn";

export function useFriends() {
  const { user, token } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !token) { setLoading(false); return; }
    try {
      const data = await callFunction("accountAuth", { action: "friendsList", id: user.id, token });
      setFriends(data.friends || []);
    } catch {
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => { load(); }, [load]);

  const add = async (targetId: string) => {
    await callFunction("accountAuth", { action: "addFriend", targetId, id: user.id, token });
    await load();
  };

  const remove = async (friendId: string) => {
    await callFunction("accountAuth", { action: "removeFriend", friendId, id: user.id, token });
    await load();
  };

  return { friends, loading, reload: load, add, remove };
}