import { Heart } from "lucide-react";
import SurfaceCard from "./SurfaceCard";

export default function NoteCard({ text, status }: { text: string; status: string }) {
  return <SurfaceCard className="bg-gradient-to-br from-rose-50 to-violet-50"><Heart className="mb-4 h-5 w-5 fill-rose-400 text-rose-400" /><p className="font-medium leading-relaxed text-rose-950">{text}</p><p className="mt-4 text-xs font-bold uppercase tracking-widest text-rose-400">{status}</p></SurfaceCard>;
}