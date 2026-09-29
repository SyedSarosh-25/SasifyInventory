export function catalogResponse(payload, { view = '', productId = '' } = {}) {
  const products = productId
    ? payload.products.filter(product => product.id === productId || product.canonical_key === productId)
    : payload.products;
  return {
    ...payload,
    productCount: payload.products.length,
    products: view === 'summary' ? products.map(({ delivery_instruction: _instructions, description, ...product }) => ({
      ...product,
      description: String(description || '').split(/\n+/).map(line => line.trim()).find(Boolean)?.slice(0, 180) || '',
    })) : products,
  };
}
