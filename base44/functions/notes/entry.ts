import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { verifyAccount, toPublicAccount, logActivity } from '../../shared/accountUtils.ts';

const NOTE_TTL_MS = 24 * 60 * 60 * 1000;
const isExpired = (n) => n.expiresAt ? new Date(n.expiresAt).getTime() <= Date.now() : false;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const acc = await verifyAccount(base44, body.id, body.token);
    if (!acc) return Response.json({ error: 'Your session expired. Please log in again.' }, { status: 401 });

    if (action === 'list') {
      const mode = body.mode === 'sent' ? 'sent' : 'received';
      const nowIso = new Date().toISOString();
      const query = mode === 'sent'
        ? { senderId: acc.id, expiresAt: { $gt: nowIso } }
        : { recipientId: acc.id, expiresAt: { $gt: nowIso } };
      const mine = await base44.asServiceRole.entities.Note.filter(query, '-created_date', 100);

      if (mode === 'received') {
        const toDeliver = mine.filter((n) => n.status === 'sent' || n.status === 'sending');
        for (const n of toDeliver) {
          await base44.asServiceRole.entities.Note.update(n.id, {
            status: 'delivered',
            deliveredAt: new Date().toISOString()
          });
        }
      }

      const ids = new Set();
      for (const n of mine) { ids.add(n.senderId); ids.add(n.recipientId); }
      let profileMap = {};
      if (ids.size) {
        const accounts = await base44.asServiceRole.entities.Account.filter(
          { id: { $in: [...ids] } },
          undefined,
          ids.size
        );
        for (const a of accounts) profileMap[a.id] = toPublicAccount(a);
      }

      const signedAudio = {};
      const privateAudioNotes = mine.filter((n) => n.type === 'audio' && n.audioUrl && !n.audioUrl.startsWith('http'));
      if (privateAudioNotes.length) {
        await Promise.all(privateAudioNotes.map(async (n) => {
          try {
            const res = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: n.audioUrl, expires_in: 300 });
            const signed = res?.signed_url || res?.data?.signed_url;
            if (signed) signedAudio[n.id] = signed;
          } catch {}
        }));
      }

      const notes = mine.map((n) => ({
        ...n,
        audioUrl: signedAudio[n.id] || (n.audioUrl && n.audioUrl.startsWith('http') ? n.audioUrl : ''),
        sender: profileMap[n.senderId] || null,
        recipient: profileMap[n.recipientId] || null,
        status: mode === 'received' && (n.status === 'sent' || n.status === 'sending') ? 'delivered' : n.status
      }));

      return Response.json({ notes });
    }

    if (action === 'create') {
      const recipientId = String(body.recipientId || '');
      const type = body.type === 'audio' ? 'audio' : 'text';
      const text = String(body.text || '').slice(0, 4000);
      if (!recipientId) return Response.json({ error: 'Pick someone first.' }, { status: 400 });
      if (recipientId === acc.id) return Response.json({ error: 'You cannot send a note to yourself.' }, { status: 400 });
      const recipient = await base44.asServiceRole.entities.Account.get(recipientId).catch(() => null);
      if (!recipient || recipient.active === false) return Response.json({ error: 'That person no longer has an account.' }, { status: 400 });
      const note = await base44.asServiceRole.entities.Note.create({
        senderId: acc.id,
        recipientId,
        type,
        text: type === 'text' ? text : '',
        audioUrl: body.audioUrl || undefined,
        audioDuration: typeof body.audioDuration === 'number' ? body.audioDuration : undefined,
        originalFileName: body.originalFileName || undefined,
        startTimeMs: body.startTimeMs,
        endTimeMs: body.endTimeMs,
        durationMs: body.durationMs,
        mimeType: body.mimeType || undefined,
        status: 'sent',
        expiresAt: new Date(Date.now() + NOTE_TTL_MS).toISOString()
      });
      await logActivity(base44, acc.id, acc.displayName, type === 'audio' ? 'audio_note_sent' : 'text_note_sent', 'note', note.id, recipient.username);
      return Response.json({ note: { ...note, audioUrl: undefined } });
    }

    if (action === 'markRead') {
      const note = await base44.asServiceRole.entities.Note.get(body.noteId).catch(() => null);
      if (!note || note.recipientId !== acc.id || isExpired(note)) return Response.json({ error: 'Not found.' }, { status: 404 });
      if (note.status !== 'read') {
        await base44.asServiceRole.entities.Note.update(note.id, { status: 'read', readAt: new Date().toISOString() });
      }
      return Response.json({ ok: true });
    }

    if (action === 'react') {
      const note = await base44.asServiceRole.entities.Note.get(body.noteId).catch(() => null);
      if (!note || note.recipientId !== acc.id || isExpired(note)) return Response.json({ error: 'Not found.' }, { status: 404 });
      const heart = !(note.reaction?.heart === true);
      const reaction = heart ? { heart: true, at: new Date().toISOString() } : { heart: false, at: null };
      await base44.asServiceRole.entities.Note.update(note.id, { reaction });
      return Response.json({ reaction });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}