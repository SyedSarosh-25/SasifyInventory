import type { Product } from './products.ts';
import { products } from './products.ts';
import { formatPkr, has25DayWarranty, isAnnualPlan, productHref, productLogo } from './product-utils.ts';
import { founderProfile, siteDescription, siteOrigin, socials } from './site-config.ts';

export function productTitle(product: Product) {
  const duration = product.duration === '-' ? '' : ` (${product.duration})`;
  return `${product.name}${duration} Price in Pakistan | Sasify Solutions`;
}

export function productDescription(product: Product) {
  const duration = product.duration === '-' ? 'this package' : product.duration;
  return `${product.name}: ${formatPkr(product.sellingPricePkr)} for ${duration} in Pakistan. Check access, warranty and plan details. Order from Sasify Solutions on WhatsApp.`;
}

export function productQuestions(product: Product) {
  const price = formatPkr(product.sellingPricePkr);
  return [
    {
      question: `What is the ${product.name} price in Pakistan?`,
      answer: product.duration === '-'
        ? `Sasify Solutions lists this package at ${price}. Confirm the access period and availability on WhatsApp before payment.`
        : `Sasify Solutions lists ${product.name} at ${price} for ${product.duration}. Confirm availability on WhatsApp before payment.`,
    },
    {
      question: isAnnualPlan(product) ? 'Is this a one-time payment for the full year?' : 'What access is included in this package?',
      answer: isAnnualPlan(product)
        ? `Yes. Pay ${price} once to Sasify Solutions for the full year. No monthly payments to us are needed during that year. Provider usage limits still apply.`
        : `${product.description} Confirm the account, device, invitation and usage requirements for this exact listing before ordering.`,
    },
    {
      question: `What warranty comes with ${product.name}?`,
      answer: has25DayWarranty(product)
        ? 'This one-month / 30-day package includes a full 25-day warranty from Sasify Solutions. Contact our WhatsApp number for warranty support.'
        : 'A warranty period is included. Confirm the duration and what is covered for this specific package with Sasify Solutions before payment.',
    },
  ];
}

export const organizationData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${siteOrigin}/#organization`,
  name: 'Sasify Solutions',
  url: `${siteOrigin}/`,
  logo: { '@type': 'ImageObject', url: `${siteOrigin}/sasify-logo.png`, width: 200, height: 200 },
  description: siteDescription,
  telephone: '+923116185711',
  founder: { '@type': 'Person', name: 'Syed Sarosh', url: founderProfile },
  sameAs: socials.map(({ href }) => href),
};

export const websiteData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${siteOrigin}/#website`,
  url: `${siteOrigin}/`,
  name: 'Sasify Solutions',
  alternateName: 'Sasify Solutions Inventory',
  inLanguage: 'en-PK',
  publisher: { '@id': `${siteOrigin}/#organization` },
};

export function breadcrumbData(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name, item: `${siteOrigin}${item.path}`,
    })),
  };
}

export function productData(product: Product) {
  const url = `${siteOrigin}${productHref(product)}`;
  const logo = productLogo(product);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    url,
    name: product.duration === '-' ? product.name : `${product.name} - ${product.duration}`,
    description: product.description,
    sku: product.id,
    category: product.category,
    ...(logo ? { image: [logo] } : {}),
    ...(product.duration === '-' ? {} : {
      additionalProperty: [{ '@type': 'PropertyValue', name: 'Access period / allocation', value: product.duration }],
    }),
    offers: {
      '@type': 'Offer', url,
      price: product.sellingPricePkr,
      priceCurrency: 'PKR',
      description: productQuestions(product)[0].answer,
      seller: { '@id': `${siteOrigin}/#organization` },
    },
  };
}

export function serializeJsonLd(data: Record<string, unknown>) {
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}

export function faqData(path: string, questions: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    '@id': `${siteOrigin}${path}#questions`, url: `${siteOrigin}${path}`,
    inLanguage: 'en-PK', publisher: { '@id': organizationData['@id'] },
    mainEntity: questions.map(({ question, answer }) => ({
      '@type': 'Question', name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

export function sitemapEntries() {
  return ['/', '/inventory', '/about', '/buying-guide', '/warranty', '/refunds', '/privacy', '/terms', ...products.map(productHref)].map((path) => ({ url: `${siteOrigin}${path}` }));
}

export function robotsRules() {
  return { rules: { userAgent: '*', allow: '/' }, sitemap: `${siteOrigin}/sitemap.xml` };
}

// Static exports do not emit Vinext's dynamic metadata routes yet.
export function sitemapXml() {
  const xmlEscape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries().map(({ url }) => `  <url><loc>${xmlEscape(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
}

export function robotsText() {
  const { rules, sitemap } = robotsRules();
  return `User-agent: ${rules.userAgent}\nAllow: ${rules.allow}\n\nSitemap: ${sitemap}\n`;
}
