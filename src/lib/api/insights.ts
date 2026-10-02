import { api } from './client';
import type {
  OverviewResponse,
  PatternsResponse,
  TrendResponse,
  RiskResponse,
  HabitDetailInsightsResponse,
} from '@/types/api';

export const insightsApi = {
  overview(params?: { window?: number }, signal?: AbortSignal): Promise<OverviewResponse> {
    return api.get<OverviewResponse>('/user/habits/insights/overview/', params, signal);
  },

  patterns(params?: { window?: number; habit_id?: string }, signal?: AbortSignal): Promise<PatternsResponse> {
    return api.get<PatternsResponse>('/user/habits/insights/patterns/', params, signal);
  },

  trend(params?: { window?: number; granularity?: 'day' | 'week' }, signal?: AbortSignal): Promise<TrendResponse> {
    return api.get<TrendResponse>('/user/habits/insights/trend/', params, signal);
  },

  risk(params?: { window?: number }, signal?: AbortSignal): Promise<RiskResponse> {
    return api.get<RiskResponse>('/user/habits/insights/risk/', params, signal);
  },

  detail(habitId: string, params?: { window?: number }, signal?: AbortSignal): Promise<HabitDetailInsightsResponse> {
    return api.get<HabitDetailInsightsResponse>(`/user/habits/${habitId}/insights/`, params, signal);
  },
};
