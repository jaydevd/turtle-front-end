import type { Metadata } from 'next';
import { HabitAnalysisView } from '@/components/views/HabitAnalysisView';

export const metadata: Metadata = { title: 'Habit Analysis' };

export default async function HabitAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HabitAnalysisView habitId={id} />;
}
