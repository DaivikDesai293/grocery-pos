import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { getStoredRefreshToken, setSession, clearSession, subscribe, getUser } from '../api/tokenStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUser());
  // Starts true so routes don't flash a "please log in" screen while we're
  // still trying to silently restore a session from the stored refresh token.
  const [initializing, setInitializing] = useState(true);

  useEffect(() => subscribe(({ user: u }) => setUser(u)), []);

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        setInitializing(false);
        return;
      }
      try {
        const { data } = await api.post('/auth/refresh', { refreshToken });
        if (!cancelled) setSession(data);
      } catch {
        if (!cancelled) clearSession();
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
    setSession(data);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getStoredRefreshToken();
    clearSession();
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch {
        // Best-effort: the local session is already cleared either way.
      }
    }
  }, []);

  const hasRole = useCallback((...roles) => Boolean(user && roles.includes(user.role)), [user]);

  const value = {
    user,
    initializing,
    isAuthenticated: Boolean(user),
    login,
    logout,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}
