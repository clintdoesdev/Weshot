import type { FrameOutput, FrameResources } from '@weshot/frame';
import type { FrameSettings, ImageFormat } from '@weshot/shared';

export type RenderJob = {
  settings: FrameSettings;
  source: ImageBitmap | null;
  backgroundImage: ImageBitmap | null;
  output: FrameOutput;
  format: ImageFormat;
  quality?: number;
  resources: Omit<FrameResources, 'backgroundImage'>;
};

export type RenderRequest = RenderJob & { id: number };

export type RenderResponse =
  | { id: number; ok: true; blob: Blob; contentRect: { x: number; y: number; width: number; height: number }; contentRadius: number }
  | { id: number; ok: false; error: string };
