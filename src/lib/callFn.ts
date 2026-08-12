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

async function getSupabaseErrorMessage(error: any) {
  // Supabase FunctionsHttpError normally exposes the
  // server response through error.context.
  try {
    const context = error?.context;

    if (context) {
      // Clone the response when possible so we do not consume it.
      const response =
        typeof context.clone === "function"
          ? context.clone()
          : context;

      if (typeof response.json === "function") {
        const body = await response.json().catch(() => null);

        if (body?.error) {
          return typeof body.error === "string"
            ? body.error
            : "Something went wrong.";
        }

        if (body?.message) {
          return typeof body.message === "string"
            ? body.message
            : "Something went wrong.";
        }
      }

      if (typeof response.text === "function") {
        const text = await response.text().catch(() => "");

        if (text) {
          try {
            const body = JSON.parse(text);

            if (body?.error) {
              return typeof body.error === "string"
                ? body.error
                : "Something went wrong.";
            }

            if (body?.message) {
              return typeof body.message === "string"
                ? body.message
                : "Something went wrong.";
            }
          } catch {
            // Ignore non-JSON response bodies.
          }
        }
      }
    }
  } catch {
    // Ignore response parsing errors.
  }

  return (
    error?.message ||
    "Something went wrong."
  );
}

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
      const serverMessage =
        await getSupabaseErrorMessage(error);

      throw new Error(serverMessage);
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
      const serverMessage =
        await getSupabaseErrorMessage(error);

      throw new Error(serverMessage);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }

  throw new Error(
    `Unknown function: ${name}`
  );
}