import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

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

function normalizeUsername(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function authEmail(username: string) {
  return `${username}@auth.ducknote.local`;
}

function toPublicAccount(profile: any) {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    role: profile.role,
    email: profile.email || "",
    profileImage: profile.profile_image || "",
    active: profile.active !== false,
    notifyText: profile.notify_text !== false,
    notifyAudio: profile.notify_audio !== false,
  };
}

function toPublicFriend(friend: any) {
  return {
    id: friend.id,
    ownerId: friend.owner_id,
    targetId: friend.target_id,
    targetUsername: friend.target_username || "",
    targetDisplayName: friend.target_display_name || "",
    targetProfileImage: friend.target_profile_image || "",
    createdAt: friend.created_at,
  };
}

async function getAuthenticatedUser(req: Request, ctx: any) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await ctx.supabase.auth.getUser(token);

  if (error || !user) return null;

  return user;
}

async function getAuthenticatedProfile(req: Request, ctx: any) {
  const authUser = await getAuthenticatedUser(req, ctx);

  if (!authUser) return null;

  const { data: profile, error } = await ctx.supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error || !profile || profile.active === false) {
    return null;
  }

  return profile;
}

async function requireAdmin(req: Request, ctx: any) {
  const profile = await getAuthenticatedProfile(req, ctx);

  if (!profile || profile.role !== "admin") {
    return null;
  }

  return profile;
}

async function logActivity(
  ctx: any,
  {
    actorId,
    actorName,
    action,
    targetType = null,
    targetId = null,
    targetLabel = null,
  }: {
    actorId: string;
    actorName: string;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    targetLabel?: string | null;
  }
) {
  const { error } = await ctx.supabaseAdmin
    .from("activity_logs")
    .insert({
      actor_id: actorId,
      actor_name: actorName,
      action,
      target_type: targetType,
      target_id: targetId,
      target_label: targetLabel,
    });

  if (error) {
    console.error("activity log error:", error);
  }
}

