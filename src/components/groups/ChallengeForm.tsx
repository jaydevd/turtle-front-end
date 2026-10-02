'use client';

import { FormDialog } from '@/components/ui/dialogs';
import { defaultIconKey } from '@/components/ui/HabitIcon';
import {
    ColorSwatchPicker,
    Field,
    IconPicker,
    NumberStepper,
    SelectField,
    WeekdayToggle,
} from '@/components/ui/inputs';
import { errorMessage, isApiError } from '@/lib/api/client';
import {
    fromDateInputValue,
    toApiTime,
    toDateInputValue,
} from '@/lib/date';
import { useCreateTag } from '@/lib/query/hooks';
import { frequencyOptions } from '@/lib/schedule';
import { habitSwatches } from '@/theme/tokens';
import { useAppScheme } from '@/theme/useAppScheme';
import type {
    ChallengeCreate,
    FrequencyType,
    ScheduleInput,
    Tag,
    Weekday,
} from '@/types/api';
import AddRounded from '@mui/icons-material/AddRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { Alert, Box, Button, IconButton, MenuItem, Stack, Typography } from '@mui/material';
import { useMemo, useState } from 'react';

const NEW_TAG = '__new__';

/** Mirrors `habits.challenges.MAX_CHALLENGE_RULES`. */
const MAX_RULES = 10;

/** A month-long default window: long enough to build a habit, short enough to finish. */
const DEFAULT_WINDOW_DAYS = 30;

export interface ChallengeFormProps {
  tags: Tag[];
  submitting: boolean;
  error: unknown;
  onSubmit: (input: ChallengeCreate) => void | Promise<void>;
  onClose: () => void;
}

/**
 * Proposing a challenge.
 *
 * A challenge *is* a habit, so this reuses the same schedule and appearance
 * controls as the habit form. Two things differ and are deliberately not
 * optional: the window is always fixed and dated, because the winner is read off
 * the final day, and the rules are editable right up until the challenge starts.
 */
