import { createClient } from "npm:@supabase/supabase-js@2";
import {
  SignJWT,
  importPKCS8,
} from "npm:jose@6";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

const supabasePublishableKey =
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
  Deno.env.get("SUPABASE_ANON_KEY")!;

const supabaseSecretKey =
  Deno.env.get("SUPABASE_SECRET_KEY") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseClient = createClient(
  supabaseUrl,
  supabasePublishableKey
);

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: corsHeaders,
  });
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser(token);

  if (error || !user) {
    console.error("auth getUser error:", error);
    return null;
  }

  return user;
}

async function getAuthenticatedProfile(req: Request) {
  const authUser = await getAuthenticatedUser(req);

  if (!authUser) return null;

  const { data: profile, error } =
    await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

  if (error || !profile || profile.active === false) {
    return null;
  }

  return profile;
}

function isExpired(note: any) {
  if (!note.expires_at) return false;

  return (
    new Date(note.expires_at).getTime() <= Date.now()
  );
}

/**
 * Converts the private Storage path into a temporary signed URL.
 *
 * Database example:
 * 64a1f3a2-.../clip-xxxx.wav
 *
 * Frontend receives:
 * https://.../storage/v1/object/sign/voice-notes/...
 */
async function getAudioUrl(
  audioPath: string | null,
  expectedOwnerId?: string
) {
  if (!audioPath) return "";

  const cleanPath = String(audioPath).trim();

  if (!cleanPath) return "";

  // Audio must always be a private Storage path.
  // Never allow arbitrary external URLs or path traversal.
  if (
    cleanPath.startsWith("http://") ||
    cleanPath.startsWith("https://") ||
    cleanPath.startsWith("/") ||
    cleanPath.includes("..")
  ) {
    console.error("Rejected invalid audio path:", cleanPath);
    return "";
  }

  const [ownerId] = cleanPath.split("/");

  if (!ownerId) {
    console.error("Rejected audio path without owner folder:", cleanPath);
    return "";
  }

  // The first folder must belong to the note sender.
  if (expectedOwnerId && ownerId !== expectedOwnerId) {
    console.error("Rejected audio path ownership mismatch:", {
      ownerId,
      expectedOwnerId,
    });
    return "";
  }

  const { data, error } =
    await supabaseAdmin.storage
      .from("voice-notes")
      .createSignedUrl(cleanPath, 60 * 60);

  if (error) {
    console.error(
      "audio signed URL error:",
      error.message,
      "path:",
      cleanPath
    );

    return "";
  }

  if (!data?.signedUrl) {
    console.error(
      "audio signed URL missing:",
      cleanPath
    );

    return "";
  }

  return data.signedUrl;
}
// =========================================================
// Firebase Cloud Messaging
// =========================================================

async function getFirebaseAccessToken() {
  const projectId =
    Deno.env.get("FIREBASE_PROJECT_ID");

  const clientEmail =
    Deno.env.get("FIREBASE_CLIENT_EMAIL");

  const privateKey =
    Deno.env.get("FIREBASE_PRIVATE_KEY");

  if (
    !projectId ||
    !clientEmail ||
    !privateKey
  ) {
    throw new Error(
      "Firebase notification credentials are not configured."
    );
  }

  const normalizedPrivateKey =
    privateKey.replace(/\\n/g, "\n");

  const key = await importPKCS8(
    normalizedPrivateKey,
    "RS256"
  );

  const now = Math.floor(
    Date.now() / 1000
  );

  const assertion = await new SignJWT({
    scope:
      "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({
      alg: "RS256",
      typ: "JWT",
    })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience(
      "https://oauth2.googleapis.com/token"
    )
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type:
          "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    }
  );

  const data = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    !data?.access_token
  ) {
    console.error(
      "Firebase OAuth error:",
      data
    );

    throw new Error(
      "Could not authenticate with Firebase."
    );
  }

  return {
    projectId,
    accessToken: data.access_token,
  };
}

