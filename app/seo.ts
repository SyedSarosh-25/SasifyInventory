import type { Product } from './products.ts';
import { products } from './products.ts';
import {
  formatPkr,
  isAnnualPlan,
  productHref,
  productLogo,
} from './product-utils.ts';
import type { SupplierSeoProduct } from './supplier-seo.ts';
import {
  supplierProductHref,
  supplierSeoProducts,
} from './supplier-seo.ts';
import { supplierLogo } from './supplier-product-utils.ts';
import {
  founderProfile,
  siteDescription,
  siteOrigin,
  socials,
} from './site-config.ts';

const SEO_TITLE_LIMIT = 65;
const SEO_DESCRIPTION_LIMIT = 155;
const titleSuffix = '| Price in Pakistan | Sasify';
const duplicateSupplierNames = new Set(
  supplierSeoProducts
    .map((product) => product.name)
    .filter((name, index, names) => names.indexOf(name) !== index),
);

function trimSeoText(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) return normalized;
  const clipped = normalized.slice(0, Math.max(1, limit - 1)).trimEnd();
  const boundary = clipped.lastIndexOf(' ');
  const safeClip = boundary >= Math.floor(limit * 0.6) ? clipped.slice(0, boundary) : clipped;
  return `${safeClip.trimEnd()}…`;
}

function compactProductTitle(name: string, disambiguator?: string) {
  const detail = disambiguator ? ` · ${disambiguator}` : '';
  const availableNameLength = Math.max(18, SEO_TITLE_LIMIT - titleSuffix.length - detail.length - 1);
  const compactName = trimSeoText(`${name}${detail}`, availableNameLength);
  return `${compactName} ${titleSuffix}`;
}

export function productTitle(product: Product) {
  return compactProductTitle(product.name);
}

export function productDescription(product: Product) {
  if (product.contactOnly)
    return trimSeoText(
      `${product.name}: KVM1, KVM2, KVM4 and KVM8 packages. Contact Sasify Solutions on WhatsApp for pricing and purchase.`,
      SEO_DESCRIPTION_LIMIT,
    );
  const duration = product.duration === '-' ? 'this package' : product.duration;
  return trimSeoText(
    `${product.name}: ${formatPkr(product.sellingPricePkr)} for ${duration} in Pakistan. Review access, warranty and availability before ordering online.`,
    SEO_DESCRIPTION_LIMIT,
  );
}

export function productQuestions(product: Product) {
  if (product.contactOnly)
    return [
      {
        question: `How do I get ${product.name} pricing and details?`,
        answer: `Choose your preferred package on this page, then contact Sasify Solutions on WhatsApp for availability, payment details and purchase of ${product.name}.`,
      },
      {
        question: `Which options are available for ${product.name}?`,
        answer: `${product.description} The available packages are KVM1, KVM2, KVM4 and KVM8. Ask our team which option fits your required resources before ordering.`,
      },
      {
        question: `What support comes with ${product.name}?`,
        answer:
          'Warranty terms are specific to the selected package. Sasify Solutions support is available on WhatsApp for availability, activation and plan questions.',
      },
    ];
  if (product.id === 'p093' && product.variants?.length)
    return [
      {
        question: 'What is the ChatGPT Plus account price in Pakistan?',
        answer:
          'Sasify Solutions offers a one-month Ultra Stable ChatGPT Plus account paid through Apple Pay for PKR 3,499. Confirm the current availability before ordering.',
      },
      {
        question: `What warranty comes with ${product.name}?`,
        answer:
          'The Ultra Stable Apple Pay option includes a full 25-day warranty. Warranty details for other account options are shown with the listing and confirmed before payment. WhatsApp support is available after payment for delivery or activation issues.',
      },
    ];
  const price = formatPkr(product.sellingPricePkr);
  return [
    {
      question: `What is the ${product.name} price in Pakistan?`,
      answer:
        product.duration === '-'
          ? `Sasify Solutions lists this package at ${price}. Review the access period and availability, then buy online through secure checkout.`
          : `Sasify Solutions lists ${product.name} at ${price} for ${product.duration}. Review the listing and buy online through secure checkout.`,
    },
    {
      question: isAnnualPlan(product)
        ? 'Is this a one-time payment for the full year?'
        : 'What access is included in this package?',
      answer: isAnnualPlan(product)
        ? `Yes. Pay ${price} once to Sasify Solutions for the full year. No monthly payments to us are needed during that year. Provider usage limits still apply.`
        : `${product.description} Review the account, device, invitation and usage requirements for this exact listing before ordering.`,
    },
    {
      question: `What warranty comes with ${product.name}?`,
      answer: 'Warranty terms are shown for the selected listing and may differ by product. WhatsApp support is available after payment for delivery or activation issues.',
    },
  ];
}

