/**
 * Wrap a local image URL through the Netlify Image CDN so the platform
 * resizes / re-encodes / caches it at the edge. Pass through external
 * URLs unchanged.
 *
 * https://docs.netlify.com/image-cdn/overview/
 */

export type ImgOpts = {
  w?: number;
  h?: number;
  fit?: 'cover' | 'contain' | 'fill';
  q?: number;
  fm?: 'webp' | 'avif' | 'jpg' | 'png';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
};

export function img(url: string | null | undefined, opts: ImgOpts = {}): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;

  const params = new URLSearchParams();
  params.set('url', url);
  if (opts.w !== undefined) params.set('w', String(opts.w));
  if (opts.h !== undefined) params.set('h', String(opts.h));
  if (opts.fit) params.set('fit', opts.fit);
  if (opts.q !== undefined) params.set('q', String(opts.q));
  if (opts.fm) params.set('fm', opts.fm);
  if (opts.position) params.set('position', opts.position);
  return `/.netlify/images?${params.toString()}`;
}

/**
 * Comma-separated srcset for responsive images. `widths` are device
 * widths in CSS pixels; each entry pairs with the corresponding URL.
 */
export function imgSrcSet(
  url: string | null | undefined,
  widths: number[],
  opts: Omit<ImgOpts, 'w'> = {},
): string {
  if (!url) return '';
  return widths
    .map((w) => `${img(url, { ...opts, w })} ${w}w`)
    .join(', ');
}
