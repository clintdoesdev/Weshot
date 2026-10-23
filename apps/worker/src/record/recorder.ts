import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LIMITS, MIME_TYPES, type CaptureSettings, type JobStatus, type RecordSettings, type Rect } from '@weshot/shared';
import { lazyLoadPass, loadPage } from '../capture';
import type { SessionDeps } from '../browser';
import { composeArgs, startEncoder, writeFrame } from './ffmpeg';
import { MEASURE_SCRIPT, RECORDER_SETUP } from './page-script';
import { buildTimeline, cursorAt } from './timeline';

export type RecordInput = {
  capture: CaptureSettings;
  record: RecordSettings;
  templatePng: Buffer;
  contentRect: Rect;
  output: { width: number; height: number };
};

export type RecordDeps = SessionDeps & {
  onStatus?: (s: JobStatus) => void | Promise<void>;
  onProgress?: (p: { progress: number; elapsedSec: number; totalSec: number }) => void | Promise<void>;
  shouldStop?: () => Promise<boolean>;
};

export type RecordResult = { file: Buffer; ext: 'mp4' | 'webm' | 'gif'; contentType: string; width: number; height: number; frames: number };

const withTimeout = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<undefined>((r) => setTimeout(r, ms))]);

/** Recording pipeline, product spec §4.7: scroll the page with easing, capture frames, composite with FFmpeg. */
export async function recordPage(input: RecordInput, deps: RecordDeps = {}): Promise<RecordResult> {
  const { record, contentRect, output } = input;
  // Capture just enough pixels for the content area (max 2x) so frames stay sharp but quick.
  const dsf = Math.min(2, Math.max(1, Math.ceil(contentRect.width / input.capture.viewport.width)));
  const capture: CaptureSettings = { ...input.capture, scale: dsf as 1 | 2, fullPage: false };
  const fps = record.format === 'gif' ? LIMITS.gifFps : record.fps;
  const lengthSec = Math.min(record.lengthSec, record.format === 'gif' ? LIMITS.maxGifSec : LIMITS.maxVideoSec);
  const totalFrames = Math.max(1, Math.round(lengthSec * fps));

  const session = await loadPage(capture, deps);
  const { page } = session;
  const dir = await mkdtemp(join(tmpdir(), 'weshot-rec-'));
  try {
    await withTimeout(lazyLoadPass(page), 15_000);
    const m = (await page.evaluate(`${MEASURE_SCRIPT}(${JSON.stringify(record.type === 'tour' ? (record.sections ?? []) : [])})`)) as {
      headings: number[];
      stops: number[];
      scrollHeight: number;
      viewportHeight: number;
    };
    const timeline = buildTimeline({
      type: record.type,
      lengthSec,
      easing: record.easing,
      pauseAtHeadings: record.pauseAtHeadings,
      maxScroll: Math.min(m.scrollHeight, LIMITS.maxFullPageHeight) - m.viewportHeight,
      headings: m.headings,
      stops: m.stops,
    });
    await page.evaluate(RECORDER_SETUP);

    const templatePath = join(dir, 'template.png');
    const outPath = join(dir, `out.${record.format}`);
    await writeFile(templatePath, input.templatePng);
    const encoder = startEncoder(
      composeArgs({ fps, width: output.width, height: output.height, content: contentRect, format: record.format, templatePath, outPath }),
    );

    await deps.onStatus?.('capturing');
    const cdp = await page.context().newCDPSession(page);
    let frames = 0;
    try {
      for (let i = 0; i < totalFrames; i++) {
        const t = i / fps;
        const c = cursorAt(t, timeline.rests);
        await page.evaluate(
          ([y, x, cy, r, show]) => (window as unknown as { __wsFrame: (...a: unknown[]) => Promise<boolean> }).__wsFrame(y, x, cy, r, show),
          [timeline.at(t), c.x, c.y, c.ripple, record.cursor] as const,
        );
        const shot = (await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, optimizeForSpeed: true })) as { data: string };
        await writeFrame(encoder.stdin, Buffer.from(shot.data, 'base64'));
        frames++;
        if (i % 6 === 0 || i === totalFrames - 1) {
          await deps.onProgress?.({ progress: (frames / totalFrames) * 0.9, elapsedSec: Math.round((frames / fps) * 10) / 10, totalSec: lengthSec });
        }
        if (i % 15 === 14 && (await deps.shouldStop?.())) break;
      }
    } catch (err) {
      encoder.kill();
      throw err;
    }
    encoder.stdin.end();
    await deps.onStatus?.('encoding');
    await encoder.done;
    const file = await readFile(outPath);
    const ext = record.format;
    const gifHeight = Math.round((output.height * LIMITS.gifWidth) / output.width / 2) * 2;
    return {
      file,
      ext,
      contentType: MIME_TYPES[ext],
      width: ext === 'gif' ? LIMITS.gifWidth : output.width,
      height: ext === 'gif' ? gifHeight : output.height,
      frames,
    };
  } finally {
    await session.close();
    await rm(dir, { recursive: true, force: true });
  }
}
