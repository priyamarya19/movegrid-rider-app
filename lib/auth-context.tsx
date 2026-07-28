import * as SecureStore from 'expo-secure-store';
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
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
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

  const signIn = async (mobile: string, otp: string) => {
    const res = await api.verifyOtp(mobile, otp);
    const nextUser: RiderUser = { name: res.name, mobile };
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, res.token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser)),
    ]);
    signingOut.current = false;
    setSessionExpired(false);
    setToken(res.token);
    setUser(nextUser);
  };

  const signOut = async () => {
    if (signingOut.current) return;
    signingOut.current = true;
    try {
      await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
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
    <AuthContext.Provider value={{ token, user, isLoading, sessionExpired, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
