import { useEffect, useState } from "react";
import { ShieldCheck, Users, Activity, Send, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { callFunction } from "@/lib/callFn";
import SurfaceCard from "@/components/system/SurfaceCard";
import LoadingState from "@/components/system/LoadingState";
import ErrorState from "@/components/system/ErrorState";

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !token) return;
    (async () => {
      try {
        const data = await callFunction("accountAuth", { action: "adminStats", adminId: user.id, adminToken: token });
        setStats(data);
      } catch (e: any) { setError(e.message || "Couldn't load stats."); }
      finally { setLoading(false); }
    })();
  }, [user, token]);

  if (loading) return <LoadingState label="Gathering your dashboard…" />;
  if (error) return <ErrorState message={error} />;

  const cards = [
    { label: "Total users", value: stats?.totalUsers ?? 0, icon: Users, tint: "from-rose-500 to-rose-400" },
    { label: "Notes today", value: stats?.notesToday ?? 0, icon: Send, tint: "from-violet-500 to-rose-400" },
    { label: "Notes this week", value: stats?.notesWeek ?? 0, icon: Calendar, tint: "from-rose-400 to-violet-400" },
    { label: "Total notes", value: stats?.totalNotes ?? 0, icon: Activity, tint: "from-violet-400 to-rose-500" },
  ];

  return (
    <div className="space-y-5">
      <SurfaceCard className="border-0 bg-gradient-to-br from-violet-500 to-rose-500 p-6 text-white">
        <ShieldCheck className="h-7 w-7" />
        <h2 className="mt-5 font-heading text-3xl font-black">A gentle space, safely managed.</h2>
        <p className="mt-3 text-sm leading-6 text-white/80">Account tools and activity controls have a private home here.</p>
      </SurfaceCard>

      <div className="grid grid-cols-2 gap-4">
        {cards.map((c) => (
          <SurfaceCard key={c.label}>
            <span className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${c.tint} text-white`}><c.icon className="h-4 w-4" /></span>
            <p className="mt-3 font-heading text-2xl font-black text-rose-950">{c.value}</p>
            <p className="text-xs text-rose-400">{c.label}</p>
          </SurfaceCard>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => navigate("/admin/users")} className="rounded-[1.5rem] border border-rose-100 bg-white/85 p-5 text-left shadow-sm transition-transform active:scale-[.98]">
          <Users className="h-5 w-5 text-rose-500" />
          <p className="mt-3 font-bold text-rose-950">Manage users</p>
          <p className="mt-1 text-xs text-rose-400">Create, edit, reset passwords</p>
        </button>
        <button onClick={() => navigate("/admin/activity")} className="rounded-[1.5rem] border border-rose-100 bg-white/85 p-5 text-left shadow-sm transition-transform active:scale-[.98]">
          <Activity className="h-5 w-5 text-violet-500" />
          <p className="mt-3 font-bold text-rose-950">Activity</p>
          <p className="mt-1 text-xs text-rose-400">Recent account events</p>
        </button>
      </div>
    </div>
  );
}