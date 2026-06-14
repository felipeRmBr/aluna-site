import type { APIRoute } from 'astro';
import { adminCookie, constantTimeCompare } from '../../../lib/auth';

export const prerender = false;

const attempts = new Map<string, { n: number; resetAt: number }>();
const MAX = 5;
const WINDOW_MS = 15 * 60 * 1000;

function ipOf(req: Request): string {
  return (
    req.headers.get('x-nf-client-connection-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown'
  );
}

function checkRate(ip: string): boolean {
  const now = Date.now();
  const cur = attempts.get(ip);
  if (!cur || cur.resetAt < now) {
    attempts.set(ip, { n: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  cur.n += 1;
  return cur.n <= MAX;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const adminPassword = import.meta.env.ADMIN_PASSWORD;
  const secret = import.meta.env.ADMIN_COOKIE_SECRET;

  if (!adminPassword || !secret) {
    return new Response('Server misconfigured', { status: 500 });
  }

  const ip = ipOf(request);
  if (!checkRate(ip)) {
    return redirect('/admin?error=rate');
  }

  const form = await request.formData();
  const password = String(form.get('password') ?? '');

  if (!constantTimeCompare(password, adminPassword)) {
    return redirect('/admin?error=bad');
  }

  const c = adminCookie(secret);
  cookies.set(c.name, c.value, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: c.maxAge,
  });

  return redirect('/admin/pedidos');
};
