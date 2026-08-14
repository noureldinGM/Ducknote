import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = "voice-notes";
const BATCH_SIZE = 100;

Deno.serve(async (_req: Request) => {
  const { data: notes, error: notesError } = await supabase
    .from("notes")
    .select("id,type,audio_url,expires_at")
    .lte("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (notesError) {
    console.error("Failed to load expired notes", notesError);
    return new Response(JSON.stringify({ ok: false, error: notesError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let deletedNotes = 0;
  let deletedAudio = 0;
  let failedAudio = 0;
  const failures: Array<{ noteId: string; audioPath?: string; error: string }> = [];

  for (const note of notes ?? []) {
    let audioDeleted = true;

    if (note.type === "audio" && note.audio_url) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([note.audio_url]);

      if (storageError) {
        audioDeleted = false;
        failedAudio += 1;
        failures.push({
          noteId: note.id,
          audioPath: note.audio_url,
          error: storageError.message,
        });
        console.error("Failed to delete audio", note.id, note.audio_url, storageError);
      } else {
        deletedAudio += 1;
      }
    }

    // Never delete an audio note row if its Storage object could not be removed.
    // This allows the next scheduled run to retry safely.
    if (!audioDeleted) continue;

    const { error: deleteError } = await supabase
      .from("notes")
      .delete()
      .eq("id", note.id);

    if (deleteError) {
      failures.push({ noteId: note.id, error: deleteError.message });
      console.error("Failed to delete expired note", note.id, deleteError);
      continue;
    }

    deletedNotes += 1;
  }

  return new Response(
    JSON.stringify({
      ok: true,
      scanned: notes?.length ?? 0,
      deletedNotes,
      deletedAudio,
      failedAudio,
      failures,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
