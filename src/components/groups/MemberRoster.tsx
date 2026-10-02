'use client';

import { useState } from 'react';
import { Box, Button, IconButton, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import GroupOffOutlined from '@mui/icons-material/GroupOffOutlined';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import { ConfirmDialog, FormDialog } from '@/components/ui/dialogs';
import { SelectField } from '@/components/ui/inputs';
import { EmptyState } from '@/components/ui/surfaces';
import { RolePill } from '@/components/ui/pills';
import { useToast } from '@/components/feedback/ToastProvider';
import { errorMessage } from '@/lib/api/client';
import { useRemoveMember, useSetMemberRole, useTransferOwnership } from '@/lib/query/hooks';
import { formatRelative } from '@/lib/date';
import { useAppScheme } from '@/theme/useAppScheme';
import { radii } from '@/theme/tokens';
import type { Group, GroupMembership, GroupRole } from '@/types/api';

/** Roles a caller may hand out. `owner` is absent: it has its own endpoint. */
const ASSIGNABLE_ROLES: Array<{ value: GroupRole; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
];

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
  const transferOwnership = useTransferOwnership();

  const [roleTarget, setRoleTarget] = useState<GroupMembership | null>(null);
  const [nextRole, setNextRole] = useState<GroupRole>('member');
  const [removeTarget, setRemoveTarget] = useState<GroupMembership | null>(null);
  const [transferTarget, setTransferTarget] = useState<string>('');

  const isOwner = group.my_role === 'owner';
  const isAdmin = group.my_role === 'owner' || group.my_role === 'admin';
  const transferCandidates = members.filter((membership) => membership.role !== 'owner');

  function openRoleDialog(membership: GroupMembership) {
    setRoleTarget(membership);
    setNextRole(membership.role === 'admin' ? 'member' : 'admin');
  }

  async function applyRole() {
    if (!roleTarget) return;
    try {
      await setRole.mutateAsync({ groupId: group.id, memberId: roleTarget.id, role: nextRole });
      toast({ tone: 'success', message: `${roleTarget.user_email} is now a ${nextRole}.` });
      setRoleTarget(null);
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error, 'Could not change that role.') });
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    try {
      await removeMember.mutateAsync({ groupId: group.id, memberId: removeTarget.id });
      toast({ tone: 'success', message: `${removeTarget.user_email} was removed.` });
      setRemoveTarget(null);
    } catch (error) {
      setRemoveTarget(null);
      toast({ tone: 'error', message: errorMessage(error, 'Could not remove that member.') });
    }
  }

  async function confirmTransfer() {
    const target = transferCandidates.find(
      (membership) => membership.user === transferTarget,
    );
    if (!target) return;
    try {
      await transferOwnership.mutateAsync({ groupId: group.id, userId: target.user });
      toast({
        tone: 'success',
        message: `${target.user_email} now owns this group. You are an admin.`,
      });
      setTransferTarget('');
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error, 'Could not transfer ownership.') });
    }
  }

  if (members.length === 0) {
    return (
      <EmptyState
        compact
        icon={GroupOffOutlined}
        title="Nobody here yet"
        description="Invite someone by email, or ask a registered user to join from the requests tab."
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
              {membership.user_email.slice(0, 1).toUpperCase()}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}
              >
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {membership.user_email}
                </Typography>
                {isSelf ? (
                  <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                    you
                  </Typography>
                ) : null}
              </Stack>
              <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                Joined {formatRelative(membership.joined_at)}
              </Typography>
            </Box>
            <RolePill role={membership.role} />
            {manageable ? (
              <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                <Button size="small" color="inherit" onClick={() => openRoleDialog(membership)}>
                  {membership.role === 'admin' ? 'Demote' : 'Promote'}
                </Button>
                <Tooltip title="Remove from group">
                  <IconButton
                    size="small"
                    aria-label={`Remove ${membership.user_email}`}
                    onClick={() => setRemoveTarget(membership)}
                    sx={{ color: colors.inkSoft }}
                  >
                    <DeleteOutlineRounded fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ) : null}
          </Stack>
        );
      })}

      {isOwner && transferCandidates.length > 0 ? (
        <Stack direction="row" sx={{ pt: 2 }}>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<SwapHorizRounded />}
            onClick={() => setTransferTarget(transferCandidates[0].user)}
          >
            Transfer ownership
          </Button>
        </Stack>
      ) : null}

      <FormDialog
        open={Boolean(roleTarget)}
        title={nextRole === 'admin' ? 'Make an admin' : 'Demote to member'}
        description="Admins can change the group settings, manage members, and start or stop challenges."
        confirmLabel={nextRole === 'admin' ? 'Promote' : 'Demote'}
        busy={setRole.isPending}
        onConfirm={applyRole}
        onClose={() => setRoleTarget(null)}
      >
        <SelectField
          label="Role"
          name="role"
          value={nextRole}
          onChange={(event) => setNextRole(event.target.value as GroupRole)}
        >
          {ASSIGNABLE_ROLES.map((role) => (
            <MenuItem key={role.value} value={role.value}>
              {role.label}
            </MenuItem>
          ))}
        </SelectField>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove this member?"
        message={
          <>
            <strong>{removeTarget?.user_email}</strong> loses access to the group immediately.
            Their own habits and history stay intact.
          </>
        }
        confirmLabel="Remove member"
        tone="danger"
        busy={removeMember.isPending}
        onConfirm={confirmRemove}
        onClose={() => setRemoveTarget(null)}
      />

      <FormDialog
        open={Boolean(transferTarget)}
        title="Hand over this group?"
        description="They gain every admin right, and you drop to admin. This cannot be undone by them."
        confirmLabel="Transfer ownership"
        busy={transferOwnership.isPending}
        disabled={!transferTarget}
        onConfirm={confirmTransfer}
        onClose={() => setTransferTarget('')}
      >
        <SelectField
          label="New owner"
          name="new-owner"
          value={transferTarget}
          onChange={(event) => setTransferTarget(event.target.value)}
        >
          {transferCandidates.map((membership) => (
            <MenuItem key={membership.user} value={membership.user}>
              {membership.user_email}
            </MenuItem>
          ))}
        </SelectField>
      </FormDialog>
    </Stack>
  );
}
