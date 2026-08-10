import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Loader2 } from "lucide-react";

export default function LoveButton({ children, onClick, loading = false, disabled = false, variant = "solid", className = "" }: { children: React.ReactNode; onClick?: () => void; loading?: boolean; disabled?: boolean; variant?: "solid" | "outline"; className?: string }) {
  const [bursts, setBursts] = useState<number[]>([]);

  const handle = () => {
    if (disabled || loading) return;
    const id = Date.now() + Math.random();
    setBursts((b) => [...b, id]);
    setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 700);
    onClick?.();
  };

  const base = variant === "solid" ? "bg-gradient-to-r from-rose-500 to-violet-500 text-white shadow-lg shadow-rose-200" : "border border-rose-200 bg-white text-rose-600";

  return (
    <motion.button
      type="button"
      onClick={handle}
      disabled={disabled || loading}
      whileTap={{ scale: 0.93 }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`relative flex items-center justify-center gap-2 overflow-visible rounded-2xl px-6 py-3.5 font-bold disabled:opacity-60 ${base} ${className}`}
    >
      <AnimatePresence>
        {bursts.map((id) => (
          <motion.span key={id} initial={{ opacity: 1, y: 0, scale: 0.6 }} animate={{ opacity: 0, y: -34, scale: 1.2 }} exit={{ opacity: 0 }} transition={{ duration: 0.65, ease: "easeOut" }} className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2">
            <Heart className="h-4 w-4 fill-rose-400 text-rose-400" />
          </motion.span>
        ))}
      </AnimatePresence>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${variant === "solid" ? "fill-white/80" : "fill-rose-300"}`} />}
      <span>{children}</span>
    </motion.button>
  );
}