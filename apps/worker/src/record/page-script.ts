/**
 * Injected into the recorded page: a cursor overlay (arrow + ripple ring) and a per-frame setter.
 * Kept as a string so it runs in the page, not in Node.
 */
export const RECORDER_SETUP = `(() => {
  if (window.__wsFrame) return;
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
  root.innerHTML = '<div id="__ws_ripple" style="position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:2px solid rgba(255,214,10,0.95);background:rgba(255,214,10,0.18);opacity:0"></div>' +
    '<svg id="__ws_cursor" width="26" height="26" viewBox="0 0 26 26" style="position:absolute;margin:-2px 0 0 -3px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35))"><path d="M4 2 L4 21 L9 16.5 L12.5 24 L16 22.5 L12.6 15.2 L19.5 15.2 Z" fill="#000" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const attach = () => document.documentElement.appendChild(root);
  attach();
  document.documentElement.style.scrollBehavior = 'auto';
  const cursor = root.querySelector('#__ws_cursor');
  const ripple = root.querySelector('#__ws_ripple');
  window.__wsFrame = (y, cx, cy, r, showCursor) => {
    if (!root.isConnected) attach();
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    cursor.style.display = showCursor ? 'block' : 'none';
    ripple.style.display = showCursor ? 'block' : 'none';
    const px = cx * window.innerWidth, py = cy * window.innerHeight;
    cursor.style.left = px + 'px'; cursor.style.top = py + 'px';
    ripple.style.left = px + 'px'; ripple.style.top = py + 'px';
    if (r === null) { ripple.style.opacity = '0'; }
    else { ripple.style.opacity = String(1 - r); ripple.style.transform = 'scale(' + (0.4 + r * 1.2) + ')'; }
    return new Promise((res) => requestAnimationFrame(() => res(true)));
  };
})()`;

/** Offsets for heading pauses and tour stops, measured once before recording. */
export const MEASURE_SCRIPT = `((selectors) => {
  const top = (el) => el.getBoundingClientRect().top + window.scrollY - Math.round(window.innerHeight * 0.12);
  const headings = Array.from(document.querySelectorAll('h1, h2, h3')).filter((el) => el.getBoundingClientRect().height > 0).map(top);
  let stops = [];
  if (selectors && selectors.length) {
    for (const s of selectors) { try { const el = document.querySelector(s); if (el) stops.push(top(el)); } catch (e) {} }
  } else {
    stops = Array.from(document.querySelectorAll('section, main > div, h2')).filter((el) => el.getBoundingClientRect().height > 120 || el.tagName === 'H2').map(top);
  }
  const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
  return { headings, stops, scrollHeight, viewportHeight: window.innerHeight };
})`;
