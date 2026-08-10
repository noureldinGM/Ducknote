import { Heart } from 'lucide-react';

export default function NoteComposer({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-rose-400"><Heart className="h-4 w-4 fill-rose-300" /><span className="text-sm font-bold">Write something for them…</span></div>
      <div className="relative">
        <span className="pointer-events-none absolute -left-3 -top-3 text-2xl">💗</span>
        <span className="pointer-events-none absolute -bottom-2 -right-2 text-xl">✨</span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={4000}
          rows={7}
          autoFocus
          placeholder="I just wanted to say that I miss you ❤️"
          className="w-full resize-none rounded-[1.75rem] border border-rose-100 bg-gradient-to-br from-rose-50 to-violet-50 p-5 text-lg font-medium leading-relaxed text-rose-950 shadow-[inset_0_2px_20px_-12px_rgba(159,18,57,.4)] outline-none placeholder:text-rose-300 focus-visible:ring-2 focus-visible:ring-rose-200"
        />
      </div>
      <div className="flex items-center justify-between px-1 text-xs text-rose-400">
        <span>Keep it sweet and personal.</span>
        <span>{value.length}/4000</span>
      </div>
    </div>
  );
}