'use client';

import { SegmentedControl } from '@/components/ui/inputs';
import { ChallengeStatusPill } from '@/components/ui/pills';
import { EmptyState, InlineEmpty } from '@/components/ui/surfaces';
import { formatShortDate } from '@/lib/date';
import { describeSchedule } from '@/lib/schedule';
import { radii } from '@/theme/tokens';
import { useAppScheme } from '@/theme/useAppScheme';
import type { ChallengeStatus, Habit } from '@/types/api';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import FlagOutlined from '@mui/icons-material/FlagOutlined';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useState } from 'react';

type StatusFilter = ChallengeStatus | 'all';

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Running' },
  { value: 'draft', label: 'Drafts' },
  { value: 'completed', label: 'Finished' },
];

export interface ChallengeBoardProps {
  challenges: Habit[];
  loading: boolean;
  /** Admins, and members when the group allows it. */
  canPropose: boolean;
  onPropose: () => void;
  onOpen: (challengeId: string) => void;
}

/**
 * The group's challenges as a board, filterable by status.
 *
 * A challenge is a habit template, so the list is habits - but only the
 * templates, never the per-participant copies, which the backend keeps out of
 * this route.
 */
export function ChallengeBoard({
  challenges,
  loading,
  canPropose,
  onPropose,
  onOpen,
}: ChallengeBoardProps) {
  const [filter, setFilter] = useState<StatusFilter>('all');

  const shown =
    filter === 'all'
      ? challenges
      : challenges.filter((challenge) => challenge.challenge_status === filter);

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <SegmentedControl
          ariaLabel="Challenge status"
          value={filter}
          options={FILTERS}
          onChange={setFilter}
        />
        {canPropose ? (
          <Button size="small" variant="contained" onClick={onPropose}>
            Propose a challenge
          </Button>
        ) : null}
      </Stack>

      {loading ? (
        <InlineEmpty message="Loading challenges…" />
      ) : shown.length === 0 ? (
        <EmptyState
          compact
          icon={FlagOutlined}
          title={filter === 'all' ? 'No challenges yet' : `Nothing ${filter}`}
          description={
            canPropose
              ? 'Propose one and the whole group can follow the leaderboard.'
              : 'A group member has to propose the first one.'
          }
          action={
            canPropose ? (
              <Button size="small" variant="contained" onClick={onPropose}>
                Propose a challenge
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Box>
          {shown.map((challenge) => (
            <ChallengeRow
              key={challenge.id}
              challenge={challenge}
              onOpen={() => onOpen(challenge.id)}
            />
          ))}
        </Box>
      )}
    </Stack>
  );
}

function ChallengeRow({ challenge, onOpen }: { challenge: Habit; onOpen: () => void }) {
  const { colors } = useAppScheme();
  const status = challenge.challenge_status;

  return (
    <Stack
      component="button"
      type="button"
      onClick={onOpen}
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'center',
        width: '100%',
        py: 1.75,
        px: 1,
        textAlign: 'left',
        font: 'inherit',
        background: 'transparent',
        border: 'none',
        borderRadius: `${radii.sm}px`,
        cursor: 'pointer',
        '& + &': { borderTop: `1px solid ${colors.hairline}` },
        '&:hover': { backgroundColor: colors.paperRaised },
        '&:focus-visible': { outline: 'none', boxShadow: `0 0 0 3px ${colors.ring}` },
      }}
    >
      <Box
        sx={{
          width: 3,
          alignSelf: 'stretch',
          minHeight: 38,
          borderRadius: `${radii.pill}px`,
          backgroundColor: challenge.color ?? colors.sage,
          flexShrink: 0,
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}
        >
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {challenge.name}
          </Typography>
          {status ? <ChallengeStatusPill status={status} /> : null}
        </Stack>
        <Typography variant="caption" sx={{ color: colors.inkSoft }}>
          {formatShortDate(challenge.start_date)}
          {challenge.end_date ? ` → ${formatShortDate(challenge.end_date)}` : ''}
          {' · '}
          {describeSchedule(challenge.schedule)}
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
        {challenge.challenge_winners.length > 0 ? (
          <Stack direction="row" spacing={0.35} sx={{ alignItems: 'center' }}>
            <EmojiEventsOutlined sx={{ fontSize: 16, color: colors.sage }} />
            <Typography variant="caption" sx={{ color: colors.inkSoft }}>
              {challenge.challenge_winners.length === 1
                ? '1 winner'
                : `${challenge.challenge_winners.length} winners`}
            </Typography>
          </Stack>
        ) : (
          <Typography variant="caption" sx={{ color: colors.inkSoft }}>
            {challenge.participant_count}{' '}
            {challenge.participant_count === 1 ? 'person' : 'people'}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}