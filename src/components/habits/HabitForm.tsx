'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { Field, SelectField, SegmentedControl, WeekdayToggle, ColorSwatchPicker, IconPicker, NumberStepper } from '@/components/ui/inputs';
import { Section } from '@/components/ui/surfaces';
import { errorMessage, isApiError } from '@/lib/api/client';
import { useCreateTag } from '@/lib/query/hooks';
import { frequencyOptions } from '@/lib/schedule';
import { fromApiTime, toApiTime, fromDateInputValue, toDateInputValue } from '@/lib/date';
import { habitSwatches, radii } from '@/theme/tokens';
import { useAppScheme } from '@/theme/useAppScheme';
import { defaultIconKey, isValidIcon } from '@/components/ui/HabitIcon';
import type {
  DurationType,
  FrequencyType,
  Habit,
  HabitDraft,
  HabitStatus,
  ScheduleInput,
  Tag,
  Weekday,
} from '@/types/api';

export interface HabitFormProps {
  mode: 'create' | 'edit';
  habit?: Habit;
  tags: Tag[];
  submitting?: boolean;
  error?: unknown;
  onSubmit: (draft: HabitDraft, resolvedTagId: string) => void | Promise<void>;
  onCancel: () => void;
}

const DURATION_OPTIONS: Array<{ value: DurationType; label: string }> = [
  { value: 'INDEFINITE', label: 'Ongoing' },
  { value: 'FIXED', label: 'Fixed period' },
];

const STATUS_OPTIONS: Array<{ value: HabitStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
];

const NEW_TAG = '__new__';

/**
 * Shared create/edit form. The habit foreign key to a tag is required and
 * `PROTECT`ed, so a tag is always resolved before submitting: an existing
 * selection, or a name typed inline which is created (or matched) first.
 */
