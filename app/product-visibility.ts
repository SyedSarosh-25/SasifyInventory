type Listing = { name?: string | null; slug?: string | null };

// Exact internal fixtures only: do not hide real testing/security products or
// confuse an unavailable historical offer with an internal test listing.
export function isInternalTestListing(product: Listing) {
  return /^(?:api[\s-]+)?test[\s-]+product$/i.test(String(product.name || '').trim())
    || /^(?:api-)?test-product(?:-[a-z0-9]+)?$/i.test(String(product.slug || ''));
}
