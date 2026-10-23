import { Geist_Mono, Outfit } from 'next/font/google';
import { givonic } from '@/fonts/givonic/generated';

export const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-outfit',
  display: 'swap',
});

/** Numeric values only (UI spec §1.4). */
export const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const fontVariables = [givonic?.variable, outfit.variable, geistMono.variable].filter(Boolean).join(' ');
