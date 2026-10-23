/**
 * Renders the static images used on the landing page (gallery cards, recordings card, mobile demo card)
 * and the Open Graph image, with the same renderFrame as the editor.
 *
 *   pnpm --filter @weshot/web render:static
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GlobalFonts, createCanvas, type Canvas } from '@napi-rs/canvas';
import { drawDemoPage, renderFrame, roundRectPath, type Ctx2D, type FrameSource, type ScratchCanvas } from '@weshot/frame';
import { BUILT_IN_PRESETS, DEFAULT_FRAME, GALLERY_EXAMPLES, type FrameSettings } from '@weshot/shared';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../public/images');
mkdirSync(out, { recursive: true });
const fixtures = join(here, '../../../packages/frame/test/fixtures');
for (const w of [400, 500, 600]) GlobalFonts.registerFromPath(join(fixtures, `inter-latin-${w}-normal.woff2`), 'WeShotStatic');
const FONT = "'WeShotStatic'";
const URL = 'https://queuely.app/';

// @napi-rs/canvas implements the canvas API; its TS types are separate from the DOM ones.
const ctxOf = (c: Canvas) => c.getContext('2d') as unknown as Ctx2D;
const src = (c: Canvas) => c as unknown as FrameSource;
const scratch = (w: number, h: number) => createCanvas(w, h) as unknown as ScratchCanvas;

function demo(width = 1440, height = 900): Canvas {
  const c = createCanvas(width, height);
  drawDemoPage(ctxOf(c), width, height, FONT);
  return c;
}

/** A phone-sized version of the sample page. */
function demoPhone(): Canvas {
  const w = 390;
  const h = 844;
  const c = createCanvas(w, h);
  const ctx = ctxOf(c);
  ctx.fillStyle = '#FBFAF7';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  roundRectPath(ctx, { x: 20, y: 58, width: 26, height: 26 }, 7);
  ctx.fill();
  ctx.font = `650 19px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('Queuely', 56, 72);
  ctx.textAlign = 'center';
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText('Lines that move', w / 2, 200);
  ctx.fillText('themselves.', w / 2, 246);
  ctx.fillStyle = '#6B675E';
  ctx.font = `400 16px ${FONT}`;
  ctx.fillText('Books, reminds and seats your guests.', w / 2, 300);
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  roundRectPath(ctx, { x: 40, y: 340, width: w - 80, height: 52 }, 26);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `600 17px ${FONT}`;
  ctx.fillText('Get started', w / 2, 366);
  const tints = ['#FFE9A8', '#E7E3DA', '#DCE8E0'];
  tints.forEach((t, i) => {
    ctx.fillStyle = t;
    ctx.beginPath();
    roundRectPath(ctx, { x: 20, y: 430 + i * 136, width: w - 40, height: 120 }, 18);
    ctx.fill();
  });
  return c;
}

function frame(settings: FrameSettings, source: Canvas | null, width: number, height: number, scale: number): Canvas {
  const c = createCanvas(Math.round(width * scale), Math.round(height * scale));
  renderFrame(ctxOf(c), source ? src(source) : null, settings, { width, height, scale }, { url: URL, title: 'Queuely', fontFamily: FONT, createCanvas: scratch });
  return c;
}

function save(c: Canvas, name: string, format: 'webp' | 'png' = 'webp') {
  const buf = format === 'webp' ? c.toBuffer('image/webp', 86) : c.toBuffer('image/png');
  writeFileSync(join(out, name), buf);
  console.log(`${name}  ${c.width}×${c.height}  ${(buf.length / 1024).toFixed(0)} kB`);
}

// Gallery cards: image area is 210 px tall, ~300 px wide → render 640 × 420 at 1x (crisp at 2x DPR).
const cardSize = { width: 640, height: 420 };
for (const ex of GALLERY_EXAMPLES) {
  const settings: FrameSettings = {
    ...ex.frame,
    canvas: { width: 1600, height: 1050 },
    windowOffset: ex.frame.windowOffset,
  };
  // Render at the full canvas size and downscale, so the card looks exactly like loading the preset.
  const scale = cardSize.width / 1600;
  const c = frame(settings, demo(), 1600, 1050, scale);
  if (ex.showPhone) {
    const phone = createCanvas(390 + 60, 844 + 60);
    renderFrame(
      ctxOf(phone),
      src(demoPhone()),
      { ...DEFAULT_FRAME, window: { ...DEFAULT_FRAME.window, style: 'none', radius: 24 }, background: { kind: 'transparent' }, padding: 30, canvas: 'auto' },
      { width: 450, height: 904, scale: 1 },
      { fontFamily: FONT, createCanvas: scratch },
    );
    const ctx = c.getContext('2d');
    const ph = c.height * 0.78;
    const pw = (phone.width / phone.height) * ph;
    ctx.drawImage(phone, c.width - pw - c.width * 0.03, c.height - ph + c.height * 0.06, pw, ph);
  }
  save(c, `gallery-${ex.id}.webp`);
}

// Recordings card: the window alone on transparent, shown over a Honey card.
save(
  frame(
    { ...DEFAULT_FRAME, background: { kind: 'transparent' }, padding: 60, canvas: { width: 1100, height: 760 } },
    demo(),
    1100,
    760,
    1,
  ),
  'recording-window.webp',
);

// Mobile landing demo card: Honey stage 230 px tall at 390 wide.
save(frame({ ...BUILT_IN_PRESETS[0]!.frame, canvas: { width: 716, height: 460 }, padding: 34 }, demo(), 716, 460, 1), 'demo-mobile.webp');

// Open Graph image.
save(frame({ ...BUILT_IN_PRESETS[0]!.frame, canvas: 'og-image' }, demo(), 1200, 630, 1), 'og.png', 'png');
