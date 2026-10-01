import { api } from './client';
import type { User } from '@/types/api';

export interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
}

export const profileApi = {
  async getProfile(signal?: AbortSignal): Promise<User> {
    return api.get<User>('/user/profile/', undefined, signal);
  },

  async updateProfile(input: UpdateProfileInput): Promise<User> {
    const payload: UpdateProfileInput = {};
    if (input.first_name !== undefined) {
      payload.first_name = input.first_name.trim();
    }
    if (input.last_name !== undefined) {
      payload.last_name = input.last_name.trim();
    }
    return api.patch<User>('/user/profile/', payload);
  },
};