export function HabitForm({
  mode,
  habit,
  tags,
  submitting = false,
  error,
  onSubmit,
  onCancel,
}: HabitFormProps) {
  const { mode: schemeMode, colors } = useAppScheme();
  const createTag = useCreateTag();

  const [name, setName] = useState(habit?.name ?? '');
  const [goal, setGoal] = useState(habit?.goal ?? '');
  const [tagId, setTagId] = useState(habit?.tag ?? (tags[0]?.id ?? NEW_TAG));
  const [newTagName, setNewTagName] = useState('');
  const [startDate, setStartDate] = useState(() =>
    habit ? toDateInputValue(habit.start_date) : toDateInputValue(Date.now() / 1000),
  );
  const [durationType, setDurationType] = useState<DurationType>(
    habit?.duration_type ?? 'INDEFINITE',
  );
  const [endDate, setEndDate] = useState(habit?.end_date ? toDateInputValue(habit.end_date) : '');
  const [status, setStatus] = useState<HabitStatus>(habit?.status ?? 'ACTIVE');
  const [reminder, setReminder] = useState(fromApiTime(habit?.reminder ?? null));
  const [color, setColor] = useState(habit?.color ?? habitSwatches[0][schemeMode]);
  const [icon, setIcon] = useState(
    habit?.icon && isValidIcon(habit.icon) ? habit.icon : defaultIconKey,
  );

  const [frequency, setFrequency] = useState<FrequencyType>(
    habit?.schedule?.frequency_type ?? 'DAILY',
  );
  const [targetCount, setTargetCount] = useState(habit?.schedule?.target_count ?? 1);
  const [weekdays, setWeekdays] = useState<Weekday[]>(habit?.schedule?.weekdays ?? []);
  const [scheduledTime, setScheduledTime] = useState(
    fromApiTime(habit?.schedule?.scheduled_time ?? null),
  );
  const [touched, setTouched] = useState(false);

  const usingNewTag = tagId === NEW_TAG;
  const busy = submitting || createTag.isPending;

  const fieldError = (field: string): string | undefined =>
    touched && isApiError(error) ? error.fieldError(field) : undefined;

  const serverErrors = isApiError(error) ? error.errors : {};
  const formError =
    touched && error && Object.keys(serverErrors).length === 0 ? errorMessage(error) : undefined;

  const startSeconds = useMemo(() => fromDateInputValue(startDate), [startDate]);
  const endSeconds = useMemo(() => fromDateInputValue(endDate), [endDate]);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Give the habit a name.';
    if (usingNewTag && !newTagName.trim()) errors.tag = 'Name the new tag, or pick an existing one.';
    if (!startDate || startSeconds === null) errors.start_date = 'Pick a start date.';
    if (durationType === 'FIXED') {
      if (!endDate || endSeconds === null) {
        errors.end_date = 'Pick the last day of the period.';
      } else if (startSeconds !== null && endSeconds <= startSeconds) {
        errors.end_date = 'The end date must come after the start date.';
      }
    }
    if (frequency === 'CUSTOM' && weekdays.length === 0) {
      errors.weekdays = 'Pick at least one day.';
    }
    return errors;
  }

  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const combinedError = (field: string): string | undefined =>
    clientErrors[field] ?? fieldError(field);

  async function resolveTagId(): Promise<string> {
    if (!usingNewTag) return tagId;
    const trimmed = newTagName.trim();
    const existing = tags.find((tag) => tag.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const created = await createTag.mutateAsync(trimmed);
    return created.id;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    const errors = validate();
    setClientErrors(errors);
    if (Object.keys(errors).length > 0 || startSeconds === null) return;

    const schedule: ScheduleInput = {
      frequency_type: frequency,
      target_count: targetCount,
      weekdays: frequency === 'CUSTOM' ? [...weekdays].sort((a, b) => a - b) : [],
      scheduled_time: scheduledTime ? toApiTime(scheduledTime) : null,
    };

    const draft: HabitDraft = {
      name: name.trim(),
      goal: goal.trim() ? goal.trim() : null,
      reminder: reminder ? toApiTime(reminder) : null,
      tag: '',
      start_date: startSeconds,
      duration_type: durationType,
      end_date: durationType === 'FIXED' ? endSeconds : null,
      status,
      color,
      icon,
      schedule,
    };

    const resolvedTagId = await resolveTagId();
    draft.tag = resolvedTagId;
    await onSubmit(draft, resolvedTagId);
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={2.5}>
        {formError ? <Alert severity="error">{formError}</Alert> : null}

        <Section index={1} title="The habit" description="What are you building, and how is it filed?">
          <Stack spacing={2.25}>
            <Field
              label="Habit name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              errorText={combinedError('name')}
              placeholder="Read for 20 minutes"
              autoFocus
              slotProps={{ htmlInput: { maxLength: 255 } }}
            />
            <Field
              label="Goal"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              helperText="Optional. A sentence about what success looks like."
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
                  helperText="Habits are grouped by tag."
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
          </Stack>
        </Section>

        <Section index={2} title="Schedule" description="How often should this show up as due?">
          <Stack spacing={2.5}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Frequency
              </Typography>
              <SegmentedControl
                ariaLabel="Schedule frequency"
                value={frequency}
                options={frequencyOptions}
                onChange={setFrequency}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  {frequency === 'WEEKLY' ? 'Times per week' : 'Repetitions per day'}
                </Typography>
                <NumberStepper
                  label="target count"
                  value={targetCount}
                  onChange={setTargetCount}
                  min={1}
                  max={99}
                />
              </Stack>

              <Stack spacing={1} sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Preferred time
                </Typography>
                <Field
                  label="Time"
                  type="time"
                  value={scheduledTime}
                  onChange={(event) => setScheduledTime(event.target.value)}
                  helperText="Optional reminder time in your local clock."
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>
            </Stack>

            {frequency === 'CUSTOM' ? (
              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Days
                </Typography>
                <WeekdayToggle value={weekdays} onChange={setWeekdays} />
                {combinedError('weekdays') || combinedError('schedule.weekdays') ? (
                  <Typography variant="caption" sx={{ color: 'error.main' }}>
                    {combinedError('weekdays') ?? combinedError('schedule.weekdays')}
                  </Typography>
                ) : null}
              </Stack>
            ) : null}
          </Stack>
        </Section>

        <Section index={3} title="Timeframe" description="When does it start, and does it end?">
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Field
                  label="Start date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  errorText={combinedError('start_date')}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Field
                  label="Reminder"
                  type="time"
                  value={reminder}
                  onChange={(event) => setReminder(event.target.value)}
                  helperText="Optional nudge for this habit."
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Duration
              </Typography>
              <SegmentedControl
                ariaLabel="Duration type"
                value={durationType}
                options={DURATION_OPTIONS}
                onChange={setDurationType}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {durationType === 'FIXED' ? (
                <Box sx={{ flex: 1 }}>
                  <Field
                    label="End date"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    errorText={combinedError('end_date')}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Box>
              ) : null}
              {mode === 'edit' ? (
                <Box sx={{ flex: 1 }}>
                  <SelectField
                    label="Status"
                    name="status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value as HabitStatus)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </SelectField>
                </Box>
              ) : null}
            </Stack>
          </Stack>
        </Section>

        <Section index={4} title="Appearance" description="A colour and icon make habits scannable at a glance.">
          <Stack spacing={2.5}>
            <Stack spacing={1.25}>
              <Typography variant="subtitle2" color="text.secondary">
                Accent
              </Typography>
              <ColorSwatchPicker value={color} onChange={setColor} />
            </Stack>
            <Stack spacing={1.25}>
              <Typography variant="subtitle2" color="text.secondary">
                Icon
              </Typography>
              <IconPicker value={icon} onChange={setIcon} />
            </Stack>
          </Stack>
        </Section>

        <Stack
          direction="row"
          spacing={1.25}
          sx={{
            position: 'sticky',
            bottom: 0,
            py: 2,
            backgroundColor: colors.canvas,
            borderTop: `1px solid ${colors.hairline}`,
            borderRadius: `${radii.sm}px`,
            justifyContent: 'flex-end',
          }}
        >
          <Button onClick={onCancel} color="inherit" disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? 'Saving…' : mode === 'create' ? 'Create habit' : 'Save changes'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