export default {
  fetch: withSupabase(
    { auth: ["user", "publishable"] },
    async (req, ctx) => {
      if (req.method === "OPTIONS") {
        return new Response("ok", {
          headers: corsHeaders,
        });
      }

      try {
        const body = await req.json().catch(() => ({}));
        const action = body.action;

        // =====================================================
        // BOOTSTRAP
        // Creates the first admin account only.
        // =====================================================

        if (action === "bootstrap") {
          const username = normalizeUsername(body.username);
          const password = String(body.password || "");

          const displayName = String(
            body.displayName || username
          ).trim();

          const email = String(body.email || "").trim();

          if (
            !username ||
            !/^[a-z0-9_]{3,24}$/.test(username)
          ) {
            return json(
              {
                error:
                  "Username must be 3-24 lowercase letters, numbers, or underscores.",
              },
              400
            );
          }

          if (password.length < 6) {
            return json(
              {
                error: "Password must be at least 6 characters.",
              },
              400
            );
          }

          if (!displayName) {
            return json(
              {
                error: "Display name is required.",
              },
              400
            );
          }

          const { count, error: countError } =
            await ctx.supabaseAdmin
              .from("profiles")
              .select("id", {
                count: "exact",
                head: true,
              });

          if (countError) {
            return json(
              { error: countError.message },
              500
            );
          }

          if ((count ?? 0) > 0) {
            return json(
              {
                error:
                  "Bootstrap is disabled because an account already exists.",
              },
              403
            );
          }

          const { data: created, error: createError } =
            await ctx.supabaseAdmin.auth.admin.createUser({
              email: email || authEmail(username),
              password,
              email_confirm: true,
              user_metadata: {
                username,
                display_name: displayName,
                role: "admin",
              },
            });

          if (createError || !created.user) {
            return json(
              {
                error:
                  createError?.message ||
                  "Could not create admin account.",
              },
              400
            );
          }

          const { data: profile, error: profileError } =
            await ctx.supabaseAdmin
              .from("profiles")
              .update({
                username,
                display_name: displayName,
                role: "admin",
                email: email || "",
                active: true,
              })
              .eq("id", created.user.id)
              .select()
              .single();

          if (profileError) {
  console.error(
    "CREATE USER PROFILE INSERT FAILED:",
    profileError
  );

  await ctx.supabaseAdmin.auth.admin.deleteUser(
    created.user.id
  );

  return json(
    {
      error: profileError.message,
      details: profileError.details || null,
      hint: profileError.hint || null,
      code: profileError.code || null,
    },
    500
  );
}
        }

        // =====================================================
        // LOGIN
        // username + password
        // =====================================================

        if (action === "login") {
          const username = normalizeUsername(body.username);
          const password = String(body.password || "");

          if (!username || !password) {
            return json(
              {
                error:
                  "Enter your username and password.",
              },
              400
            );
          }

          const { data: profile, error: profileError } =
            await ctx.supabaseAdmin
              .from("profiles")
              .select("*")
              .eq("username", username)
              .maybeSingle();

          if (profileError || !profile) {
            return json(
              {
                error: "Wrong username or password.",
              },
              401
            );
          }

          if (profile.active === false) {
            return json(
              {
                error: "This account is disabled.",
              },
              403
            );
          }

          const { data: authData, error: authError } =
            await ctx.supabase.auth.signInWithPassword({
              email:
                profile.email ||
                authEmail(profile.username),
              password,
            });

          if (authError || !authData.session) {
            return json(
              {
                error: "Wrong username or password.",
              },
              401
            );
          }

          return json({
            account: toPublicAccount(profile),
            token: authData.session.access_token,
            refreshToken:
              authData.session.refresh_token,
          });
        }

        // =====================================================
        // ME
        // =====================================================

        if (action === "me") {
          const profile = await getAuthenticatedProfile(
            req,
            ctx
          );

          if (!profile) {
            return json(
              { error: "Invalid session." },
              401
            );
          }

          return json({
            account: toPublicAccount(profile),
          });
        }

        // =====================================================
        // LOGOUT
        // =====================================================

        if (action === "logout") {
          const authUser = await getAuthenticatedUser(
            req,
            ctx
          );

          if (authUser) {
            await ctx.supabase.auth.signOut();
          }

          return json({ ok: true });
        }
    // =====================================================
    // CHANGE PASSWORD
    // =====================================================

    if (action === "changePassword") {
      const profile =
        await getAuthenticatedProfile(req, ctx);

      if (!profile) {
        return json(
          {
            error:
              "Your session expired. Please log in again.",
          },
          401
        );
      }

      const currentPassword = String(
        body.currentPassword || ""
      );

      const newPassword = String(
        body.newPassword || ""
      );

      if (!currentPassword) {
        return json(
          {
            error:
              "Your current password is required.",
          },
          400
        );
      }

      if (newPassword.length < 6) {
        return json(
          {
            error:
              "New password must be at least 6 characters.",
          },
          400
        );
      }

      const email =
        profile.email ||
        authEmail(profile.username);

      // Verify current password
      const {
        error: passwordError,
      } =
        await ctx.supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });

      if (passwordError) {
        return json(
          {
            error:
              "Your current password is incorrect.",
          },
          401
        );
      }

      // Update password
      const {
        error: updateError,
      } =
        await ctx.supabaseAdmin.auth.admin.updateUserById(
          profile.id,
          {
            password: newPassword,
          }
        );

      if (updateError) {
        return json(
          {
            error: updateError.message,
          },
          400
        );
      }

      await logActivity(ctx, {
        actorId: profile.id,
        actorName:
          profile.display_name ||
          profile.username,
        action: "password_reset",
        targetType: "user",
        targetId: profile.id,
        targetLabel: profile.username,
      });

      return json({
        ok: true,
      });
    }

    // =====================================================
    // SEARCH USERS
    // =====================================================

    if (action === "search") {
      const profile =
        await getAuthenticatedProfile(req, ctx);

      if (!profile) {
        return json(
          {
            error:
              "Your session expired. Please log in again.",
          },
          401
        );
      }

      const q = normalizeUsername(
        body.query || ""
      );

      const { data: profiles, error } =
        await ctx.supabaseAdmin
          .from("profiles")
          .select("*")
          .neq("id", profile.id)
          .eq("active", true)
          .ilike("username", `%${q}%`)
          .order("username", {
            ascending: true,
          })
          .limit(12);

      if (error) {
        return json(
          {
            error: error.message,
          },
          500
        );
      }

      return json({
        users: (profiles || []).map(
          toPublicAccount
        ),
      });
    }

    // =====================================================
    // FRIENDS LIST
    // =====================================================

    if (action === "friendsList") {
      const profile =
        await getAuthenticatedProfile(req, ctx);

      if (!profile) {
        return json(
          {
            error:
              "Your session expired. Please log in again.",
          },
          401
        );
      }

      const {
        data: friends,
        error,
      } =
        await ctx.supabaseAdmin
          .from("friends")
          .select("*")
          .eq("owner_id", profile.id)
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        return json(
          {
            error: error.message,
          },
          500
        );
      }

return json({
  friends: (friends || []).map((friend: any) => ({
    id: friend.id,
    ownerId: friend.owner_id,
    targetId: friend.target_id,
    targetUsername: friend.target_username || "",
    targetDisplayName: friend.target_display_name || "",
    targetProfileImage: friend.target_profile_image || "",
    createdDate: friend.created_at,
  })),
});
    }

    // =====================================================
    // ADD FRIEND
    // =====================================================

    if (action === "addFriend") {
      const profile =
        await getAuthenticatedProfile(req, ctx);

      if (!profile) {
        return json(
          {
            error:
              "Your session expired. Please log in again.",
          },
          401
        );
      }

      const targetId = String(
        body.targetId || ""
      );

      if (
        !targetId ||
        targetId === profile.id
      ) {
        return json(
          {
            error: "Pick someone else.",
          },
          400
        );
      }

      const {
        data: target,
        error: targetError,
      } =
        await ctx.supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("id", targetId)
          .maybeSingle();

      if (
        targetError ||
        !target ||
        target.active === false
      ) {
        return json(
          {
            error:
              "That person no longer has an account.",
          },
          400
        );
      }

      const {
        data: existing,
        error: existingError,
      } =
        await ctx.supabaseAdmin
          .from("friends")
          .select("id")
          .eq("owner_id", profile.id)
          .eq("target_id", targetId)
          .maybeSingle();

      if (existingError) {
        return json(
          {
            error:
              existingError.message,
          },
          500
        );
      }

      if (existing) {
  const {
    data: existingFriend,
    error: existingFriendError,
  } = await ctx.supabaseAdmin
    .from("friends")
    .select("*")
    .eq("id", existing.id)
    .single();

  if (existingFriendError || !existingFriend) {
    return json(
      {
        error:
          existingFriendError?.message ||
          "Could not load the existing friend.",
      },
      500
    );
  }

  return json({
    friend: {
      id: existingFriend.id,
      ownerId: existingFriend.owner_id,
      targetId: existingFriend.target_id,
      targetUsername:
        existingFriend.target_username || "",
      targetDisplayName:
        existingFriend.target_display_name || "",
      targetProfileImage:
        existingFriend.target_profile_image || "",
      createdDate:
        existingFriend.created_at,
    },
  });
}

      const {
        data: friend,
        error: friendError,
      } =
        await ctx.supabaseAdmin
          .from("friends")
          .insert({
            owner_id: profile.id,
            target_id: target.id,
            target_username:
              target.username,
            target_display_name:
              target.display_name,
            target_profile_image:
              target.profile_image || "",
          })
          .select()
          .single();

      if (friendError) {
        return json(
          {
            error:
              friendError.message,
          },
          500
        );
      }

      return json({
  friend: {
    id: friend.id,
    ownerId: friend.owner_id,
    targetId: friend.target_id,
    targetUsername: friend.target_username || "",
    targetDisplayName:
      friend.target_display_name || "",
    targetProfileImage:
      friend.target_profile_image || "",
    createdDate: friend.created_at,
  },
});
    }

    // =====================================================
    // REMOVE FRIEND
    // =====================================================

    if (action === "removeFriend") {
      const profile =
        await getAuthenticatedProfile(req, ctx);

      if (!profile) {
        return json(
          {
            error:
              "Your session expired. Please log in again.",
          },
          401
        );
      }

      const friendId = String(
        body.friendId || ""
      );

      if (!friendId) {
        return json(
          {
            error: "No friend selected.",
          },
          400
        );
      }

      const {
        data: target,
        error: targetError,
      } =
        await ctx.supabaseAdmin
          .from("friends")
          .select("id")
          .eq("id", friendId)
          .eq("owner_id", profile.id)
          .maybeSingle();

      if (targetError) {
        return json(
          {
            error:
              targetError.message,
          },
          500
        );
      }

      if (!target) {
        return json(
          {
            error: "Not found.",
          },
          404
        );
      }

      const { error: deleteError } =
        await ctx.supabaseAdmin
          .from("friends")
          .delete()
          .eq("id", friendId)
          .eq("owner_id", profile.id);

      if (deleteError) {
        return json(
          {
            error:
              deleteError.message,
          },
          500
        );
      }

      return json({
        ok: true,
      });
    }
    // =====================================================
    // UPDATE OWN PROFILE
    // =====================================================

if (action === "updateProfile") {
  const profile = await getAuthenticatedProfile(req, ctx);

  if (!profile) {
    return json(
      {
        error: "Your session expired. Please log in again.",
      },
      401
    );
  }

  const displayName = String(
    body.displayName || ""
  ).trim();

  const profileImage = String(
    body.profileImage || ""
  ).trim();

  const notifyText = body.notifyText !== false;
  const notifyAudio = body.notifyAudio !== false;

  if (!displayName) {
    return json(
      {
        error: "Display name is required.",
      },
      400
    );
  }

  if (displayName.length > 50) {
    return json(
      {
        error: "Display name must be 50 characters or less.",
      },
      400
    );
  }

  const { data: updated, error: updateError } =
    await ctx.supabaseAdmin
      .from("profiles")
      .update({
        display_name: displayName,
        profile_image: profileImage,
        notify_text: notifyText,
        notify_audio: notifyAudio,
      })
      .eq("id", profile.id)
      .select()
      .single();

  if (updateError || !updated) {
    return json(
      {
        error:
          updateError?.message ||
          "Could not update your profile.",
      },
      500
    );
  }

  return json({
    account: toPublicAccount(updated),
  });
}
        // =====================================================
        // ADMIN AUTHORIZATION
        // All actions below require a real Supabase
        // authenticated admin.
        // =====================================================

        const adminProfile = await requireAdmin(
          req,
          ctx
        );

        if (!adminProfile) {
          return json(
            { error: "Admin access required." },
            403
          );
        }

        // =====================================================
        // ADMIN STATS
        // =====================================================

        if (action === "adminStats") {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);

          const sevenDaysAgo = new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
          );

          const [
            totalUsersResult,
            activeUsersResult,
            totalNotesResult,
            notesTodayResult,
            notesWeekResult,
          ] = await Promise.all([
            ctx.supabaseAdmin
              .from("profiles")
              .select("id", {
                count: "exact",
                head: true,
              }),

            ctx.supabaseAdmin
              .from("profiles")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq("active", true),

            ctx.supabaseAdmin
              .from("notes")
              .select("id", {
                count: "exact",
                head: true,
              }),

            ctx.supabaseAdmin
              .from("notes")
              .select("id", {
                count: "exact",
                head: true,
              })
              .gte(
                "created_at",
                startOfToday.toISOString()
              ),

            ctx.supabaseAdmin
              .from("notes")
              .select("id", {
                count: "exact",
                head: true,
              })
              .gte(
                "created_at",
                sevenDaysAgo.toISOString()
              ),
          ]);

          const errors = [
            totalUsersResult.error,
            activeUsersResult.error,
            totalNotesResult.error,
            notesTodayResult.error,
            notesWeekResult.error,
          ].filter(Boolean);

          if (errors.length > 0) {
            return json(
              {
                error:
                  errors[0]?.message ||
                  "Could not load admin statistics.",
              },
              500
            );
          }

          return json({
            totalUsers:
              totalUsersResult.count ?? 0,
            activeUsers:
              activeUsersResult.count ?? 0,
            totalNotes:
              totalNotesResult.count ?? 0,
            notesToday:
              notesTodayResult.count ?? 0,
            notesWeek:
              notesWeekResult.count ?? 0,
          });
        }

        // =====================================================
        // ACTIVITY
        // =====================================================

        if (action === "activity") {
          const { data: logs, error } =
            await ctx.supabaseAdmin
              .from("activity_logs")
              .select(
                "id, actor_name, action, target_type, target_id, target_label, created_at"
              )
              .order("created_at", {
                ascending: false,
              })
              .limit(100);

          if (error) {
            return json(
              { error: error.message },
              500
            );
          }

          return json({
            logs: (logs || []).map((log: any) => ({
              id: log.id,
              action: log.action,
              actorName: log.actor_name || "",
              targetLabel: log.target_label || "",
              created_date: log.created_at,
              targetType: log.target_type || "",
              targetId: log.target_id || null,
            })),
          });
        }

        // =====================================================
        // LIST USERS
        // =====================================================

        if (action === "list") {
          const { data: profiles, error } =
            await ctx.supabaseAdmin
              .from("profiles")
              .select("*")
              .order("username", {
                ascending: true,
              });

          if (error) {
            return json(
              { error: error.message },
              500
            );
          }

          return json({
            accounts: (profiles || []).map(
              toPublicAccount
            ),
          });
        }

        // =====================================================
        // CREATE USER
        // =====================================================

        if (action === "create") {
          const username = normalizeUsername(
            body.username
          );

          const displayName = String(
            body.displayName || ""
          ).trim();

          const password = String(
            body.password || ""
          );

          const email = String(
            body.email || ""
          ).trim();

          const role =
            body.role === "admin"
              ? "admin"
              : "user";

          if (
            !username ||
            !/^[a-z0-9_]{3,24}$/.test(username)
          ) {
            return json(
              {
                error:
                  "Username must be 3-24 lowercase letters, numbers, or underscores.",
              },
              400
            );
          }

          if (!displayName) {
            return json(
              {
                error:
                  "Display name is required.",
              },
              400
            );
          }

          if (password.length < 6) {
            return json(
              {
                error:
                  "Password must be at least 6 characters.",
              },
              400
            );
          }

          if (role === "admin" && !email) {
            return json(
              {
                error:
                  "Admin accounts require an email.",
              },
              400
            );
          }

          const { data: existing } =
            await ctx.supabaseAdmin
              .from("profiles")
              .select("id")
              .eq("username", username)
              .maybeSingle();

          if (existing) {
            return json(
              {
                error:
                  "That username is already taken.",
              },
              409
            );
          }

          const authUserEmail =
            email || authEmail(username);

          const { data: created, error: createError } =
            await ctx.supabaseAdmin.auth.admin.createUser(
              {
                email: authUserEmail,
                password,
                email_confirm: true,
                user_metadata: {
                  username,
                  display_name: displayName,
                  role,
                },
              }
            );

          if (
            createError ||
            !created.user
          ) {
            return json(
              {
                error:
                  createError?.message ||
                  "Could not create account.",
              },
              400
            );
          }

          const { data: profile, error: profileError } =
  await ctx.supabaseAdmin
    .from("profiles")
    .update({
      username,
      display_name: displayName,
      role,
      email: email || "",
      active: true,
    })
    .eq("id", created.user.id)
    .select()
    .single();

          if (profileError) {
            await ctx.supabaseAdmin.auth.admin.deleteUser(
              created.user.id
            );

            return json(
              {
                error:
                  profileError.message,
              },
              500
            );
          }

          await logActivity(ctx, {
            actorId: adminProfile.id,
            actorName:
              adminProfile.display_name ||
              adminProfile.username,
            action: "user_created",
            targetType: "user",
            targetId: profile.id,
            targetLabel:
              profile.username,
          });

          return json({
            account: toPublicAccount(profile),
          });
        }

        // =====================================================
        // UPDATE USER
        // =====================================================

        if (action === "updateUser") {
          const targetId = String(
            body.targetId || ""
          );

          const displayName = String(
            body.displayName || ""
          ).trim();

          const username = normalizeUsername(
            body.username
          );

          const profileImage = String(
            body.profileImage || ""
          );

          if (!targetId) {
            return json(
              {
                error:
                  "Target user is required.",
              },
              400
            );
          }

          if (!displayName) {
            return json(
              {
                error:
                  "Display name is required.",
              },
              400
            );
          }

          if (
            !username ||
            !/^[a-z0-9_]{3,24}$/.test(username)
          ) {
            return json(
              {
                error:
                  "Invalid username.",
              },
              400
            );
          }

          const { data: target, error: targetError } =
            await ctx.supabaseAdmin
              .from("profiles")
              .select("*")
              .eq("id", targetId)
              .maybeSingle();

          if (targetError || !target) {
            return json(
              {
                error:
                  "User not found.",
              },
              404
            );
          }

          const oldUsername = target.username;

          const { data: duplicate } =
            await ctx.supabaseAdmin
              .from("profiles")
              .select("id")
              .eq("username", username)
              .neq("id", targetId)
              .maybeSingle();

          if (duplicate) {
            return json(
              {
                error:
                  "That username is already taken.",
              },
              409
            );
          }

          const { error: authUpdateError } =
            await ctx.supabaseAdmin.auth.admin.updateUserById(
              targetId,
              {
                user_metadata: {
                  username,
                  display_name: displayName,
                },
              }
            );

          if (authUpdateError) {
            return json(
              {
                error:
                  authUpdateError.message,
              },
              400
            );
          }

          const { data: updated, error: updateError } =
            await ctx.supabaseAdmin
              .from("profiles")
              .update({
                username,
                display_name: displayName,
                profile_image: profileImage,
              })
              .eq("id", targetId)
              .select()
              .single();

          if (updateError || !updated) {
            return json(
              {
                error:
                  updateError?.message ||
                  "Could not update user.",
              },
              500
            );
          }

          await logActivity(ctx, {
            actorId: adminProfile.id,
            actorName:
              adminProfile.display_name ||
              adminProfile.username,
            action:
              oldUsername !== username
                ? "username_changed"
                : "user_updated",
            targetType: "user",
            targetId: targetId,
            targetLabel: username,
          });

          return json({
            account:
              toPublicAccount(updated),
          });
        }

        // =====================================================
        // REMOVE USER
        // =====================================================

        if (action === "remove") {
          const targetId = String(
            body.targetId || ""
          );

          if (!targetId) {
            return json(
              {
                error:
                  "Target user is required.",
              },
              400
            );
          }

          if (targetId === adminProfile.id) {
            return json(
              {
                error:
                  "You cannot delete your own account.",
              },
              403
            );
          }

          const { data: target, error: targetError } =
            await ctx.supabaseAdmin
              .from("profiles")
              .select("*")
              .eq("id", targetId)
              .maybeSingle();

          if (targetError || !target) {
            return json(
              {
                error:
                  "User not found.",
              },
              404
            );
          }

          if (target.role === "admin") {
            return json(
              {
                error:
                  "You cannot delete another admin account.",
              },
              403
            );
          }

          const targetLabel = target.username;

          const { error: profileDeleteError } =
            await ctx.supabaseAdmin
              .from("profiles")
              .delete()
              .eq("id", targetId);

          if (profileDeleteError) {
            return json(
              {
                error:
                  profileDeleteError.message,
              },
              400
            );
          }

          const { error: authDeleteError } =
            await ctx.supabaseAdmin.auth.admin.deleteUser(
              targetId
            );

          if (authDeleteError) {
            return json(
              {
                error:
                  authDeleteError.message,
              },
              500
            );
          }

          await logActivity(ctx, {
            actorId: adminProfile.id,
            actorName:
              adminProfile.display_name ||
              adminProfile.username,
            action: "user_deleted",
            targetType: "user",
            targetId,
            targetLabel,
          });

          return json({
            ok: true,
          });
        }

        // =====================================================
        // RESET PASSWORD
        // =====================================================

        if (action === "resetPassword") {
          const targetId = String(
            body.targetId || ""
          );

          const newPassword = String(
            body.newPassword || ""
          );

          if (!targetId) {
            return json(
              {
                error:
                  "Target user is required.",
              },
              400
            );
          }

          if (newPassword.length < 6) {
            return json(
              {
                error:
                  "Password must be at least 6 characters.",
              },
              400
            );
          }

          const { data: target, error: targetError } =
            await ctx.supabaseAdmin
              .from("profiles")
              .select("*")
              .eq("id", targetId)
              .maybeSingle();

          if (targetError || !target) {
            return json(
              {
                error:
                  "User not found.",
              },
              404
            );
          }

          const { error: passwordError } =
            await ctx.supabaseAdmin.auth.admin.updateUserById(
              targetId,
              {
                password: newPassword,
              }
            );

          if (passwordError) {
            return json(
              {
                error:
                  passwordError.message,
              },
              400
            );
          }

          await logActivity(ctx, {
            actorId: adminProfile.id,
            actorName:
              adminProfile.display_name ||
              adminProfile.username,
            action: "password_reset",
            targetType: "user",
            targetId,
            targetLabel:
              target.username,
          });

          return json({
            ok: true,
          });
        }

        return json(
          {
            error: "Unknown action.",
          },
          400
        );
      } catch (error) {
        console.error(
          "account-auth error:",
          error
        );

        return json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Something went wrong.",
          },
          500
        );
      }
    }
  ),
};