import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'anonymous'

  const logout = useCallback(() => {
    api.setTokens({});
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    api.setAuthExpiredHandler(() => {
      setUser(null);
      setStatus('anonymous');
    });

    const persisted = api.loadPersistedRefreshToken();
    if (!persisted) {
      setStatus('anonymous');
      return;
    }

    // Bootstrapping a fresh access token from the persisted refresh token.
    (async () => {
      try {
        const tokens = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:5002/api/v1'}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: persisted }),
        }).then((r) => r.json());

        if (!tokens?.success) throw new Error('refresh failed');
        api.setTokens(tokens.data);
        const me = await api.get('/auth/me');
        setUser(me);
        setStatus('authenticated');
      } catch (_e) {
        api.setTokens({});
        setStatus('anonymous');
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    api.setTokens(data);
    setUser(data.user);
    setStatus('authenticated');
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
