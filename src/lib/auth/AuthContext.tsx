'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { configureApiClient, endSession } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { getTokenUserId, isTokenExpired } from '@/lib/auth/jwt';
import { clearTokens, readTokens, writeTokens } from '@/lib/auth/storage';
import type { AuthPayload, User } from '@/types/api';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  /** Replaces the cached user so profile edits are reflected app-wide. */
  updateUser: (user: User) => void;
  /**
   * Turns an already-issued `{tokens, user}` payload into a session. The Google
   * callback lands with tokens in the URL rather than as a response body, and
   * this is the same funnel `signIn` and `signUp` go through, so there is only
   * one way to become authenticated.
   */
  adoptSession: (payload: AuthPayload) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * There is no `whoami` endpoint on the backend, so the signed-in user is
 * reconstructed from the cached sign-up/login payload plus the `user_id` claim
 * inside the access token. Both are re-synced on every successful auth call.
 */
const USER_STORAGE_KEY = 'habit-tracker-user';

function readCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function cacheUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const mounted = useRef(false);

  // The transport needs to be able to tear the session down on a failed refresh.
  useEffect(() => {
    configureApiClient({
      onSessionExpired: () => {
        cacheUser(null);
        if (mounted.current) setStatus('anonymous');
      },
    });
  }, []);

  /*
   * Restoring a session has to wait for mount: the server cannot read
   * localStorage, so it renders `loading` and the client must agree on the
   * first pass. That makes this one of the few effects that legitimately
   * updates state synchronously.
   */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    mounted.current = true;
    const tokens = readTokens();
    if (!tokens?.access) {
      cacheUser(null);
      setStatus('anonymous');
      return;
    }

    const cached = readCachedUser();
    if (cached) setUser(cached);

    // An expired access token is still refreshable, so only a malformed or
    // unverifiable token is treated as a dead session here.
    if (!getTokenUserId(tokens.access)) {
      clearTokens();
      cacheUser(null);
      setStatus('anonymous');
      return;
    }

    setStatus('authenticated');
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const adopt = useCallback((payload: AuthPayload) => {
    writeTokens(payload.tokens);
    cacheUser(payload.user);
    setUser(payload.user);
    setStatus('authenticated');
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      adopt(await authApi.logIn(email, password));
    },
    [adopt],
  );

  const signUp = useCallback(
    async (input: { email: string; password: string; first_name?: string; last_name?: string }) => {
      adopt(await authApi.signUp(input));
    },
    [adopt],
  );

  const signOut = useCallback(async () => {
    const tokens = readTokens();
    // Fire and forget: the endpoint cannot actually revoke without a blacklist.
    if (tokens?.refresh) {
      await authApi.logOut(tokens.refresh).catch(() => undefined);
    }
    endSession();
    cacheUser(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  const updateUser = useCallback((next: User) => {
    cacheUser(next);
    setUser(next);
  }, []);

  const value = useMemo(
    () => ({ status, user, signIn, signUp, signOut, updateUser, adoptSession: adopt }),
    [status, user, signIn, signUp, signOut, updateUser, adopt],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

/** True when the access token has passed its expiry, used for gentle nudges. */
export function accessTokenExpired(): boolean {
  const tokens = readTokens();
  return tokens?.access ? isTokenExpired(tokens.access) : true;
}
