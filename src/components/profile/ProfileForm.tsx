import { useState, type ChangeEvent } from "react";
import {
  Camera,
  Loader2,
  Bell,
  MessageCircle,
  Music,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { callFunction } from "@/lib/callFn";

import AppButton from "@/components/system/AppButton";
import AppInput from "@/components/system/AppInput";
import ErrorState from "@/components/system/ErrorState";
import UserAvatar from "@/components/system/UserAvatar";
import { displayUsername } from "@/lib/username";

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition-colors ${on
          ? "bg-gradient-to-r from-rose-500 to-violet-500"
          : "bg-rose-100"
        }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.4rem]" : "left-0.5"
          }`}
      />
    </button>
  );
}

export default function ProfileForm({
  user,
  refresh,
}: {
  user: any;
  refresh: () => Promise<void>;
}) {
  const { token } = useAuth();

  const [name, setName] = useState(
    user.displayName || user.full_name || ""
  );

  const [image, setImage] = useState(
    user.profileImage || ""
  );

  const [notifyText, setNotifyText] = useState(
    user.notifyText !== false
  );

  const [notifyAudio, setNotifyAudio] = useState(
    user.notifyAudio !== false
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const upload = async (file?: File) => {
    if (!file) return;

    setBusy(true);
    setError("");
    setSaved(false);

    try {
      if (!user?.id) {
        throw new Error("You must be logged in to upload a photo.");
      }

      if (!file.type.startsWith("image/")) {
        throw new Error("Please choose an image file.");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Profile images must be smaller than 5 MB.");
      }

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const filePath = `${user.id}/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("profile-images")
        .getPublicUrl(filePath);

      if (!publicUrl) {
        throw new Error("Could not create the image URL.");
      }

      setImage(publicUrl);
    } catch (e: any) {
      setError(
        e?.message || "Couldn't upload that photo."
      );
    } finally {
      setBusy(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    setBusy(true);
    setError("");
    setSaved(false);

    try {
      await callFunction("accountAuth", {
        action: "updateProfile",
        displayName: name.trim(),
        profileImage: image,
        notifyText,
        notifyAudio,
        id: user.id,
        token,
      });

      await refresh();

      setSaved(true);
    } catch (e: any) {
      setError(
        e?.message || "Couldn't save your profile."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex items-center gap-4">
        <UserAvatar
          src={image}
          name={name}
          className="h-20 w-20"
        />

        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl bg-rose-50 px-4 text-sm font-bold text-rose-600">
          <Camera className="h-4 w-4" />

          Change photo

          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              upload(e.target.files?.[0])
            }
            className="sr-only"
          />
        </label>
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-rose-950">
          Display name
        </label>

        <AppInput
          value={name}
          maxLength={50}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setName(e.target.value)
          }
          required
        />
      </div>

      <div>
        <p className="text-sm font-bold text-rose-950">
          Username
        </p>

        <p className="mt-1 text-sm text-rose-400">
          {displayUsername(user.username)}
        </p>
      </div>

      <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-rose-950">
          <Bell className="h-4 w-4" />
          Notifications
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-rose-700">
              <MessageCircle className="h-4 w-4 text-rose-400" />
              New text notes
            </span>

            <Toggle
              on={notifyText}
              onChange={setNotifyText}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-rose-700">
              <Music className="h-4 w-4 text-violet-400" />
              Audio notes
            </span>

            <Toggle
              on={notifyAudio}
              onChange={setNotifyAudio}
            />
          </div>
        </div>
      </div>

      {error && <ErrorState message={error} />}

      {saved && (
        <p className="text-sm font-bold text-emerald-600">
          Your profile feels more like you now.
        </p>
      )}

      <AppButton
        disabled={busy}
        className="w-full bg-gradient-to-r from-rose-500 to-violet-500 text-white hover:opacity-95"
      >
        {busy && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}

        Save changes
      </AppButton>
    </form>
  );
}