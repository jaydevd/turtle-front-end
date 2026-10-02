'use client';

import { useToast } from '@/components/feedback/ToastProvider';
import { EmptyState, ErrorState, InlineEmpty, PageHeader, Section } from '@/components/ui/surfaces';
import { errorMessage } from '@/lib/api/client';
import { formatShortDate } from '@/lib/date';
import { useAcceptInvitation, useMyInvitations } from '@/lib/query/hooks';
import MarkEmailReadOutlined from '@mui/icons-material/MarkEmailReadOutlined';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function GroupInviteView({ token }: { token: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const invitations = useMyInvitations();
  const acceptInvitation = useAcceptInvitation();
  const [error, setError] = useState<unknown>(null);

  const invitation = invitations.data?.results.find((item) => item.token === token);

  async function accept() {
    setError(null);
    try {
      const result = await acceptInvitation.mutateAsync(token);
      toast({ tone: 'success', message: `You joined ${result.invitation.group_name}.` });
      router.replace(`/groups/${result.invitation.group}`);
    } catch (caught) {
      setError(caught);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Invitation" title="Join a group" description="Review the invitation before joining." />
      <Section title="Group invitation">
        {!token ? (
          <EmptyState
            compact
            icon={MarkEmailReadOutlined}
            title="Invitation link is missing"
            description="Open the complete invitation link shared with you."
          />
        ) : invitations.isPending ? (
          <InlineEmpty message="Checking this invitation…" />
        ) : invitations.isError ? (
          <ErrorState
            message={errorMessage(invitations.error, 'Could not load your invitations.')}
            onRetry={() => void invitations.refetch()}
          />
        ) : !invitation ? (
          <EmptyState
            compact
            icon={MarkEmailReadOutlined}
            title="Invitation unavailable"
            description="It may have expired, been revoked, or been sent to a different email address."
          />
        ) : (
          <Stack spacing={2} sx={{ maxWidth: 560 }}>
            {error ? <Alert severity="error">{errorMessage(error, 'Could not accept this invitation.')}</Alert> : null}
            <Typography variant="body1">
              <strong>{invitation.invited_by_email}</strong> invited you to join{' '}
              <strong>{invitation.group_name}</strong>.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {invitation.expires_at
                ? `This invitation expires ${formatShortDate(invitation.expires_at)}.`
                : 'This invitation does not expire.'}
            </Typography>
            <Button
              variant="contained"
              onClick={() => void accept()}
              disabled={acceptInvitation.isPending}
              sx={{ alignSelf: 'flex-start' }}
            >
              {acceptInvitation.isPending ? 'Joining…' : 'Accept invitation'}
            </Button>
          </Stack>
        )}
      </Section>
    </>
  );
}