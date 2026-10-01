import type { Metadata } from 'next';
import { HabitDetailView } from '@/components/views/HabitDetailView';

export const metadata: Metadata = { title: 'Habit' };

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HabitDetailView habitId={id} />;
}
