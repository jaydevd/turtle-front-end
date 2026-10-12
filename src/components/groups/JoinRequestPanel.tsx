'use client';

import { useToast } from '@/components/feedback/ToastProvider';
import { ConfirmDialog, FormDialog } from '@/components/ui/dialogs';
import { Field, SegmentedControl } from '@/components/ui/inputs';
import { JoinRequestStatusPill } from '@/components/ui/pills';
import { EmptyState, InlineEmpty } from '@/components/ui/surfaces';
import { errorMessage, isApiError } from '@/lib/api/client';
import { formatRelative } from '@/lib/date';
import {
    useMemberLookup,
    useRespondToJoinRequest,
    useSendInvitation,
    useSendJoinRequest,
    useWithdrawJoinRequest,
} from '@/lib/query/hooks';
import { useAppScheme } from '@/theme/useAppScheme';
import type {
  Group,
  GroupJoinRequest,
  JoinRequestScope,
  MemberLookupResult,
} from '@/types/api';
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

const SCOPE_OPTIONS: Array<{ value: JoinRequestScope; label: string }> = [
  { value: 'incoming', label: 'For you' },
  { value: 'outgoing', label: 'Sent by you' },
];

/** How long the composer waits after the last keystroke before searching. */
const LOOKUP_DEBOUNCE_MS = 300;

/** A pragmatic shape check; the server is the authority on who exists. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Requests to join, in both directions - and the one composer that starts them.
 *
 * The direction is the interesting part: a member *asks* somebody to join and
 * that somebody decides. So only the recipient is offered Accept or Reject, only
 * the sender is offered Withdraw, and everyone who may reach out gets the send
 * form, which is why the same list needs both labels.
 *
 * The composer is deliberately one field rather than two panels. Typing an
 * address searches for it: a hit is somebody to ask, and a miss is the signal to
 * invite them by email instead. Both routes end in the same pending request, so
 * the sender watches them in the same list.
 */
export interface JoinRequestPanelProps {
  group: Group;
  requests: GroupJoinRequest[];
  loading: boolean;
  currentUserId?: string;
  /** Admins see the whole log, so they get a third filter. */
  isAdmin: boolean;
  /**
   * The direction filter. It is lifted because it is also the query key: `scope`
   * is a server-side filter, so the screen cannot hold a superset and filter it
   * locally without hiding rows the API never sent.
   */
  scope: JoinRequestScope;
  onScopeChange: (scope: JoinRequestScope) => void;
}

