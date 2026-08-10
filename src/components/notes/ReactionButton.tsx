import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

export default function ReactionButton({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  const [popping, setPopping] = useState(false);

  const tap = () => {
    setPopping(true);
    setTimeout(() => setPopping(false), 650);
    onToggle();
  };

  return (
    <button type="button" onClick={tap} aria-label={active ? "Remove heart" : "Send a heart"} className="relative grid h-10 w-10 place-items-center rounded-full text-rose-400 transition-colors hover:bg-rose-50">
      <AnimatePresence>
        {popping && (
          <motion.span key="burst" initial={{ opacity: 1, y: 0, scale: 0.5 }} animate={{ opacity: 0, y: -26, scale: 1.3 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2">
            <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" />
          </motion.span>
        )}
      </AnimatePresence>
      <motion.span whileTap={{ scale: 0.75 }} animate={active ? { scale: [1, 1.25, 1] } : { scale: 1 }} transition={{ duration: 0.35 }}>
        <Heart className={`h-6 w-6 ${active ? "fill-rose-500 text-rose-500" : "fill-none"}`} />
      </motion.span>
    </button>
  );
}