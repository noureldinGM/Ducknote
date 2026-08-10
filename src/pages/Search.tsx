import { useNavigate } from 'react-router-dom';
import UserSearch from '@/components/notes/UserSearch';

export default function Search() {
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      <div className="px-1">
        <h2 className="font-heading text-2xl font-black text-rose-950">Find someone</h2>
        <p className="mt-1 text-sm text-rose-500">Search by @username to send them a little note.</p>
      </div>
      <UserSearch onSelect={(user) => navigate('/create', { state: { recipient: user } })} />
    </div>
  );
}