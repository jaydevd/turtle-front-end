import { api } from './client';
import { WORKING_SET_SIZE } from './habits';
import type { Tag } from '@/types/api';

export const tagsApi = {
  list(signal?: AbortSignal): Promise<{ count: number; results: Tag[] }> {
    return api.get('/user/habits/tags/', { limit: WORKING_SET_SIZE }, signal);
  },

  create(name: string): Promise<Tag> {
    return api.post<Tag>('/user/habits/tags/', { name: name.trim() });
  },

  /** Requires the UUID route; the backend's `int` variant could never match. */
  rename(id: string, name: string): Promise<Tag> {
    return api.patch<Tag>(`/user/habits/tags/${id}/`, { name: name.trim() });
  },

  /**
   * Fails with a 400 while any habit still references the tag, because the
   * foreign key is `on_delete=PROTECT`.
   */
  async remove(id: string): Promise<void> {
    await api.delete<void>(`/user/habits/tags/${id}/`);
  },
};
