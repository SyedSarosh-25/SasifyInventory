'use client';

import { useState } from 'react';
import type { Product } from '../products';
import { initials, productLogo } from '../product-utils';

export function ProductLogo({ product, eager = false }: { product: Product; eager?: boolean }) {
  const src = productLogo(product);
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  return src && src !== failedLogo ? (
    <img src={src} alt={`${product.name} logo`} className="product-logo"
      data-dark-monochrome={/chatgpt|codex|capcut|cursor/i.test(product.name) ? 'true' : undefined}
      loading={eager ? 'eager' : 'lazy'} onError={() => setFailedLogo(src)} />
  ) : (
    <span className="product-monogram" aria-label={product.name}>{initials(product.name)}</span>
  );
}
