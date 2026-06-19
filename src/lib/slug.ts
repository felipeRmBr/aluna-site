/**
 * URL-safe slugify for product/coleccion names.
 * Lowercase, ASCII-only, hyphen-separated, no leading/trailing hyphens.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function isValidSlug(s: string): boolean {
  return s.length >= 2 && s.length <= 60 && SLUG_RE.test(s);
}
