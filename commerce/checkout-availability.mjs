// Supplier failures are unknown, never proof of zero stock. Never purchase here.
export async function checkSupplierPlan(offers, providers, timeoutMs = 8000) {
  const catalogs = new Map();
  const results = await Promise.all(offers.map(async (offer) => {
    if (offer.provider_id === 'manual') return { offer, available: Number(offer.supplier_stock || 0), verified: true };
    const provider = providers.find((p) => p.id === offer.provider_id && p.configured && p.id !== 'elitetools');
    if (!provider) return { offer, verified: false };
    if (!catalogs.has(provider.id)) {
      catalogs.set(provider.id, (async () => {
        let timer;
        try {
          const data = await Promise.race([provider.catalog(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Supplier availability timed out')), timeoutMs); })]);
          if (!Array.isArray(data?.products)) throw new Error('Invalid supplier catalog');
          return data.products;
        } finally { clearTimeout(timer); }
      })());
    }
    try {
      const products = await catalogs.get(provider.id);
      const product = products.find((p) => String(p.id) === String(offer.external_product_id));
      if (!product) return { offer, available: 0, verified: true };
      const available = Number(product.stock);
      if (!Number.isSafeInteger(available) || available < 0) return { offer, verified: false };
      return { offer, available, verified: true };
    } catch { return { offer, verified: false }; }
  }));
  const available = results.find((r) => r.verified && r.available > 0);
  if (available) return { status: 'available', available: available.available, offer: available.offer };
  return { status: results.length && results.every((r) => r.verified) ? 'unavailable' : 'unknown', available: null };
}
