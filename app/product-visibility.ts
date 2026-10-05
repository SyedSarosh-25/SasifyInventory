type Listing = {
  name?: string | null;
  slug?: string | null;
  category?: string | null;
  description?: string | null;
};

// Exact internal fixtures only: do not hide real testing/security products or
// confuse an unavailable historical offer with an internal test listing.
export function isInternalTestListing(product: Listing) {
  return /^(?:api[\s-]+)?test[\s-]+product$/i.test(String(product.name || '').trim())
    || /^(?:api-)?test-product(?:-[a-z0-9]+)?$/i.test(String(product.slug || ''));
}

export function isApiProduct(product?: Listing | null): boolean {
  if (!product) return false;
  const name = String(product.name || '').toLowerCase();
  const slug = String(product.slug || '').toLowerCase();
  const desc = String(product.description || '').toLowerCase();
  const cat = String(product.category || '').toLowerCase();

  if (/\b(?:api|zapi)\b/i.test(name) || /\b(?:api|zapi)\b/i.test(slug)) return true;
  if (/\btoken(?:s)?\b/i.test(name) || /\btoken(?:s)?\b/i.test(slug)) return true;
  if (/codex/i.test(name) && /credit/i.test(name)) return true;
  if (cat.includes('api & credit') && /\b(?:api|token|tokens|credits?)\b/i.test(name)) return true;
  if (desc.startsWith('api ') || desc.includes('api cursor') || desc.includes('api key') || desc.includes('api credit')) return true;
  return false;
}
