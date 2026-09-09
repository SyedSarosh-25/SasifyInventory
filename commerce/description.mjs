function text(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join('\n').trim();
  return '';
}

export function providerDescription(product) {
  const candidates = [
    product?.description_en,
    product?.description,
    product?.product_description,
    product?.long_description,
    product?.details,
    product?.content,
    product?.notes,
    product?.note,
    product?.info,
    product?.metadata?.description,
    product?.attributes?.description,
  ];
  return candidates.map(text).find(Boolean) || '';
}
