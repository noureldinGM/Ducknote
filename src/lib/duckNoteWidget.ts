import { registerPlugin } from "@capacitor/core";

interface DuckNoteWidgetPlugin {
  updateLatestNote(options: {
    noteId: string;
    sender: string;
    note: string;
    time: string;
    type: string;
    audioUrl: string;
  }): Promise<{ ok: boolean }>;

  syncSession(options: {
    accessToken: string;
    refreshToken: string;
    userId: string;
    supabaseUrl: string;
    publishableKey: string;
  }): Promise<{ ok: boolean }>;

  clearSession(): Promise<{ ok: boolean }>;
}

const DuckNoteWidget =
  registerPlugin<DuckNoteWidgetPlugin>(
    "DuckNoteWidget"
  );

export async function updateDuckNoteWidget(
  note: any
) {
  if (!note?.id) {
    return;
  }

  const sender =
    note.sender?.displayName ||
    note.sender?.username ||
    "Someone";

  const text =
    note.text || "";

  const createdAt =
    note.created_at ||
    note.createdAt;

  const time = createdAt
    ? new Date(createdAt).toLocaleString()
    : "Just now";

  const type =
    note.type === "audio"
      ? "audio"
      : "text";

  const audioUrl =
    note.audio_url ||
    note.audioUrl ||
    "";

  try {
    await DuckNoteWidget.updateLatestNote({
      noteId: String(note.id),
      sender: String(sender),
      note: String(text),
      time,
      type,
      audioUrl: String(audioUrl),
    });
  } catch (error) {
    console.error(
      "[DuckNote Widget] Failed to update widget:",
      error
    );

    throw error;
  }
}

export async function syncDuckNoteSession(
  accessToken: string,
  refreshToken: string,
  userId: string
) {
  try {
    const supabaseUrl =
      import.meta.env.VITE_SUPABASE_URL;

    const publishableKey =
      import.meta.env
        .VITE_SUPABASE_PUBLISHABLE_KEY;

    if (
      !supabaseUrl ||
      !publishableKey
    ) {
      throw new Error(
        "Missing Supabase configuration."
      );
    }

    await DuckNoteWidget.syncSession({
      accessToken,
      refreshToken,
      userId,
      supabaseUrl,
      publishableKey,
    });
  } catch (error) {
    console.error(
      "[DuckNote Widget] Failed to sync session:",
      error
    );

    throw error;
  }
}

export async function clearDuckNoteSession() {
  try {
    await DuckNoteWidget.clearSession();
  } catch (error) {
    console.error(
      "[DuckNote Widget] Failed to clear session:",
      error
    );

    throw error;
  }
}