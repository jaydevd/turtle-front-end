import type { Metadata } from 'next';
import { EditHabitView } from '@/components/views/EditHabitView';

export const metadata: Metadata = { title: 'Edit habit' };

export default async function EditHabitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditHabitView habitId={id} />;
}
