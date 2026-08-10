import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, FileAudio, MessageCircle, Check, Sparkles, Music } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { callFunction } from "@/lib/callFn";
import UserSearch from "@/components/notes/UserSearch";
import NoteComposer from "@/components/notes/NoteComposer";
import NotePreview from "@/components/notes/NotePreview";
import AudioEditor from "@/components/audio/AudioEditor";

type ClipResult = { blob: Blob; originalFileName: string; startTimeMs: number; endTimeMs: number; durationMs: number; mimeType: string };
import AudioPlayer from "@/components/audio/AudioPlayer";
import SurfaceCard from "@/components/system/SurfaceCard";
import LoveButton from "@/components/notes/LoveButton";
import ErrorState from "@/components/system/ErrorState";
import { displayUsername } from "@/lib/username";
import { UPLOAD_FAILED_MESSAGE } from "@/lib/audioLimits";

type PublicUser = { id: string; username: string; displayName: string; profileImage?: string };
type Step = "find" | "type" | "write" | "preview" | "audioPick" | "audioEditor" | "audioPreview" | "sent";

export default function CreateNote() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [step, setStep] = useState<Step>(location.state?.recipient ? "type" : "find");
  const [recipient, setRecipient] = useState<PublicUser | null>(location.state?.recipient || null);
  const [text, setText] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [clip, setClip] = useState<ClipResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const choose = (u: PublicUser) => { setRecipient(u); setStep("type"); setError(""); };

  const reset = () => { setRecipient(null); setText(""); setAudioFile(null); setClip(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(""); setError(""); setStep("find"); };

  const onAudioChosen = (file: File) => {
    if (!file.type.startsWith("audio/")) { setError("That doesn't look like an audio file."); return; }
    setAudioFile(file);
    setError("");
    setStep("audioEditor");
  };

  const onClipConfirmed = (result: ClipResult) => {
    setClip(result);
    const url = URL.createObjectURL(result.blob);
    setPreviewUrl(url);
    setStep("audioPreview");
  };

  const sendText = async () => {
    setError("");
    if (!recipient?.id || !user?.id) { setError("Pick someone first."); return; }
    if (!text.trim()) { setError("Write a little something."); return; }
    setSending(true);
    try {
      await callFunction("notes", { action: "create", recipientId: recipient.id, type: "text", text: text.trim(), id: user.id, token });
      setStep("sent");
    } catch {
      setError(UPLOAD_FAILED_MESSAGE);
    } finally {
      setSending(false);
    }
  };

  const sendAudio = async () => {
    setError("");
    if (!recipient?.id || !user?.id || !clip) { setError("Something's missing."); return; }
    setSending(true);
    try {
      const fileObj = new File([clip.blob], `clip.${clip.mimeType === "audio/wav" ? "wav" : "m4a"}`, { type: clip.mimeType });
      const upload: any = await base44.integrations.Core.UploadFile({ file: fileObj });
      const audioUrl = upload.data?.file_url || upload.file_url;
      if (!audioUrl) throw new Error("Upload failed");
      await callFunction("notes", {
        action: "create",
        recipientId: recipient.id,
        type: "audio",
        audioUrl,
        audioDuration: clip.durationMs / 1000,
        originalFileName: clip.originalFileName,
        startTimeMs: clip.startTimeMs,
        endTimeMs: clip.endTimeMs,
        durationMs: clip.durationMs,
        mimeType: clip.mimeType,
        id: user.id,
        token
      });
      setStep("sent");
    } catch {
      setError(UPLOAD_FAILED_MESSAGE);
    } finally {
      setSending(false);
    }
  };

  const stepLabel = step === "find" ? "Step 1" : step === "type" ? "Step 2" : step.startsWith("audio") ? "Voice note" : "Step 3";
  const stepTitle = step === "find" ? "Find someone" : step === "type" ? "What kind of note?" : step === "write" ? "What do you want to send?" : step === "preview" ? "Ready to send?" : step === "audioPick" ? "Pick a voice clip" : step === "audioEditor" ? "Choose the part you love" : step === "audioPreview" ? "Ready to send?" : "";

  return (
    <div className="space-y-5">
      {step !== "sent" && (
        <div className="flex items-center gap-3 px-1">
          {step !== "find" && step !== "type" && (
            <button onClick={() => setStep(step === "preview" ? "write" : step === "audioPreview" ? "audioEditor" : step === "audioEditor" ? "audioPick" : step === "audioPick" ? "type" : "type")} className="grid h-10 w-10 place-items-center rounded-2xl text-rose-400 hover:bg-rose-50"><ArrowLeft className="h-5 w-5" /></button>
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-rose-400">{stepLabel}</p>
            <h2 className="font-heading text-2xl font-black text-rose-950">{stepTitle}</h2>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {step === "find" && <UserSearch onSelect={choose} ctaLabel="Choose" />}

          {step === "type" && recipient && (
            <div className="grid gap-3">
              <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-600"><Heart className="h-4 w-4 fill-rose-400 text-rose-400" />Writing to {recipient.displayName} <span className="text-rose-400">{displayUsername(recipient.username)}</span></div>
              <button onClick={() => setStep("write")} className="flex items-center gap-4 rounded-[1.5rem] border border-rose-100 bg-white p-5 text-left shadow-sm transition-transform active:scale-[.98]">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-violet-500 text-white"><MessageCircle className="h-6 w-6" /></span>
                <span><span className="block font-heading text-lg font-black text-rose-950">A text note</span><span className="text-sm text-rose-400">Sweet words, up to 4000 characters.</span></span>
              </button>
              <button onClick={() => setStep("audioPick")} className="flex items-center gap-4 rounded-[1.5rem] border border-rose-100 bg-white p-5 text-left shadow-sm transition-transform active:scale-[.98]">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-rose-500 text-white"><Music className="h-6 w-6" /></span>
                <span><span className="block font-heading text-lg font-black text-rose-950">A voice note</span><span className="text-sm text-rose-400">Pick a song or sound, clip up to 30s.</span></span>
              </button>
            </div>
          )}

          {step === "write" && (
            <SurfaceCard>
              <NoteComposer value={text} onChange={setText} />
              {error && <div className="mt-4"><ErrorState message={error} /></div>}
              <div className="mt-5"><LoveButton onClick={() => { setError(""); setStep("preview"); }} disabled={!text.trim()} className="w-full">Continue to preview</LoveButton></div>
            </SurfaceCard>
          )}

          {step === "preview" && recipient && (
            <SurfaceCard>
              <NotePreview recipient={recipient} text={text} />
              {error && <div className="mt-4"><ErrorState message={error} /></div>}
              <div className="mt-6 flex flex-col gap-3">
                <LoveButton onClick={() => { setError(""); setStep("write"); }} variant="outline" className="w-full">Edit</LoveButton>
                <LoveButton onClick={sendText} loading={sending} disabled={!text.trim()} className="w-full">Send with love 💗</LoveButton>
              </div>
            </SurfaceCard>
          )}

          {step === "audioPick" && (
            <SurfaceCard>
              <div className="mb-4 flex items-center gap-2 text-rose-500"><FileAudio className="h-5 w-5" /><span className="text-sm font-bold">Choose an audio file from your device.</span></div>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/50 px-6 py-10 text-center transition-colors hover:bg-rose-50">
                <FileAudio className="h-8 w-8 text-rose-400" />
                <span className="font-bold text-rose-600">Tap to pick a file</span>
                <span className="text-xs text-rose-400">MP3, M4A, WAV, OGG and more</span>
                <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && onAudioChosen(e.target.files[0])} />
              </label>
              <p className="mt-3 text-center text-[11px] text-rose-300">Your original stays private — only the clipped part gets sent.</p>
              {error && <div className="mt-4"><ErrorState message={error} /></div>}
            </SurfaceCard>
          )}

          {step === "audioEditor" && audioFile && (
            <SurfaceCard>
              <AudioEditor file={audioFile} onConfirm={onClipConfirmed} onCancel={() => setStep("audioPick")} />
            </SurfaceCard>
          )}

          {step === "audioPreview" && recipient && clip && (
            <SurfaceCard>
              <div className="mb-4 flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-600"><Heart className="h-4 w-4 fill-rose-400 text-rose-400" />A {Math.round(clip.durationMs / 1000)}s voice note for {recipient.displayName}</div>
              <AudioPlayer url={previewUrl} durationMs={clip.durationMs} />
              {error && <div className="mt-4"><ErrorState message={error} /></div>}
              <div className="mt-6 flex flex-col gap-3">
                <LoveButton onClick={() => setStep("audioEditor")} variant="outline" className="w-full">Adjust clip</LoveButton>
                <LoveButton onClick={sendAudio} loading={sending} className="w-full">Send with love 💗</LoveButton>
              </div>
            </SurfaceCard>
          )}

          {step === "sent" && (
            <SurfaceCard className="text-center">
              <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-violet-500 text-white shadow-lg shadow-rose-200">
                <Check className="h-9 w-9" />
              </motion.div>
              <h2 className="mt-6 font-heading text-2xl font-black text-rose-950">You sent a little love 💌</h2>
              <p className="mt-2 text-sm text-rose-500">Your {clip ? "voice" : "text"} note is on its way to {recipient?.displayName}.</p>
              <div className="mt-6 flex flex-col gap-3">
                <LoveButton onClick={reset} className="w-full">Send another ✨</LoveButton>
                <button onClick={() => navigate("/history")} className="w-full rounded-2xl border border-rose-200 py-3.5 font-bold text-rose-500">See your history</button>
              </div>
            </SurfaceCard>
          )}
        </motion.div>
      </AnimatePresence>

      {step === "find" && <p className="px-1 text-center text-xs text-rose-300"><Sparkles className="mr-1 inline h-3 w-3" />Only people with a DuckNote account can be found.</p>}
    </div>
  );
}