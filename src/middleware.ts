import { defineMiddleware } from 'astro:middleware';
import { isAdmin, adminCookieName } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const path = url.pathname;

  const requiresAdmin =
    path.startsWith('/admin/pedidos') ||
    (path.startsWith('/api/admin/') && !path.startsWith('/api/admin/login'));

  if (!requiresAdmin) return next();

  const secret = import.meta.env.ADMIN_COOKIE_SECRET;
  if (!secret) {
    return new Response('Server misconfigured: ADMIN_COOKIE_SECRET missing', { status: 500 });
  }

  const cookie = context.cookies.get(adminCookieName())?.value;
  if (!isAdmin(cookie, secret)) {
    if (path.startsWith('/api/')) {
      return new Response('Unauthorized', { status: 401 });
    }
    return context.redirect('/admin');
  }

  return next();
});
