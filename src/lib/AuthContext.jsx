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
      const { data, error } = await supabase.functions.invoke(
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

      console.log("[DuckNote Auth] ME response:", {
        data,
        error: error
          ? {
            message: error.message,
            name: error.name,
            context: error.context,
          }
          : null,
      });

      if (error) {
        throw error;
      }

      if (!data?.account) {
        throw new Error("Invalid session.");
      }

      console.log("[DuckNote Auth] ME account:", {
        id: data.account.id,
        username: data.account.username,
        role: data.account.role,
        active: data.account.active,
      });

      setUser(data.account);

      return data.account;
    } catch (err) {
      console.error("[DuckNote Auth] ME failed:", {
        message: err?.message,
        name: err?.name,
      });

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

        if (!mounted) return;

        if (session?.access_token) {
          setToken(session.access_token);

          const account = await loadCurrentUser(
            session.access_token
          );

          if (!account && mounted) {
            await supabase.auth.signOut();
          }
        }
      } catch (err) {
        if (mounted) {
          setUser(null);
          setToken(null);
          setAuthError(
            err?.message || "Something went wrong."
          );
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
        if (session?.access_token) {
          setToken(session.access_token);
        } else {
          setToken(null);
        }

        if (event === "SIGNED_OUT") {
          setUser(null);
          setToken(null);
          resetPushNotifications();
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

  // =========================================================
  // Login
  // =========================================================

  const login = async (username, password) => {
    setAuthError(null);

    try {
      const { data, error } =
        await supabase.functions.invoke("account-auth", {
          body: {
            action: "login",
            username,
            password,
          },
        });

      if (error) {
        throw new Error(
          error.message || "Login failed."
        );
      }

      if (!data?.account || !data?.token) {
        throw new Error("Login failed.");
      }

      console.log("[DuckNote Auth] LOGIN account:", {
        id: data.account.id,
        username: data.account.username,
        role: data.account.role,
        active: data.account.active,
      });

      // The Edge Function authenticates through Supabase Auth
      // and returns the Supabase session tokens.
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.setSession({
        access_token: data.token,
        refresh_token: data.refreshToken,
      });

      console.log("[DuckNote Auth] SESSION:", {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        userId: session?.user?.id,
        email: session?.user?.email,
      });

      if (sessionError) {
        throw sessionError;
      }

      setUser(data.account);
      setToken(data.token);

      return data.account;
    } catch (err) {
      const message =
        err?.message || "Login failed.";

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
        return;
      }

      setToken(session.access_token);

      const account = await loadCurrentUser(
        session.access_token
      );

      if (!account) {
        await supabase.auth.signOut();
      }
    } catch {
      setUser(null);
      setToken(null);
    }
  };

  // =========================================================
  // Logout
  // =========================================================

  const logout = async (shouldRedirect = true) => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Even if the server-side logout fails,
      // clear the local authentication state.
    }

    setUser(null);
    setToken(null);
    setAuthError(null);

    if (shouldRedirect) {
      window.location.href = "/login";
    }
  };

  // =========================================================
  // Navigation
  // =========================================================

  const navigateToLogin = () => {
    window.location.href = "/login";
  };

  // =========================================================
  // Provider
  // =========================================================

  return (
    <AuthContext.Provider
      value={{
        user,
        token,

        isAuthenticated: !!user,

        isLoadingAuth,
        isLoadingPublicSettings,

        authError,
        authChecked,

        appPublicSettings: null,

        logout,
        navigateToLogin,

        checkUserAuth,

        checkAppState: async () => {
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
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};