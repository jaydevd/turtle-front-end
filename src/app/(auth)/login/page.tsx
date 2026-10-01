import type { Metadata } from 'next';
import { LoginView } from '@/components/views/AuthViews';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return <LoginView />;
}