export function ChallengeForm({ tags, submitting, error, onSubmit, onClose }: ChallengeFormProps) {
  const { mode: schemeMode, colors } = useAppScheme();
  const createTag = useCreateTag();

  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [tagId, setTagId] = useState(tags[0]?.id ?? NEW_TAG);
  const [newTagName, setNewTagName] = useState('');
  const [startDate, setStartDate] = useState(() => toDateInputValue(Date.now() / 1000));
  const [endDate, setEndDate] = useState(() =>
    toDateInputValue(Date.now() / 1000 + DEFAULT_WINDOW_DAYS * 86_400),
  );
  const [frequency, setFrequency] = useState<FrequencyType>('DAILY');
  const [targetCount, setTargetCount] = useState(1);
  const [weekdays, setWeekdays] = useState<Weekday[]>([]);
  const [scheduledTime, setScheduledTime] = useState('');
  const [rules, setRules] = useState<string[]>([]);
  const [ruleDraft, setRuleDraft] = useState('');
  // Explicitly `string`: the swatch table is typed with literal hex values, which
  // `useState` would otherwise narrow to and then reject `onChange` against.
  const [color, setColor] = useState<string>(habitSwatches[1][schemeMode]);
  const [icon, setIcon] = useState(defaultIconKey);
  const [touched, setTouched] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const usingNewTag = tagId === NEW_TAG;
  const busy = submitting || createTag.isPending;

  const startSeconds = useMemo(() => fromDateInputValue(startDate), [startDate]);
  const endSeconds = useMemo(() => fromDateInputValue(endDate), [endDate]);

  const serverError = (field: string): string | undefined =>
    touched && isApiError(error) ? error.fieldError(field) : undefined;
  const combinedError = (field: string): string | undefined =>
    clientErrors[field] ?? serverError(field);

  const serverErrors = isApiError(error) ? error.errors : {};
  const formError =
    touched && error && Object.keys(serverErrors).length === 0
      ? errorMessage(error, 'Could not propose the challenge.')
      : undefined;

  function addRule() {
    const trimmed = ruleDraft.trim();
    if (!trimmed || rules.length >= MAX_RULES) return;
    setRules((current) => [...current, trimmed]);
    setRuleDraft('');
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Give the challenge a name.';
    if (usingNewTag && !newTagName.trim()) errors.tag = 'Name the new tag, or pick an existing one.';
    if (!startDate || startSeconds === null) errors.start_date = 'Pick a start date.';
    if (!endDate || endSeconds === null) {
      errors.end_date = 'Pick the last day of the challenge.';
    } else if (startSeconds !== null && endSeconds <= startSeconds) {
      errors.end_date = 'The end date must come after the start date.';
    }
    if (frequency === 'CUSTOM' && weekdays.length === 0) errors.weekdays = 'Pick at least one day.';
    return errors;
  }

  async function resolveTagId(): Promise<string> {
    if (!usingNewTag) return tagId;
    const trimmed = newTagName.trim();
    const existing = tags.find((tag) => tag.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const created = await createTag.mutateAsync(trimmed);
    return created.id;
  }

  async function handleSubmit() {
    setTouched(true);
    const errors = validate();
    setClientErrors(errors);
    if (Object.keys(errors).length > 0 || startSeconds === null || endSeconds === null) return;

    const schedule: ScheduleInput = {
      frequency_type: frequency,
      target_count: targetCount,
      weekdays: frequency === 'CUSTOM' ? [...weekdays].sort((a, b) => a - b) : [],
      scheduled_time: scheduledTime ? toApiTime(scheduledTime) : null,
    };

    await onSubmit({
      name: name.trim(),
      goal: goal.trim() ? goal.trim() : null,
      reminder: null,
      tag: await resolveTagId(),
      start_date: startSeconds,
      end_date: endSeconds,
      duration_type: 'FIXED',
      status: 'ACTIVE',
      color,
      icon,
      schedule,
      challenge_rules: rules.map((rule) => rule.trim()).filter(Boolean),
    });
  }

  return (
    <FormDialog
      open
      title="Propose a challenge"
      description="Everyone in the group can follow the leaderboard. Starting is a separate step, so the group sees the plan before it counts."
      confirmLabel="Propose challenge"
      busy={busy}
      onConfirm={handleSubmit}
      onClose={onClose}
    >
      <Stack spacing={2.25}>
        {formError ? <Alert severity="error">{formError}</Alert> : null}

        <Field
          label="Challenge name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          errorText={combinedError('name')}
          placeholder="30 days of walking"
          autoFocus
          slotProps={{ htmlInput: { maxLength: 255 } }}
        />

        <Field
          label="Goal"
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          helperText="Optional. What does taking part look like?"
          multiline
          minRows={2}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <SelectField
              label="Tag"
              name="tag"
              value={tagId}
              onChange={(event) => setTagId(event.target.value)}
              errorText={combinedError('tag')}
              helperText="A habit always needs one."
            >
              {tags.map((tag) => (
                <MenuItem key={tag.id} value={tag.id}>
                  {tag.name}
                </MenuItem>
              ))}
              <MenuItem value={NEW_TAG}>+ New tag…</MenuItem>
            </SelectField>
          </Box>
          {usingNewTag ? (
            <Box sx={{ flex: 1 }}>
              <Field
                label="New tag name"
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                placeholder="Health"
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
            </Box>
          ) : null}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Field
              label="Starts"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              errorText={combinedError('start_date')}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Field
              label="Ends"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              errorText={combinedError('end_date')}
              helperText="The winner is read off this day, so a challenge always ends."
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Frequency
          </Typography>
          <SelectField
            label="How often"
            name="frequency"
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as FrequencyType)}
          >
            {frequencyOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </SelectField>
          <Stack
            direction="row"
            spacing={3}
            sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 2 }}
          >
            <NumberStepper
              label="repetitions"
              value={targetCount}
              onChange={setTargetCount}
              min={1}
              max={99}
            />
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <Field
                label="Preferred time"
                type="time"
                value={scheduledTime}
                onChange={(event) => setScheduledTime(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
          </Stack>
          {frequency === 'CUSTOM' ? (
            <Box>
              <WeekdayToggle value={weekdays} onChange={setWeekdays} />
              {combinedError('weekdays') ? (
                <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>
                  {combinedError('weekdays')}
                </Typography>
              ) : null}
            </Box>
          ) : null}
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Rules
          </Typography>
          <Typography variant="caption" sx={{ color: colors.inkSoft }}>
            Up to {MAX_RULES}. Locked in once the challenge starts.
          </Typography>
          {rules.length > 0 ? (
            <Stack spacing={0.75}>
              {rules.map((rule, index) => (
                <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {index + 1}. {rule}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label={`Remove rule ${index + 1}`}
                    onClick={() => setRules((current) => current.filter((_, i) => i !== index))}
                    sx={{ color: colors.inkSoft }}
                  >
                    <CloseRounded fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          ) : null}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Field
                label="Add a rule"
                value={ruleDraft}
                onChange={(event) => setRuleDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addRule();
                  }
                }}
                placeholder="No alcohol"
              />
            </Box>
            <Button
              onClick={addRule}
              startIcon={<AddRounded />}
              disabled={!ruleDraft.trim() || rules.length >= MAX_RULES}
              sx={{ mt: 0.5 }}
            >
              Add
            </Button>
          </Stack>
        </Stack>

        <Stack spacing={1.25}>
          <Typography variant="subtitle2" color="text.secondary">
            Accent
          </Typography>
          <ColorSwatchPicker value={color} onChange={setColor} />
          <IconPicker value={icon} onChange={setIcon} />
        </Stack>
      </Stack>
    </FormDialog>
  );
}