import { USD_TO_PKR } from './currency-utils.ts';

export type SupplierPriceProduct = {
  name: string;
  description?: string;
};

export type SupplierPriceComparison = {
  unitAmountPkr: number;
  period: 'month' | 'year' | 'package';
  quantity: number;
  totalPkr: number;
  sourceLabel: string;
  sourceUrl: string;
  note: string;
};

type OfficialReference = {
  amount: number;
  currency: 'USD' | 'PKR';
  period: 'month' | 'year' | 'package';
  sourceLabel: string;
  sourceUrl: string;
  note: string;
  matches: (text: string) => boolean;
};

const officialReferences: OfficialReference[] = [
  {
    amount: 19.99,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'Google AI Pro official reference',
    sourceUrl: 'https://one.google.com/about/plans',
    note: 'US list price converted using the website exchange rate; regional prices, taxes and promotions may differ.',
    matches: (text) =>
      /\bgemini(?:\s+ai)?\s+pro\b|\bgemini\s+\d+\s+months?\b/i.test(text),
  },
  {
    amount: 25,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'ChatGPT Business Standard official reference',
    sourceUrl: 'https://openai.com/business/pricing/',
    note: 'Monthly Standard-seat list price; this is a comparison reference and the marketplace access arrangement may differ.',
    matches: (text) => /chatgpt\s+business\b/i.test(text),
  },
  {
    amount: 25,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'Claude Team Standard official reference',
    sourceUrl:
      'https://support.claude.com/en/articles/9266767-what-is-the-team-plan',
    note: 'US monthly Standard-seat list price; regional pricing, taxes and the two-seat minimum may differ.',
    matches: (text) => /claude\s+team\s+(?:plan\s+)?standard\b/i.test(text),
  },
  {
    amount: 125,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'Claude Team Premium official reference',
    sourceUrl:
      'https://support.claude.com/en/articles/9266767-what-is-the-team-plan',
    note: 'US monthly Premium-seat list price; regional pricing, taxes and the two-seat minimum may differ.',
    matches: (text) => /claude\s+team\s+(?:plan\s+)?premium\b/i.test(text),
  },
  {
    amount: 69.99,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'Adobe Creative Cloud Pro official reference',
    sourceUrl: 'https://www.adobe.com/creativecloud/pricing.html',
    note: 'Regular individual Creative Cloud Pro list price; introductory offers, taxes and account arrangements may differ.',
    matches: (text) =>
      /adobe\b/i.test(text) &&
      /(?:all\s+apps|creative\s+cloud|2\s+devices)/i.test(text) &&
      !/express\b/i.test(text),
  },
  {
    amount: 180,
    currency: 'USD',
    period: 'year',
    sourceLabel: 'Canva Pro official reference',
    sourceUrl: 'https://www.canva.com/pricing/',
    note: 'Official individual Canva Pro annual list price; education, panel, invite and shared arrangements are not treated as the same plan.',
    matches: (text) =>
      /canva\s+pro\b|slot\s+canva\s+pro|link\s+to\s+join\s+canva\s+pro/i.test(
        text,
      ) && !/(?:edu|education|panel|admin|invite)/i.test(text),
  },
  {
    amount: 20,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'Cursor Pro official reference',
    sourceUrl: 'https://cursor.com/pricing',
    note: 'Official individual Cursor Pro monthly list price; API-credit packages and supplier access arrangements may differ.',
    matches: (text) =>
      /cursor\s+pro\b/i.test(text) && !/(?:api|credit|credits)/i.test(text),
  },
  {
    amount: 379,
    currency: 'PKR',
    period: 'month',
    sourceLabel: 'Spotify Premium Pakistan official reference',
    sourceUrl: 'https://www.spotify.com/pk-en/premium/',
    note: 'Official Pakistan Individual plan reference; trials, prepaid offers and account arrangements may differ.',
    matches: (text) =>
      /spotify\s+premium\b/i.test(text) && !/student|duo|family/i.test(text),
  },
];

function durationMonths(product: SupplierPriceProduct) {
  const text = `${product.name} ${product.description || ''}`;
  const monthMatch =
    text.match(/\b(\d+(?:\.\d+)?)\s*(?:months?|mos?)\b/i) ||
    text.match(/\b(\d+)\s*m\b(?!\s*(?:credit|credits))/i);
  if (monthMatch) {
    const months = Number(monthMatch[1]);
    return months > 0 ? months : null;
  }
  const yearMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(?:years?|yrs?|y)\b/i);
  if (yearMatch) {
    const years = Number(yearMatch[1]);
    return years > 0 ? years * 12 : null;
  }
  if (/\b(?:30\s*days?|30d)\b/i.test(text)) return 1;
  return null;
}

function isMicrosoftOfficeProfessionalPlus(product: SupplierPriceProduct) {
  return /microsoft\s+office\s+2024\s+pro(?:fessional)?\s+key/i.test(
    product.name,
  );
}

export function supplierOriginalPriceComparison(
  product: SupplierPriceProduct,
): SupplierPriceComparison | null {
  // Microsoft Office Professional Plus 2024 is a commercial/volume-licensing
  // edition, not a consumer monthly subscription. Microsoft does not publish
  // a comparable public retail price for this exact listing, so do not turn a
  // third-party “10 years warranty” phrase into a fabricated ten-year value.
  if (isMicrosoftOfficeProfessionalPlus(product)) return null;

  // Match the product title, not arbitrary supplier copy. Descriptions can
  // mention unrelated tools and must not change the official benchmark.
  const reference = officialReferences.find((item) => item.matches(product.name));
  if (!reference) return null;

  const months = durationMonths(product);
  if (reference.period !== 'package' && months === null) return null;
  const unitAmountPkr =
    reference.currency === 'USD'
      ? reference.amount * USD_TO_PKR
      : reference.amount;
  const quantity =
    reference.period === 'month'
      ? months!
      : reference.period === 'year'
        ? months! / 12
        : 1;
  return {
    unitAmountPkr,
    period: reference.period,
    quantity,
    totalPkr: Math.round(unitAmountPkr * quantity * 100) / 100,
    sourceLabel: reference.sourceLabel,
    sourceUrl: reference.sourceUrl,
    note: reference.note,
  };
}

export function supplierSavingsPkr(
  product: SupplierPriceProduct & { price: number },
) {
  const comparison = supplierOriginalPriceComparison(product);
  return comparison === null
    ? null
    : Math.round((comparison.totalPkr - product.price) * 100) / 100;
}
