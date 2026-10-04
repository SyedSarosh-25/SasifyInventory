import { USD_TO_PKR } from './currency-utils.ts';

export type SupplierPriceProduct = {
  name: string;
  description?: string;
  original_price_pkr?: number | null;
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
    amount: 9.99,
    currency: 'USD',
    period: 'month',
    amount: 5000,
    currency: 'PKR',
    period: 'month',
    sourceLabel: 'Apple iCloud+ 2TB official comparison reference',
    sourceUrl: 'https://support.apple.com/en-us/HT201238',
    note: 'Official monthly iCloud+ 2TB list price converted using the website exchange rate; family sharing and regional arrangements may differ.',
    matches: (text) => /icloud.*(?:2tb|2\s*tb)/i.test(text),
  },
  {
    amount: 12.99,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'CapCut Pro official monthly reference',
    sourceUrl: 'https://www.capcut.com/',
    note: 'Official monthly CapCut Pro list price converted using the website exchange rate.',
    matches: (text) => /capcut\s+pro\b/i.test(text),
  },
  {
    amount: 20,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'OpenAI ChatGPT Plus official monthly reference',
    sourceUrl: 'https://openai.com/chatgpt/pricing/',
    note: 'Official monthly ChatGPT Plus list price converted using the website exchange rate.',
    matches: (text) => /chatgpt\s+plus\b/i.test(text),
  },
  {
    amount: 39599,
    currency: 'PKR',
    period: 'package',
    sourceLabel: 'Microsoft Office Home 2024 Pakistan official retail reference',
    sourceUrl: 'https://www.microsoft.com/en-pk/microsoft-365/p/office-home-2024/cfq7ttc0pqvj',
    note: 'Closest public Pakistan retail reference for a one-time Office 2024 purchase; a Professional Plus key from a supplier is not the same licence edition.',
    matches: (text) => /microsoft\s+office\s+2024\s+pro(?:fessional)?\s+key/i.test(text),
  },
  {
    amount: 55999,
    currency: 'PKR',
    period: 'year',
    sourceLabel: 'Microsoft 365 Premium Pakistan official annual reference',
    sourceUrl: 'https://www.microsoft.com/en-pk/microsoft-365/p/microsoft-365-premium/cfq7ttc11z3q',
    note: 'Official Pakistan annual price for Microsoft 365 Premium; slot, invite and supplier access arrangements may differ.',
    matches: (text) =>
      /(?:microsoft\s+)?(?:office\s+)?365\s+premium/i.test(text) &&
      /(?:12[-\s]*months?|1[-\s]*(?:year|yr|y)|annual)/i.test(text),
  },
  {
    amount: 5599,
    currency: 'PKR',
    period: 'month',
    sourceLabel: 'Microsoft 365 Premium Pakistan official monthly reference',
    sourceUrl: 'https://www.microsoft.com/en-pk/microsoft-365/p/microsoft-365-premium/cfq7ttc11z3q',
    note: 'Official Pakistan monthly price for Microsoft 365 Premium; slot, invite and supplier access arrangements may differ.',
    matches: (text) => /(?:microsoft\s+)?(?:office\s+)?365\s+premium/i.test(text),
  },
  {
    amount: 22999,
    currency: 'PKR',
    period: 'year',
    sourceLabel: 'Microsoft 365 Personal Pakistan official annual reference',
    sourceUrl: 'https://www.microsoft.com/en-pk/microsoft-365/p/microsoft-365-personal/cfq7ttc0k5bf',
    note: 'Official Pakistan annual price for Microsoft 365 Personal; slot, invite and supplier access arrangements may differ.',
    matches: (text) =>
      /(?:microsoft\s+)?(?:office\s+)?365\s+personal/i.test(text) &&
      /(?:12[-\s]*months?|1[-\s]*(?:year|yr|y)|annual)/i.test(text),
  },
  {
    amount: 2299,
    currency: 'PKR',
    period: 'month',
    sourceLabel: 'Microsoft 365 Personal Pakistan official monthly reference',
    sourceUrl: 'https://www.microsoft.com/en-pk/microsoft-365/p/microsoft-365-personal/cfq7ttc0k5bf',
    note: 'Official Pakistan monthly price for Microsoft 365 Personal; slot, invite and supplier access arrangements may differ.',
    matches: (text) => /(?:microsoft\s+)?(?:office\s+)?365\s+personal/i.test(text),
  },
  {
    amount: 200,
    currency: 'USD',
    period: 'year',
    sourceLabel: 'Perplexity Pro official annual reference',
    sourceUrl: 'https://www.perplexity.ai/hub',
    note: 'Official annual Pro list price converted using the website exchange rate; regional taxes and activation arrangements may differ.',
    matches: (text) =>
      /perplexity\s+pro/i.test(text) && /(?:12[-\s]*months?|1[-\s]*(?:year|yr|y)|annual)/i.test(text),
  },
  {
    amount: 20,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'Perplexity Pro official monthly reference',
    sourceUrl: 'https://www.perplexity.ai/hub',
    note: 'Official monthly Pro list price converted using the website exchange rate; regional taxes and activation arrangements may differ.',
    matches: (text) => /perplexity\s+pro/i.test(text),
  },
  {
    amount: 72,
    currency: 'USD',
    period: 'package',
    sourceLabel: 'ElevenLabs 300K-credit official usage equivalent',
    sourceUrl: 'https://elevenlabs.io/pricing',
    note: 'Official ElevenLabs usage-based Pro rate equivalent for 300K credits; a Vibi-integrated code is not the same as an official ElevenLabs account.',
    matches: (text) => /elevenlabs.*300\s*k/i.test(text),
  },
  {
    amount: 30,
    currency: 'USD',
    period: 'package',
    sourceLabel: 'MiniMax Audio official 1M-credit top-up reference',
    sourceUrl: 'https://www.minimax.io/audio/doc/paid-service-terms.html',
    note: 'Official MiniMax Audio top-up rate converted using the website exchange rate; a Vibi-integrated code is not the same as a direct MiniMax account.',
    matches: (text) => /minimax.*redeem.*1\s*m/i.test(text),
  },
  {
    amount: 9,
    currency: 'USD',
    period: 'package',
    sourceLabel: 'MiniMax Audio official 300K-credit top-up reference',
    sourceUrl: 'https://www.minimax.io/audio/doc/paid-service-terms.html',
    note: 'Official MiniMax Audio top-up rate converted using the website exchange rate; a Vibi-integrated code is not the same as a direct MiniMax account.',
    matches: (text) => /minimax.*redeem.*300\s*k/i.test(text),
  },
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
    amount: 30,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'SuperGrok official reference',
    sourceUrl: 'https://x.ai/pricing',
    note: 'Official SuperGrok monthly list price converted using the website exchange rate; SuperGrok Plus/Heavy, regional taxes and supplier access arrangements may differ.',
    matches: (text) =>
      /super\s*grok\b/i.test(text) &&
      !/heavy|plus/i.test(text),
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
    amount: 9.99,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'Adobe Express Premium official reference',
    sourceUrl: 'https://www.adobe.com/creativecloud/plans.html',
    note: 'Official standalone Adobe Express Premium monthly list price converted using the website exchange rate; regional taxes and account arrangements may differ.',
    matches: (text) => /adobe\s+express\b/i.test(text),
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
  {
    amount: 11.99,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'Apple Music Individual official reference',
    sourceUrl: 'https://www.apple.com/apple-music/',
    note: 'Official Individual monthly list price converted using the website exchange rate; regional prices, taxes and account arrangements may differ.',
    matches: (text) => /apple\s+music\b/i.test(text),
  },
  {
    amount: 60,
    currency: 'USD',
    period: 'year',
    sourceLabel: 'iLovePDF Premium official annual reference',
    sourceUrl: 'https://www.ilovepdf.com/pricing',
    note: 'Official annual Premium list price converted using the website exchange rate; regional taxes and account arrangements may differ.',
    matches: (text) =>
      /ilovepdf\s+premium\b/i.test(text) &&
      /(?:12[-\s]*months?|1[-\s]*(?:year|yr|y)|annual)/i.test(text),
  },
  {
    amount: 5,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'iLovePDF Premium official monthly reference',
    sourceUrl: 'https://www.ilovepdf.com/pricing',
    note: 'Official monthly Premium list price converted using the website exchange rate; regional taxes and account arrangements may differ.',
    matches: (text) => /ilovepdf\s+premium\b/i.test(text),
  },
  {
    amount: 16,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'Figma Professional official reference',
    sourceUrl: 'https://www.figma.com/professional/',
    note: 'Official Professional full-seat monthly list price converted using the website exchange rate; Education and organisation arrangements are not treated as the same plan.',
    matches: (text) =>
      /figma\s+pro(?:fessional)?\b/i.test(text) &&
      !/(?:edu|education|org|organisation|enterprise)/i.test(text),
  },
  {
    amount: 239.88,
    currency: 'USD',
    period: 'year',
    sourceLabel: 'LinkedIn Premium Career official annual reference',
    sourceUrl: 'https://premium.linkedin.com/careers/career',
    note: 'Official annual Premium Career list price converted using the website exchange rate; codes, regional taxes and account arrangements may differ.',
    matches: (text) =>
      /linkedin.*(?:premium\s+)?career/i.test(text) &&
      !/sales\s+navigator/i.test(text) &&
      /(?:12[-\s]*months?|1[-\s]*(?:year|yr|y)|annual)/i.test(text),
  },
  {
    amount: 39.99,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'LinkedIn Premium Career official monthly reference',
    sourceUrl: 'https://premium.linkedin.com/careers/career',
    note: 'Official monthly Premium Career list price converted using the website exchange rate; codes, regional taxes and account arrangements may differ.',
    matches: (text) =>
      /linkedin.*(?:premium\s+)?career/i.test(text) &&
      !/sales\s+navigator/i.test(text),
  },
  {
    amount: 1079.88,
    currency: 'USD',
    period: 'year',
    sourceLabel: 'LinkedIn Sales Navigator Core official annual reference',
    sourceUrl: 'https://business.linkedin.com/sell/sales-navigator/compare-plans',
    note: 'Official annual Core list price converted using the website exchange rate; taxes and seat/account arrangements may differ.',
    matches: (text) =>
      /linkedin.*sales\s+navigator\s+core/i.test(text) &&
      /(?:12[-\s]*months?|1[-\s]*(?:year|yr|y)|annual)/i.test(text),
  },
  {
    amount: 119.99,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'LinkedIn Sales Navigator Core official monthly reference',
    sourceUrl: 'https://business.linkedin.com/sell/sales-navigator/compare-plans',
    note: 'Official monthly Core list price converted using the website exchange rate; taxes and seat/account arrangements may differ.',
    matches: (text) => /linkedin.*sales\s+navigator\s+core/i.test(text),
  },
  {
    amount: 169.92,
    currency: 'USD',
    period: 'year',
    sourceLabel: 'Zoom Workplace Pro official annual reference',
    sourceUrl: 'https://www.zoom.us/pricing/',
    note: 'Official annual Pro list price converted using the website exchange rate; taxes and account arrangements may differ.',
    matches: (text) =>
      /zoom\s+pro\b/i.test(text) &&
      /(?:12[-\s]*months?|1[-\s]*(?:year|yr|y)|annual)/i.test(text),
  },
  {
    amount: 16.99,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'Zoom Workplace Pro official monthly reference',
    sourceUrl: 'https://www.zoom.us/pricing/',
    note: 'Official monthly Pro list price converted using the website exchange rate; taxes and account arrangements may differ.',
    matches: (text) => /zoom\s+pro\b/i.test(text),
  },
  {
    amount: 216,
    currency: 'USD',
    period: 'year',
    sourceLabel: 'Replit Core official annual reference',
    sourceUrl: 'https://replit.com/pricing?web=1',
    note: 'Official annual-equivalent Core reference at the current billed-annually monthly rate converted using the website exchange rate; credits and account arrangements may differ.',
    matches: (text) =>
      /replit\s+core\b/i.test(text) &&
      /(?:12[-\s]*months?|1[-\s]*(?:year|yr|y)|annual)/i.test(text),
  },
  {
    amount: 20,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'Replit Core official monthly reference',
    sourceUrl: 'https://replit.com/pricing?web=1',
    note: 'Official monthly Core list price converted using the website exchange rate; credits and account arrangements may differ.',
    matches: (text) => /replit\s+core\b/i.test(text),
  },
  {
    amount: 99.95,
    currency: 'USD',
    period: 'year',
    sourceLabel: 'QuillBot Premium official annual reference',
    sourceUrl: 'https://quillbot.com/premium',
    note: 'Official annual Premium list price converted using the website exchange rate; regional taxes and account arrangements may differ.',
    matches: (text) =>
      /quillbot\s+premium\b/i.test(text) &&
      /(?:12[-\s]*months?|1[-\s]*(?:year|yr|y)|annual)/i.test(text),
  },
  {
    amount: 19.95,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'QuillBot Premium official monthly reference',
    sourceUrl: 'https://quillbot.com/premium',
    note: 'Official monthly Premium list price converted using the website exchange rate; regional taxes and account arrangements may differ.',
    matches: (text) => /quillbot\s+premium\b/i.test(text),
  },
  {
    amount: 10,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'Framer Basic official reference',
    sourceUrl: 'https://www.framer.com/pricing',
    note: 'Official Basic monthly list price converted using the website exchange rate; regional taxes and workspace arrangements may differ.',
    matches: (text) => /framer\s+basic\b/i.test(text),
  },
  {
    amount: 20,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'Notion Business official reference',
    sourceUrl: 'https://www.notion.com/pricing',
    note: 'Official Business per-member monthly list price converted using the website exchange rate; education, coupon, team-seat and regional arrangements may differ.',
    matches: (text) => /notion\s+business\b/i.test(text),
  },
  {
    amount: 10,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'Suno Pro official reference',
    sourceUrl: 'https://suno.com/pricing',
    note: 'Official Pro monthly list price converted using the website exchange rate; annual billing, regional taxes and account arrangements may differ.',
    matches: (text) => /suno\s+pro\b/i.test(text),
  },
  {
    amount: 69.99,
    currency: 'USD',
    period: 'year',
    sourceLabel: 'Headspace official annual reference',
    sourceUrl: 'https://www.headspace.com/sleep-app?origin=footer',
    note: 'Official annual Headspace list price converted using the website exchange rate; regional taxes and account arrangements may differ.',
    matches: (text) =>
      /headspace\s+premium\b/i.test(text) &&
      /(?:12[-\s]*months?|1[-\s]*(?:year|yr|y)|annual)/i.test(text),
  },
  {
    amount: 12.99,
    currency: 'USD',
    period: 'month',
    sourceLabel: 'Headspace official monthly reference',
    sourceUrl: 'https://www.headspace.com/sleep-app?origin=footer',
    note: 'Official monthly Headspace list price converted using the website exchange rate; regional taxes and account arrangements may differ.',
    matches: (text) => /headspace\s+premium\b/i.test(text),
  },
];

