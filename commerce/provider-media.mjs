const imageKeys = [
  'logo_url', 'logoUrl', 'logo', 'image_url', 'imageUrl', 'image', 'icon_url', 'iconUrl', 'icon',
  'thumbnail_url', 'thumbnailUrl', 'thumbnail', 'product_image_url', 'productImageUrl',
  'product_image', 'productImage', 'brand_logo', 'brandLogo',
];

function candidate(value) {
  if (value && typeof value === 'object') value = value.url || value.src || value.href || '';
  if (typeof value !== 'string') return '';
  const url = value.trim();
  return /^https?:\/\//i.test(url) ? url.slice(0, 2000) : '';
}

export function providerLogo(product) {
  for (const key of imageKeys) {
    const direct = candidate(product?.[key]);
    if (direct) return direct;
  }
  for (const container of [product?.metadata, product?.meta, product?.attributes, product?.brand]) {
    if (!container || typeof container !== 'object') continue;
    for (const key of imageKeys) {
      const nested = candidate(container[key]);
      if (nested) return nested;
    }
  }
  for (const collection of [product?.images, product?.image_urls, product?.thumbnails]) {
    if (!Array.isArray(collection)) continue;
    for (const item of collection) {
      const url = candidate(item);
      if (url) return url;
    }
  }
  return '';
}
