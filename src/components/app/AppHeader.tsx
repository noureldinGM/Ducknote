import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import BrandMark from "@/components/brand/BrandMark";
import UserAvatar from "@/components/system/UserAvatar";

export default function AppHeader({ title }: { title: string }) {
  const { user, logout } = useAuth();
  return <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-rose-100/70 bg-[#fff9f6]/90 px-4 backdrop-blur-xl sm:px-6"><div className="flex items-center gap-3"><BrandMark compact /><div><p className="text-xs font-bold uppercase tracking-[.18em] text-rose-400">DuckNote</p><h1 className="font-heading text-lg font-extrabold text-rose-950">{title}</h1></div></div><div className="flex items-center gap-2"><UserAvatar src={user?.profileImage} name={user?.displayName || user?.full_name} className="h-9 w-9" /><button onClick={() => logout(true)} aria-label="Log out" className="grid h-10 w-10 place-items-center rounded-2xl text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600"><LogOut className="h-5 w-5" /></button></div></header>;
}