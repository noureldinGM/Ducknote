import { supabase } from "@/lib/supabase";

const supabaseAccountAuthActions = new Set([
  "search",
  "friendsList",
  "addFriend",
  "removeFriend",
  "changePassword",
  "updateProfile",

  // Admin actions
  "adminStats",
  "activity",
  "list",
  "create",
  "updateUser",
  "remove",
  "resetPassword",
]);

export async function callFunction(
  name: string,
  payload: any
) {
  // =====================================================
  // Supabase account-auth
  // =====================================================

  if (
    name === "accountAuth" &&
    supabaseAccountAuthActions.has(payload?.action)
  ) {
    const token =
      payload?.token ||
      payload?.adminToken;

    const { data, error } =
      await supabase.functions.invoke(
        "account-auth",
        {
          body: payload,
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        }
      );

    if (error) {
      let serverMessage = "";

      try {
        const context = (error as any).context;

        if (context?.clone) {
          const response = context.clone();

          const body = await response
            .json()
            .catch(() => null);

          serverMessage =
            body?.error ||
            body?.message ||
            "";
        }
      } catch {
        // Ignore response parsing errors.
      }

      throw new Error(
        serverMessage ||
          error.message ||
          "Something went wrong."
      );
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }

  // =====================================================
  // Supabase notes
  // =====================================================

  if (name === "notes") {
    const token = payload?.token;

    const { data, error } =
      await supabase.functions.invoke(
        "notes",
        {
          body: payload,
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        }
      );

    if (error) {
      let serverMessage = "";

      try {
        const context = (error as any).context;

        if (context?.clone) {
          const response = context.clone();

          const body = await response
            .json()
            .catch(() => null);

          serverMessage =
            body?.error ||
            body?.message ||
            "";
        }
      } catch {
        // Ignore response parsing errors.
      }

      throw new Error(
        serverMessage ||
          error.message ||
          "Something went wrong."
      );
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }

  // =====================================================
  // Unknown function
  // =====================================================

  throw new Error(
    `Unsupported function: ${name}`
  );
}