export const organizationData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${siteOrigin}/#organization`,
  name: 'Sasify Solutions',
  url: `${siteOrigin}/`,
  logo: {
    '@type': 'ImageObject',
    url: `${siteOrigin}/sasify-logo.png`,
    width: 200,
    height: 200,
  },
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
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteOrigin}${item.path}`,
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
    name:
      product.duration === '-'
        ? product.name
        : `${product.name} - ${product.duration}`,
    description: product.description,
    sku: product.id,
    category: product.category,
    ...(logo ? { image: [logo] } : {}),
    ...(product.duration === '-'
      ? {}
      : {
          additionalProperty: [
            {
              '@type': 'PropertyValue',
              name: 'Access period / allocation',
              value: product.duration,
            },
          ],
        }),
    ...(product.contactOnly
      ? {}
      : {
          offers: product.variants?.length
            ? product.variants.map((variant) => ({
                '@type': 'Offer',
                url: product.id === 'p093' ? url : `${url}#account-options`,
                sku: variant.id,
                name: variant.name,
                price: variant.sellingPricePkr,
                priceCurrency: 'PKR',
                description: `${variant.name}: ${variant.duration} for ${formatPkr(variant.sellingPricePkr)}.`,
                seller: { '@id': `${siteOrigin}/#organization` },
              }))
            : {
                '@type': 'Offer',
                url,
                price: product.sellingPricePkr,
                priceCurrency: 'PKR',
                description: productQuestions(product)[0].answer,
                seller: { '@id': `${siteOrigin}/#organization` },
              },
        }),
  };
}

export function supplierProductTitle(product: SupplierSeoProduct) {
  const disambiguator = duplicateSupplierNames.has(product.name)
    ? product.slug.slice(-6)
    : undefined;
  return compactProductTitle(product.name, disambiguator);
}

export function supplierProductDescription(product: SupplierSeoProduct) {
  return trimSeoText(
    `${product.name}: ${formatPkr(product.price)} in Pakistan. Check stock, warranty and delivery before ordering online.`,
    SEO_DESCRIPTION_LIMIT,
  );
}

export function supplierProductQuestions(product: SupplierSeoProduct) {
  return [
    {
      question: `What is the ${product.name} price in Pakistan?`,
      answer: `Sasify Solutions lists ${product.name} at ${formatPkr(product.price)}. Stock and activation requirements can change, so review the listing before ordering.`,
    },
    {
      question: `How is ${product.name} delivered?`,
      answer:
        'After payment verification, eligible supplier products are fulfilled automatically through the secure Sasify Solutions checkout.',
    },
    {
      question: `What should I check before buying ${product.name}?`,
      answer:
        'Read the product description, account or redemption requirements, warranty terms stated in the listing, and any customer-email requirement before payment.',
    },
  ];
}

export function supplierProductData(product: SupplierSeoProduct) {
  const url = `${siteOrigin}${supplierProductHref(product)}`;
  const logo = supplierLogo(product.name, product.logoUrl);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    url,
    name: product.name,
    description: product.description,
    sku: product.id,
    category: product.category,
    ...(logo ? { image: [logo] } : {}),
    offers: {
      '@type': 'Offer',
      url,
      price: product.price,
      priceCurrency: 'PKR',
      availability: 'https://schema.org/InStock',
      seller: { '@id': `${siteOrigin}/#organization` },
    },
  };
}

export function serializeJsonLd(data: Record<string, unknown>) {
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}

export function faqData(
  path: string,
  questions: { question: string; answer: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${siteOrigin}${path}#questions`,
    url: `${siteOrigin}${path}`,
    inLanguage: 'en-PK',
    publisher: { '@id': organizationData['@id'] },
    mainEntity: questions.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

export function sitemapEntries() {
  return [
    '/',
    '/inventory',
    '/about',
    '/buying-guide',
    '/request-tool',
    '/scammers',
    '/warranty',
    '/refunds',
    '/privacy',
    '/terms',
    ...products.map(productHref),
    ...supplierSeoProducts.map(supplierProductHref),
  ].map((path) => ({ url: `${siteOrigin}${path}` }));
}

export function robotsRules() {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}

// Static exports do not emit Vinext's dynamic metadata routes yet.
export function sitemapXml() {
  const xmlEscape = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries()
    .map(({ url }) => `  <url><loc>${xmlEscape(url)}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
}

export function robotsText() {
  const { rules, sitemap } = robotsRules();
  return `User-agent: ${rules.userAgent}\nAllow: ${rules.allow}\n\nSitemap: ${sitemap}\n`;
}
