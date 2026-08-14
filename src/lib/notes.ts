import { callFunction } from "@/lib/callFn";

function createReactionMutationId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

export async function toggleReaction(note: any, id: string, token: string) {
  const data = await callFunction("notes", {
    action: "react",
    noteId: note.id,
    id,
    token,
    mutationId: createReactionMutationId(),
  });

  return data.reaction;
}
