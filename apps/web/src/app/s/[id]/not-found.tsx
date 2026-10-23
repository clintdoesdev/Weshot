import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export default function ShareNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[620px] flex-col items-center justify-center gap-5 px-4 text-center">
      <Logo />
      <h1 className="text-h2-m font-semibold md:text-h2">This link has expired</h1>
      <p className="text-[17px] text-ws-text-2">Share links last 30 days, or until the person who made them deletes them.</p>
      <Link href="/" className="btn-primary inline-flex h-12 items-center rounded-pill px-6 text-[16px]">
        Frame your own
      </Link>
    </main>
  );
}
