import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Loader2, Heart } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { callFunction } from "@/lib/callFn";
import AppButton from "@/components/system/AppButton";
import AppInput from "@/components/system/AppInput";
import BrandMark from "@/components/brand/BrandMark";

export default function ChangePassword() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (next.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (next !== confirm) { setError("New passwords don't match."); return; }
    setBusy(true);
    try {
      await callFunction("accountAuth", { action: "changePassword", currentPassword: current, newPassword: next, id: user.id, token });
      setDone(true);
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err: any) {
      setError(err.message || "Couldn't change your password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff9f6] px-4 py-8">
      <div className="absolute -right-20 top-10 h-60 w-60 rounded-full bg-violet-200/40 blur-3xl" />
      <div className="absolute -left-24 bottom-10 h-72 w-72 rounded-full bg-rose-200/50 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm flex-col justify-center">
        <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-rose-500 hover:text-rose-700"><ArrowLeft className="h-4 w-4" />Back</button>
        <div className="mb-6 text-center">
          <BrandMark />
          <div className="mx-auto mt-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-violet-500 text-white shadow-lg shadow-rose-200"><Lock className="h-6 w-6" /></div>
          <h1 className="mt-4 font-heading text-3xl font-black text-rose-950">Change your password</h1>
          <p className="mt-2 text-sm text-rose-500">Pick something only you would know.</p>
        </div>
        <section className="rounded-[2rem] border border-white bg-white/85 p-6 shadow-[0_24px_70px_-35px_rgba(159,18,57,.5)] backdrop-blur">
          {done ? (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Heart className="h-6 w-6 fill-emerald-500 text-emerald-500" /></div>
              <p className="mt-4 font-bold text-rose-950">Your password is updated.</p>
              <AppButton onClick={() => navigate(-1)} className="mt-5 w-full bg-gradient-to-r from-rose-500 to-violet-500 text-white">Back to the app</AppButton>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && <div role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-600">{error}</div>}
              <label className="block text-sm font-bold text-rose-950">Current password<div className="relative mt-2"><Lock className="absolute left-4 top-4 h-4 w-4 text-rose-300" /><AppInput type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" className="pl-11" required /></div></label>
              <label className="block text-sm font-bold text-rose-950">New password<div className="relative mt-2"><Lock className="absolute left-4 top-4 h-4 w-4 text-rose-300" /><AppInput type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 6 characters" className="pl-11" required /></div></label>
              <label className="block text-sm font-bold text-rose-950">Confirm new password<div className="relative mt-2"><Lock className="absolute left-4 top-4 h-4 w-4 text-rose-300" /><AppInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="pl-11" required /></div></label>
              <AppButton type="submit" disabled={busy} className="w-full bg-gradient-to-r from-rose-500 to-violet-500 text-white hover:opacity-95">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busy ? "Saving…" : "Update password"}</AppButton>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}