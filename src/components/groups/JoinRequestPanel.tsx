'use client';

import { useToast } from '@/components/feedback/ToastProvider';
import { ConfirmDialog, FormDialog } from '@/components/ui/dialogs';
import { Field, SegmentedControl } from '@/components/ui/inputs';
import { JoinRequestStatusPill } from '@/components/ui/pills';
import { EmptyState, InlineEmpty } from '@/components/ui/surfaces';
import { errorMessage, isApiError } from '@/lib/api/client';
import { formatRelative } from '@/lib/date';
import {
    useRespondToJoinRequest,
    useSendJoinRequest,
    useWithdrawJoinRequest,
} from '@/lib/query/hooks';
import { useAppScheme } from '@/theme/useAppScheme';
import type { Group, GroupJoinRequest, JoinRequestScope } from '@/types/api';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useState } from 'react';

const SCOPE_OPTIONS: Array<{ value: JoinRequestScope; label: string }> = [
  { value: 'incoming', label: 'For you' },
  { value: 'outgoing', label: 'Sent by you' },
];

/**
 * Requests to join, in both directions.
 *
 * The direction is the interesting part: a member *asks* somebody to join and
 * that somebody decides. So only the recipient is offered Accept or Reject, only
 * the sender is offered Withdraw, and everyone is offered the send form - which
 * is why the same list needs both labels.
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
  const withdrawRequest = useWithdrawJoinRequest();
  const respond = useRespondToJoinRequest();

  const [sendOpen, setSendOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [sendError, setSendError] = useState<unknown>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<GroupJoinRequest | null>(null);
  const [requestLinkReady, setRequestLinkReady] = useState(false);

  const scopeOptions = isAdmin
    ? [...SCOPE_OPTIONS, { value: 'pending' as JoinRequestScope, label: 'All pending' }]
    : SCOPE_OPTIONS;

  const canSend =
    group.my_role !== null &&
    (isAdmin || group.members_can_invite) &&
    group.join_requests_enabled;

  async function submitRequest() {
    const trimmedId = userId.trim();
    if (!trimmedId) return;
    setSendError(null);
    try {
      await sendRequest.mutateAsync({
        groupId: group.id,
        input: { to_user: trimmedId, message },
      });
      toast({ tone: 'success', message: 'Request sent. They decide from here.' });
      setRequestLinkReady(true);
      setSendOpen(false);
      setUserId('');
      setMessage('');
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

  const fieldError = (field: string) => (isApiError(sendError) ? sendError.fieldError(field) : undefined);

  async function copyRequestLink() {
    const link = `${window.location.origin}/groups/${group.id}/requests`;
    try {
      await navigator.clipboard.writeText(link);
      toast({ tone: 'success', message: 'Request review link copied.' });
    } catch {
      toast({ tone: 'info', message: link });
    }
  }

  return (
    <Stack spacing={2.5}>
      {requestLinkReady ? (
        <Alert
          severity="info"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<ContentCopyRounded />}
              onClick={() => void copyRequestLink()}
            >
              Copy link
            </Button>
          }
        >
          Share the review link with the person you asked so they can respond.
        </Alert>
      ) : null}

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
        {canSend ? (
          <Button size="small" variant="contained" onClick={() => setSendOpen(true)}>
            Ask someone to join
          </Button>
        ) : (
          <Typography variant="caption" sx={{ color: colors.inkSoft }}>
            {group.join_requests_enabled
              ? 'Only admins can ask people to join here.'
              : 'This group does not take join requests.'}
          </Typography>
        )}
      </Stack>

      {loading ? (
        <InlineEmpty message="Loading requests…" />
      ) : requests.length === 0 ? (
        <EmptyState
          compact
          icon={MailOutlineRounded}
          title={scope === 'incoming' ? 'No requests waiting on you' : 'You have not asked anyone yet'}
          description={
            scope === 'incoming'
              ? 'When a member asks you to join a group, it lands here to accept or decline.'
              : 'Ask a registered user to join by pasting their user id.'
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
        title="Ask someone to join"
        description="They get to accept or decline. Nothing is added to the group until they say yes."
        confirmLabel="Send request"
        busy={sendRequest.isPending}
        disabled={!userId.trim()}
        onConfirm={submitRequest}
        onClose={() => {
          setSendOpen(false);
          setSendError(null);
        }}
      >
        <Stack spacing={2}>
          {sendError && !fieldError('to_user') ? (
            <Alert severity="error">{errorMessage(sendError, 'Could not send that request.')}</Alert>
          ) : null}
          <Field
            label="User ID"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            errorText={fieldError('to_user')}
            helperText="The person you are asking can copy theirs from Settings › Account."
            placeholder="00000000-0000-0000-0000-000000000000"
            autoFocus
          />
          <Field
            label="Message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            errorText={fieldError('message')}
            helperText="Optional. They see this with the request."
            multiline
            minRows={2}
          />
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
