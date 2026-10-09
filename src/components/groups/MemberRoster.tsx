'use client';

import { useState } from 'react';
import { Box, Divider, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import GroupOffOutlined from '@mui/icons-material/GroupOffOutlined';
import { ConfirmDialog } from '@/components/ui/dialogs';
import { EmptyState } from '@/components/ui/surfaces';
import { RolePill } from '@/components/ui/pills';
import { useToast } from '@/components/feedback/ToastProvider';
import { errorMessage } from '@/lib/api/client';
import { useRemoveMember, useSetMemberRole } from '@/lib/query/hooks';
import { formatRelative } from '@/lib/date';
import { useAppScheme } from '@/theme/useAppScheme';
import { radii } from '@/theme/tokens';
import type { Group, GroupMembership } from '@/types/api';

export interface MemberRosterProps {
  group: Group;
  members: GroupMembership[];
  /** The signed-in user's id, so their own row is recognisable. */
  currentUserId?: string;
  busy?: boolean;
}

/**
 * The roster, plus the two promotion rules the API enforces:
 *
 * - the owner row is never editable, so a group cannot be left ownerless by a
 *   well-meaning promotion;
 * - an admin may only move people between `admin` and `member`, so an admin
 *   cannot demote or evict a peer. The owner can touch anyone but the owner.
 *
 * Both rules are re-checked server side. Hiding the controls keeps the screen
 * from offering an action that is guaranteed to fail.
 */
export function MemberRoster({ group, members, currentUserId, busy = false }: MemberRosterProps) {
  const { colors } = useAppScheme();
  const { toast } = useToast();
  const setRole = useSetMemberRole();
  const removeMember = useRemoveMember();

  const [roleTarget, setRoleTarget] = useState<GroupMembership | null>(null);
  const [removeTarget, setRemoveTarget] = useState<GroupMembership | null>(null);
  const [menuFor, setMenuFor] = useState<{ anchor: HTMLElement; member: GroupMembership } | null>(null);

  const isOwner = group.my_role === 'owner';
  const isAdmin = group.my_role === 'owner' || group.my_role === 'admin';
  const nextRole = roleTarget ? (roleTarget.role === 'admin' ? 'member' : 'admin') : 'member';

  function openRoleDialog(membership: GroupMembership) {
    setRoleTarget(membership);
  }

  async function applyRole() {
    if (!roleTarget) return;
    try {
      await setRole.mutateAsync({ groupId: group.id, memberId: roleTarget.id, role: nextRole });
      toast({
        tone: 'success',
        message: `${roleTarget.display_name} is now a ${nextRole}.`,
      });
      setRoleTarget(null);
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error, 'Could not change that role.') });
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    try {
      await removeMember.mutateAsync({ groupId: group.id, memberId: removeTarget.id });
      toast({
        tone: 'success',
        message: `${removeTarget.display_name} was removed.`,
      });
      setRemoveTarget(null);
    } catch (error) {
      setRemoveTarget(null);
      toast({ tone: 'error', message: errorMessage(error, 'Could not remove that member.') });
    }
  }

  if (members.length === 0) {
    return (
      <EmptyState
        compact
        icon={GroupOffOutlined}
        title="Nobody here yet"
        description="Invite someone by email, or ask a registered user to join from the Requests section on this page."
      />
    );
  }

  return (
    <Stack spacing={0}>
      {members.map((membership) => {
        const isSelf = membership.user === currentUserId;
        const isMemberOwner = membership.role === 'owner';
        // An admin may not touch a peer admin; the owner may touch anyone but the
        // owner row itself.
        const peerAdmin = !isOwner && membership.role === 'admin';
        const manageable = isAdmin && !isMemberOwner && !peerAdmin;

        return (
          <Stack
            key={membership.id}
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: 'center',
              py: 1.5,
              '& + &': { borderTop: `1px solid ${colors.hairline}` },
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: `${radii.sm}px`,
                display: 'grid',
                placeItems: 'center',
                backgroundColor: colors.paperRaised,
                color: colors.inkSoft,
                fontSize: '0.8125rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {membership.display_name.slice(0, 1).toUpperCase()}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}
              >
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {membership.display_name}
                </Typography>
                {isSelf ? (
                  <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                    you
                  </Typography>
                ) : null}
              </Stack>
              <Typography
                variant="caption"
                noWrap
                sx={{ color: colors.inkSoft, display: 'block', minWidth: 0 }}
              >
                {membership.display_name !== membership.user_email
                  ? `${membership.user_email} · Joined ${formatRelative(membership.joined_at)}`
                  : `Joined ${formatRelative(membership.joined_at)}`}
              </Typography>
            </Box>
            <RolePill role={membership.role} />
            {manageable ? (
              <IconButton
                size="small"
                aria-label={`Actions for ${membership.display_name}`}
                aria-haspopup="menu"
                onClick={(event) => setMenuFor({ anchor: event.currentTarget, member: membership })}
                sx={{ color: colors.inkSoft, flexShrink: 0 }}
              >
                <MoreVertRounded fontSize="small" />
              </IconButton>
            ) : null}
          </Stack>
        );
      })}

      <Menu
        anchorEl={menuFor?.anchor}
        open={Boolean(menuFor)}
        onClose={() => setMenuFor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {menuFor ? (
          <>
            <MenuItem
              onClick={() => {
                const member = menuFor.member;
                setMenuFor(null);
                openRoleDialog(member);
              }}
            >
              {menuFor.member.role === 'admin' ? 'Demote to member' : 'Promote to admin'}
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem
              onClick={() => {
                const member = menuFor.member;
                setMenuFor(null);
                setRemoveTarget(member);
              }}
              sx={{ color: 'error.main' }}
            >
              Remove from group
            </MenuItem>
          </>
        ) : null}
      </Menu>

      <ConfirmDialog
        open={Boolean(roleTarget)}
        title={nextRole === 'admin' ? 'Make an admin?' : 'Move to member?'}
        message={
          roleTarget ? (
            <>
              <strong>{roleTarget.display_name}</strong> will{' '}
              {nextRole === 'admin'
                ? 'be able to change the group settings, manage members, and start or stop challenges.'
                : 'lose the extra admin rights and return to being a regular member.'}
            </>
          ) : null
        }
        confirmLabel={nextRole === 'admin' ? 'Promote' : 'Demote'}
        busy={setRole.isPending}
        onConfirm={applyRole}
        onClose={() => setRoleTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove this member?"
        message={
          <>
            <strong>{removeTarget?.display_name}</strong> loses access to the group immediately.
            Their own habits and history stay intact.
          </>
        }
        confirmLabel="Remove member"
        tone="danger"
        busy={removeMember.isPending}
        onConfirm={confirmRemove}
        onClose={() => setRemoveTarget(null)}
      />
    </Stack>
  );
}
