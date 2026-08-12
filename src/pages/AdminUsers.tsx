import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { UserPlus, Trash2, KeyRound, Loader2, X, ShieldCheck, UserCog, Camera } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { callFunction } from "@/lib/callFn";
import AppButton from "@/components/system/AppButton";
import AppInput from "@/components/system/AppInput";
import UserAvatar from "@/components/system/UserAvatar";
import SurfaceCard from "@/components/system/SurfaceCard";
import EmptyState from "@/components/system/EmptyState";
import ErrorState from "@/components/system/ErrorState";
import { displayUsername, validateUsername } from "@/lib/username";
import { supabase } from "@/lib/supabase";

type Account = { id: string; username: string; displayName: string; role: string; email?: string; profileImage?: string; active: boolean };

export default function AdminUsers() {
  const { user, token } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [resetTarget, setResetTarget] = useState<Account | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editError, setEditError] = useState("");

  const load = async () => {
    if (!user || !token) return;
    setLoading(true);
    setError("");
    try {
      const data = await callFunction("accountAuth", { action: "list", adminId: user.id, adminToken: token });
      setAccounts(data.accounts || []);
    } catch (e: any) {
      setError(e.message || "Couldn't load accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user, token]);

  const resetForm = () => { setUsername(""); setDisplayName(""); setPassword(""); setEmail(""); setRole("user"); setFormError(""); };

  const openEdit = (a: Account) => {
    setEditTarget(a); setEditName(a.displayName); setEditUsername(a.username); setEditImage(a.profileImage || ""); setEditError("");
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditError("");
    if (!editName.trim()) { setEditError("Display name is required."); return; }
    setBusy(true);
    try {
      await callFunction("accountAuth", { action: "updateUser", targetId: editTarget.id, displayName: editName.trim(), username: editUsername, profileImage: editImage, adminId: user.id, adminToken: token });
      setEditTarget(null);
      await load();
    } catch (err: any) {
      setEditError(err.message || "Couldn't update the account.");
    } finally {
      setBusy(false);
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    const uErr = validateUsername(username);
    if (uErr) { setFormError(uErr); return; }
    if (password.length < 6) { setFormError("Password must be at least 6 characters."); return; }
    if (!displayName.trim()) { setFormError("Display name is required."); return; }
    if (role === "admin" && !email.trim()) { setFormError("Admin accounts require an email."); return; }
    setBusy(true);
    try {
      await callFunction("accountAuth", { action: "create", username, displayName: displayName.trim(), password, email: email.trim(), role, adminId: user.id, adminToken: token });
      resetForm();
      setShowForm(false);
      await load();
    } catch (err: any) {
      setFormError(err.message || "Couldn't create the account.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (acc: Account) => {
    if (!confirm(`Delete @${acc.username}? This cannot be undone.`)) return;
    try {
      await callFunction("accountAuth", { action: "remove", targetId: acc.id, adminId: user.id, adminToken: token });
      await load();
    } catch (e: any) {
      alert(e.message || "Couldn't delete the account.");
    }
  };

  const doReset = async (e: FormEvent) => {
    e.preventDefault();
    setResetError("");
    if (newPassword.length < 6) { setResetError("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      await callFunction("accountAuth", { action: "resetPassword", targetId: resetTarget!.id, newPassword, adminId: user.id, adminToken: token });
      setResetTarget(null);
      setNewPassword("");
      setResetError("");
    } catch (err: any) {
      setResetError(err.message || "Couldn't reset the password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="font-heading text-2xl font-black text-rose-950">Accounts</h2>
          <p className="mt-1 text-sm text-rose-500">Create usernames and passwords for your people.</p>
        </div>
        <button onClick={() => { setShowForm((s) => !s); resetForm(); }} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-violet-500 px-4 text-sm font-bold text-white shadow-sm">
          <UserPlus className="h-4 w-4" />New
        </button>
      </div>

      {showForm && (
        <SurfaceCard>
          <form onSubmit={create} className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-rose-950">New account</p>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="text-rose-400 hover:text-rose-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-bold text-rose-950">Username</label><AppInput value={username} onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)} placeholder="username" required /></div>
              <div><label className="mb-1 block text-xs font-bold text-rose-950">Display name</label><AppInput value={displayName} onChange={(e: ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)} placeholder="Lovely name" required /></div>
              <div><label className="mb-1 block text-xs font-bold text-rose-950">Password</label><AppInput type="password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} placeholder="At least 6 characters" required /></div>
              <div><label className="mb-1 block text-xs font-bold text-rose-950">Email (admin only)</label><AppInput type="email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="admin@example.com" /></div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-rose-950">Role</label>
              <div className="flex gap-2 rounded-2xl bg-white/70 p-1">
                {(["user", "admin"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)} className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${role === r ? "bg-gradient-to-r from-rose-500 to-violet-500 text-white" : "text-rose-400"}`}>{r}</button>
                ))}
              </div>
            </div>
            {formError && <ErrorState message={formError} />}
            <AppButton disabled={busy} className="w-full bg-gradient-to-r from-rose-500 to-violet-500 text-white">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create account</AppButton>
          </form>
        </SurfaceCard>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-rose-400"><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading accounts…</span></div>
      ) : error ? (
        <ErrorState message={error} />
      ) : accounts.length === 0 ? (
        <SurfaceCard><EmptyState icon={UserPlus} title="No accounts yet" message="Create the first account to get started." /></SurfaceCard>
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => (
            <SurfaceCard key={a.id}>
              <div className="flex items-center gap-3">
                <UserAvatar src={a.profileImage} name={a.displayName} className="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-rose-950">{a.displayName} {a.role === "admin" && <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-600"><ShieldCheck className="h-3 w-3" />admin</span>}</p>
                  <p className="truncate text-xs text-rose-400">{displayUsername(a.username)}{a.email ? ` · ${a.email}` : ""}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(a)} aria-label="Edit user" className="grid h-9 w-9 place-items-center rounded-xl text-rose-400 hover:bg-rose-50 hover:text-rose-600"><UserCog className="h-4 w-4" /></button>
                  <button onClick={() => { setResetTarget(a); setNewPassword(""); setResetError(""); }} aria-label="Reset password" className="grid h-9 w-9 place-items-center rounded-xl text-rose-400 hover:bg-rose-50 hover:text-rose-600"><KeyRound className="h-4 w-4" /></button>
                  {a.id !== user.id && <button onClick={() => remove(a)} aria-label="Delete account" className="grid h-9 w-9 place-items-center rounded-xl text-rose-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-rose-950/30 p-4 sm:items-center" onClick={() => setResetTarget(null)}>
          <div className="w-full max-w-sm rounded-[1.75rem] border border-white bg-white p-6 shadow-2xl">
            <form onSubmit={doReset} onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <p className="font-bold text-rose-950">Reset password</p>
                <button type="button" onClick={() => setResetTarget(null)} className="text-rose-400 hover:text-rose-600"><X className="h-5 w-5" /></button>
              </div>
              <p className="mb-3 text-sm text-rose-500">Set a new password for {displayUsername(resetTarget.username)}. They'll be logged out everywhere.</p>
              <AppInput type="password" value={newPassword} onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)} placeholder="New password" required />
              {resetError && <div className="mt-3"><ErrorState message={resetError} /></div>}
              <AppButton disabled={busy} className="mt-4 w-full bg-gradient-to-r from-rose-500 to-violet-500 text-white">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save new password</AppButton>
            </form>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-rose-950/30 p-4 sm:items-center" onClick={() => setEditTarget(null)}>
          <div className="w-full max-w-sm rounded-[1.75rem] border border-white bg-white p-6 shadow-2xl">
            <form onSubmit={saveEdit} onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <p className="font-bold text-rose-950">Edit {displayUsername(editTarget.username)}</p>
                <button type="button" onClick={() => setEditTarget(null)} className="text-rose-400 hover:text-rose-600"><X className="h-5 w-5" /></button>
              </div>
              <div className="mb-4 flex items-center gap-3">
                <UserAvatar src={editImage} name={editName} className="h-14 w-14" />
                <label className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl bg-rose-50 px-3 text-xs font-bold text-rose-600"><Camera className="h-3.5 w-3.5" />Photo<input type="file" accept="image/*" className="sr-only" onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                  const f = e.target.files?.[0];
                  if (!f) return;

                  try {
                    const extension = f.name.split(".").pop() || "jpg";
                    const path = `profiles/${editTarget?.id}/${crypto.randomUUID()}.${extension}`;

                    const { error } = await supabase.storage
                      .from("profile-images")
                      .upload(path, f, {
                        cacheControl: "3600",
                        upsert: false,
                        contentType: f.type || "image/jpeg",
                      });

                    if (error) {
                      throw error;
                    }

                    const { data } = supabase.storage
                      .from("profile-images")
                      .getPublicUrl(path);

                    setEditImage(data.publicUrl);
                  } catch (error) {
                    console.error("[DuckNote] Profile image upload failed:", error);
                  }
                }} /></label>
              </div>
              <label className="mb-1 block text-xs font-bold text-rose-950">Display name</label>
              <AppInput value={editName} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)} className="mb-3" required />
              <label className="mb-1 block text-xs font-bold text-rose-950">Username</label>
              <AppInput value={editUsername} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditUsername(e.target.value)} required />
              {editError && <div className="mt-3"><ErrorState message={editError} /></div>}
              <AppButton disabled={busy} className="mt-4 w-full bg-gradient-to-r from-rose-500 to-violet-500 text-white">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes</AppButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}