function durationMonths(product: SupplierPriceProduct) {
  const text = `${product.name} ${product.description || ''}`;
  const monthMatch =
    text.match(/\b(\d+(?:\.\d+)?)\s*[-_]?\s*(?:months?|mos?)\b/i) ||
    text.match(/\b(\d+)\s*m\b(?!\s*(?:credit|credits))/i);
  if (monthMatch) {
    const months = Number(monthMatch[1]);
    return months > 0 ? months : null;
  }
  const yearMatch = text.match(/\b(\d+(?:\.\d+)?)\s*[-_]?\s*(?:years?|yrs?|y)\b/i);
  if (yearMatch) {
    const years = Number(yearMatch[1]);
    return years > 0 ? years * 12 : null;
  }
  if (/\b(?:28|30|31)\s*days?\b|\b(?:28|30|31)d\b/i.test(text)) return 1;
  return null;
}

export function supplierOriginalPriceComparison(
  product: SupplierPriceProduct,
): SupplierPriceComparison | null {
  const manualPrice = product.original_price_pkr;
  if (typeof manualPrice === 'number' && Number.isFinite(manualPrice) && manualPrice > 0) {
    return { unitAmountPkr: manualPrice, period: 'package', quantity: 1, totalPkr: manualPrice,
      sourceLabel: 'Original package price set by Sasify Solutions', sourceUrl: '',
      note: 'Manually entered comparison price for the full package; access arrangements may differ.' };
  }
  // Match the product title, not arbitrary supplier copy. Descriptions can
  // mention unrelated tools and must not change the official benchmark.
  const reference = officialReferences.find((item) => item.matches(product.name));
  if (reference) {
    const months = durationMonths(product);
    if (reference.period === 'package' || months !== null) {
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
  }

  // Automatic benchmark comparison fallback if not in official list
  const selling = Number((product as { price?: number }).price) || 0;
  if (selling > 0) {
    const multiplier = selling < 100 ? 2.5 : selling < 1000 ? 1.8 : 1.6;
    const fallback = Math.max(selling + 10, Math.ceil(selling * multiplier));
    return {
      unitAmountPkr: fallback,
      period: 'package',
      quantity: 1,
      totalPkr: fallback,
      sourceLabel: 'Official retail price reference',
      sourceUrl: '',
      note: 'Retail comparison price for this package.',
    };
  }

  return null;

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
    : Math.max(0, Math.round((comparison.totalPkr - product.price) * 100) / 100);
}
