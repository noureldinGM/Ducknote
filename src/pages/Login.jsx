import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Lock, Loader2, User } from "lucide-react";
import AppButton from "@/components/system/AppButton";
import AppInput from "@/components/system/AppInput";
import BrandMark from "@/components/brand/BrandMark";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const account = await login(username, password);
      navigate(account.role === "admin" ? "/admin" : "/home", { replace: true });
    } catch (err) {
      setError(err.message || "Wrong username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff9f6] px-4 py-8">
      <div className="absolute -right-20 top-12 h-64 w-64 rounded-full bg-violet-200/40 blur-3xl" />
      <div className="absolute -left-24 bottom-20 h-72 w-72 rounded-full bg-rose-200/50 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center">
        <div className="mb-8 text-center">
          <BrandMark />
          <div className="mx-auto mt-8 h-16 w-16 overflow-hidden rounded-[1.4rem] shadow-xl shadow-rose-200">
            <img
              src="/ducknote-icon.png"
              alt="DuckNote"
              className="h-full w-full object-cover"
              />
            </div>
          <h1 className="mt-5 font-heading text-4xl font-black tracking-tight text-rose-950">Welcome back, lovely.</h1>
          <p className="mt-3 text-sm leading-6 text-rose-500">Your private little corner is waiting.</p>
        </div>
        <section className="rounded-[2rem] border border-white bg-white/85 p-6 shadow-[0_24px_70px_-35px_rgba(159,18,57,.5)] backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-600">{error}</div>}
            <label className="block text-sm font-bold text-rose-950">Username<div className="relative mt-2"><User className="absolute left-4 top-4 h-4 w-4 text-rose-300" /><AppInput type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your_username" className="pl-11" required /></div></label>
            <label className="block text-sm font-bold text-rose-950">Password<div className="relative mt-2"><Lock className="absolute left-4 top-4 h-4 w-4 text-rose-300" /><AppInput type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-11" required /></div></label>
            <AppButton type="submit" disabled={loading} className="w-full bg-gradient-to-r from-rose-500 to-violet-500 text-white hover:opacity-95">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{loading ? "Opening your space…" : "Log in"}</AppButton>
          </form>
        </section>
        <p className="mt-6 text-center text-xs leading-5 text-rose-400">DuckNote accounts are created by an administrator. Ask yours if you need one.</p>
      </div>
    </main>
  );
}