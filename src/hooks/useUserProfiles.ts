import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export function useUserProfiles(ids: string[]) {
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const key = ids.filter(Boolean).join(',');
  useEffect(() => {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return;
    let active = true;
    base44.functions
      .invoke('publicUsers', { ids: unique })
      .then((res) => {
        if (active && res.data?.users) setProfiles((prev) => ({ ...prev, ...res.data.users }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [key]);
  return profiles;
}