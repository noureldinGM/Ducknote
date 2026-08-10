import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();
const STORAGE_KEY = 'ducknote_session_v1';

async function callAccountAuth(payload) {
  let res;
  try {
    res = await base44.functions.invoke('accountAuth', payload);
  } catch (err) {
    const data = err?.response?.data || err?.data || {};
    const msg = data?.error || err?.message || 'Something went wrong.';
    throw new Error(typeof msg === 'string' ? msg : 'Something went wrong.');
  }
  if (res?.status >= 400) {
    throw new Error(res?.data?.error || 'Something went wrong.');
  }
  return res?.data;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        const data = await callAccountAuth({ action: 'me', id: session.id, token: session.token });
        if (data?.account) {
          setUser(data.account);
          setToken(session.token);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
      setAuthChecked(true);
    }
  };

  const login = async (username, password) => {
    const data = await callAccountAuth({ action: 'login', username, password });
    if (!data?.account) throw new Error('Login failed.');
    const session = { id: data.account.id, token: data.token };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(data.account);
    setToken(data.token);
    return data.account;
  };

  const checkUserAuth = async () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const session = JSON.parse(raw);
      const data = await callAccountAuth({ action: 'me', id: session.id, token: session.token });
      if (data?.account) {
        setUser(data.account);
        setToken(session.token);
      }
    } catch {}
  };

  const logout = (shouldRedirect = true) => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const session = JSON.parse(raw);
        callAccountAuth({ action: 'logout', id: session.id, token: session.token }).catch(() => {});
      } catch {}
    }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setToken(null);
    if (shouldRedirect) window.location.href = '/login';
  };

  const navigateToLogin = () => { window.location.href = '/login'; };

  return (
    <AuthContext.Provider value={{
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
      checkAppState: init,
      login
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};