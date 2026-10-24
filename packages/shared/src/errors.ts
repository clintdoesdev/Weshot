/** User-facing error copy, product spec §6. */

export const ERROR_CODES = [
  'INVALID_URL',
  'BLOCKED_HOST',
  'TIMEOUT',
  'BOT_CHECK',
  'HTTP_4XX',
  'HTTP_5XX',
  'RATE_LIMIT',
  'IMAGE_TOO_LARGE',
  'BLOCKED_SITE',
  'BOT_PROTECTION',
  'CAPTURE_UNAVAILABLE',
  'PAGE_TOO_LARGE',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export type ErrorAction = 'focus-bar' | 'paste-screenshot' | 'retry';

export const ERROR_ACTIONS: Record<ErrorCode, ErrorAction[]> = {
  INVALID_URL: ['focus-bar'],
  BLOCKED_HOST: ['paste-screenshot'],
  TIMEOUT: ['retry', 'paste-screenshot'],
  BOT_CHECK: ['paste-screenshot'],
  HTTP_4XX: ['retry'],
  HTTP_5XX: ['retry'],
  RATE_LIMIT: [],
  IMAGE_TOO_LARGE: [],
  BLOCKED_SITE: ['paste-screenshot'],
  BOT_PROTECTION: ['retry'],
  CAPTURE_UNAVAILABLE: ['paste-screenshot'],
  PAGE_TOO_LARGE: ['paste-screenshot'],
};

export function errorMessage(code: string, params: { status?: number; minutes?: number } = {}): string {
  switch (code) {
    case 'INVALID_URL':
      return "That doesn't look like a web address.";
    case 'BLOCKED_HOST':
      return "WeShot can't open private or local addresses.";
    case 'TIMEOUT':
      return 'The page took longer than 30 seconds to load.';
    case 'BOT_CHECK':
      return 'This site blocks automated browsers.';
    case 'HTTP_4XX':
    case 'HTTP_5XX':
      return `The site returned an error (${params.status ?? (code === 'HTTP_4XX' ? 400 : 500)}).`;
    case 'RATE_LIMIT':
      return `You've made a lot of captures this hour. Try again in ${Math.max(1, params.minutes ?? 60)} min.`;
    case 'IMAGE_TOO_LARGE':
      return 'That image is over 25 MB.';
    // Not in product spec §6; see DECISIONS.md.
    case 'BLOCKED_SITE':
      return "WeShot can't open this site.";
    case 'PAGE_TOO_LARGE':
      return 'This page is too long to capture. Turn off Full page or paste a screenshot.';
    case 'CAPTURE_UNAVAILABLE':
      return "Link capture isn't available right now. Paste a screenshot instead.";
    case 'BOT_PROTECTION':
      return "WeShot couldn't confirm this request came from a person. Reload the page and try again.";
    default:
      return 'Something went wrong. Try again.';
  }
}

export function isErrorCode(code: string): code is ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(code);
}

export class WeShotError extends Error {
  constructor(
    public readonly code: ErrorCode | 'INTERNAL',
    message?: string,
    public readonly status?: number,
  ) {
    super(message ?? errorMessage(code, status !== undefined ? { status } : {}));
    this.name = 'WeShotError';
  }
}
