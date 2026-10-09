import { API_BASE_URL, api } from './client';
import type { AuthPayload, User } from '@/types/api';

export interface SetPasswordInput {
  new_password: string;
  /** Only sent when the account already has one to confirm. */
  current_password?: string;
}

export const authApi = {
  async signUp(input: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }): Promise<AuthPayload> {
    const payload = await api.post<AuthPayload>('/user/auth/sign-up/', {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      first_name: input.first_name?.trim() || '',
      last_name: input.last_name?.trim() || '',
    });
    return payload;
  },

  async logIn(email: string, password: string): Promise<AuthPayload> {
    return api.post<AuthPayload>('/user/auth/log-in/', {
      email: email.trim().toLowerCase(),
      password,
    });
  },

  /**
   * Best effort. The backend has no token blacklist installed, so this always
   * reports success and the client discards the tokens either way.
   */
  async logOut(refresh: string): Promise<void> {
    await api.post('/user/auth/log-out/', { refresh });
  },

  /**
   * Sets a password on the signed-in account and returns it refreshed, which is
   * how the client learns `has_password` has flipped.
   *
   * `current_password` is only sent when the caller has one to send; the backend
   * rejects a password change on an account that already has a password unless
   * it comes with it.
   */
  async setPassword(input: {
    new_password: string;
    current_password?: string;
  }): Promise<User> {
    const body: { new_password: string; current_password?: string } = {
      new_password: input.new_password,
    };
    if (input.current_password) {
      body.current_password = input.current_password;
    }
    return api.post<User>('/user/auth/set-password/', body);
  },

  /**
   * Starts connecting Google to the signed-in account and returns the URL to
   * send the browser to.
   *
   * A POST rather than a plain navigation: the backend can only tell whose
   * account is asking from the Authorization header, and a navigation carries
   * none. The response is a signed URL - no credential comes back - and the
   * rest of the flow happens as redirects, ending on the Google callback page.
   */
  async googleLinkStart(next?: string): Promise<string> {
    const { url } = await api.post<{ url: string }>('/user/auth/google/link/start/', {
      next: next ?? '/settings',
    });
    return url;
  },

  /**
   * Unlinks Google from the signed-in account and returns it refreshed, which
   * is how the client learns `google_connected` has flipped.
   *
   * The backend refuses when the account has no password, because the link
   * would then be the only way back in.
   */
  async googleDisconnect(): Promise<User> {
    return api.delete<User>('/user/auth/google/disconnect/');
  },
};

/**
 * Where to send the browser to start a Google sign in.
 *
 * A navigation, not a request: the backend answers with a redirect to Google and
 * comes back to `/auth/google/callback`, so there is no response for this client
 * to read and no credential that needs exposing to the browser.
 */
export function googleSignInUrl(next?: string): string {
  const base = `${API_BASE_URL}/user/auth/google/start/`;
  if (!next) return base;
  return `${base}?${new URLSearchParams({ next }).toString()}`;
}

export type { User };