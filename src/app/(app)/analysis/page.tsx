import type { Metadata } from 'next';
import { InsightsView } from '@/components/views/InsightsView';

export const metadata: Metadata = { title: 'Analysis' };

export default function AnalysisPage() {
  return <InsightsView />;
}
