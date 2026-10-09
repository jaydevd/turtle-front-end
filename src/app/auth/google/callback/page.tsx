import type { Metadata } from 'next';
import { GoogleCallbackView } from '@/components/views/GoogleCallbackView';

export const metadata: Metadata = { title: 'Signing in' };

export default function GoogleCallbackPage() {
  return <GoogleCallbackView />;
}