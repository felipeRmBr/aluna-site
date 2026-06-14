import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'aluna_admin';
const MAX_AGE_DAYS = 30;
const MAX_AGE_S = MAX_AGE_DAYS * 24 * 60 * 60;

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function adminCookie(secret: string): { name: string; value: string; maxAge: number } {
  const issued = Date.now().toString(36);
  const sig = sign(`admin|${issued}`, secret);
  return {
    name: COOKIE_NAME,
    value: `admin|${issued}|${sig}`,
    maxAge: MAX_AGE_S,
  };
}

export function adminCookieName(): string {
  return COOKIE_NAME;
}

export function isAdmin(cookieValue: string | undefined, secret: string): boolean {
  if (!cookieValue) return false;
  const parts = cookieValue.split('|');
  if (parts.length !== 3) return false;
  const [role, issued, sig] = parts;
  if (role !== 'admin') return false;

  const expected = sign(`${role}|${issued}`, secret);
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;

  const issuedAt = parseInt(issued, 36);
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > MAX_AGE_S * 1000) return false;

  return true;
}

export function constantTimeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
