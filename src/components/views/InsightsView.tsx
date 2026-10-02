'use client';

import { useState } from 'react';
import { Box, MenuItem, Select, Stack, Tab, Tabs, Typography } from '@mui/material';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRounded from '@mui/icons-material/TrendingDownRounded';
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded';
import VerifiedRounded from '@mui/icons-material/VerifiedRounded';
import {
  ErrorState,
  HabitIconTile,
  InlineEmpty,
  ListSkeleton,
  PageHeader,
  Section,
  StatTile,
} from '@/components/ui/surfaces';
import {
  HourOfDayBars,
  InsightsHeatmap,
  InsightsHeatmapLegend,
  TrendBars,
  WeekdayProfileBars,
} from '@/components/ui/insights';
import { errorMessage } from '@/lib/api/client';
import {
  useInsightsOverview,
  useInsightsPatterns,
  useInsightsRisk,
  useInsightsTrend,
} from '@/lib/query/hooks';
import { useAppScheme } from '@/theme/useAppScheme';
import { formatPlural } from '@/lib/date';
import type { HabitOverviewRow, RiskLevel } from '@/types/api';

type TabKey = 'overview' | 'patterns' | 'trend' | 'risk';

const WINDOWS = [7, 14, 30, 90, 180, 365] as const;

export function InsightsView() {
  const { colors } = useAppScheme();
  const [tab, setTab] = useState<TabKey>('overview');
  const [windowDays, setWindowDays] = useState<number>(30);

  const overview = useInsightsOverview(windowDays);
  const patterns = useInsightsPatterns({ window: windowDays });
  const trend = useInsightsTrend({ window: windowDays, granularity: 'day' });
  const risk = useInsightsRisk(windowDays);

  const accent = '#386A5A';

  return (
    <>
      <PageHeader
        eyebrow="Analysis"
        title="Insights"
        description="Patterns, trends and risk signals across your habits."
        actions={
          <Select
            size="small"
            value={windowDays}
            onChange={(event) => setWindowDays(Number(event.target.value))}
            sx={{ minWidth: 132 }}
          >
            {WINDOWS.map((days) => (
              <MenuItem key={days} value={days}>
                Last {days} days
              </MenuItem>
            ))}
          </Select>
        }
      />
      <Stack spacing={3}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value as TabKey)}
          sx={{
            borderBottom: `1px solid ${colors.hairline}`,
            '& .MuiTab-root': {
              color: colors.inkSoft,
              '&.Mui-selected': { color: colors.ink },
            },
            '& .MuiTabs-indicator': { backgroundColor: colors.sage },
          }}
        >
          <Tab label="Overview" value="overview" />
          <Tab label="Patterns" value="patterns" />
          <Tab label="Trends" value="trend" />
          <Tab label="Risk" value="risk" />
        </Tabs>

        {tab === 'overview' ? (
          <OverviewTab query={overview} accent={accent} />
        ) : null}
        {tab === 'patterns' ? <PatternsTab query={patterns} accent={accent} /> : null}
        {tab === 'trend' ? <TrendsTab query={trend} accent={accent} /> : null}
        {tab === 'risk' ? <RiskTab query={risk} accent={accent} /> : null}
      </Stack>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                        */
/* ------------------------------------------------------------------ */

