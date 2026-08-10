import UserAvatar from "./UserAvatar";
import { displayUsername } from "@/lib/username";

export default function UserRow({ user }: { user: any }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/70 p-3">
      <UserAvatar src={user.profileImage} name={user.displayName || user.full_name} />
      <div className="min-w-0"><p className="truncate font-bold text-rose-950">{user.displayName || user.full_name || "LumaNote user"}</p><p className="text-sm text-rose-400">{displayUsername(user.username)}</p></div>
    </div>
  );
}