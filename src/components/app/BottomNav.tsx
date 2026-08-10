import { NavLink } from "react-router-dom";
import { Home, Search, Plus, History, User, LayoutDashboard, Users, Activity, Heart } from "lucide-react";

const userItems = [["Home", "/home", Home], ["People", "/people", Heart], ["Create", "/create", Plus], ["History", "/history", History], ["Profile", "/profile", User]] as const;
const adminItems = [["Dashboard", "/admin", LayoutDashboard], ["Users", "/admin/users", Users], ["Activity", "/admin/activity", Activity], ["Profile", "/admin/profile", User]] as const;

export default function BottomNav({ role }: { role: "admin" | "user" }) {
  const items = role === "admin" ? adminItems : userItems;
  return <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-xl items-end justify-around border-t border-rose-100 bg-white/95 px-2 pb-[max(.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl sm:bottom-4 sm:rounded-[1.75rem] sm:border"><>{items.map(([label, to, Icon]) => <NavLink key={to} to={to} end={to === "/admin"} className={({ isActive }) => `flex min-w-14 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-bold transition-all ${isActive ? "bg-rose-50 text-rose-600" : "text-rose-300 hover:text-rose-500"}`}><Icon className="h-5 w-5" />{label}</NavLink>)}</></nav>;
}