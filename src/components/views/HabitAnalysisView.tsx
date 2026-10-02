'use client';

import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import Link from 'next/link';
import {
  ErrorState,
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
} from '@/components/ui/insights';
import { errorMessage } from '@/lib/api/client';
import { useHabit, useHabitInsights } from '@/lib/query/hooks';
import { useAppScheme } from '@/theme/useAppScheme';
import type { RiskProbability } from '@/types/api';

export function HabitAnalysisView({ habitId }: { habitId: string }) {
  const insights = useHabitInsights(habitId, 90);
  const habit = useHabit(habitId);

  const backButton = (
    <Button
      component={Link}
      href={`/habits/${habitId}`}
      color="inherit"
      size="small"
      startIcon={<ArrowBackRounded />}
      sx={{ mb: 2 }}
    >
      Back to habit
    </Button>
  );

  if (insights.isError || habit.isError) {
    return (
      <>
        {backButton}
        <ErrorState
          message={errorMessage(insights.error ?? habit.error)}
          onRetry={() => {
            void insights.refetch();
            void habit.refetch();
          }}
        />
      </>
    );
  }

  if (insights.isPending || habit.isPending) {
    return (
      <>
        {backButton}
        <ListSkeleton rows={3} />
      </>
    );
  }

  const data = insights.data;
  const name = habit.data?.name ?? data?.habit.name ?? 'Habit analysis';
  const accent = data?.habit.color ?? '#386A5A';

  if (!data) {
    return (
      <>
        {backButton}
        <ErrorState message="No insights are available for this habit yet." />
      </>
    );
  }

  const probability = data.risk.completion_probability_today;

  return (
    <>
      {backButton}
      <PageHeader
        eyebrow="Habit analysis"
        title={name}
        description="Patterns, trends and risk for this habit over the last 90 days."
      />
      <Stack spacing={3}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          }}
        >
          <StatTile
            label="Completion"
            value={percent(data.metrics.completion_rate)}
            hint={`${data.metrics.hit_periods ?? 0} of ${data.metrics.scored_periods ?? 0} periods hit`}
          />
          <StatTile
            label="Current streak"
            value={`${data.metrics.current_streak}d`}
            hint={`Best ${data.metrics.best_streak}d`}
          />
          <StatTile
            label="Consistency"
            value={percent(data.metrics.consistency_score)}
            hint={`${data.metrics.lapse_count ?? 0} lapses`}
          />
          <StatTile
            label="Today"
            value={
              data.risk.is_streak_at_risk
                ? 'At risk'
                : probability?.probability !== null && probability?.probability !== undefined
                  ? percent(probability.probability * 100)
                  : '—'
            }
            hint={
              data.risk.seconds_remaining_in_day !== null
                ? `${Math.floor(data.risk.seconds_remaining_in_day / 3600)}h left in the day`
                : undefined
            }
          />
        </Box>

        <Section title="Patterns" description="When this habit succeeds, and when it slips.">
          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            }}
          >
            <Box>
              <Typography variant="overline" color="text.secondary">
                Weekdays
              </Typography>
              <Typography variant="body2">
                Best: {data.patterns.best_weekday_name ?? 'not enough history'}
                {typeof data.patterns.best_weekday_rate === 'number'
                  ? ` · ${Math.round(data.patterns.best_weekday_rate)}%`
                  : ''}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Worst: {data.patterns.worst_weekday_name ?? 'n/a'}
                {typeof data.patterns.worst_weekday_rate === 'number'
                  ? ` · ${Math.round(data.patterns.worst_weekday_rate)}%`
                  : ''}
              </Typography>
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Timing
              </Typography>
              {data.patterns.punctuality.available ? (
                <>
                  <Typography variant="body2">
                    {data.patterns.punctuality.on_time_count} of{' '}
                    {data.patterns.punctuality.sample_count} on time
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {data.patterns.punctuality.on_time_rate !== null
                      ? `${Math.round(data.patterns.punctuality.on_time_rate)}% within ${data.patterns.punctuality.tolerance_minutes ?? 60} min of the scheduled time`
                      : 'No completion times recorded yet'}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2">No scheduled time set for this habit.</Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="overline" color="text.secondary">
              Hour of day
            </Typography>
            <HourOfDayBars profile={data.patterns.hour_of_day} />
          </Box>
        </Section>

        <Section
          title="History"
          description={`${data.trends.heatmap.length} days were due in this window.`}
        >
          {data.trends.heatmap.length ? (
            <>
              <InsightsHeatmap cells={data.trends.heatmap} accent={accent} />
              <Box sx={{ mt: 2 }}>
                <InsightsHeatmapLegend accent={accent} />
              </Box>
            </>
          ) : (
            <InlineEmpty message="No due days in this window yet." />
          )}
        </Section>

        <Section title="Risk" description="Signals for today.">
          <RiskRow probability={probability} />
        </Section>
      </Stack>
    </>
  );
}

function RiskRow({ probability }: { probability: RiskProbability | null }) {
  const { colors } = useAppScheme();

  if (!probability) {
    return <InlineEmpty message="No risk model has scored this habit yet." />;
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: 700, width: 58 }}>
          {probability.risk}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={(probability.probability ?? 0) * 100}
          sx={{
            flex: 1,
            height: 8,
            borderRadius: 999,
            backgroundColor: `${accentWash(colors.inkSoft)}`,
            '& .MuiLinearProgress-bar': { borderRadius: 999 },
          }}
        />
        <Typography variant="body2" sx={{ width: 84, textAlign: 'right', fontWeight: 600 }}>
          {probability.probability === null
            ? 'no data'
            : `${Math.round(probability.probability * 100)}%`}
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {probability.sufficient_data
          ? `Scored from ${probability.samples.overall} completions, including ${probability.samples.weekday} on this weekday.`
          : 'Not enough history yet for a confident estimate.'}
      </Typography>
    </Stack>
  );
}

function accentWash(ink: string): string {
  return `${ink}1a`;
}

function percent(value: number | null | undefined): string {
  return typeof value === 'number' ? `${Math.round(value)}%` : '—';
}
