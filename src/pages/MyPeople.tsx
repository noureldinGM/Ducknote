import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Send, X, Loader2, Search as SearchIcon, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useFriends } from "@/hooks/useFriends";
import { callFunction } from "@/lib/callFn";
import UserAvatar from "@/components/system/UserAvatar";
import SurfaceCard from "@/components/system/SurfaceCard";
import EmptyState from "@/components/system/EmptyState";
import LoadingState from "@/components/system/LoadingState";
import ErrorState from "@/components/system/ErrorState";
import { displayUsername } from "@/lib/username";

type PublicUser = { id: string; username: string; displayName: string; profileImage?: string };

export default function MyPeople() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { friends, loading, reload, add, remove } = useFriends();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  const run = async (q: string) => {
    if (!q) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await callFunction("accountAuth", { action: "search", query: q, id: user.id, token });
      setResults(data.users || []);
    } catch { setResults([]); } finally { setSearching(false); }
  };

  const onSearch = (v: string) => {
    setQuery(v);
    const q = v.trim().toLowerCase().replace(/^@/, "");
    if (!q) { setResults([]); return; }
    setTimeout(() => run(q), 300);
  };

  const addPerson = async (u: PublicUser) => {
    setAdding(u.id);
    try { await add(u.id); setResults((r) => r.filter((x) => x.id !== u.id)); }
    catch (e: any) { setError(e.message || "Couldn't add them."); }
    finally { setAdding(null); }
  };

  const sendTo = (f: any) => {
    navigate("/create", { state: { recipient: { id: f.targetId, username: f.targetUsername, displayName: f.targetDisplayName, profileImage: f.targetProfileImage } } });
  };

  if (loading) return <LoadingState label="Gathering your people…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-5">
      <div className="px-1">
        <p className="text-sm font-bold text-rose-400">Your favourite humans</p>
        <h2 className="font-heading text-3xl font-black text-rose-950">My People 💗</h2>
      </div>

      <SurfaceCard>
        <div className="relative">
          <SearchIcon className="absolute left-4 top-4 h-4 w-4 text-rose-300" />
          <input
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Add someone… @username"
            className="h-12 w-full rounded-2xl border border-rose-100 bg-white/80 pl-11 pr-4 text-sm font-medium shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          />
        </div>
        {searching && <div className="flex items-center justify-center gap-2 py-4 text-rose-400"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Looking…</span></div>}
        {!searching && results.length > 0 && (
          <div className="mt-3 space-y-2">
            {results.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-white/85 p-3">
                <UserAvatar src={u.profileImage} name={u.displayName} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-rose-950">{u.displayName}</p>
                  <p className="text-xs text-rose-400">{displayUsername(u.username)}</p>
                </div>
                <button onClick={() => addPerson(u)} disabled={adding === u.id} className="inline-flex h-9 items-center gap-1 rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 px-3 text-xs font-bold text-white disabled:opacity-50">
                  {adding === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}Add
                </button>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>

      {friends.length === 0 ? (
        <SurfaceCard><EmptyState icon={Heart} title="No one here yet 💗" message="Add the people you send notes to most — they'll live here for quick sending." /></SurfaceCard>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {friends.map((f) => (
            <div key={f.id} className="relative rounded-[1.5rem] border border-rose-100 bg-white/85 p-4 text-center shadow-sm">
              <button onClick={() => remove(f.id)} aria-label="Remove" className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-rose-300 hover:bg-rose-50 hover:text-rose-500"><X className="h-3.5 w-3.5" /></button>
              <UserAvatar src={f.targetProfileImage} name={f.targetDisplayName} className="mx-auto h-14 w-14" />
              <p className="mt-3 truncate font-bold text-rose-950">{f.targetDisplayName}</p>
              <p className="truncate text-xs text-rose-400">{displayUsername(f.targetUsername)}</p>
              <button onClick={() => sendTo(f)} className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 py-2 text-xs font-bold text-white">
                <Send className="h-3.5 w-3.5" />Send note
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}