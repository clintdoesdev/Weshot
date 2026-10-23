'use client';

import type { PostHog } from 'posthog-js';

/**
 * Anonymous, cookieless product analytics (product spec §4.2, §11). PostHog runs with memory-only persistence,
 * no autocapture and no session recording; nothing identifies a person. Loaded lazily when the browser is idle.
 */
type Props = Record<string, string | number | boolean | null>;

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
const queue: Array<[string, Props | undefined]> = [];

function load(): Promise<PostHog | null> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === 'undefined') return Promise.resolve(null);
  loading ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      persistence: 'memory',
      disable_persistence: true,
      disable_session_recording: true,
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: false,
      ip: false,
      person_profiles: 'never',
      advanced_disable_decide: true,
    });
    client = posthog;
    for (const [e, p] of queue.splice(0)) posthog.capture(e, p);
    return posthog;
  });
  return loading;
}

export function startAnalytics(): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || typeof window === 'undefined') return;
  const go = () => void load();
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 5000 });
  else setTimeout(go, 3000);
}

export function track(event: string, props?: Props): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  if (client) client.capture(event, props);
  else {
    queue.push([event, props]);
    void load();
  }
}
