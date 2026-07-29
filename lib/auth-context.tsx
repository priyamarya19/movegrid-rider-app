import { storage } from './storage';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

import * as api from './api';
import { clearQueryCache } from './queryCache';

const TOKEN_KEY = 'mgr_token';
const USER_KEY = 'mgr_user';

type RiderUser = { name: string; mobile: string };

type AuthState = {
  token: string | null;
  user: RiderUser | null;
  isLoading: boolean;
  sessionExpired: boolean;
  signIn: (mobile: string, otp: string) => Promise<void>;
  /** Complete login with an already-issued rider token (UAT tester picker). */
  signInWithToken: (token: string, user: RiderUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<RiderUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const signingOut = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          storage.get(TOKEN_KEY),
          storage.get(USER_KEY),
        ]);
        if (savedToken) {
          setToken(savedToken);
          setUser(savedUser ? JSON.parse(savedUser) : null);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const complete = async (newToken: string, nextUser: RiderUser) => {
    await Promise.all([storage.set(TOKEN_KEY, newToken), storage.set(USER_KEY, JSON.stringify(nextUser))]);
    clearQueryCache(); // never show the previous rider's cached data
    signingOut.current = false;
    setSessionExpired(false);
    setToken(newToken);
    setUser(nextUser);
  };

  const signIn = async (mobile: string, otp: string) => {
    const res = await api.verifyOtp(mobile, otp);
    await complete(res.token, { name: res.name, mobile });
  };

  const signInWithToken = async (newToken: string, nextUser: RiderUser) => {
    await complete(newToken, nextUser);
  };

  const signOut = async () => {
    if (signingOut.current) return;
    signingOut.current = true;
    try {
      await Promise.all([storage.del(TOKEN_KEY), storage.del(USER_KEY)]);
      clearQueryCache();
      setToken(null);
      setUser(null);
    } finally {
      signingOut.current = false;
    }
  };

  useEffect(() => {
    api.setUnauthorizedHandler((code) => {
      if (code === 'token_expired') setSessionExpired(true);
      void signOut();
    });
    return () => api.setUnauthorizedHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, sessionExpired, signIn, signInWithToken, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
