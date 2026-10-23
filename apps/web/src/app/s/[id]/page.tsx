import { getStorage } from '@weshot/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { Glow } from '@/components/ui/Glow';
import { Logo } from '@/components/ui/Logo';
import { shares } from '@/lib/server/shares';
import { ShareOwnerActions } from './ShareOwnerActions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const site = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://weshot.app').replace(/\/$/, '');

const load = cache(async (id: string) => {
  if (!/^[0-9A-Za-z]{10}$/.test(id)) return null;
  const share = await shares.find(id);
  if (!share || share.expiresAt < new Date()) return null;
  // Local dev storage gives a relative URL: keep it for the page, make it absolute for Open Graph.
  const src = getStorage().publicUrl(share.assetKey);
  const assetUrl = src.startsWith('/') ? `${site()}${src}` : src;
  const ext = /\.(\w+)$/.exec(share.assetKey)?.[1] ?? '';
  return { ...share, src, assetUrl, ext };
});

const VIDEO_TYPES: Record<string, string> = { mp4: 'video/mp4', webm: 'video/webm' };

/** Share pages carry Open Graph tags for X, WhatsApp and Slack previews, and are never indexed (product spec §2.1, §7). */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const share = await load((await params).id);
  if (!share) return { title: 'WeShot', robots: { index: false, follow: false } };
  const url = `${site()}/s/${share.id}`;
  const title = 'Made with WeShot';
  const description = 'A website framed in a macOS window with WeShot.';
  const isVideo = share.kind === 'video' && VIDEO_TYPES[share.ext];
  const image = share.kind === 'image' || share.ext === 'gif' ? { url: share.assetUrl, width: share.width, height: share.height } : { url: `${site()}/images/og.png`, width: 1200, height: 630 };
  return {
    title,
    description,
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'WeShot',
      type: isVideo ? 'video.other' : 'website',
      images: [image],
      ...(isVideo ? { videos: [{ url: share.assetUrl, secureUrl: share.assetUrl, type: VIDEO_TYPES[share.ext], width: share.width, height: share.height }] } : {}),
    },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  };
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const share = await load((await params).id);
  if (!share) notFound();
  const isVideo = share.kind === 'video' && share.ext !== 'gif';
  const expires = share.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Glow style={{ width: 1000, height: 700, left: '50%', top: 120, transform: 'translateX(-50%)' }} />
      <header className="relative z-10 mx-4 mt-4 md:mx-auto md:mt-5 md:max-w-nav">
        <nav aria-label="Main" className="glass-nav flex items-center justify-between rounded-pill py-2 pl-5 pr-2">
          <Link href="/" aria-label="WeShot home" className="rounded-[10px]">
            <Logo />
          </Link>
          <Link href="/" className="btn-primary inline-flex h-11 items-center rounded-pill px-5 text-[15px]">
            Frame your own
          </Link>
        </nav>
      </header>
      <main className="relative z-10 mx-auto flex max-w-container flex-col items-center px-4 py-10 md:px-8 md:py-16">
        <div className="glass-panel w-full max-w-[1100px] rounded-panel p-2.5">
          {isVideo ? (
            <video
              src={share.src}
              width={share.width}
              height={share.height}
              controls
              autoPlay
              muted
              loop
              playsInline
              className="h-auto w-full rounded-[20px]"
              aria-label="Shared scroll video made with WeShot"
            />
          ) : (
            // Share files live on the CDN with their own size; next/image optimisation is not needed here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={share.src} width={share.width} height={share.height} alt="Framed screenshot made with WeShot" className="h-auto w-full rounded-[20px]" />
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[14px] text-ws-text-3">
          <span>
            Expires <span className="font-mono text-[13px]">{expires}</span>
          </span>
          <a href={`mailto:abuse@weshot.app?subject=${encodeURIComponent(`Report share ${share.id}`)}`} className="inline-flex min-h-[44px] items-center underline decoration-white/30 underline-offset-4 hover:text-white">
            Report this page
          </a>
          <ShareOwnerActions id={share.id} />
        </div>
      </main>
    </div>
  );
}
