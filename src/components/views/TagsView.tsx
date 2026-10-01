'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import {
  ErrorState,
  ListSkeleton,
  PageHeader,
  Section,
  EmptyState,
} from '@/components/ui/surfaces';
import { FormDialog, ConfirmDialog, InUseTagDialog } from '@/components/ui/dialogs';
import { Field } from '@/components/ui/inputs';
import { TagChip } from '@/components/ui/pills';
import { useToast } from '@/components/feedback/ToastProvider';
import {
  useCreateTag,
  useDeleteTag,
  useHabits,
  useRenameTag,
  useTags,
} from '@/lib/query/hooks';
import { errorMessage, isApiError } from '@/lib/api/client';
import { starterTags } from '@/theme/tokens';
import { useAppScheme } from '@/theme/useAppScheme';
import type { Tag } from '@/types/api';

export function TagsView() {
  const tags = useTags();
  const habits = useHabits();
  const createTag = useCreateTag();
  const renameTag = useRenameTag();
  const deleteTag = useDeleteTag();
  const { toast } = useToast();
  const { colors } = useAppScheme();

  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<Tag | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null);
  const [inUse, setInUse] = useState<{ tag: Tag; habits: string[] } | null>(null);

  const habitsByTag = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const habit of habits.data?.results ?? []) {
      const list = map.get(habit.tag) ?? [];
      list.push(habit.name);
      map.set(habit.tag, list);
    }
    return map;
  }, [habits.data]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      await createTag.mutateAsync(name);
      setNewName('');
      toast({ tone: 'success', message: `Tag “${name}” added.` });
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error, 'Could not create the tag.') });
    }
  }

  async function handleRename() {
    if (!renaming) return;
    const name = renameValue.trim();
    if (!name) return;
    try {
      await renameTag.mutateAsync({ id: renaming.id, name });
      toast({ tone: 'success', message: 'Tag renamed.' });
      setRenaming(null);
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error, 'Could not rename the tag.') });
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteTag.mutateAsync(pendingDelete.id);
      toast({ tone: 'success', message: `Tag “${pendingDelete.name}” deleted.` });
      setPendingDelete(null);
    } catch (error) {
      setPendingDelete(null);
      const inUseHabits = habitsByTag.get(pendingDelete.id) ?? [];
      if (isApiError(error) && error.status === 400) {
        // The foreign key is PROTECTed; turn the 400 into a clear next step.
        setInUse({ tag: pendingDelete, habits: inUseHabits });
        return;
      }
      toast({ tone: 'error', message: errorMessage(error, 'Could not delete the tag.') });
    }
  }

  const list = tags.data?.results ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Organisation"
        title="Tags"
        description="Group habits by area of life. Every habit needs one, so start here if the list is empty."
      />

      <Stack spacing={3}>
        <Section
          title="New tag"
          description="Tags are shared across your habits and can be renamed at any time."
        >
          <Stack
            component="form"
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            onSubmit={handleCreate}
            sx={{ alignItems: { xs: 'stretch', sm: 'flex-start' } }}
          >
            <Box sx={{ flex: 1, maxWidth: 360 }}>
              <TextField
                size="small"
                fullWidth
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="e.g. Health"
                aria-label="New tag name"
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
            </Box>
            <Button
              type="submit"
              variant="contained"
              startIcon={<AddRounded />}
              disabled={!newName.trim() || createTag.isPending}
            >
              Add tag
            </Button>
          </Stack>
        </Section>

        {tags.isError ? (
          <ErrorState message={errorMessage(tags.error)} onRetry={() => void tags.refetch()} />
        ) : tags.isPending ? (
          <ListSkeleton rows={4} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={LocalOfferOutlined}
            title="No tags yet"
            description="Create a tag to file your habits under. Pick one of these to get going:"
            action={
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {starterTags.map((name) => (
                  <TagChip
                    key={name}
                    name={name}
                    onClick={() => {
                      void createTag
                        .mutateAsync(name)
                        .then(() => toast({ tone: 'success', message: `Tag “${name}” added.` }))
                        .catch((error: unknown) =>
                          toast({ tone: 'error', message: errorMessage(error, 'Could not create the tag.') }),
                        );
                    }}
                  />
                ))}
              </Stack>
            }
          />
        ) : (
          <Section title="Your tags" description={`${list.length} in total.`}>
            <Box>
              {list.map((tag) => (
                <Stack
                  key={tag.id}
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: 'center',
                    py: 1.5,
                    '& + &': { borderTop: `1px solid ${colors.hairline}` },
                  }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: `${10}px`,
                      display: 'grid',
                      placeItems: 'center',
                      backgroundColor: colors.primaryWash,
                      color: colors.primaryInk,
                      flexShrink: 0,
                    }}
                  >
                    <LocalOfferOutlined sx={{ fontSize: 17 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" noWrap>
                      {tag.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.inkSoft }}>
                      {tag.habit_count} {tag.habit_count === 1 ? 'habit' : 'habits'}
                    </Typography>
                  </Box>
                  <Tooltip title="Rename">
                    <IconButton
                      size="small"
                      aria-label={`Rename ${tag.name}`}
                      onClick={() => {
                        setRenaming(tag);
                        setRenameValue(tag.name);
                      }}
                      sx={{ color: colors.inkSoft }}
                    >
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      aria-label={`Delete ${tag.name}`}
                      onClick={() => setPendingDelete(tag)}
                      sx={{ color: colors.inkSoft }}
                    >
                      <DeleteOutlineRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ))}
            </Box>
          </Section>
        )}
      </Stack>

      <FormDialog
        open={Boolean(renaming)}
        title="Rename tag"
        confirmLabel="Save"
        busy={renameTag.isPending}
        disabled={!renameValue.trim()}
        onConfirm={handleRename}
        onClose={() => setRenaming(null)}
      >
        <Field
          label="Tag name"
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
          autoFocus
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
      </FormDialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this tag?"
        message={
          <>
            <strong>{pendingDelete?.name}</strong> will be removed. If any habits still use it, the
            server will refuse and you can reassign them.
          </>
        }
        confirmLabel="Delete tag"
        tone="danger"
        busy={deleteTag.isPending}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />

      <InUseTagDialog
        open={Boolean(inUse)}
        tagName={inUse?.tag.name ?? ''}
        habitNames={inUse?.habits ?? []}
        onClose={() => setInUse(null)}
        onReassign={() => {
          setInUse(null);
          toast({ tone: 'info', message: 'Open a habit and change its tag to reassign it.' });
        }}
      />
    </>
  );
}
