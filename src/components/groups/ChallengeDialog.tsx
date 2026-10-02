'use client';

import { useToast } from '@/components/feedback/ToastProvider';
import { ConfirmDialog } from '@/components/ui/dialogs';
import { Field } from '@/components/ui/inputs';
import { ChallengeStatusPill } from '@/components/ui/pills';
import { InlineEmpty } from '@/components/ui/surfaces';
import { errorMessage } from '@/lib/api/client';
import { formatShortDate } from '@/lib/date';
import {
    useChallenge,
    useChallengeLifecycle,
    useChallengeProgress,
    useChallengeSubscribers,
    useJoinChallenge,
    useLeaveChallenge,
    useUpdateChallengeRules,
} from '@/lib/query/hooks';
import { describeSchedule } from '@/lib/schedule';
import { radii } from '@/theme/tokens';
import { useAppScheme } from '@/theme/useAppScheme';
import type { ChallengeParticipant } from '@/types/api';
import AddRounded from '@mui/icons-material/AddRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import EmojiEventsRounded from '@mui/icons-material/EmojiEventsRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import StopCircleRounded from '@mui/icons-material/StopCircleRounded';
import UndoRounded from '@mui/icons-material/UndoRounded';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    LinearProgress,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { useState } from 'react';

/** Mirrors `habits.challenges.MAX_CHALLENGE_RULES`. */
const MAX_RULES = 10;

export interface ChallengeDialogProps {
  groupId: string;
  challengeId: string | null;
  currentUserId?: string;
  /** The caller's tier, which the detail screen already knows. */
  isAdmin: boolean;
  onClose: () => void;
}

/**
 * One challenge, in full: the rules people agreed to, the leaderboard, and the
 * one lifecycle control the caller is actually allowed to pull.
 *
 * Read access is wide on purpose - every member of the group may watch, whether
 * or not they took part - while the actions are narrow. The backend re-checks all
 * of it, so the visibility here is about not offering buttons that cannot work.
 */
