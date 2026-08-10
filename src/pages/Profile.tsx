import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import SurfaceCard from "@/components/system/SurfaceCard";
import ProfileForm from "@/components/profile/ProfileForm";

export default function Profile() {
  const { user, checkUserAuth } = useAuth();
  return <SurfaceCard><div className="mb-6"><p className="text-sm font-bold text-rose-400">Make it yours</p><h2 className="font-heading text-2xl font-black text-rose-950">Your little identity</h2></div><ProfileForm user={user} refresh={checkUserAuth} />
      <Link to="/change-password" className="mt-5 block rounded-2xl border border-rose-200 py-3.5 text-center font-bold text-rose-500 hover:bg-rose-50">Change your password</Link>
    </SurfaceCard>;
}