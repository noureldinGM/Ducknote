import { Heart } from 'lucide-react';
import UserAvatar from '@/components/system/UserAvatar';
import { displayUsername } from '@/lib/username';

type PublicUser = { id: string; username: string; displayName: string; profileImage?: string };

export default function NotePreview({ recipient, text }: { recipient: PublicUser; text: string }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl bg-white/70 p-3">
        <UserAvatar src={recipient.profileImage} name={recipient.displayName} className="h-12 w-12" />
        <div><p className="text-xs font-bold uppercase tracking-widest text-rose-400">To</p><p className="font-bold text-rose-950">{recipient.displayName || 'DuckNote friend'}</p><p className="text-sm text-rose-400">{displayUsername(recipient.username)}</p></div>
      </div>
      <div className="relative rounded-[1.75rem] border border-rose-100 bg-gradient-to-br from-rose-50 to-violet-50 p-6 shadow-[0_20px_60px_-35px_rgba(159,18,57,.5)]">
        <Heart className="absolute right-5 top-5 h-5 w-5 fill-rose-200 text-rose-200" />
        <p className="whitespace-pre-wrap text-lg font-medium leading-relaxed text-rose-950">{text}</p>
      </div>
      <p className="text-center text-sm font-medium text-rose-400">A little digital gift, ready to go 💌</p>
    </div>
  );
}