export function ChallengeDialog({
  groupId,
  challengeId,
  currentUserId,
  isAdmin,
  onClose,
}: ChallengeDialogProps) {
  const { colors } = useAppScheme();
  const { toast } = useToast();

  const challenge = useChallenge(groupId, challengeId ?? undefined);
  const subscribers = useChallengeSubscribers(challengeId ?? undefined);
  const progress = useChallengeProgress(challengeId ?? undefined, Boolean(challengeId));

  const join = useJoinChallenge(groupId);
  const leave = useLeaveChallenge(groupId);
  const lifecycle = useChallengeLifecycle(groupId);
  const updateRules = useUpdateChallengeRules(groupId);

  const [confirm, setConfirm] = useState<'end' | 'cancel' | 'leave' | null>(null);
  const [editingRules, setEditingRules] = useState(false);
  const [draftRules, setDraftRules] = useState<string[]>([]);
  const [ruleDraft, setRuleDraft] = useState('');

  const data = challenge.data;
  const status = data?.challenge_status ?? null;
  const isAuthor = Boolean(data && currentUserId && data.user === currentUserId);
  const subscribed = Boolean(
    subscribers.data?.results.some((row) => row.user === currentUserId),
  );

  // Mirrors `challenges.can_manage_challenge`: the author, or any group admin.
  const canManage = isAuthor || isAdmin;
  const joinable = status === 'draft' || status === 'active';
  const winners = data?.challenge_winner_score?.winners ?? [];

  function beginRuleEdit() {
    setDraftRules(data?.challenge_rules ?? []);
    setRuleDraft('');
    setEditingRules(true);
  }

  function addDraftRule() {
    const trimmed = ruleDraft.trim();
    if (!trimmed || draftRules.length >= MAX_RULES) return;
    setDraftRules((current) => [...current, trimmed]);
    setRuleDraft('');
  }

  async function saveRules() {
    if (!challengeId) return;
    try {
      await updateRules.mutateAsync({
        challengeId,
        rules: draftRules.map((rule) => rule.trim()).filter(Boolean),
      });
      toast({ tone: 'success', message: 'Rules updated.' });
      setEditingRules(false);
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error, 'Could not update the rules.') });
    }
  }

  async function runLifecycle(action: 'start' | 'end' | 'cancel') {
    if (!challengeId) return;
    try {
      await lifecycle.mutateAsync({ challengeId, action });
      toast({
        tone: 'success',
        message:
          action === 'start'
            ? 'Challenge started. The leaderboard is live.'
            : action === 'end'
              ? 'Challenge ended. The winner is on the board.'
              : 'Challenge cancelled.',
      });
      setConfirm(null);
    } catch (error) {
      setConfirm(null);
      toast({ tone: 'error', message: errorMessage(error, 'Could not do that.') });
    }
  }

  async function toggleParticipation() {
    if (!challengeId) return;
    try {
      if (subscribed) {
        await leave.mutateAsync(challengeId);
        toast({ tone: 'info', message: 'You left the challenge.' });
        setConfirm(null);
      } else {
        await join.mutateAsync(challengeId);
        toast({
          tone: 'success',
          message: 'You are in. Your copy is on your habits page.',
        });
      }
    } catch (error) {
      setConfirm(null);
      toast({ tone: 'error', message: errorMessage(error, 'Could not change that.') });
    }
  }

  const rows = [...(progress.data?.results ?? [])].sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return b.total - a.total;
  });

  return (
    <>
      <Dialog open={Boolean(challengeId)} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle component="div" sx={{ pb: 0.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography component="h2" variant="h4">
              {data?.name ?? 'Challenge'}
            </Typography>
            {status ? <ChallengeStatusPill status={status} /> : null}
          </Stack>
          {data ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {formatShortDate(data.start_date)}
              {data.end_date ? ` → ${formatShortDate(data.end_date)}` : ''}
              {' · '}
              {describeSchedule(data.schedule)}
            </Typography>
          ) : null}
        </DialogTitle>

        <DialogContent sx={{ pt: '16px !important' }}>
          <Stack spacing={3}>
            {challenge.isError ? (
              <Alert severity="error">{errorMessage(challenge.error, 'Could not load it.')}</Alert>
            ) : null}

            {data?.goal ? (
              <Typography variant="body2" sx={{ color: colors.inkSoft }}>
                {data.goal}
              </Typography>
            ) : null}

            <Stack spacing={1}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Rules
                </Typography>
                {canManage && status === 'draft' && !editingRules ? (
                  <Button size="small" color="inherit" onClick={beginRuleEdit}>
                    Edit rules
                  </Button>
                ) : null}
              </Stack>

              {editingRules ? (
                <Stack spacing={1}>
                  {draftRules.map((rule, index) => (
                    <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {index + 1}. {rule}
                      </Typography>
                      <IconButton
                        size="small"
                        aria-label={`Remove rule ${index + 1}`}
                        onClick={() =>
                          setDraftRules((current) => current.filter((_, i) => i !== index))
                        }
                        sx={{ color: colors.inkSoft }}
                      >
                        <CloseRounded fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Field
                        label="Add a rule"
                        value={ruleDraft}
                        onChange={(event) => setRuleDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addDraftRule();
                          }
                        }}
                      />
                    </Box>
                    <Button
                      onClick={addDraftRule}
                      startIcon={<AddRounded />}
                      disabled={!ruleDraft.trim() || draftRules.length >= MAX_RULES}
                      sx={{ mt: 0.5 }}
                    >
                      Add
                    </Button>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      disabled={updateRules.isPending}
                      onClick={saveRules}
                    >
                      Save rules
                    </Button>
                    <Button color="inherit" onClick={() => setEditingRules(false)}>
                      Cancel
                    </Button>
                  </Stack>
                </Stack>
              ) : data && data.challenge_rules.length > 0 ? (
                <Stack component="ol" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
                  {data.challenge_rules.map((rule, index) => (
                    <Typography component="li" variant="body2" key={index}>
                      {rule}
                    </Typography>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: colors.inkSoft }}>
                  No rules yet
                  {status === 'draft' ? ', and they can still be added.' : '.'}
                </Typography>
              )}
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Leaderboard
              </Typography>
              {progress.isPending ? (
                <InlineEmpty message="Scoring the board…" />
              ) : rows.length === 0 ? (
                <Typography variant="body2" sx={{ color: colors.inkSoft }}>
                  Nobody has joined yet.
                </Typography>
              ) : (
                <Stack spacing={0.5}>
                  {rows.map((row, index) => (
                    <LeaderboardRow
                      key={row.user_id}
                      row={row}
                      place={index + 1}
                      isWinner={winners.some((winner) => winner.user_id === row.user_id)}
                      isSelf={row.user_id === currentUserId}
                      accent={data?.color ?? colors.sage}
                    />
                  ))}
                </Stack>
              )}
              {progress.data ? (
                <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                  Score blends discipline, consistency and adherence
                  {progress.data.weights && Object.keys(progress.data.weights).length > 0
                    ? ` (${Object.entries(progress.data.weights)
                        .map(([key, weight]) => `${key} ${Math.round(weight * 100)}%`)
                        .join(', ')})`
                    : ''}
                  . Anyone logging less than{' '}
                  {Math.round(progress.data.minimum_engagement_ratio * 100)}% of the window can watch
                  but not win.
                </Typography>
              ) : null}
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: 'wrap' }}>
          {subscribed && joinable ? (
            <Button
              color="inherit"
              startIcon={<LogoutRounded />}
              disabled={leave.isPending}
              onClick={() => setConfirm('leave')}
            >
              Leave
            </Button>
          ) : joinable && !isAuthor ? (
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              disabled={join.isPending}
              onClick={toggleParticipation}
            >
              Join
            </Button>
          ) : null}

          {canManage && status === 'draft' ? (
            <Button
              variant="contained"
              startIcon={<PlayArrowRounded />}
              disabled={lifecycle.isPending}
              onClick={() => runLifecycle('start')}
            >
              Start
            </Button>
          ) : null}
          {canManage && (status === 'draft' || status === 'active') ? (
            <Button
              color="inherit"
              startIcon={<StopCircleRounded />}
              onClick={() => setConfirm('end')}
            >
              End now
            </Button>
          ) : null}
          {canManage && (status === 'draft' || status === 'active') ? (
            <Button color="inherit" startIcon={<UndoRounded />} onClick={() => setConfirm('cancel')}>
              Cancel
            </Button>
          ) : null}

          <Box sx={{ flex: 1 }} />
          <Button color="inherit" onClick={onClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirm === 'end'}
        title="End this challenge now?"
        message="The final day is scored and a winner is announced. It cannot be restarted."
        confirmLabel="End challenge"
        busy={lifecycle.isPending}
        onConfirm={() => runLifecycle('end')}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'cancel'}
        title="Cancel this challenge?"
        message="Nobody wins, everyone still keeps what they logged, and it cannot be restarted."
        confirmLabel="Cancel challenge"
        tone="danger"
        busy={lifecycle.isPending}
        onConfirm={() => runLifecycle('cancel')}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'leave'}
        title="Leave this challenge?"
        message="Your copy of the habit and its logs are removed. You can rejoin while it is still open, but the days you missed stay missed."
        confirmLabel="Leave challenge"
        tone="danger"
        busy={leave.isPending}
        onConfirm={toggleParticipation}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}

