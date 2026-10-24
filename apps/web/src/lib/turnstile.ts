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
 * Optional Cloudflare Turnstile. Only used when TURNSTILE_SITE_KEY is set; otherwise returns undefined and the
 * server skips the check.
 */
export async function getTurnstileToken(): Promise<string | undefined> {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!sitekey || process.env.NEXT_PUBLIC_E2E === '1') return undefined;
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