function TabFrame({
  isLoading,
  isError,
  error,
  onRetry,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  if (isLoading) return <ListSkeleton rows={3} />;
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={onRetry} />;
  return <>{children}</>;
}

function rate(value: number | null | undefined): string {
  return typeof value === 'number' ? `${Math.round(value)}%` : '—';
}

function riskTone(level: RiskLevel): 'success' | 'warning' | 'error' {
  if (level === 'HIGH') return 'error';
  if (level === 'MEDIUM') return 'warning';
  return 'success';
}

/** Ranked habit row with a proportional bar, used by both top and bottom lists. */
function HabitRateRow({ row, accent }: { row: HabitOverviewRow; accent: string }) {
  const { colors } = useAppScheme();
  const pct = row.completion_rate ?? 0;

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <HabitIconTile icon={row.icon} color={row.color ?? accent} size={34} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {row.name}
          </Typography>
          {typeof row.rate_delta === 'number' ? (
            <Typography variant="caption" sx={{ color: colors.inkSoft }}>
              {row.rate_delta > 0 ? '+' : ''}
              {Math.round(row.rate_delta)} pts
            </Typography>
          ) : null}
        </Stack>
        <Box sx={{ height: 6, borderRadius: 999, backgroundColor: `${row.color ?? accent}22` }}>
          <Box
            sx={{
              width: `${Math.max(0, Math.min(100, pct))}%`,
              height: '100%',
              borderRadius: 999,
              backgroundColor: row.color ?? accent,
              transition: 'width 320ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </Box>
      </Box>
      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {rate(row.completion_rate)}
        </Typography>
        <Typography variant="caption" sx={{ color: colors.inkSoft }}>
          {row.current_streak > 0
            ? `${row.current_streak}d streak`
            : `best ${row.best_streak}d`}
        </Typography>
      </Box>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                           */
/* ------------------------------------------------------------------ */

function OverviewTab({
  query,
  accent,
}: {
  query: ReturnType<typeof useInsightsOverview>;
  accent: string;
}) {
  const { colors } = useAppScheme();

  return (
    <TabFrame
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      onRetry={() => void query.refetch()}
    >
      {query.data ? (
        <Stack spacing={3}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
            }}
          >
            <StatTile
              label="Completion"
              value={rate(query.data.completion_rate)}
              hint={
                typeof query.data.rate_delta === 'number'
                  ? `${query.data.rate_delta > 0 ? '+' : ''}${Math.round(query.data.rate_delta)} pts vs previous window`
                  : `${query.data.hit_days}/${query.data.due_days} days hit`
              }
              icon={InsightsOutlined}
              accent={accent}
            />
            <StatTile
              label="Active streak"
              value={`${query.data.active_day_streak}d`}
              hint={`Best ${query.data.best_active_day_streak}d`}
              icon={LocalFireDepartmentRounded}
              accent={colors.terracotta}
            />
            <StatTile
              label="Consistency"
              value={rate(query.data.consistency_score)}
              hint={`${query.data.perfect_days} perfect ${formatPlural(query.data.perfect_days, 'day')}`}
              icon={VerifiedRounded}
              accent={colors.sage}
            />
            <StatTile
              label="Habits"
              value={query.data.habit_count}
              hint={`${query.data.active_days} active ${formatPlural(query.data.active_days, 'day')} of ${query.data.days_considered ?? query.data.window_days}`}
              icon={query.data.rate_delta !== null && query.data.rate_delta < 0 ? TrendingDownRounded : TrendingUpRounded}
              accent={colors.terracotta}
            />
          </Box>

          <Section title="Day breakdown" description="Every due day in the window.">
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' },
              }}
            >
              {[
                { label: 'Due', value: query.data.due_days },
                { label: 'Hit', value: query.data.hit_days },
                { label: 'Partial', value: query.data.partial_days },
                { label: 'Missed', value: query.data.missed_days },
                { label: 'Skipped', value: query.data.skipped_days },
              ].map((stat) => (
                <Box key={stat.label}>
                  <Typography variant="overline" sx={{ color: colors.inkSoft }}>
                    {stat.label}
                  </Typography>
                  <Typography variant="h5">{stat.value}</Typography>
                </Box>
              ))}
            </Box>
          </Section>

          <Section
            title="Weekday profile"
            description="Where the week gets away from you."
          >
            <WeekdayProfileBars buckets={query.data.weekday_profile} />
          </Section>

          <Section
            title="Top habits"
            description={`Ranked over the last ${query.data.window_days} days.`}
          >
            {query.data.top_habits.length ? (
              <Stack spacing={2}>
                {query.data.top_habits.map((row) => (
                  <HabitRateRow key={row.id} row={row} accent={accent} />
                ))}
              </Stack>
            ) : (
              <InlineEmpty message="No habits have been completed in this window yet." />
            )}
          </Section>

          {query.data.bottom_habits.length ? (
            <Section
              title="Needs attention"
              description="Lowest completion rates in the same window."
            >
              <Stack spacing={2}>
                {query.data.bottom_habits.map((row) => (
                  <HabitRateRow key={row.id} row={row} accent={accent} />
                ))}
              </Stack>
            </Section>
          ) : null}

          {query.data.tag_profile.length ? (
            <Section title="By tag">
              <Stack spacing={2}>
                {query.data.tag_profile.map((tag) => (
                  <Stack key={tag.tag_id} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ width: 120, fontWeight: 600 }} noWrap>
                      {tag.tag_name}
                    </Typography>
                    <Box sx={{ flex: 1, height: 6, borderRadius: 999, backgroundColor: `${accent}22` }}>
                      <Box
                        sx={{
                          width: `${Math.max(0, Math.min(100, tag.completion_rate ?? 0))}%`,
                          height: '100%',
                          borderRadius: 999,
                          backgroundColor: accent,
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: colors.inkSoft, width: 100, textAlign: 'right' }}>
                      {rate(tag.completion_rate)} · {tag.habit_count}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Section>
          ) : null}
        </Stack>
      ) : null}
    </TabFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Patterns                                                           */
/* ------------------------------------------------------------------ */

function PatternsTab({
  query,
  accent,
}: {
  query: ReturnType<typeof useInsightsPatterns>;
  accent: string;
}) {
  const { colors } = useAppScheme();

  return (
    <TabFrame
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      onRetry={() => void query.refetch()}
    >
      {query.data ? (
        <Stack spacing={3}>
          <Section
            title="Weekday profile"
            description={`Completion across every habit over the last ${query.data.window_days} days.`}
          >
            <WeekdayProfileBars buckets={query.data.weekday_profile} />
          </Section>

          {query.data.habits.length ? (
            <Section
              title="Per habit"
              description="When each habit succeeds, and when it slips."
            >
              <Stack spacing={3}>
                {query.data.habits.map((habit) => {
                  const color = habit.color ?? accent;
                  const punctuality = habit.punctuality;

                  return (
                    <Box
                      key={habit.id}
                      sx={{
                        p: 2.25,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: colors.hairline,
                      }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
                        <HabitIconTile icon={habit.icon} color={color} size={34} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {habit.name}
                        </Typography>
                      </Stack>

                      <Box
                        sx={{
                          display: 'grid',
                          gap: 2,
                          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        }}
                      >
                        <Box>
                          <Typography variant="overline" sx={{ color: colors.inkSoft }}>
                            Weekdays
                          </Typography>
                          <Typography variant="body2">
                            {habit.best_weekday_name ?? 'Not enough history'}
                            {typeof habit.best_weekday_rate === 'number'
                              ? ` · ${Math.round(habit.best_weekday_rate)}%`
                              : ''}
                          </Typography>
                          <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                            Worst:{' '}
                            {habit.worst_weekday_name ?? 'n/a'}
                            {typeof habit.worst_weekday_rate === 'number'
                              ? ` · ${Math.round(habit.worst_weekday_rate)}%`
                              : ''}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="overline" sx={{ color: colors.inkSoft }}>
                            Timing
                          </Typography>
                          <Typography variant="body2">
                            {punctuality.available
                              ? `${punctuality.on_time_count} of ${punctuality.sample_count} on time`
                              : 'No scheduled time'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                            {punctuality.available && punctuality.on_time_rate !== null
                              ? `${Math.round(punctuality.on_time_rate)}% within ${
                                  punctuality.tolerance_minutes ?? 60
                                } min`
                              : 'Not enough completion times yet'}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="overline" sx={{ color: colors.inkSoft }}>
                          Hour of day
                        </Typography>
                        <HourOfDayBars profile={habit.hour_of_day} />
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </Section>
          ) : (
            <Section title="Per habit">
              <InlineEmpty message="Create a habit to start seeing patterns." />
            </Section>
          )}
        </Stack>
      ) : null}
    </TabFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Trends                                                             */
/* ------------------------------------------------------------------ */

function TrendsTab({
  query,
  accent,
}: {
  query: ReturnType<typeof useInsightsTrend>;
  accent: string;
}) {
  const { colors } = useAppScheme();

  return (
    <TabFrame
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      onRetry={() => void query.refetch()}
    >
      {query.data ? (
        <Stack spacing={3}>
          <Section
            title="Combined completion"
            description={`Share of due habits completed each day over the last ${query.data.window_days} days.`}
          >
            <TrendBars points={query.data.combined} accent={accent} />
            <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: colors.inkSoft }}>
              {query.data.combined.length} days plotted
            </Typography>
          </Section>

          {query.data.habits.length ? (
            <Section
              title="Per habit history"
              description="One cell per day the habit was due."
            >
              <Stack spacing={3}>
                {query.data.habits.map((habit) => (
                  <Box key={habit.id}>
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.25 }}>
                      <HabitIconTile icon={habit.icon} color={habit.color ?? accent} size={28} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {habit.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                        {habit.heatmap.length} days
                      </Typography>
                    </Stack>
                    <InsightsHeatmap cells={habit.heatmap} accent={habit.color ?? accent} />
                  </Box>
                ))}
              </Stack>
              <Box sx={{ mt: 2.5 }}>
                <InsightsHeatmapLegend accent={accent} />
              </Box>
            </Section>
          ) : (
            <Section title="Per habit history">
              <InlineEmpty message="No habits to chart yet." />
            </Section>
          )}
        </Stack>
      ) : null}
    </TabFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Risk                                                               */
/* ------------------------------------------------------------------ */

function RiskTab({
  query,
  accent,
}: {
  query: ReturnType<typeof useInsightsRisk>;
  accent: string;
}) {
  const { colors } = useAppScheme();

  return (
    <TabFrame
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      onRetry={() => void query.refetch()}
    >
      {query.data ? (
        <Stack spacing={3}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' },
            }}
          >
            <StatTile
              label="Streaks at risk"
              value={query.data.summary.streaks_at_risk}
              hint="Live streaks today could still break"
              icon={LocalFireDepartmentRounded}
              accent={colors.terracotta}
            />
            <StatTile
              label="High risk"
              value={query.data.summary.high_risk_habits}
              hint="Least likely to be completed today"
              icon={TrendingDownRounded}
              accent={colors.terracotta}
            />
            <StatTile
              label="Decaying"
              value={query.data.summary.decaying_habits}
              hint="Losing ground on their own trend"
              icon={TrendingDownRounded}
              accent={colors.terracotta}
            />
            <StatTile
              label="Load"
              value={query.data.load_projection.outstanding_count}
              hint={query.data.load_projection.overloaded ? 'Overloaded today' : `${query.data.load_projection.sample_occurrences} samples`}
              icon={InsightsOutlined}
              accent={accent}
            />
          </Box>

          <Section
            title="Streaks at risk"
            description="Habits with a live streak and an unmet target today."
          >
            {query.data.streaks_at_risk.length ? (
              <Stack spacing={2}>
                {query.data.streaks_at_risk.map((row) => (
                  <Stack key={row.habit_id} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <LocalFireDepartmentRounded sx={{ fontSize: 20, color: colors.terracotta }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {row.habit_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                        {row.current_streak} day streak
                        {row.seconds_remaining_in_day !== null
                          ? ` · ${Math.floor(row.seconds_remaining_in_day / 3600)}h left today`
                          : ''}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <InlineEmpty message="No streaks are on the line right now." />
            )}
          </Section>

          <Section
            title="Completion probability"
            description="Likelihood each habit is completed today."
          >
            {query.data.completion_probabilities.length ? (
              <Stack spacing={2}>
                {query.data.completion_probabilities.map((row) => (
                  <Box key={row.habit_id}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.75 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }} noWrap>
                        {row.habit_name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: `${riskTone(row.risk)}.main` }}
                      >
                        {row.risk}
                      </Typography>
                      <Typography variant="caption" sx={{ color: colors.inkSoft, width: 68, textAlign: 'right' }}>
                        {row.probability === null ? 'no data' : `${Math.round(row.probability * 100)}%`}
                      </Typography>
                    </Stack>
                    <Box sx={{ height: 6, borderRadius: 999, backgroundColor: `${accent}1f` }}>
                      <Box
                        sx={{
                          width: `${Math.max(2, Math.min(100, (row.probability ?? 0) * 100))}%`,
                          height: '100%',
                          borderRadius: 999,
                          backgroundColor: accent,
                        }}
                      />
                    </Box>
                    {!row.sufficient_data ? (
                      <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                        Not enough history for a confident estimate.
                      </Typography>
                    ) : null}
                  </Box>
                ))}
              </Stack>
            ) : (
              <InlineEmpty message="No habits to score today." />
            )}
          </Section>

          {query.data.decaying_habits.length ? (
            <Section title="Decaying" description="Behind their own previous window.">
              <Stack spacing={1.5}>
                {query.data.decaying_habits.map((row) => (
                  <Typography key={row.habit_id} variant="body2">
                    {row.habit_name} · {rate(row.completion_rate)} (was{' '}
                    {rate(row.previous_completion_rate)})
                  </Typography>
                ))}
              </Stack>
            </Section>
          ) : null}

          {query.data.struggling_habits.length ? (
            <Section title="Struggling" description="Missed most of their scheduled days.">
              <Stack spacing={1.5}>
                {query.data.struggling_habits.map((row) => (
                  <Typography key={row.habit_id} variant="body2">
                    {row.habit_name} · {rate(row.completion_rate)} · {row.missed_periods} missed
                  </Typography>
                ))}
              </Stack>
            </Section>
          ) : null}
        </Stack>
      ) : null}
    </TabFrame>
  );
}
