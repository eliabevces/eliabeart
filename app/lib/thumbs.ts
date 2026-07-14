// Pre-generated WebP rendition widths, stored in S3 under {album}/_thumbs/.
// Shared between server (generation/serving) and the client-side next/image
// loader, so this module must stay free of server-only imports (sharp, S3).
export const THUMB_WIDTHS = [480, 1080, 2048] as const;

export type ThumbWidth = (typeof THUMB_WIDTHS)[number];

export function isThumbWidth(width: number): width is ThumbWidth {
  return (THUMB_WIDTHS as readonly number[]).includes(width);
}

/**
 * Smallest rendition that still covers the requested display width;
 * falls back to the largest rendition for anything bigger.
 */
export function nearestThumbWidth(width: number): ThumbWidth {
  for (const w of THUMB_WIDTHS) {
    if (w >= width) return w;
  }
  return THUMB_WIDTHS[THUMB_WIDTHS.length - 1];
}
