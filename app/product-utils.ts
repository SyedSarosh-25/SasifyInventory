import type { Product } from './products';
import { USD_TO_PKR } from './currency-utils.ts';

export const siteOrigin = 'https://sasify-solutions-inventory.morrisboyle861417684.chatgpt.site';
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

export function has25DayWarranty(product: Product) {
  return /^(1 month|30 days)$/i.test(product.duration.trim());
}

export function originalPricePkr(product: Product) {
  if (product.originalPricePkr != null) return product.originalPricePkr;
  // Prefer an explicitly listed annual option for annual plans; never invent a provider quote.
  const references = product.originalPrice.split(/\s+or\s+|;/i);
  const reference = (isAnnualPlan(product) && references.find((part) => /\/year\b/i.test(part))) || references[0];
  const price = reference.match(/(US\$|\$|PKR\s+)(\d+(?:,\d{3})*(?:\.\d+)?)/i);
  if (!price) return null;
  const amount = Number(price[2].replaceAll(',', ''));
  return Math.round(amount * (price[1].toUpperCase().startsWith('PKR') ? 1 : USD_TO_PKR) * 100) / 100;
}

export function savingsPkr(product: Product) {
  const original = originalPricePkr(product);
  return original === null ? null : Math.round((original - product.sellingPricePkr) * 100) / 100;
}
