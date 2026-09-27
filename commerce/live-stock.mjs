// Prices and customer copy remain local; supplier availability is never reused
// from a saved snapshot when the provider cannot be reached.
export async function liveSupplierStock(offers, providers) {
  const needed = new Set(offers.map((offer) => offer.provider_id));
  const results = await Promise.all(providers.filter((provider) => provider.configured && needed.has(provider.id)).map(async (provider) => {
    try {
      const catalog = await provider.catalog();
      if (!Array.isArray(catalog.products)) throw new Error('Invalid catalog');
      return { providerId: provider.id, ok: true, products: catalog.products };
    } catch {
      return { providerId: provider.id, ok: false, products: [] };
    }
  }));
  const catalogs = new Map(results.map((result) => [result.providerId, result]));
  return {
    checkedAt: new Date().toISOString(),
    providers: results.map(({ providerId, ok }) => ({ providerId, ok })),
    offers: offers.map((offer) => {
      if (offer.provider_id === 'manual') return { ...offer, available: Number(offer.supplier_stock || 0), availabilitySource: 'local' };
      const catalog = catalogs.get(offer.provider_id);
      const product = catalog?.products.find((item) => String(item.id) === String(offer.external_product_id));
      const available = catalog?.ok ? Number(product?.stock ?? 0) : null;
      return { ...offer, available: Number.isSafeInteger(available) && available >= 0 ? available : null, availabilitySource: 'live', availabilityVerified: catalog?.ok === true };
    }),
  };
}

export function cheapestLiveOffers(offers) {
  const winners = new Map();
  for (const offer of offers) {
    if (!(offer.available > 0)) continue;
    if (!winners.has(offer.canonical_key)) winners.set(offer.canonical_key, offer);
  }
  return [...winners.values()];
}