export function JoinRequestPanel({
  group,
  requests,
  loading,
  currentUserId,
  isAdmin,
  scope,
  onScopeChange,
}: JoinRequestPanelProps) {
  const { colors } = useAppScheme();
  const { toast } = useToast();
  const sendRequest = useSendJoinRequest();
  const sendInvitation = useSendInvitation();
  const withdrawRequest = useWithdrawJoinRequest();
  const respond = useRespondToJoinRequest();

  const [sendOpen, setSendOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [settledEmail, setSettledEmail] = useState('');
  const [picked, setPicked] = useState<MemberLookupResult | null>(null);
  const [message, setMessage] = useState('');
  const [sendError, setSendError] = useState<unknown>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<GroupJoinRequest | null>(null);

  const scopeOptions = isAdmin
    ? [...SCOPE_OPTIONS, { value: 'pending' as JoinRequestScope, label: 'All pending' }]
    : SCOPE_OPTIONS;

  // Reaching out at all needs the invite switch. A join request additionally
  // needs the requests switch, since an admin may hand requests out of the
  // members' hands while leaving invitations open.
  const canReachOut = group.my_role !== null && (isAdmin || group.members_can_invite);
  const canAsk =
    group.my_role !== null &&
    (isAdmin || (group.join_requests_enabled && group.members_can_invite));

  /*
   * Settle the typed address before searching, so a query runs once per pause
   * rather than once per keystroke.
   */
  useEffect(() => {
    const handle = window.setTimeout(() => setSettledEmail(email.trim()), LOOKUP_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [email]);

  const lookup = useMemberLookup(group.id, settledEmail, sendOpen);
  const matches = lookup.data ?? [];

  const address = email.trim();
  const looksLikeEmail = EMAIL_PATTERN.test(address);
  const searching = lookup.isFetching;

  /*
   * A pick only counts while it is still one of the matches. Rather than clear it
   * when the address changes - which would be a state write during render - the
   * stale pick is simply ignored once the results no longer contain it. With a
   * single match there is nothing to choose between, so it stands in on its own;
   * more than one is a list for the sender to pick from.
   */
  const pickedStillMatches =
    picked !== null && matches.some((match) => match.id === picked.id);
  const target = pickedStillMatches ? picked : matches.length === 1 ? matches[0] : null;

  // A complete address that matched nobody: the composer's cue to invite.
  const inviting = !target && !searching && matches.length === 0 && looksLikeEmail;
  const canSubmit = target ? canAsk : inviting;

  const busy = sendRequest.isPending || sendInvitation.isPending;
  const fieldError = (field: string) =>
    isApiError(sendError) ? sendError.fieldError(field) : undefined;

  function resetComposer() {
    setEmail('');
    setSettledEmail('');
    setPicked(null);
    setMessage('');
    setSendError(null);
  }

  async function submitComposer() {
    setSendError(null);
    try {
      if (target) {
        await sendRequest.mutateAsync({
          groupId: group.id,
          input: { email: target.email, message },
        });
        toast({ tone: 'success', message: 'Request sent. They decide from here.' });
      } else {
        await sendInvitation.mutateAsync({ groupId: group.id, input: { email: address } });
        toast({
          tone: 'success',
          message: 'Invitation sent. They will get an email to create their account.',
        });
      }
      setSendOpen(false);
      resetComposer();
      onScopeChange('outgoing');
    } catch (error) {
      setSendError(error);
    }
  }

  async function answer(request: GroupJoinRequest, action: 'accept' | 'reject') {
    try {
      await respond.mutateAsync({ groupId: group.id, requestId: request.id, action });
      toast({
        tone: action === 'accept' ? 'success' : 'info',
        message: action === 'accept' ? `${request.from_user_email} joined the group.` : 'Request declined.',
      });
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error, 'Could not answer that request.') });
    }
  }

  async function confirmWithdraw() {
    if (!withdrawTarget) return;
    try {
      await withdrawRequest.mutateAsync({ groupId: group.id, requestId: withdrawTarget.id });
      toast({ tone: 'info', message: 'Request withdrawn.' });
      setWithdrawTarget(null);
    } catch (error) {
      setWithdrawTarget(null);
      toast({ tone: 'error', message: errorMessage(error, 'Could not withdraw that request.') });
    }
  }

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <SegmentedControl
          ariaLabel="Request direction"
          value={scope}
          options={scopeOptions}
          onChange={onScopeChange}
        />
        {canReachOut ? (
          <Button size="small" variant="contained" onClick={() => setSendOpen(true)}>
            Invite or ask someone
          </Button>
        ) : (
          <Typography variant="caption" sx={{ color: colors.inkSoft }}>
            Only admins can bring people into this group.
          </Typography>
        )}
      </Stack>

      {loading ? (
        <InlineEmpty message="Loading requests…" />
      ) : requests.length === 0 ? (
        <EmptyState
          compact
          icon={MailOutlineRounded}
          title={
            scope === 'incoming'
              ? 'No requests waiting on you'
              : scope === 'pending'
                ? 'Nothing pending'
                : 'You have not asked anyone yet'
          }
          description={
            scope === 'incoming'
              ? 'When a member asks you to join a group, it lands here to accept or decline.'
              : scope === 'pending'
                ? 'Every outstanding request in this group, whichever way it points.'
                : 'Enter an email address to ask someone to join, or invite them if they are not on the platform yet.'
          }
        />
      ) : (
        <Box>
          {requests.map((request) => {
            const incoming = request.to_user === currentUserId;
            const pending = request.status === 'pending';

            return (
              <Stack
                key={request.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{
                  py: 1.75,
                  alignItems: { sm: 'center' },
                  '& + &': { borderTop: `1px solid ${colors.hairline}` },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}
                  >
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                      {incoming ? request.from_user_email : request.to_user_email}
                    </Typography>
                    <JoinRequestStatusPill status={request.status} />
                  </Stack>
                  {request.message ? (
                    <Typography variant="body2" sx={{ color: colors.inkSoft, mt: 0.25 }}>
                      {request.message}
                    </Typography>
                  ) : null}
                  <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                    {formatRelative(request.created_at)}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  {incoming && pending ? (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={respond.isPending}
                        onClick={() => answer(request, 'accept')}
                      >
                        Accept
                      </Button>
                      <Button
                        size="small"
                        color="inherit"
                        disabled={respond.isPending}
                        onClick={() => answer(request, 'reject')}
                      >
                        Decline
                      </Button>
                    </>
                  ) : null}
                  {!incoming && pending ? (
                    <Button size="small" color="inherit" onClick={() => setWithdrawTarget(request)}>
                      Withdraw
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            );
          })}
        </Box>
      )}

      <FormDialog
        open={sendOpen}
        title="Invite or ask someone"
        description="Search for their email. If they are already here they get a request to accept or decline; if not, they get an invitation to create an account first."
        confirmLabel={target ? 'Send request' : 'Invite'}
        busy={busy}
        disabled={!canSubmit}
        onConfirm={submitComposer}
        onClose={() => {
          setSendOpen(false);
          resetComposer();
        }}
      >
        <Stack spacing={2}>
          {sendError && !fieldError('email') ? (
            <Alert severity="error">
              {errorMessage(sendError, 'Could not reach that address.')}
            </Alert>
          ) : null}

          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            errorText={fieldError('email')}
            helperText="We check as you type whether they already have an account."
            placeholder="somebody@example.com"
            autoFocus
          />

          {searching && settledEmail.length >= 2 ? (
            <Typography variant="caption" sx={{ color: colors.inkSoft }}>
              Searching…
            </Typography>
          ) : null}

          {matches.length > 1 ? (
            <Stack spacing={0.75}>
              <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                More than one account matches. Pick one:
              </Typography>
              {matches.map((match) => {
                const active = picked?.id === match.id;
                return (
                  <Box
                    key={match.id}
                    component="button"
                    type="button"
                    onClick={() => setPicked(match)}
                    sx={{
                      textAlign: 'left',
                      px: 1.5,
                      py: 1.25,
                      borderRadius: 2,
                      border: `1px solid ${active ? colors.sage : colors.hairline}`,
                      backgroundColor: active ? colors.paperRaised : 'transparent',
                      cursor: 'pointer',
                      color: 'inherit',
                      font: 'inherit',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {match.display_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                      {match.email}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          ) : null}

          {target && matches.length === 1 ? (
            <Alert severity="info">
              Sending to <strong>{target.display_name}</strong> ({target.email}).
            </Alert>
          ) : null}

          {inviting ? (
            <Alert severity="info">
              No account uses this address yet. We will email them an invitation, and the
              request to join will be waiting for them when they sign up.
            </Alert>
          ) : null}

          {target && !canAsk ? (
            <Alert severity="warning">
              An admin has turned join requests off here. You can still invite somebody
              who is not on the platform yet.
            </Alert>
          ) : null}

          {target ? (
            <Field
              label="Message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              errorText={fieldError('message')}
              helperText="Optional. They see this with the request."
              multiline
              minRows={2}
            />
          ) : null}
        </Stack>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(withdrawTarget)}
        title="Withdraw this request?"
        message={
          <>
            <strong>{withdrawTarget?.to_user_email}</strong> will no longer see a pending request
            from you. They never had to answer it.
          </>
        }
        confirmLabel="Withdraw"
        busy={withdrawRequest.isPending}
        onConfirm={confirmWithdraw}
        onClose={() => setWithdrawTarget(null)}
      />
    </Stack>
  );
}
