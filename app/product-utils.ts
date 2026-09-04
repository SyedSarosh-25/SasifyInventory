import type { Product } from './products';
import { USD_TO_PKR } from './currency-utils.ts';

export { siteOrigin } from './site-config.ts';
export const claudeLogoUrl = 'https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fclaude.ai&sz=128';

export function formatPkr(value: number) {
  return `PKR ${value.toLocaleString('en-PK')}`;
}

export function whatsappLink(productName?: string, duration?: string) {
  const selection = productName ? `${productName}${duration ? ` (${duration})` : ''}` : '';
  const text = selection
    ? `Hi, I want to buy ${selection} from Sasify Solutions Inventory. Please share availability and payment details.`
    : 'Hi, I would like help choosing a digital product from Sasify Solutions.';
  return `https://wa.me/923116185711?text=${encodeURIComponent(text)}`;
}

export function productHref(product: Product) {
  return `/products/${product.id}`;
}

export function initials(name: string) {
  return name.replace(/[^a-zA-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
    .slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

export function favicon(domainOrUrl: string) {
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(domainOrUrl)}&sz=128`;
}

export function productLogo(product: Product) {
  if (/claude/i.test(product.name)) return claudeLogoUrl;
  if (/gemini/i.test(product.name)) return favicon('gemini.google.com');
  return product.sourceUrl ? favicon(product.sourceUrl) : '';
}

export function isAnnualPlan(product: Product) {
  return /^(1 year|12 months|365 days)$/i.test(product.duration.trim());
}

export function accessTypeLabel(product: Product) {
  if (/shared/i.test(product.name)) return 'Shared access';
  if (/single person/i.test(product.name)) return 'Single-person access';
  if (/team/i.test(product.name)) return 'Team seat or team access';
  if (/invite/i.test(product.name)) return 'Invite-based access';
  if (/credits?|api/i.test(`${product.name} ${product.duration}`)) return 'Credit allocation';
  return 'Plan access - confirm account arrangement';
}

export function has25DayWarranty(product: Product) {
  return /^(1 month|30 days)$/i.test(product.duration.trim());
}

export function planMonths(product: Product) {
  const duration = product.duration.trim();
  if (/^30 days$/i.test(duration)) return 1;
  if (/^365 days$/i.test(duration)) return 12;
  const match = duration.match(/^(\d+)\s+(month|year)s?$/i);
  if (!match || Number(match[1]) <= 0) return null;
  return Number(match[1]) * (match[2].toLowerCase() === 'year' ? 12 : 1);
}

export function originalPriceComparison(product: Product) {
  // Compare monthly subscription prices over the whole offered term, not just one month.
  const references = product.originalPrice.split(/\s+or\s+|;/i);
  const reference = references.find((part) => /\/month\b/i.test(part)) || references[0];
  const price = reference.match(/(US\$|\$|PKR\s+)(\d+(?:,\d{3})*(?:\.\d+)?)/i);
  if (!price && product.originalPricePkr == null) return null;
  const unitAmountPkr = product.originalPricePkr ?? Number(price![2].replaceAll(',', '')) * (price![1].toUpperCase().startsWith('PKR') ? 1 : USD_TO_PKR);
  const period = /\/month\b/i.test(reference) ? 'month' : /\/year\b/i.test(reference) ? 'year' : 'package';
  const months = planMonths(product);
  if (period !== 'package' && months === null) return null;
  const quantity = period === 'month' ? months! : period === 'year' ? months! / 12 : 1;
  return { unitAmountPkr, period, quantity, totalPkr: Math.round(unitAmountPkr * quantity * 100) / 100 };
}

export function originalPricePkr(product: Product) {
  return originalPriceComparison(product)?.totalPkr ?? null;
}

export function savingsPkr(product: Product) {
  const original = originalPricePkr(product);
  return original === null ? null : Math.round((original - product.sellingPricePkr) * 100) / 100;
}
