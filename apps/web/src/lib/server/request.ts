import { errorMessage, type ErrorCode } from '@weshot/shared';
import { NextResponse } from 'next/server';
import { hashIp } from './ratelimit';

/** Client IP as seen by Vercel (first x-forwarded-for hop). Only its salted hash is ever used. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? '0.0.0.0';
}

export function ipHashOf(req: Request): string {
  return hashIp(clientIp(req), process.env.IP_HASH_SALT || 'weshot');
}

export function apiError(code: ErrorCode | 'BAD_REQUEST' | 'INTERNAL', status: number, extra: { minutes?: number; status?: number } = {}) {
  const message =
    code === 'BAD_REQUEST' ? 'Something in that request was not valid.' : code === 'INTERNAL' ? 'Something went wrong. Try again.' : errorMessage(code, extra);
  return NextResponse.json({ code, message, ...extra }, { status, headers: { 'cache-control': 'no-store' } });
}

/** e2e tests run the web app against canned captures instead of a real browser. */
export function isMockCapture(): boolean {
  return process.env.E2E_MOCK_CAPTURE === '1';
}