/** One leaderboard line: rank, name, bar, and the two numbers behind the bar. */
function LeaderboardRow({
  row,
  place,
  isWinner,
  isSelf,
  accent,
}: {
  row: ChallengeParticipant;
  place: number;
  isWinner: boolean;
  isSelf: boolean;
  accent: string;
}) {
  const { colors } = useAppScheme();
  const top = row.total;

  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        alignItems: 'center',
        px: 1.25,
        py: 1,
        borderRadius: `${radii.sm}px`,
        backgroundColor: isSelf ? colors.primaryWash : 'transparent',
        opacity: row.eligible ? 1 : 0.6,
      }}
    >
      <Stack direction="row" spacing={0.35} sx={{ alignItems: 'center', width: 46, flexShrink: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, width: 16 }}>
          {place}
        </Typography>
        {isWinner ? (
          <Tooltip title="Winner">
            <EmojiEventsRounded sx={{ fontSize: 16, color: colors.sage }} />
          </Tooltip>
        ) : null}
      </Stack>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline' }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600, flex: 1 }}>
            {row.user_email}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {Math.round(top)}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, top)}
          sx={{
            mt: 0.5,
            height: 4,
            borderRadius: `${radii.pill}px`,
            backgroundColor: colors.hairline,
            '& .MuiLinearProgress-bar': { backgroundColor: row.eligible ? accent : colors.inkSoft },
          }}
        />
        <Stack direction="row" spacing={0.75} sx={{ mt: 0.5, alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: colors.inkSoft }}>
            {row.evidence.hit_days}/{row.engagement.logged_days} days hit
          </Typography>
          {!row.eligible ? (
            <Chip
              size="small"
              variant="outlined"
              label="Below the threshold"
              sx={{ height: 18, fontSize: '0.6875rem' }}
            />
          ) : null}
        </Stack>
      </Box>
    </Stack>
  );
}

/**
 * Admin tier, inferred from the roster rather than asked for: the caller can see
 * the whole roster, so finding their own row is one lookup instead of a second
 * query. The backend still decides.
 */