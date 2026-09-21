import { siteOrigin } from './site-config';

export const shareImageUrl = `${siteOrigin}/opengraph-image`;

export function shareImage(alt: string) {
  return [{
    url: shareImageUrl,
    width: 1200,
    height: 630,
    type: 'image/png',
    alt,
  }];
}

export function productShareImageUrl(routeId: string) {
  return `${siteOrigin}/products/${encodeURIComponent(routeId)}/opengraph-image`;
}

export function productShareImage(routeId: string, alt: string) {
  return [{
    url: productShareImageUrl(routeId),
    width: 1200,
    height: 630,
    type: 'image/png',
    alt,
  }];
}
