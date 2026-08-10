import { callFunction } from "@/lib/callFn";

export async function toggleReaction(note: any, id: string, token: string) {
  const data = await callFunction("notes", { action: "react", noteId: note.id, id, token });
  return data.reaction;
}