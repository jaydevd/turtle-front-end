import { api } from './client';
import type { AuthPayload, User } from '@/types/api';

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
};

export type { User };
