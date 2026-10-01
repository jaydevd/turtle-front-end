import type { Metadata } from 'next';
import { SignUpView } from '@/components/views/AuthViews';

export const metadata: Metadata = { title: 'Create account' };

export default function SignUpPage() {
  return <SignUpView />;
}
