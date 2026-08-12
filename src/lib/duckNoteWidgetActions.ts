import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useNotes } from "@/hooks/useNotes";
import { toggleReaction } from "@/lib/notes";

export function useDuckNoteWidgetActions() {
  const { user, token } = useAuth();

  const {
    notes,
    reload,
  } = useNotes("received");

  useEffect(() => {
    const handleWidgetReact = async (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          noteId?: string;
        }>;

      const noteId =
        customEvent.detail?.noteId;

      if (!noteId || !user?.id || !token) {
        return;
      }

      const note =
        notes.find(
          (item: any) =>
            item.id === noteId
        );

      if (!note) {
        return;
      }

      try {
        await toggleReaction(
          note,
          user.id,
          token
        );

        await reload();
      } catch (error) {
        console.error(
          "[DuckNote Widget] Reaction failed:",
          error
        );
      }
    };

    window.addEventListener(
      "ducknote-widget-react",
      handleWidgetReact
    );

    return () => {
      window.removeEventListener(
        "ducknote-widget-react",
        handleWidgetReact
      );
    };
  }, [
    user,
    token,
    notes,
    reload,
  ]);
}