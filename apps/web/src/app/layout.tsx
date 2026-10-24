import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { fontVariables } from './fonts';
import './globals.css';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://weshot.app';
const description =
  'Paste a link or an image. WeShot wraps it in a macOS window on the background you pick, ready to download as an image.';

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: 'WeShot: your website, beautifully framed',
  description,
  openGraph: {
    title: 'WeShot',
    description,
    url: site,
    siteName: 'WeShot',
    images: [{ url: '/images/og.png', width: 1200, height: 630, alt: 'A website framed in a macOS window on a yellow background' }],
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'WeShot', description, images: ['/images/og.png'] },
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
