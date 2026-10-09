'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
export function SearchRetry() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button type="button" className="primary-button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? 'Trying again…' : 'Try again'}</button>;
}
