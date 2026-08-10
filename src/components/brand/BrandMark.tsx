import { Heart } from "lucide-react";

export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-violet-500 shadow-lg shadow-rose-200">
        <Heart className="h-5 w-5 fill-white text-white" />
      </span>
      {!compact && <span className="font-heading text-xl font-extrabold tracking-tight text-rose-950">DuckNote</span>}
    </div>
  );
}