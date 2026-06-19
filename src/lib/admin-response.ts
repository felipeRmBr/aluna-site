/**
 * Helpers for admin API endpoints that support both HTML form submission
 * (303 redirect on success) and AJAX (`Accept: application/json` returns JSON).
 *
 * The admin islands fetch with `Accept: application/json` so the browser
 * never navigates; the legacy form submit path is kept for graceful
 * no-JS fallback and for the create flows.
 */

export function wantsJson(request: Request): boolean {
  return request.headers.get('accept')?.includes('application/json') ?? false;
}

export function json<T extends object>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function jsonError(message: string, status = 400): Response {
  return json({ ok: false, error: message }, status);
}
