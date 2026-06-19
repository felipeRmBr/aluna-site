import type { APIRoute } from 'astro';
import { getBlob } from '../../../lib/blobs';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const raw = params.key;
  if (!raw) return new Response('Bad request', { status: 400 });

  const key = decodeURIComponent(raw);
  const result = await getBlob(key);
  if (!result) return new Response('Not found', { status: 404 });

  return new Response(result.body as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': result.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