async function sendPushNotification({
  recipient,
  note,
  sender,
  notification,
}: {
  recipient: any;
  note: any;
  sender: any;
  notification?: {
    title: string;
    body: string;
    type: "note" | "reaction";
  };
}) {
  // ---------------------------------------------------------
  // Respect user's notification settings
  // ---------------------------------------------------------

  const enabled =
    note.type === "audio"
      ? recipient.notify_audio === true
      : recipient.notify_text === true;

  if (!enabled) {
    console.log(
      "[DUCKNOTE PUSH] Notification disabled by recipient settings."
    );

    return;
  }

  // ---------------------------------------------------------
  // Get active device tokens
  // ---------------------------------------------------------

  const {
    data: tokens,
    error: tokenError,
  } = await supabaseAdmin
    .from("push_tokens")
    .select("id, token, platform")
    .eq("user_id", recipient.id)
    .eq("active", true);

  if (tokenError) {
    console.error(
      "[DUCKNOTE PUSH] Token lookup failed:",
      tokenError.message
    );

    return;
  }

  if (!tokens?.length) {
    console.log(
      "[DUCKNOTE PUSH] Recipient has no active devices."
    );

    return;
  }

  // ---------------------------------------------------------
  // Get Firebase OAuth access token
  // ---------------------------------------------------------

  let firebase;

  try {
    firebase =
      await getFirebaseAccessToken();
  } catch (error) {
    console.error(
      "[DUCKNOTE PUSH] Firebase auth failed:",
      error
    );

    return;
  }

  const senderName =
    sender?.display_name ||
    sender?.username ||
    "Someone";

  const title =
    notification?.title ||
    (note.type === "audio"
      ? "🎤 New audio note"
      : "📝 New note");

  const body =
    notification?.body ||
    (note.type === "audio"
      ? `${senderName} sent you an audio note`
      : `${senderName} sent you a note`);

  // ---------------------------------------------------------
  // Send to every active device
  // ---------------------------------------------------------

  await Promise.all(
    tokens.map(async (device) => {
      try {
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${firebase.projectId}/messages:send`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${firebase.accessToken}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              message: {
                token: device.token,

                notification: {
                  title,
                  body,
                },

                data: {
                  type: String(note.type),
                  noteId: String(note.id),
                  senderId: String(
                    note.sender_id
                  ),
                  recipientId: String(
                    note.recipient_id
                  ),
                  action: "open_note",
                  notificationType:
                    notification?.type || "note",
                },

                android: {
                  priority: "high",
                  notification: {
                    channelId:
                      "ducknote-notes",
                  },
                },
              },
            }),
          }
        );

        const result =
          await response
            .json()
            .catch(() => null);

        if (response.ok) {
          console.log(
            "[DUCKNOTE PUSH] Sent:",
            device.id
          );

          return;
        }

        console.error(
          "[DUCKNOTE PUSH] FCM send failed:",
          {
            deviceId: device.id,
            status: response.status,
            result,
          }
        );

        // -----------------------------------------------------
        // Disable invalid / expired FCM tokens
        // -----------------------------------------------------

        const errorCode =
          result?.error?.details?.find?.(
            (detail: any) =>
              detail?.errorCode
          )?.errorCode;

        const invalidToken =
          errorCode === "UNREGISTERED" ||
          result?.error?.status ===
            "NOT_FOUND";

        if (invalidToken) {
          await supabaseAdmin
            .from("push_tokens")
            .update({
              active: false,
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", device.id);

          console.log(
            "[DUCKNOTE PUSH] Disabled invalid token:",
            device.id
          );
        }
      } catch (error) {
        console.error(
          "[DUCKNOTE PUSH] Device send error:",
          {
            deviceId: device.id,
            error,
          }
        );
      }
    })
  );
}
function publicNote(note: any, audioUrl = "") {
  return {
    id: note.id,

    senderId: note.sender_id,
    recipientId: note.recipient_id,

    type: note.type,

    text: note.text || "",

    audioUrl:
      note.type === "audio"
        ? audioUrl
        : "",

    audioDuration:
      note.audio_duration ?? null,

    originalFileName:
      note.original_file_name ?? null,

    startTimeMs:
      note.start_time_ms ?? null,

    endTimeMs:
      note.end_time_ms ?? null,

    durationMs:
      note.duration_ms ?? null,

    mimeType:
      note.mime_type ?? null,

    status:
      note.status,

    deliveredAt:
      note.delivered_at ?? null,

    readAt:
      note.read_at ?? null,

    expiresAt:
      note.expires_at ?? null,

    reaction:
      note.reaction ?? null,

    created_at:
      note.created_at,

    createdAt:
      note.created_at,
  };
}

export default {
  fetch: async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: corsHeaders,
      });
    }

    try {
      const body = await req.json().catch(() => ({}));
      const action = body.action;

      // =====================================================
      // AUTHENTICATION
      // =====================================================

      const profile =
        await getAuthenticatedProfile(req);

      if (!profile) {
        return json(
          {
            error:
              "Your session expired. Please log in again.",
          },
          401
        );
      }

      // =====================================================
      // CREATE NOTE
      // =====================================================

      if (action === "create") {
        const recipientId = String(
          body.recipientId || ""
        );

        const type =
          body.type === "audio"
            ? "audio"
            : "text";

        const text = String(
          body.text || ""
        ).slice(0, 4000);

        if (!recipientId) {
          return json(
            {
              error: "Pick someone first.",
            },
            400
          );
        }

        if (recipientId === profile.id) {
          return json(
            {
              error:
                "You cannot send a note to yourself.",
            },
            400
          );
        }

        // ---------------------------------------------------
        // Find recipient
        // ---------------------------------------------------

        const {
          data: recipient,
          error: recipientError,
        } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("id", recipientId)
          .maybeSingle();

        if (
          recipientError ||
          !recipient ||
          recipient.active === false
        ) {
          return json(
            {
              error:
                "That person no longer has an account.",
            },
            400
          );
        }

        // ---------------------------------------------------
        // Validate audio
        // ---------------------------------------------------

        if (type === "audio") {
          if (!body.audioUrl) {
            return json(
              {
                error:
                  "Audio upload is missing.",
              },
              400
            );
          }

          if (
            typeof body.durationMs !== "number" ||
            body.durationMs <= 0
          ) {
            return json(
              {
                error:
                  "Audio duration is missing.",
              },
              400
            );
          }
        }

        // ---------------------------------------------------
        // Create note
        // ---------------------------------------------------

        const expiresAt = new Date(
          Date.now() +
            24 * 60 * 60 * 1000
        ).toISOString();

        const {
          data: note,
          error: noteError,
        } = await supabaseAdmin
          .from("notes")
          .insert({
            sender_id: profile.id,
            recipient_id: recipientId,

            type,

            text:
              type === "text"
                ? text
                : null,

            audio_url:
              type === "audio"
                ? body.audioUrl || null
                : null,

            audio_duration:
              type === "audio" &&
              typeof body.audioDuration === "number"
                ? body.audioDuration
                : null,

            original_file_name:
              type === "audio"
                ? body.originalFileName || null
                : null,

            start_time_ms:
              type === "audio" &&
              typeof body.startTimeMs === "number"
                ? body.startTimeMs
                : null,

            end_time_ms:
              type === "audio" &&
              typeof body.endTimeMs === "number"
                ? body.endTimeMs
                : null,

            duration_ms:
              type === "audio" &&
              typeof body.durationMs === "number"
                ? body.durationMs
                : null,

            mime_type:
              type === "audio"
                ? body.mimeType || null
                : null,

            status: "sent",

            expires_at: expiresAt,
          })
          .select("*")
          .single();

        if (noteError || !note) {
          console.error(
            "create note error:",
            noteError
          );

          return json(
            {
              error:
                noteError?.message ||
                "Could not create the note.",
            },
            500
          );
        }

        // ---------------------------------------------------
        // Activity log
        // ---------------------------------------------------

        try {
          await supabaseAdmin
            .from("activity_logs")
            .insert({
              actor_id: profile.id,

              actor_name:
                profile.display_name ||
                profile.username ||
                "",

              action:
                type === "audio"
                  ? "audio_note_sent"
                  : "text_note_sent",

              target_type: "note",

              target_id: note.id,

              target_label:
                recipient.username ||
                "",
            });
        } catch (error) {
          console.error(
            "activity log error:",
            error
          );
        }
        // ---------------------------------------------------
        // Push notification
        // ---------------------------------------------------

        try {
          await sendPushNotification({
            recipient,
            note,
            sender: profile,
          });
        } catch (error) {
          // Notification failure must never prevent
          // the note itself from being created.
          console.error(
            "[DUCKNOTE PUSH] Notification error:",
            error
          );
        }
        // ---------------------------------------------------
        // Return public note
        // ---------------------------------------------------

        const audioUrl =
  note.type === "audio"
    ? await getAudioUrl(
        note.audio_url,
        note.sender_id
      )
    : "";

        return json({
          note: publicNote(
            note,
            audioUrl
          ),
        });
      }

      // =====================================================
      // REGISTER PUSH TOKEN
      // =====================================================

      if (action === "registerPushToken") {
        const pushToken = String(body.pushToken || "").trim();

        if (!pushToken) {
          return json(
            {
              error: "Push token is required.",
            },
            400
          );
        }

        if (pushToken.length > 4096) {
          return json(
            {
              error: "Invalid push token.",
            },
            400
          );
        }

        if (body.platform !== "android") {
          return json(
            {
              error: "Unsupported push platform.",
            },
            400
          );
        }

        const { error: tokenError } =
          await supabaseAdmin
            .from("push_tokens")
            .upsert(
              {
                user_id: profile.id,
                token: pushToken,
                platform: "android",
                active: true,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "user_id,token",
              }
            );

        if (tokenError) {
          console.error(
            "push token registration error:",
            tokenError.message
          );

          return json(
            {
              error: "Could not register this device.",
            },
            500
          );
        }

        return json({
          success: true,
        });
      }

      // =====================================================
      // LIST NOTES
      // =====================================================

      if (action === "list") {
        const mode =
          body.mode === "sent"
            ? "sent"
            : "received";

        const now =
          new Date().toISOString();

        let query =
          supabaseAdmin
            .from("notes")
            .select("*")
            .gt("expires_at", now)
            .order("created_at", {
              ascending: false,
            })
            .limit(100);

        if (mode === "sent") {
          query = query.eq(
            "sender_id",
            profile.id
          );
        } else {
          query = query.eq(
            "recipient_id",
            profile.id
          );
        }

        const {
          data: notes,
          error: notesError,
        } = await query;

        if (notesError) {
          console.error(
            "list notes error:",
            notesError
          );

          return json(
            {
              error:
                notesError.message,
            },
            500
          );
        }

        // ---------------------------------------------------
        // Mark received notes as delivered
        // ---------------------------------------------------

        if (mode === "received") {
          const toDeliver =
            (notes || []).filter(
              (note: any) =>
                note.status === "sent" ||
                note.status === "sending"
            );

          for (const note of toDeliver) {
            const deliveredAt =
              new Date().toISOString();

            const { error } =
              await supabaseAdmin
                .from("notes")
                .update({
                  status: "delivered",
                  delivered_at:
                    deliveredAt,
                })
                .eq("id", note.id);

            if (!error) {
              note.status =
                "delivered";

              note.delivered_at =
                deliveredAt;
            }
          }
        }

        // ---------------------------------------------------
        // Get profiles
        // ---------------------------------------------------

        const ids =
          new Set<string>();

        for (const note of notes || []) {
          ids.add(note.sender_id);
          ids.add(note.recipient_id);
        }

        const profileMap:
          Record<string, any> = {};

        if (ids.size > 0) {
          const {
            data: accounts,
          } = await supabaseAdmin
            .from("profiles")
            .select(
              "id,username,display_name,profile_image,active,role,email"
            )
            .in(
              "id",
              [...ids]
            );

          for (
            const account of accounts || []
          ) {
            profileMap[account.id] = {
              id: account.id,

              username:
                account.username || "",

              displayName:
                account.display_name ||
                "",

              profileImage:
                account.profile_image ||
                "",

              active:
                account.active !== false,

              role:
                account.role || "user",

              email:
                account.email || "",
            };
          }
        }

        // ---------------------------------------------------
        // Build frontend notes
        // ---------------------------------------------------

        const notesWithAudioUrls =
          await Promise.all(
            (notes || []).map(
              async (note: any) => {
                const audioUrl =
  note.type === "audio"
    ? await getAudioUrl(
        note.audio_url,
        note.sender_id
      )
    : "";

                return {
                  ...publicNote(
                    note,
                    audioUrl
                  ),

                  sender:
                    profileMap[
                      note.sender_id
                    ] || null,

                  recipient:
                    profileMap[
                      note.recipient_id
                    ] || null,
                };
              }
            )
          );

        return json({
          notes:
            notesWithAudioUrls,
        });
      }

      // =====================================================
      // MARK READ
      // =====================================================

      if (action === "markRead") {
        const noteId = String(
          body.noteId || ""
        );

        if (!noteId) {
          return json(
            {
              error:
                "No note selected.",
            },
            400
          );
        }

        const {
          data: note,
          error,
        } = await supabaseAdmin
          .from("notes")
          .select("*")
          .eq("id", noteId)
          .eq(
            "recipient_id",
            profile.id
          )
          .maybeSingle();

        if (
          error ||
          !note ||
          isExpired(note)
        ) {
          return json(
            {
              error: "Not found.",
            },
            404
          );
        }

        if (note.status !== "read") {
          await supabaseAdmin
            .from("notes")
            .update({
              status: "read",
              read_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              note.id
            );
        }

        return json({
          ok: true,
        });
      }

      // =====================================================
      // REACT
      // =====================================================

      if (action === "react") {
        const noteId = String(
          body.noteId || ""
        );

        const suppliedMutationId = String(
          body.mutationId || ""
        ).trim();

        if (suppliedMutationId.length > 128) {
          return json(
            {
              error: "Invalid reaction request.",
            },
            400
          );
        }

        // Older clients may not include an ID, but new app and
        // widget actions do. Persisting it makes a retried mutation
        // idempotent instead of producing a duplicate notification.
        const mutationId =
          suppliedMutationId || crypto.randomUUID();

        const {
          data: note,
          error,
        } = await supabaseAdmin
          .from("notes")
          .select(
            "id,sender_id,recipient_id,type,reaction"
          )
          .eq("id", noteId)
          .eq(
            "recipient_id",
            profile.id
          )
          .maybeSingle();

        if (
          error ||
          !note
        ) {
          return json(
            {
              error: "Not found.",
            },
            404
          );
        }

        if (
          note.reaction?.mutationId === mutationId
        ) {
          return json({
            reaction: note.reaction,
            changed: false,
          });
        }

        const heart =
          note.reaction?.heart !== true;

        const reaction = {
          heart,

          // This is a state-version timestamp, including for an
          // unlike. Native widget writes use it to reject an older
          // list result that finishes after this mutation.
          at: new Date().toISOString(),

          mutationId,
        };

        const { error: updateError } = await supabaseAdmin
          .from("notes")
          .update({
            reaction,
          })
          .eq(
            "id",
            note.id
          );

        if (updateError) {
          console.error(
            "reaction update error:",
            updateError
          );

          return json(
            {
              error: "Could not update the reaction.",
            },
            500
          );
        }

        // The note sender is the owner whose note was liked. A
        // recipient can only react to received notes, but keep the
        // explicit check so a liker is never notified about themself.
        if (
          heart &&
          note.sender_id &&
          note.sender_id !== profile.id
        ) {
          try {
            const {
              data: noteOwner,
              error: ownerError,
            } = await supabaseAdmin
              .from("profiles")
              .select("*")
              .eq("id", note.sender_id)
              .maybeSingle();

            if (
              !ownerError &&
              noteOwner &&
              noteOwner.active !== false
            ) {
              const likerName =
                profile.display_name ||
                profile.username ||
                "Someone";

              await sendPushNotification({
                recipient: noteOwner,
                note,
                sender: profile,
                notification: {
                  title: "DuckNote",
                  body: `${likerName} liked your note ❤️`,
                  type: "reaction",
                },
              });
            }
          } catch (notificationError) {
            // The reaction is already persisted; a push failure must
            // not report the successful mutation as a failure.
            console.error(
              "[DUCKNOTE PUSH] Like notification error:",
              notificationError
            );
          }
        }

        return json({
          reaction,
          changed: true,
        });
      }

      // =====================================================
      // GET NOTE
      // =====================================================

      if (action === "getNote") {
        const noteId = String(
          body.noteId || ""
        );

        const {
          data: note,
          error,
        } = await supabaseAdmin
          .from("notes")
          .select("*")
          .eq("id", noteId)
          .maybeSingle();

        if (
          error ||
          !note
        ) {
          return json(
            {
              error: "Not found.",
            },
            404
          );
        }

        if (
          note.sender_id !==
            profile.id &&
          note.recipient_id !==
            profile.id
        ) {
          return json(
            {
              error: "Not found.",
            },
            404
          );
        }

        if (isExpired(note)) {
          return json({
            expired: true,
          });
        }

        const audioUrl =
  note.type === "audio"
    ? await getAudioUrl(
        note.audio_url,
        note.sender_id
      )
    : "";

        return json({
          note: {
            ...publicNote(
              note,
              audioUrl
            ),

            sender:
              note.sender_id ===
              profile.id
                ? profile
                : null,

            recipient:
              note.recipient_id ===
              profile.id
                ? profile
                : null,
          },
        });
      }

      // =====================================================
      // UNKNOWN ACTION
      // =====================================================

      return json(
        {
          error:
            "Unknown action.",
        },
        400
      );
    } catch (error: any) {
      console.error(
        "notes function error:",
        error
      );

      return json(
        {
          error:
            error?.message ||
            "Something went wrong.",
        },
        500
      );
    }
  },
};
