import type { APIRoute } from 'astro';
import { adminCookieName } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete(adminCookieName(), { path: '/' });
  return redirect('/admin');
};
