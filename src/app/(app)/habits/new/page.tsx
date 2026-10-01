import type { Metadata } from 'next';
import { NewHabitView } from '@/components/views/NewHabitView';

export const metadata: Metadata = { title: 'New habit' };

export default function NewHabitPage() {
  return <NewHabitView />;
}
