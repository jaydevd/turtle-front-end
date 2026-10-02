'use client';

import { useToast } from '@/components/feedback/ToastProvider';
import { JoinRequestStatusPill } from '@/components/ui/pills';
import { EmptyState, ErrorState, InlineEmpty, PageHeader, Section } from '@/components/ui/surfaces';
import { errorMessage } from '@/lib/api/client';
import { formatRelative } from '@/lib/date';
import { useJoinRequests, useRespondToJoinRequest } from '@/lib/query/hooks';
import { useAppScheme } from '@/theme/useAppScheme';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { Alert, Button, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';

export function JoinRequestReviewView({ groupId }: { groupId: string }) {
  const { colors } = useAppScheme();
  const { toast } = useToast();
  const requests = useJoinRequests(groupId, 'incoming');
  const respond = useRespondToJoinRequest();
  const [error, setError] = useState<unknown>(null);

  async function answer(requestId: string, action: 'accept' | 'reject') {
    setError(null);
    try {
      await respond.mutateAsync({ groupId, requestId, action });
      toast({
        tone: action === 'accept' ? 'success' : 'info',
        message: action === 'accept' ? 'You joined the group.' : 'Request declined.',
      });
    } catch (caught) {
      setError(caught);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Group request"
        title="Someone asked you to join"
        description="Only you can accept or decline a request addressed to you."
        actions={
          <Button component={Link} href="/groups" color="inherit" startIcon={<ArrowBackRounded />}>
            Groups
          </Button>
        }
      />
      <Section title="Requests for you">
        <Stack spacing={2}>
          {error ? <Alert severity="error">{errorMessage(error, 'Could not respond to the request.')}</Alert> : null}
          {requests.isPending ? (
            <InlineEmpty message="Loading request…" />
          ) : requests.isError ? (
            <ErrorState
              message={errorMessage(requests.error, 'This request is unavailable.')}
              onRetry={() => void requests.refetch()}
            />
          ) : requests.data.results.length === 0 ? (
            <EmptyState
              compact
              title="No request waiting"
              description="This link may have already been answered, or it may not be for your account."
            />
          ) : (
            requests.data.results.map((request) => (
              <Stack
                key={request.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ alignItems: { sm: 'center' }, py: 1.5, '& + &': { borderTop: `1px solid ${colors.hairline}` } }}
              >
                <Stack spacing={0.35} sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{request.group_name}</Typography>
                    <JoinRequestStatusPill status={request.status} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Asked by {request.from_user_email} · {formatRelative(request.created_at)}
                  </Typography>
                  {request.message ? <Typography variant="body2">{request.message}</Typography> : null}
                </Stack>
                {request.status === 'pending' ? (
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={respond.isPending}
                      onClick={() => void answer(request.id, 'accept')}
                    >
                      Accept
                    </Button>
                    <Button
                      size="small"
                      color="inherit"
                      disabled={respond.isPending}
                      onClick={() => void answer(request.id, 'reject')}
                    >
                      Decline
                    </Button>
                  </Stack>
                ) : request.status === 'accepted' ? (
                  <Button component={Link} href={`/groups/${groupId}`} size="small">Open group</Button>
                ) : null}
              </Stack>
            ))
          )}
        </Stack>
      </Section>
    </>
  );
}