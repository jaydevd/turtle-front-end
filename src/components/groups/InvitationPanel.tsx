'use client';

import { useState } from 'react';
import { Alert, Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import MarkEmailReadOutlined from '@mui/icons-material/MarkEmailReadOutlined';
import { ConfirmDialog, FormDialog } from '@/components/ui/dialogs';
import { Field } from '@/components/ui/inputs';
import { EmptyState, InlineEmpty } from '@/components/ui/surfaces';
import { InvitationStatusPill } from '@/components/ui/pills';
import { useToast } from '@/components/feedback/ToastProvider';
import { errorMessage, isApiError } from '@/lib/api/client';
import { useRevokeInvitation, useSendInvitation } from '@/lib/query/hooks';
import { SECONDS_PER_DAY, formatRelative, formatShortDate } from '@/lib/date';
import { useAppScheme } from '@/theme/useAppScheme';
import type { Group, GroupInvitation } from '@/types/api';

/** Mirrors `groups.services.DEFAULT_INVITATION_TTL_DAYS`. */
const DEFAULT_TTL_DAYS = 7;

/**
 * The link an inviter passes on by hand. The token is the whole point of the row,
 * and it is read-only, so the app can only ever show what the server minted.
 */
function inviteLink(token: string): string {
  if (typeof window === 'undefined') return `/invite?token=${token}`;
  return `${window.location.origin}/invite?token=${token}`;
}

export interface InvitationPanelProps {
  group: Group;
  invitations: GroupInvitation[];
  loading: boolean;
}

export function InvitationPanel({ group, invitations, loading }: InvitationPanelProps) {
  const { colors } = useAppScheme();
  const { toast } = useToast();
  const sendInvitation = useSendInvitation();
  const revokeInvitation = useRevokeInvitation();

  const [sendOpen, setSendOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [ttlDays, setTtlDays] = useState(String(DEFAULT_TTL_DAYS));
  const [sendError, setSendError] = useState<unknown>(null);
  const [revokeTarget, setRevokeTarget] = useState<GroupInvitation | null>(null);

  const isAdmin = group.my_role === 'owner' || group.my_role === 'admin';
  const canInvite = group.my_role !== null && (isAdmin || group.members_can_invite);

  async function submitInvitation() {
    const address = email.trim();
    if (!address) return;
    setSendError(null);

    // The backend takes an absolute deadline. Omitting it takes the same seven-day
    // default the server would have applied.
    const days = Number(ttlDays);
    const expiresAt =
      ttlDays.trim() === '' || Number.isNaN(days) || days <= 0
        ? undefined
        : Math.floor(Date.now() / 1000) + Math.round(days * SECONDS_PER_DAY);

    try {
      const invitation = await sendInvitation.mutateAsync({
        groupId: group.id,
        input: { email: address, expires_at: expiresAt ?? null },
      });
      toast({ tone: 'success', message: `Invitation sent to ${invitation.email}.` });
      setSendOpen(false);
      setEmail('');
    } catch (error) {
      setSendError(error);
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    try {
      await revokeInvitation.mutateAsync({
        groupId: group.id,
        invitationId: revokeTarget.id,
      });
      toast({ tone: 'info', message: 'Invitation revoked.' });
      setRevokeTarget(null);
    } catch (error) {
      setRevokeTarget(null);
      toast({ tone: 'error', message: errorMessage(error, 'Could not revoke that invitation.') });
    }
  }

  async function copyLink(invitation: GroupInvitation) {
    try {
      await navigator.clipboard.writeText(inviteLink(invitation.token));
      toast({ tone: 'success', message: 'Invite link copied.' });
    } catch {
      toast({ tone: 'info', message: inviteLink(invitation.token) });
    }
  }

  const fieldError = (field: string) =>
    isApiError(sendError) ? sendError.fieldError(field) : undefined;

  const emailHint = fieldError('email');

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Typography variant="body2" sx={{ color: colors.inkSoft, maxWidth: 520 }}>
          Email invitations reach somebody with no account yet. Once they register, the link
          becomes a join request they can accept, and the invitation shows up in their inbox.
        </Typography>
        {canInvite ? (
          <Button size="small" variant="contained" onClick={() => setSendOpen(true)}>
            Invite by email
          </Button>
        ) : (
          <Typography variant="caption" sx={{ color: colors.inkSoft, flexShrink: 0 }}>
            Only admins can invite here.
          </Typography>
        )}
      </Stack>

      {loading ? (
        <InlineEmpty message="Loading invitations…" />
      ) : invitations.length === 0 ? (
        <EmptyState
          compact
          icon={MarkEmailReadOutlined}
          title="No invitations sent"
          description="Invite an address that has no account yet, and share the link with them."
        />
      ) : (
        <Box>
          {invitations.map((invitation) => (
            <Stack
              key={invitation.id}
              direction="row"
              spacing={1.5}
              sx={{
                py: 1.5,
                alignItems: 'center',
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
                    {invitation.email}
                  </Typography>
                  <InvitationStatusPill status={invitation.status} />
                </Stack>
                <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                  {formatRelative(invitation.created_at)}
                  {' · invited by '}
                  {invitation.invited_by_email}
                  {invitation.expires_at
                    ? ` · expires ${formatShortDate(invitation.expires_at)}`
                    : ' · never expires'}
                </Typography>
              </Box>

              {invitation.status === 'pending' ? (
                <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                  <Tooltip title="Copy invite link">
                    <IconButton
                      size="small"
                      aria-label={`Copy the invite link for ${invitation.email}`}
                      onClick={() => copyLink(invitation)}
                      sx={{ color: colors.inkSoft }}
                    >
                      <ContentCopyRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Button size="small" color="inherit" onClick={() => setRevokeTarget(invitation)}>
                    Revoke
                  </Button>
                </Stack>
              ) : null}
            </Stack>
          ))}
        </Box>
      )}

      <FormDialog
        open={sendOpen}
        title="Invite by email"
        description="Use this for an address with no account. Somebody who has already registered is reached with a join request instead."
        confirmLabel="Send invitation"
        busy={sendInvitation.isPending}
        disabled={!email.trim()}
        onConfirm={submitInvitation}
        onClose={() => {
          setSendOpen(false);
          setSendError(null);
        }}
      >
        <Stack spacing={2}>
          {sendError && !emailHint ? (
            <Alert severity="error">
              {errorMessage(sendError, 'Could not send that invitation.')}
            </Alert>
          ) : null}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            errorText={emailHint}
            helperText="They must register with this address to claim it."
            placeholder="newcomer@example.com"
            autoFocus
          />
          <Field
            label="Expires in (days)"
            value={ttlDays}
            onChange={(event) => setTtlDays(event.target.value)}
            errorText={fieldError('expires_at')}
            helperText="Leave blank for the server default of seven days."
            slotProps={{ htmlInput: { inputMode: 'numeric', min: 1, max: 90 } }}
          />
        </Stack>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title="Revoke this invitation?"
        message={
          <>
            The link to <strong>{revokeTarget?.email}</strong> stops working immediately. Send a
            fresh one if they still need it.
          </>
        }
        confirmLabel="Revoke"
        busy={revokeInvitation.isPending}
        onConfirm={confirmRevoke}
        onClose={() => setRevokeTarget(null)}
      />
    </Stack>
  );
}
