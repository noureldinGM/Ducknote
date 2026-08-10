import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export default function RoleLanding() {
  const { user } = useAuth();
  return <Navigate to={user?.role === "admin" ? "/admin" : "/home"} replace />;
}