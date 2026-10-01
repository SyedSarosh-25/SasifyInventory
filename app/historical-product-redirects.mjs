// p016 was Gemini AI Pro, 18 Months (removed from the local catalogue on
// September 10). Map only to that same package, never to the homepage or a
// different-duration plan. Keep this shared by both deployment formats.
export const historicalProductRedirects = [
  ['p016', 'gemini-ai-pro-18-month'],
];

export function verifiedHistoricalProductRedirects(currentProducts) {
  for (const [, to] of historicalProductRedirects) {
    const product = currentProducts.find((item) => item.slug === to);
    if (!product || !/^gemini ai pro 18\s*(?:month|m)s?$/i.test(product.name)) {
      throw new Error(`Historical product redirect needs review: ${to}`);
    }
  }
  return historicalProductRedirects;
}
