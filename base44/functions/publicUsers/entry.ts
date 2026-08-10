import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const toPublic = (u) => ({
  id: u.id,
  username: u.username || '',
  displayName: u.displayName || u.full_name || '',
  profileImage: u.profileImage || ''
});

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { username, ids } = body || {};

    const all = await base44.asServiceRole.entities.User.list(undefined, 500);

    if (Array.isArray(ids) && ids.length) {
      const map = {};
      for (const u of all) if (ids.includes(u.id)) map[u.id] = toPublic(u);
      return Response.json({ users: map });
    }

    if (typeof username === 'string' && username.trim()) {
      const q = username.trim().toLowerCase().replace(/^@/, '');
      const matches = all
        .filter((u) => u.id !== user.id && (u.username || '').toLowerCase().includes(q))
        .slice(0, 12)
        .map(toPublic);
      return Response.json({ users: matches });
    }

    return Response.json({ users: [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}