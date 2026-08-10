import { Outlet, useLocation } from "react-router-dom";
import AppHeader from "./AppHeader";
import BottomNav from "./BottomNav";
import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider";

const titles: Record<string, string> = { "/home": "Home", "/people": "My People", "/search": "Find someone", "/create": "Create note", "/history": "Note history", "/profile": "Your profile", "/admin": "Dashboard", "/admin/users": "Users", "/admin/activity": "Activity", "/admin/profile": "Your profile" };

export default function AppShell({ role }: { role: "admin" | "user" }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-[#fff9f6] text-rose-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden"><span className="absolute -right-20 top-24 h-52 w-52 rounded-full bg-violet-200/30 blur-3xl" /><span className="absolute -left-24 top-1/2 h-64 w-64 rounded-full bg-rose-200/30 blur-3xl" /></div>
      <AudioPlayerProvider>
        <div className="relative mx-auto min-h-screen max-w-xl">
          <AppHeader title={titles[pathname] || "DuckNote"} />
          <main className="px-4 pb-28 pt-5 sm:px-6"><Outlet /></main>
          <BottomNav role={role} />
        </div>
      </AudioPlayerProvider>
    </div>
  );
}