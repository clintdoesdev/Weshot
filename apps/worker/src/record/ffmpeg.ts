import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import type { Writable } from 'node:stream';
import { LIMITS, type Rect, type VideoFormat } from '@weshot/shared';

export function ffmpegPath(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const p = createRequire(import.meta.url)('ffmpeg-static') as string | null;
    if (p) return p;
  } catch {
    /* fall through to PATH */
  }
  return 'ffmpeg';
}

export type ComposeOptions = {
  fps: number;
  width: number;
  height: number;
  /** Where the page goes, in video px. May extend past the edges when the window bleeds. */
  content: Rect;
  format: VideoFormat;
  templatePath: string;
  outPath: string;
};

/**
 * FFmpeg arguments for product spec §4.7 step 3: page frames (MJPEG on stdin) are scaled into the content rect,
 * laid under the template (whose transparent content hole has the rounded corners) and encoded.
 */
export function composeArgs(o: ComposeOptions): string[] {
  const cx = Math.round(o.content.x);
  const cy = Math.round(o.content.y);
  const cw = Math.max(2, Math.round(o.content.width));
  const ch = Math.max(2, Math.round(o.content.height));
  // Visible part of the content rect.
  const ix = Math.max(0, cx);
  const iy = Math.max(0, cy);
  const iw = Math.max(2, Math.min(o.width, cx + cw) - ix);
  const ih = Math.max(2, Math.min(o.height, cy + ch) - iy);

  // The template is opaque everywhere except its content hole (rounded bottom corners), so laying the page
  // underneath it applies the rounded-corner alpha mask. A single template frame is repeated by overlay.
  const graph = [
    `[0:v]scale=${cw}:${ch}:flags=lanczos,crop=${iw}:${ih}:${ix - cx}:${iy - cy}[pg]`,
    `color=c=black:s=${o.width}x${o.height}:r=${o.fps}[base]`,
    `[base][pg]overlay=${ix}:${iy}:shortest=1[b1]`,
    `[b1][1:v]overlay=0:0:eof_action=repeat`,
  ].join(';');

  const head = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(o.fps), '-c:v', 'mjpeg', '-i', 'pipe:0'];
  const tpl = ['-i', o.templatePath];

  if (o.format === 'gif') {
    const gif = `${graph},fps=${LIMITS.gifFps},scale=${LIMITS.gifWidth}:-2:flags=lanczos,split[ga][gb];[ga]palettegen=stats_mode=diff[pal];[gb][pal]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;
    return [...head, ...tpl, '-filter_complex', gif, '-loop', '0', o.outPath];
  }
  const out = `${graph},format=yuv420p[out]`;
  const codec =
    o.format === 'mp4'
      ? ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'veryfast', '-movflags', '+faststart']
      : ['-c:v', 'libvpx-vp9', '-crf', '32', '-b:v', '0', '-pix_fmt', 'yuv420p', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '5'];
  return [...head, ...tpl, '-filter_complex', out, '-map', '[out]', '-r', String(o.fps), ...codec, '-an', o.outPath];
}

export type Encoder = { stdin: Writable; done: Promise<void>; kill: () => void };

export function startEncoder(args: string[]): Encoder {
  const proc = spawn(ffmpegPath(), args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', (d: Buffer) => {
    stderr = (stderr + d.toString()).slice(-4000);
  });
  const done = new Promise<void>((resolve, reject) => {
    proc.on('error', reject);
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr}`))));
  });
  proc.stdin.on('error', () => undefined);
  return { stdin: proc.stdin, done, kill: () => proc.kill('SIGKILL') };
}

/** Write a chunk, waiting for drain so a slow encoder applies back-pressure. */
export function writeFrame(stdin: Writable, buf: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    if (stdin.write(buf)) return resolve();
    const onDrain = () => {
      stdin.off('error', onErr);
      resolve();
    };
    const onErr = (e: Error) => {
      stdin.off('drain', onDrain);
      reject(e);
    };
    stdin.once('drain', onDrain);
    stdin.once('error', onErr);
  });
}
