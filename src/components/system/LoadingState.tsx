import { Loader2 } from "lucide-react";

export default function LoadingState({ label = "Gathering your little corner…" }: { label?: string }) {
  return <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-rose-500"><Loader2 className="h-7 w-7 animate-spin" /><p className="text-sm font-medium">{label}</p></div>;
}