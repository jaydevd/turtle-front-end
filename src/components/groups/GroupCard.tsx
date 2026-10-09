'use client';

import { Box, Button, Stack, Typography } from '@mui/material';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import LockOutlined from '@mui/icons-material/LockOutlined';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import Link from 'next/link';
import { Surface } from '@/components/ui/surfaces';
import { RolePill } from '@/components/ui/pills';
import { radii } from '@/theme/tokens';
import { useAppScheme } from '@/theme/useAppScheme';
import { formatPlural } from '@/lib/date';
import type { Group } from '@/types/api';

export interface GroupCardProps {
  group: Group;
}

/**
 * One group on the list screen. Everything here comes off the single group row:
 * `member_count` is annotated server side and `my_role` is the caller's own tier,
 * so the card needs no follow-up call.
 */
export function GroupCard({ group }: GroupCardProps) {
  const { colors } = useAppScheme();

  return (
    <Surface sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: `${radii.sm}px`,
            display: 'grid',
            placeItems: 'center',
            backgroundColor: colors.primaryWash,
            color: colors.primaryInk,
            flexShrink: 0,
          }}
        >
          <GroupsRounded sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
            <Typography variant="h6" noWrap>
              {group.name}
            </Typography>
            {group.is_private ? <LockOutlined sx={{ fontSize: 14, color: colors.inkSoft }} /> : null}
          </Stack>
          <Typography variant="caption" sx={{ color: colors.inkSoft }}>
            {formatPlural(group.member_count, 'member')} &middot; owned by {group.owner_email}
          </Typography>
        </Box>
        {group.my_role ? <RolePill role={group.my_role} /> : null}
      </Stack>

      {group.description ? (
        <Typography
          variant="body2"
          sx={{
            color: colors.inkSoft,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {group.description}
        </Typography>
      ) : null}

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
        {group.join_requests_enabled ? null : (
          <Typography variant="caption" sx={{ color: colors.inkSoft }}>
            Members cannot ask
          </Typography>
        )}
        {group.anyone_can_create_challenge ? (
          <Typography variant="caption" sx={{ color: colors.inkSoft, display: 'inline-flex', gap: 0.5, alignItems: 'center' }}>
            <EmojiEventsOutlined sx={{ fontSize: 13 }} />
            Open challenges
          </Typography>
        ) : null}
      </Stack>

      <Box sx={{ flexGrow: 1 }} />

      <Button component={Link} href={`/groups/${group.id}`} variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }}>
        Open group
      </Button>
    </Surface>
  );
}
