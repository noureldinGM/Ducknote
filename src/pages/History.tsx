import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useNotes } from "@/hooks/useNotes";
import { toggleReaction } from "@/lib/notes";
import NoteBubble from "@/components/notes/NoteBubble";
import SurfaceCard from "@/components/system/SurfaceCard";
import EmptyState from "@/components/system/EmptyState";
import LoadingState from "@/components/system/LoadingState";
import ErrorState from "@/components/system/ErrorState";

type Tab = "received" | "sent";

export default function History() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState<Tab>("received");
  const received = useNotes("received");
  const sent = useNotes("sent");
  const current = tab === "received" ? received : sent;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "received", label: "Received", icon: Mail },
    { key: "sent", label: "Sent", icon: Send },
  ];

  return (
    <div className="space-y-5">
      <div className="px-1"><h2 className="font-heading text-2xl font-black text-rose-950">Your history</h2><p className="mt-1 text-sm text-rose-500">Every little message, in one place.</p></div>

      <div className="flex gap-2 rounded-2xl bg-white/70 p-1.5">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all ${tab === t.key ? "bg-gradient-to-r from-rose-500 to-violet-500 text-white shadow-sm" : "text-rose-400"}`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {current.loading ? <LoadingState label="Gathering your little notes…" /> :
       current.error ? <ErrorState message={current.error} /> :
       current.notes.length === 0 ? (
        <SurfaceCard>
          {tab === "received"
            ? <EmptyState icon={Mail} title="Nothing here yet 💗" message="Someone might be thinking about you." />
            : <EmptyState icon={Send} title="Your little messages will live here 💌" message="Send a note and it'll show up here." />}
        </SurfaceCard>
      ) : (
        <div className="space-y-4">
          {current.notes.map((n) => (
            <NoteBubble key={n.id} note={n} other={tab === "received" ? n.sender : n.recipient} direction={tab} onReact={() => toggleReaction(n, user.id, token).then(() => current.reload()).catch(() => {})} />
          ))}
        </div>
      )}
    </div>
  );
}