export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The one orchestrated moment (UI spec §1.6): scroll to the editor in 400 ms, ease-out. */
export function scrollToEditor(): void {
  const el = document.getElementById('editor');
  if (!el) return;
  const target = el.getBoundingClientRect().top + window.scrollY - 8;
  if (prefersReducedMotion()) {
    window.scrollTo(0, target);
    return;
  }
  const start = window.scrollY;
  const t0 = performance.now();
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / 400);
    window.scrollTo(0, start + (target - start) * ease(t));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
}
