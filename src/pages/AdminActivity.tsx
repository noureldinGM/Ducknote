import { useEffect, useState } from "react";
import { Activity as ActivityIcon, UserPlus, UserMinus, KeyRound, UserCog, Send, Music } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import { callFunction } from "@/lib/callFn";
import SurfaceCard from "@/components/system/SurfaceCard";
import EmptyState from "@/components/system/EmptyState";
import LoadingState from "@/components/system/LoadingState";
import ErrorState from "@/components/system/ErrorState";

const ICONS: Record<string, any> = {
  user_created: UserPlus,
  user_deleted: UserMinus,
  username_changed: UserCog,
  user_updated: UserCog,
  password_reset: KeyRound,
  text_note_sent: Send,
  audio_note_sent: Music,
};

export default function AdminActivity() {
  const { user, token } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    if (!user || !token) return;
    setLoading(true); setError("");
    try {
      const data = await callFunction("accountAuth", { action: "activity", adminId: user.id, adminToken: token });
      setLogs(data.logs || []);
    } catch (e: any) { setError(e.message || "Couldn't load activity."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user, token]);

  if (loading) return <LoadingState label="Gathering activity…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-5">
      <div className="px-1">
        <p className="text-sm font-bold text-rose-400">Private oversight</p>
        <h2 className="font-heading text-3xl font-black text-rose-950">Activity</h2>
      </div>
      {logs.length === 0 ? (
        <SurfaceCard><EmptyState icon={ActivityIcon} title="Nothing yet" message="Account events will appear here as they happen." /></SurfaceCard>
      ) : (
        <div className="space-y-3">
          {logs.map((l) => {
            const Icon = ICONS[l.action] || ActivityIcon;
            const label = l.action.replace(/_/g, " ");
            return (
              <SurfaceCard key={l.id}>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-500"><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold capitalize text-rose-950">{label}</p>
                    <p className="truncate text-xs text-rose-400">{l.actorName || "Someone"}{l.targetLabel ? ` · ${l.targetLabel}` : ""}</p>
                  </div>
                  <p className="shrink-0 text-[11px] text-rose-300">{formatDistanceToNow(new Date(l.created_date), { addSuffix: true })}</p>
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}
    </div>
  );
}