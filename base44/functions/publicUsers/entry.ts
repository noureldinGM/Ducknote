import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { normalizeUsername } from '../../shared/accountUtils.ts';

const toPublic = (a) => ({
  id: a.id,
  username: a.username || '',
  displayName: a.displayName || '',
  profileImage: a.profileImage || ''
});

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { username, ids } = body || {};

    if (Array.isArray(ids) && ids.length) {
      const clean = ids.filter((x) => typeof x === 'string' && /^[a-f0-9]{24}$/i.test(x)).slice(0, 50);
      if (!clean.length) return Response.json({ users: {} });
      const accounts = await base44.asServiceRole.entities.Account.filter(
        { id: { $in: clean }, active: { $ne: false } },
        undefined,
        50
      );
      const map = {};
      for (const a of accounts) map[a.id] = toPublic(a);
      return Response.json({ users: map });
    }

    if (typeof username === 'string' && username.trim()) {
      const q = normalizeUsername(username);
      if (q.length < 2) return Response.json({ users: [] });
      const accounts = await base44.asServiceRole.entities.Account.filter(
        { username: { $regex: q, $options: 'i' }, active: { $ne: false } },
        'username',
        12
      );
      const matches = accounts.map(toPublic);
      return Response.json({ users: matches });
    }

    return Response.json({ users: [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}