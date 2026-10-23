'use client';

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

let script: Promise<TurnstileApi> | null = null;

function loadScript(): Promise<TurnstileApi> {
  if (!script) {
    script = new Promise((resolve, reject) => {
      const w = window as unknown as { turnstile?: TurnstileApi };
      if (w.turnstile) return resolve(w.turnstile);
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => (w.turnstile ? resolve(w.turnstile) : reject(new Error('turnstile')));
      s.onerror = () => {
        script = null;
        reject(new Error('turnstile'));
      };
      document.head.appendChild(s);
    });
  }
  return script;
}

/**
 * A fresh single-use Turnstile token (product spec §5). Invisible: the widget only shows itself if
 * Cloudflare needs the visitor to interact. Loaded lazily on the first capture so the landing page stays light.
 */
export async function getTurnstileToken(): Promise<string> {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!sitekey || process.env.NEXT_PUBLIC_E2E === '1') return 'dev';
  const api = await loadScript();
  return new Promise((resolve, reject) => {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:90';
    document.body.appendChild(host);
    let id = '';
    const done = () => {
      try {
        api.remove(id);
      } catch {
        /* already removed */
      }
      host.remove();
    };
    id = api.render(host, {
      sitekey,
      appearance: 'interaction-only',
      callback: (token: string) => {
        done();
        resolve(token);
      },
      'error-callback': () => {
        done();
        reject(new Error('turnstile'));
      },
      'timeout-callback': () => {
        done();
        reject(new Error('turnstile'));
      },
    });
  });
}
