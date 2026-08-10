import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sha256, randomToken, normalizeUsername, toPublicAccount, verifyAccount, logActivity } from '../../shared/accountUtils.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'login') {
      const username = normalizeUsername(body.username);
      const password = String(body.password || '');
      if (!username || !password) return Response.json({ error: 'Enter your username and password.' }, { status: 400 });
      const all = await base44.asServiceRole.entities.Account.list(undefined, 500);
      const acc = all.find((a) => normalizeUsername(a.username) === username);
      if (!acc) return Response.json({ error: 'Wrong username or password.' }, { status: 401 });
      if (acc.active === false) return Response.json({ error: 'This account is disabled.' }, { status: 403 });
      const hash = await sha256(acc.salt + ':' + password);
      if (hash !== acc.passwordHash) return Response.json({ error: 'Wrong username or password.' }, { status: 401 });
      const token = randomToken();
      await base44.asServiceRole.entities.Account.update(acc.id, { sessionToken: token });
      return Response.json({ account: toPublicAccount(acc), token });
    }

    if (action === 'me') {
      const acc = await verifyAccount(base44, body.id, body.token);
      if (!acc) return Response.json({ error: 'Invalid session.' }, { status: 401 });
      return Response.json({ account: toPublicAccount(acc) });
    }

    if (action === 'logout') {
      if (body.id) {
        const acc = await base44.asServiceRole.entities.Account.get(body.id).catch(() => null);
        if (acc && acc.sessionToken === body.token) {
          await base44.asServiceRole.entities.Account.update(body.id, { sessionToken: '' }).catch(() => {});
        }
      }
      return Response.json({ ok: true });
    }

    if (action === 'changePassword') {
      const acc = await verifyAccount(base44, body.id, body.token);
      if (!acc) return Response.json({ error: 'Your session expired. Please log in again.' }, { status: 401 });
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');
      const cur = await sha256(acc.salt + ':' + currentPassword);
      if (cur !== acc.passwordHash) return Response.json({ error: 'Your current password is incorrect.' }, { status: 401 });
      if (newPassword.length < 6) return Response.json({ error: 'New password must be at least 6 characters.' }, { status: 400 });
      const salt = randomToken();
      const passwordHash = await sha256(salt + ':' + newPassword);
      await base44.asServiceRole.entities.Account.update(acc.id, { salt, passwordHash, sessionToken: body.token });
      await logActivity(base44, acc.id, acc.displayName, 'password_reset', 'account', acc.id, acc.username);
      return Response.json({ ok: true });
    }

    if (action === 'updateProfile') {
      const acc = await verifyAccount(base44, body.id, body.token);
      if (!acc) return Response.json({ error: 'Your session expired. Please log in again.' }, { status: 401 });
      const displayName = String(body.displayName || '').trim().slice(0, 50);
      const profileImage = String(body.profileImage || '');
      if (!displayName) return Response.json({ error: 'Display name is required.' }, { status: 400 });
      const updates: any = { displayName, profileImage };
      if (typeof body.notifyText === 'boolean') updates.notifyText = body.notifyText;
      if (typeof body.notifyAudio === 'boolean') updates.notifyAudio = body.notifyAudio;
      await base44.asServiceRole.entities.Account.update(acc.id, updates);
      return Response.json({ account: toPublicAccount({ ...acc, ...updates }) });
    }

    if (action === 'search') {
      const acc = await verifyAccount(base44, body.id, body.token);
      if (!acc) return Response.json({ error: 'Your session expired. Please log in again.' }, { status: 401 });
      const q = normalizeUsername(body.query || '');
      const all = await base44.asServiceRole.entities.Account.list(undefined, 500);
      const matches = all
        .filter((a) => a.id !== acc.id && a.active !== false && normalizeUsername(a.username).includes(q))
        .slice(0, 12)
        .map(toPublicAccount);
      return Response.json({ users: matches });
    }

    if (action === 'friendsList') {
      const acc = await verifyAccount(base44, body.id, body.token);
      if (!acc) return Response.json({ error: 'Your session expired. Please log in again.' }, { status: 401 });
      const all = await base44.asServiceRole.entities.Friend.list(undefined, 500);
      const friends = all.filter((f) => f.ownerId === acc.id);
      return Response.json({ friends });
    }

    if (action === 'addFriend') {
      const acc = await verifyAccount(base44, body.id, body.token);
      if (!acc) return Response.json({ error: 'Your session expired. Please log in again.' }, { status: 401 });
      const targetId = String(body.targetId || '');
      if (!targetId || targetId === acc.id) return Response.json({ error: 'Pick someone else.' }, { status: 400 });
      const target = await base44.asServiceRole.entities.Account.get(targetId).catch(() => null);
      if (!target || target.active === false) return Response.json({ error: 'That person no longer has an account.' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.Friend.list(undefined, 500);
      if (existing.some((f) => f.ownerId === acc.id && f.targetId === targetId)) {
        return Response.json({ error: 'They are already on your board.' }, { status: 409 });
      }
      const friend = await base44.asServiceRole.entities.Friend.create({
        ownerId: acc.id,
        targetId,
        targetUsername: target.username,
        targetDisplayName: target.displayName,
        targetProfileImage: target.profileImage || ''
      });
      return Response.json({ friend });
    }

    if (action === 'removeFriend') {
      const acc = await verifyAccount(base44, body.id, body.token);
      if (!acc) return Response.json({ error: 'Your session expired. Please log in again.' }, { status: 401 });
      const friendId = String(body.friendId || '');
      if (!friendId) return Response.json({ error: 'No friend selected.' }, { status: 400 });
      const all = await base44.asServiceRole.entities.Friend.list(undefined, 500);
      const target = all.find((f) => f.id === friendId && f.ownerId === acc.id);
      if (!target) return Response.json({ error: 'Not found.' }, { status: 404 });
      await base44.asServiceRole.entities.Friend.delete(friendId);
      return Response.json({ ok: true });
    }

    const requireAdmin = async () => {
      const acc = await verifyAccount(base44, body.adminId, body.adminToken);
      if (!acc || acc.role !== 'admin') return null;
      return acc;
    };

    if (action === 'adminStats') {
      const admin = await requireAdmin();
      if (!admin) return Response.json({ error: 'Admin access required.' }, { status: 403 });
      const accounts = await base44.asServiceRole.entities.Account.list(undefined, 500);
      const notes = await base44.asServiceRole.entities.Note.list(undefined, 500);
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const startToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
      const notesToday = notes.filter((n) => new Date(n.created_date).getTime() >= startToday).length;
      const notesWeek = notes.filter((n) => new Date(n.created_date).getTime() >= now - 7 * dayMs).length;
      const activeUsers = accounts.filter((a) => a.active !== false).length;
      return Response.json({ totalUsers: accounts.length, activeUsers, notesToday, notesWeek, totalNotes: notes.length });
    }

    if (action === 'create') {
      const username = normalizeUsername(body.username);
      const password = String(body.password || '');
      const displayName = String(body.displayName || username).trim();
      const role = body.role === 'admin' ? 'admin' : 'user';
      const email = String(body.email || '').trim();
      if (!username || !/^[a-z0-9_]{3,24}$/.test(username)) return Response.json({ error: 'Username must be 3–24 lowercase letters, numbers, or underscores.' }, { status: 400 });
      if (password.length < 6) return Response.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
      if (!displayName) return Response.json({ error: 'Display name is required.' }, { status: 400 });
      if (role === 'admin' && !email) return Response.json({ error: 'Admin accounts require an email.' }, { status: 400 });

      const existing = await base44.asServiceRole.entities.Account.list(undefined, 500);
      const adminExists = existing.some((a) => a.role === 'admin');
      const isBootstrap = !adminExists && role === 'admin';
      let admin = null;
      if (!isBootstrap) {
        admin = await requireAdmin();
        if (!admin) return Response.json({ error: 'Admin access required.' }, { status: 403 });
      }
      if (existing.some((a) => normalizeUsername(a.username) === username)) {
        return Response.json({ error: 'That username is already taken.' }, { status: 409 });
      }
      const salt = randomToken();
      const passwordHash = await sha256(salt + ':' + password);
      const created = await base44.asServiceRole.entities.Account.create({
        username, displayName, role, email, salt, passwordHash, active: true
      });
      if (admin) await logActivity(base44, admin.id, admin.displayName, 'user_created', 'account', created.id, username);
      return Response.json({ account: toPublicAccount(created) });
    }

    if (action === 'list') {
      const admin = await requireAdmin();
      if (!admin) return Response.json({ error: 'Admin access required.' }, { status: 403 });
      const all = await base44.asServiceRole.entities.Account.list(undefined, 500);
      return Response.json({ accounts: all.map(toPublicAccount) });
    }

    if (action === 'updateUser') {
      const admin = await requireAdmin();
      if (!admin) return Response.json({ error: 'Admin access required.' }, { status: 403 });
      const { targetId, displayName, username, profileImage } = body;
      if (!targetId) return Response.json({ error: 'No account selected.' }, { status: 400 });
      const target = await base44.asServiceRole.entities.Account.get(targetId).catch(() => null);
      if (!target) return Response.json({ error: 'Account not found.' }, { status: 404 });
      if (target.role === 'admin' && String(body.role || target.role) !== 'admin') {
        return Response.json({ error: 'You cannot demote an admin here.' }, { status: 400 });
      }
      const newUsername = normalizeUsername(username);
      if (newUsername && newUsername !== target.username) {
        if (!/^[a-z0-9_]{3,24}$/.test(newUsername)) return Response.json({ error: 'Username must be 3–24 lowercase letters, numbers, or underscores.' }, { status: 400 });
        const all = await base44.asServiceRole.entities.Account.list(undefined, 500);
        if (all.some((a) => a.id !== targetId && normalizeUsername(a.username) === newUsername)) {
          return Response.json({ error: 'That username is already taken.' }, { status: 409 });
        }
      }
      const updates: any = {};
      if (String(displayName || '').trim()) updates.displayName = String(displayName).trim().slice(0, 50);
      if (newUsername) updates.username = newUsername;
      if (typeof profileImage === 'string') updates.profileImage = profileImage;
      if (Object.keys(updates).length === 0) return Response.json({ error: 'Nothing to update.' }, { status: 400 });
      await base44.asServiceRole.entities.Account.update(targetId, updates);
      await base44.asServiceRole.entities.Friend.list(undefined, 500).then((friends) => {
        const mine = friends.filter((f) => f.targetId === targetId);
        return Promise.all(mine.map((f) => base44.asServiceRole.entities.Friend.update(f.id, {
          targetUsername: updates.username || f.targetUsername,
          targetDisplayName: updates.displayName || f.targetDisplayName,
          targetProfileImage: updates.profileImage !== undefined ? updates.profileImage : f.targetProfileImage
        })));
      }).catch(() => {});
      if (newUsername && newUsername !== target.username) {
        await logActivity(base44, admin.id, admin.displayName, 'username_changed', 'account', targetId, `${target.username} → ${newUsername}`);
      } else {
        await logActivity(base44, admin.id, admin.displayName, 'user_updated', 'account', targetId, target.username);
      }
      return Response.json({ account: toPublicAccount({ ...target, ...updates }) });
    }

    if (action === 'remove') {
      const admin = await requireAdmin();
      if (!admin) return Response.json({ error: 'Admin access required.' }, { status: 403 });
      const { targetId } = body;
      if (!targetId) return Response.json({ error: 'No account selected.' }, { status: 400 });
      if (targetId === admin.id) return Response.json({ error: 'You cannot delete your own account.' }, { status: 400 });
      const target = await base44.asServiceRole.entities.Account.get(targetId).catch(() => null);
      if (!target) return Response.json({ error: 'Account not found.' }, { status: 404 });
      if (target.role === 'admin') return Response.json({ error: 'You cannot delete an admin account.' }, { status: 400 });
      await base44.asServiceRole.entities.Account.delete(targetId);
      await logActivity(base44, admin.id, admin.displayName, 'user_deleted', 'account', targetId, target.username);
      return Response.json({ ok: true });
    }

    if (action === 'resetPassword') {
      const admin = await requireAdmin();
      if (!admin) return Response.json({ error: 'Admin access required.' }, { status: 403 });
      const { targetId, newPassword } = body;
      if (String(newPassword || '').length < 6) return Response.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
      const target = await base44.asServiceRole.entities.Account.get(targetId).catch(() => null);
      if (!target) return Response.json({ error: 'Account not found.' }, { status: 404 });
      const salt = randomToken();
      const passwordHash = await sha256(salt + ':' + newPassword);
      await base44.asServiceRole.entities.Account.update(targetId, { salt, passwordHash, sessionToken: '' });
      await logActivity(base44, admin.id, admin.displayName, 'password_reset', 'account', targetId, target.username);
      return Response.json({ ok: true });
    }

    if (action === 'activity') {
      const admin = await requireAdmin();
      if (!admin) return Response.json({ error: 'Admin access required.' }, { status: 403 });
      const logs = await base44.asServiceRole.entities.ActivityLog.list('-created_date', 100);
      return Response.json({ logs });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}