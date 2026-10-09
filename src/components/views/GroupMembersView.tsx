'use client';

import { useState } from 'react';
import { Box, CircularProgress, Stack } from '@mui/material';
import { InvitationPanel } from '@/components/groups/InvitationPanel';
import { JoinRequestPanel } from '@/components/groups/JoinRequestPanel';
import { MemberRoster } from '@/components/groups/MemberRoster';
import { BackLink } from '@/components/ui/BackLink';
import { ErrorState, InlineEmpty, PageHeader, Section } from '@/components/ui/surfaces';
import { errorMessage } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import {
    useGroup,
    useGroupInvitations,
    useGroupMembers,
    useJoinRequests,
} from '@/lib/query/hooks';
import type { JoinRequestScope } from '@/types/api';

/**
 * `/groups/<id>/members` - the roster and the two ways people get into the
 * group, on one page.
 *
 * Requests and invitations moved here from the group's detail tabs: they are
 * both about who may join, so they belong next to the roster rather than next
 * to the challenges.
 */
export function GroupMembersView({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const group = useGroup(groupId);
  const members = useGroupMembers(groupId);
  const invitations = useGroupInvitations(groupId);
  const [scope, setScope] = useState<JoinRequestScope>('incoming');
  const requests = useJoinRequests(groupId, scope);

  const data = group.data;
  const isAdmin = data?.my_role === 'owner' || data?.my_role === 'admin';
  const backHref = `/groups/${groupId}`;

  const backButton = <BackLink href={backHref}>Back to group</BackLink>;

  if (group.isPending) {
    return (
      <Box sx={{ maxWidth: 820, mx: 'auto' }}>
        {backButton}
        <PageHeader eyebrow="Group members" title="Loading…" />
        <Stack sx={{ py: 8, alignItems: 'center' }}>
          <CircularProgress size={28} />
        </Stack>
      </Box>
    );
  }

  if (group.isError || !data) {
    return (
      <Box sx={{ maxWidth: 820, mx: 'auto' }}>
        {backButton}
        <PageHeader eyebrow="Group members" title="Not available" />
        <ErrorState
          title="That group is unavailable"
          message={errorMessage(group.error, 'That group does not exist, or you are not a member.')}
          onRetry={() => void group.refetch()}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 820, mx: 'auto' }}>
      {backButton}
      <PageHeader
        eyebrow="Group members"
        title={data.name}
        description="Who is in the group, the requests to join, and the invitations sent out."
      />
      <Stack spacing={3}>
        <Section title="Members" description={`${data.member_count} people in this group`}>
          {members.isPending ? (
            <InlineEmpty message="Loading the roster…" />
          ) : members.isError ? (
            <ErrorState
              message={errorMessage(members.error, 'Could not load the roster.')}
              onRetry={() => void members.refetch()}
            />
          ) : (
            <MemberRoster group={data} members={members.data.results} currentUserId={user?.id} />
          )}
        </Section>

        <Section title="Requests">
          <JoinRequestPanel
            group={data}
            requests={requests.data?.results ?? []}
            loading={requests.isPending}
            currentUserId={user?.id}
            isAdmin={Boolean(isAdmin)}
            scope={scope}
            onScopeChange={setScope}
          />
        </Section>

        <Section title="Invitations">
          <InvitationPanel
            group={data}
            invitations={invitations.data?.results ?? []}
            loading={invitations.isPending}
          />
        </Section>
      </Stack>
    </Box>
  );
}