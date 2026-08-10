import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export default function RoleRoute({ role }: { role: "admin" | "user" }) {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role !== role) return <Navigate to={user.role === "admin" ? "/admin" : "/home"} replace />;
  return <Outlet />;
}