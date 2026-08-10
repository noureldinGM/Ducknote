import { useState } from 'react';
import { Search as SearchIcon, Loader2, Send } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { callFunction } from '@/lib/callFn';
import AppInput from '@/components/system/AppInput';
import UserAvatar from '@/components/system/UserAvatar';
import EmptyState from '@/components/system/EmptyState';
import AppButton from '@/components/system/AppButton';
import { displayUsername } from '@/lib/username';

type PublicUser = { id: string; username: string; displayName: string; profileImage?: string };

export default function UserSearch({ onSelect, ctaLabel = 'Send note' }: { onSelect: (user: PublicUser) => void; ctaLabel?: string }) {
  const { user, token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const run = async (q: string) => {
    setLoading(true);
    try {
      const data = await callFunction("accountAuth", { action: "search", query: q, id: user.id, token });
      setResults(data.users || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const onChange = (value: string) => {
    setQuery(value);
    const q = value.trim().toLowerCase().replace(/^@/, '');
    setSearched(false);
    if (!q) { setResults([]); return; }
    setTimeout(() => run(q), 300);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <SearchIcon className="absolute left-4 top-4 h-4 w-4 text-rose-300" />
        <AppInput value={query} onChange={(e) => onChange(e.target.value)} placeholder="Search for someone... @username" className="pl-11" />
      </div>

      {loading && <div className="flex items-center justify-center gap-2 py-6 text-rose-400"><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm font-medium">Looking…</span></div>}

      {!loading && searched && results.length === 0 && (
        <EmptyState icon={SearchIcon} title="We couldn't find them" message="Check the username and try again." />
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-white/85 p-3 shadow-sm">
              <UserAvatar src={u.profileImage} name={u.displayName} className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-rose-950">{u.displayName || 'DuckNote friend'}</p>
                <p className="text-sm text-rose-400">{displayUsername(u.username)}</p>
              </div>
              <AppButton size="sm" className="bg-gradient-to-r from-rose-500 to-violet-500 text-white" onClick={() => onSelect(u)}>
                <Send className="h-3.5 w-3.5" />{ctaLabel}
              </AppButton>
            </div>
          ))}
        </div>
      )}

      {!loading && !searched && results.length === 0 && (
        <p className="px-1 text-sm text-rose-400">Type a username to find your person.</p>
      )}
    </div>
  );
}