import { errorMessage, type ErrorCode } from '@weshot/shared';

/** A failure with a user-facing code from product spec §6. */
export class CaptureError extends Error {
  constructor(
    readonly code: ErrorCode | 'INTERNAL',
    readonly status?: number,
  ) {
    super(code === 'INTERNAL' ? 'Something went wrong. Try again.' : errorMessage(code, status !== undefined ? { status } : {}));
    this.name = 'CaptureError';
  }
}
