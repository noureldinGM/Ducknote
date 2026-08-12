import React, {
  createContext,
  useState,
  useContext,
  useEffect,
} from "react";

import { supabase } from "@/lib/supabase";

import {
  initPushNotifications,
  resetPushNotifications,
} from "@/lib/pushNotifications";

import {
  syncDuckNoteSession,
  clearDuckNoteSession,
} from "@/lib/duckNoteWidget";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] =
    useState(true);

  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // =========================================================
  // Get current DuckNote account from Supabase Edge Function
  // =========================================================

  const loadCurrentUser = async (accessToken = null) => {
    try {
      const { data, error } =
        await supabase.functions.invoke(
          "account-auth",
          {
            body: {
              action: "me",
            },
            headers: accessToken
              ? {
                Authorization: `Bearer ${accessToken}`,
              }
              : undefined,
          }
        );

      console.log(
        "[DuckNote Auth] ME response:",
        {
          data,
          error: error
            ? {
              message: error.message,
              name: error.name,
              context: error.context,
            }
            : null,
        }
      );

      if (error) {
        throw error;
      }

      if (!data?.account) {
        throw new Error("Invalid session.");
      }

      console.log(
        "[DuckNote Auth] ME account:",
        {
          id: data.account.id,
          username: data.account.username,
          role: data.account.role,
          active: data.account.active,
        }
      );

      setUser(data.account);

      return data.account;
    } catch (err) {
      console.error(
        "[DuckNote Auth] ME failed:",
        {
          message: err?.message,
          name: err?.name,
        }
      );

      setUser(null);
      setToken(null);

      return null;
    }
  };

  // =========================================================
  // Initialize authentication
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setAuthError(null);

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!mounted) {
          return;
        }

        // ===================================================
        // Existing Supabase session
        // ===================================================

        if (session?.access_token) {
          setToken(session.access_token);

          const account =
            await loadCurrentUser(
              session.access_token
            );

          if (!mounted) {
            return;
          }

          if (account) {
            // Sync the current authenticated session
            // with the native Android Widget layer.
            if (
              session.refresh_token &&
              session.user?.id
            ) {
              try {
                await syncDuckNoteSession(
                  session.access_token,
                  session.refresh_token,
                  session.user.id
                );
              } catch (widgetError) {
                console.error(
                  "[DuckNote Auth] Failed to sync existing session with widget:",
                  widgetError
                );
              }
            }
          } else {
            // The Supabase session exists locally,
            // but the DuckNote account is no longer valid.
            await supabase.auth.signOut();

            try {
              await clearDuckNoteSession();
            } catch (widgetError) {
              console.error(
                "[DuckNote Auth] Failed to clear widget session:",
                widgetError
              );
            }
          }
        } else {
          // No authenticated session.
          // Make sure an old native widget session
          // cannot remain after a previous login.
          try {
            await clearDuckNoteSession();
          } catch (widgetError) {
            console.error(
              "[DuckNote Auth] Failed to clear stale widget session:",
              widgetError
            );
          }
        }
      } catch (err) {
        if (mounted) {
          setUser(null);
          setToken(null);

          setAuthError(
            err?.message ||
            "Something went wrong."
          );

          try {
            await clearDuckNoteSession();
          } catch (widgetError) {
            console.error(
              "[DuckNote Auth] Failed to clear widget session after auth error:",
              widgetError
            );
          }
        }
      } finally {
        if (mounted) {
          setIsLoadingAuth(false);
          setIsLoadingPublicSettings(false);
          setAuthChecked(true);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // =========================================================
  // Listen for Supabase authentication changes
  // =========================================================

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // ===================================================
        // Authenticated / refreshed session
        // ===================================================

        if (session?.access_token) {
          setToken(session.access_token);

          if (
            session.refresh_token &&
            session.user?.id
          ) {
            try {
              await syncDuckNoteSession(
                session.access_token,
                session.refresh_token,
                session.user.id
              );
            } catch (error) {
              console.error(
                "[DuckNote Auth] Failed to sync refreshed session with widget:",
                error
              );
            }
          }
        } else {
          setToken(null);
        }

        // ===================================================
        // Signed out
        // ===================================================

        if (event === "SIGNED_OUT") {
          setUser(null);
          setToken(null);

          resetPushNotifications();

          try {
            await clearDuckNoteSession();
          } catch (error) {
            console.error(
              "[DuckNote Auth] Failed to clear widget session:",
              error
            );
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // =========================================================
  // Initialize push notifications after authentication
  // =========================================================

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    initPushNotifications(token);
  }, [token, user]);
  useEffect(() => {
    if (!token || !user?.id) {
      return;
    }

    let cancelled = false;

    const syncWidgetSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (
          cancelled ||
          !session?.access_token ||
          !session?.refresh_token
        ) {
          return;
        }

        await syncDuckNoteSession(
          session.access_token,
          session.refresh_token,
          user.id
        );
      } catch (error) {
        console.error(
          "[DuckNote Auth] Widget session sync failed:",
          error
        );
      }
    };

    syncWidgetSession();

    return () => {
      cancelled = true;
    };
  }, [token, user?.id]);
  // =========================================================
  // Login
  // =========================================================

  const login = async (
    username,
    password
  ) => {
    setAuthError(null);

    try {
      const { data, error } =
        await supabase.functions.invoke(
          "account-auth",
          {
            body: {
              action: "login",
              username,
              password,
            },
          }
        );

      if (error) {
        const status =
          error?.context?.status ??
          error?.status;

        if (status === 401) {
          throw new Error(
            "Wrong username or password."
          );
        }

        let serverMessage = "";

        try {
          const context = error?.context;

          if (context) {
            const response =
              typeof context.clone ===
                "function"
                ? context.clone()
                : context;

            if (
              typeof response.json ===
              "function"
            ) {
              const body =
                await response
                  .json()
                  .catch(
                    () => null
                  );

              serverMessage =
                body?.error ||
                body?.message ||
                "";
            }
          }
        } catch {
          // Ignore response parsing errors.
        }

        throw new Error(
          serverMessage ||
          error.message ||
          "Login failed."
        );
      }

      if (
        !data?.account ||
        !data?.token
      ) {
        throw new Error(
          "Login failed."
        );
      }

      console.log(
        "[DuckNote Auth] LOGIN account:",
        {
          id: data.account.id,
          username:
            data.account.username,
          role: data.account.role,
          active: data.account.active,
        }
      );

      // The Edge Function authenticates through
      // Supabase Auth and returns the Supabase
      // session tokens.
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.setSession({
        access_token: data.token,
        refresh_token:
          data.refreshToken,
      });

      console.log(
        "[DuckNote Auth] SESSION:",
        {
          hasSession: !!session,
          hasAccessToken:
            !!session?.access_token,
          userId:
            session?.user?.id,
          email:
            session?.user?.email,
        }
      );

      if (sessionError) {
        throw sessionError;
      }

      if (
        !session?.access_token ||
        !session?.refresh_token
      ) {
        throw new Error(
          "Login session could not be established."
        );
      }

      // Sync the authenticated session with
      // the native Android Widget layer.
      await syncDuckNoteSession(
        session.access_token,
        session.refresh_token,
        data.account.id
      );

      setUser(data.account);
      setToken(
        session.access_token
      );

      return data.account;
    } catch (err) {
      const message =
        err?.message ||
        "Login failed.";

      setAuthError(message);

      throw new Error(message);
    }
  };

  // =========================================================
  // Check current authentication
  // =========================================================

  const checkUserAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setUser(null);
        setToken(null);

        try {
          await clearDuckNoteSession();
        } catch (error) {
          console.error(
            "[DuckNote Auth] Failed to clear widget session:",
            error
          );
        }

        return;
      }

      setToken(
        session.access_token
      );

      const account =
        await loadCurrentUser(
          session.access_token
        );

      if (!account) {
        await supabase.auth.signOut();

        try {
          await clearDuckNoteSession();
        } catch (error) {
          console.error(
            "[DuckNote Auth] Failed to clear widget session:",
            error
          );
        }

        return;
      }

      // Keep the native Widget session
      // synchronized with the current Supabase session.
      if (
        session.refresh_token &&
        session.user?.id
      ) {
        try {
          await syncDuckNoteSession(
            session.access_token,
            session.refresh_token,
            session.user.id
          );
        } catch (error) {
          console.error(
            "[DuckNote Auth] Failed to sync widget session:",
            error
          );
        }
      }
    } catch (error) {
      setUser(null);
      setToken(null);

      try {
        await clearDuckNoteSession();
      } catch (widgetError) {
        console.error(
          "[DuckNote Auth] Failed to clear widget session:",
          widgetError
        );
      }
    }
  };

  // =========================================================
  // Logout
  // =========================================================

  const logout = async (
    shouldRedirect = true
  ) => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Even if the server-side logout fails,
      // clear the local authentication state.
    }

    setUser(null);
    setToken(null);
    setAuthError(null);

    // Make sure the native Widget cannot
    // continue using the previous account session.
    try {
      await clearDuckNoteSession();
    } catch (error) {
      console.error(
        "[DuckNote Auth] Failed to clear widget session on logout:",
        error
      );
    }

    if (shouldRedirect) {
      window.location.href =
        "/login";
    }
  };

  // =========================================================
  // Navigation
  // =========================================================

  const navigateToLogin = () => {
    window.location.href =
      "/login";
  };

  // =========================================================
  // Provider
  // =========================================================

  return (
    <AuthContext.Provider
      value={{
        user,
        token,

        isAuthenticated:
          !!user,

        isLoadingAuth,
        isLoadingPublicSettings,

        authError,
        authChecked,

        appPublicSettings: null,

        logout,
        navigateToLogin,

        checkUserAuth,

        checkAppState:
          async () => {
            await checkUserAuth();
          },

        login,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// =========================================================
// useAuth
// =========================================================

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};