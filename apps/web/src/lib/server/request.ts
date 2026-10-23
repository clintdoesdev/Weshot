import { errorMessage, type ErrorCode } from '@weshot/shared';
import { hashIp } from '@weshot/server';
import { NextResponse } from 'next/server';

/** Client IP as seen by Vercel (first x-forwarded-for hop). Only its salted hash is ever stored. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? '0.0.0.0';
}

export function ipHashOf(req: Request): string {
  return hashIp(clientIp(req), process.env.IP_HASH_SALT || 'dev-salt');
}

export function apiError(code: ErrorCode | 'BAD_REQUEST' | 'NOT_FOUND' | 'INTERNAL', status: number, extra: { minutes?: number } = {}) {
  const message =
    code === 'BAD_REQUEST'
      ? 'Something in that request was not valid.'
      : code === 'NOT_FOUND'
        ? 'Not found.'
        : code === 'INTERNAL'
          ? 'Something went wrong. Try again.'
          : errorMessage(code, extra);
  return NextResponse.json({ code, message, ...extra }, { status, headers: { 'cache-control': 'no-store' } });
}

export function isMockWorker(): boolean {
  return process.env.E2E_MOCK_WORKER === '1';
}
