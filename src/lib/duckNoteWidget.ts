import { Capacitor, registerPlugin } from "@capacitor/core";

interface DuckNoteWidgetPlugin {
  updateLatestNote(options: {
    noteId: string;
    sender: string;
    note: string;
    time: string;
    type: string;
    audioUrl: string;
    reacted: boolean;
    reactionAt: string;
  }): Promise<{ ok: boolean }>;

  syncReactionState(options: {
    noteId: string;
    reacted: boolean;
    reactionAt: string;
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
  registerPlugin<DuckNoteWidgetPlugin>("DuckNoteWidget");

export async function updateDuckNoteWidget(note: any) {
  // The Android home-screen widget has no web implementation.
  // Do nothing when running in a normal browser.
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  if (!note?.id) {
    return;
  }

  const sender =
    note.sender?.displayName ||
    note.sender?.username ||
    "Someone";

  const text = note.text || "";

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

  // Reactions come from the notes function, which is the
  // authoritative source for both the app and the widget.
  const reacted =
    note.reaction?.heart === true;

  const reactionAt =
    note.reaction?.at || "";

  try {
    await DuckNoteWidget.updateLatestNote({
      noteId: String(note.id),
      sender: String(sender),
      note: String(text),
      time,
      type,
      audioUrl: String(audioUrl),
      reacted,
      reactionAt: String(reactionAt),
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
  // Widget session sync is Android-only.
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const supabaseUrl =
      import.meta.env.VITE_SUPABASE_URL;

    const publishableKey =
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !publishableKey) {
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
  // Widget session cleanup is Android-only.
  if (!Capacitor.isNativePlatform()) {
    return;
  }

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

export async function syncDuckNoteWidgetReaction(
  noteId: string,
  reaction: any
) {
  // Widget reaction sync is Android-only.
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  if (
    !noteId ||
    !reaction ||
    typeof reaction.heart !== "boolean"
  ) {
    return;
  }

  try {
    await DuckNoteWidget.syncReactionState({
      noteId: String(noteId),
      reacted: reaction.heart,
      reactionAt: String(reaction.at || ""),
    });
  } catch (error) {
    console.error(
      "[DuckNote Widget] Failed to sync reaction:",
      error
    );

    throw error;
  }
}