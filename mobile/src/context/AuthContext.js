import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import {
  hydrateRefreshToken,
  getStoredRefreshToken,
  setSession,
  clearSession,
  subscribe,
  getUser,
} from '../api/tokenStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUser());
  // Starts true so RootNavigator doesn't flash the login screen while we're
  // still trying to silently restore a session from the securely-stored
  // refresh token.
  const [initializing, setInitializing] = useState(true);

  useEffect(() => subscribe(({ user: u }) => setUser(u)), []);

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      const refreshToken = await hydrateRefreshToken();
      if (!refreshToken) {
        setInitializing(false);
        return;
      }
      try {
        const { data } = await api.post('/auth/refresh', { refreshToken });
        if (!cancelled) await setSession(data);
      } catch {
        if (!cancelled) await clearSession();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }
    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });

    // This app is the owner/manager dashboard, not a checkout terminal —
    // every report/dashboard endpoint it calls is ADMIN/MANAGER-only on the
    // server anyway, so a cashier account couldn't do anything useful here.
    // Reject it client-side with a clear explanation instead of letting them
    // land on a dashboard full of permission errors.
    if (data.user.role === 'CASHIER') {
      if (data.refreshToken) {
        try {
          await api.post('/auth/logout', { refreshToken: data.refreshToken });
        } catch {
          // best-effort cleanup of a token we're refusing to use
        }
      }
      throw new Error('This app is for managers and admins. Cashiers should use the in-store POS terminal.');
    }

    await setSession(data);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getStoredRefreshToken();
    await clearSession();
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch {
        // Best-effort: the local session is already cleared either way.
      }
    }
  }, []);

  const value = {
    user,
    initializing,
    isAuthenticated: Boolean(user),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}
