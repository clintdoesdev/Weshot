import { describe, expect, it } from 'vitest';
import { exportFilename } from './download';

describe('exportFilename', () => {
  it('slugs the host and adds the size', () => {
    expect(exportFilename('https://www.queuely.app/', 3200, 1800, 'png')).toBe('weshot-queuely-app-3200x1800.png');
    expect(exportFilename(null, 1200, 630, 'jpg')).toBe('weshot-screenshot-1200x630.jpg');
  });
});
