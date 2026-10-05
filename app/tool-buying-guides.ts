import { products } from './products.ts';
import { supplierSeoProducts, type SupplierSeoProduct } from './supplier-seo.ts';
import { productHref } from './product-utils.ts';

type Comparison = { name: string; href: string; price: number; access: string; activation: string; warranty: string };
type Question = { question: string; answer: string };
type Guide = { heading: string; title: string; description: string; intro: string; comparisons: Comparison[]; steps: string[]; questions: Question[] };

function localComparison(id: string, details: Omit<Comparison, 'name' | 'href' | 'price'>): Comparison[] {
  const product = products.find((item) => item.id === id);
  return product ? [{ name: product.name, href: productHref(product), price: product.sellingPricePkr, ...details }] : [];
}

function supplierComparison(slugs: string[], details: (product: SupplierSeoProduct) => Omit<Comparison, 'name' | 'href' | 'price'>): Comparison[] {
  const list = supplierSeoProducts.filter((product) => !product.archived && slugs.includes(product.slug));
  const uniqueBySlug = new Map<string, SupplierSeoProduct>();
  for (const product of list) uniqueBySlug.set(product.slug, product);
  return Array.from(uniqueBySlug.values()).map((product) => ({
    name: product.name, href: `/products/${product.slug}`, price: product.price, ...details(product),
  }));
}

export function toolBuyingGuide(slug: string): Guide | null {
  if (slug === 'chatgpt') return {
    heading: 'ChatGPT Plus plans and prices in Pakistan',
    title: 'ChatGPT Plus Plans & Prices in Pakistan | Sasify Solutions',
    description: 'Compare ChatGPT Plus shared and private access in Pakistan, PKR prices, activation steps and warranty differences before ordering online.',
    intro: 'Choosing a ChatGPT Plus subscription is not just a price comparison. Shared usage, account privacy and warranty differ between offers. Compare the two locally managed options below, then review the exact listing before payment.',
    comparisons: [
      ...localComparison('p093-shared', {
        access: 'Shared account for up to four members. Activity is not private and usage is shared; an individual allowance is not guaranteed.',
        activation: 'Credentials are delivered after payment verification. Obtain the one-time 2FA login code on the original checkout device.',
        warranty: 'The shared listing states no replacement, warranty or refund after credentials are delivered or shared usage is exhausted.',
      }),
      ...localComparison('p093', {
        access: 'Private Ultra Stable account, paid through Apple Pay. This is a different access arrangement from the shared listing.',
        activation: 'Complete online checkout and payment verification, then follow the delivered sign-in details and order instructions.',
        warranty: `${products.find((product) => product.id === 'p093')?.variants?.find((variant) => variant.id === 'p093-ultra')?.warrantyDays ?? 30}-day warranty for the Ultra Stable Apple Pay option only. Other listings have their own terms.`,
      }),
    ],
    steps: ['Choose shared or private access and read the privacy, usage and warranty conditions.', 'Open the exact listing and confirm stock and the current price at checkout.', 'Follow the payment instructions on your order; delivery follows payment verification.', 'Use your order screen for credentials, login instructions and after-payment support.'],
    questions: [
      { question: 'Is the cheapest ChatGPT Plus offer the same as a private account?', answer: 'No. The shared option uses one account across up to four members, with shared usage and activity visibility. The Ultra Stable Apple Pay listing is described as a private account. Choose the access arrangement, not only the lower price.' },
      { question: 'Do all ChatGPT Plus plans have a 30-day warranty?', answer: 'No. The Ultra Stable Apple Pay option has the warranty stated above; the shared listing has explicit no-warranty and no-refund conditions after delivery. Supplier and other account options must be checked individually.' },
    ],
  };
  if (slug === 'cursor') return {
    heading: 'Cursor AI plans and credits in Pakistan',
    title: 'Cursor AI Plans & Credits in Pakistan | Sasify Solutions',
    description: 'Compare Cursor API credits and CDK access in Pakistan. Review PKR prices, key activation, expiry and listing-specific warranty before buying.',
    intro: 'A listing called Cursor Pro may be an API-credit package rather than a Cursor account. Check what is delivered, how the key is activated and when credits expire. These packages are not interchangeable with an account subscription.',
    comparisons: [
      ...supplierComparison(['api-cursor-pro-400-credits-day-1-month', 'api-cursor-pro-6500-credits-1-month', 'cursor-pro-2600-credits-1-month', 'cursor-pro-6500-credits-1-month'], () => ({
        access: 'API key / credit package, not a login account. The exact credit allocation is in the listing name and description.',
        activation: 'Follow the supplied API setup documentation. The listing states one month from key activation; daily and total-credit packages differ.',
        warranty: 'These listings state 30 days. Read the setup and purchase restrictions; the 400-credit/day listing excludes mistaken purchases and inability to configure the API.',
      })),
      ...supplierComparison(['cdk-cursor-ultra-1m'], () => ({
        access: 'One-month Cursor Ultra CDK redemption package, not an API-credit allocation.',
        activation: 'The listing requires an account on a free plan, not one with an active subscription. Use the supplied redemption instructions; allow the stated processing time.',
        warranty: 'No positive warranty duration is specified in this listing. Confirm coverage before buying; do not assume the API packages’ 30-day warranty applies.',
      })),
    ],
    steps: ['Decide whether you need API credits or CDK redemption; do not treat an API key as an account login.', 'Read the exact credit allocation, expiry, compatibility and setup instructions on the product page.', 'For the CDK offer, check the free-plan account requirement before paying.', 'Complete checkout and follow the delivered setup instructions. Use the order screen for after-payment help.'],
    questions: [
      { question: 'Is a Cursor Pro credit package a Cursor subscription account?', answer: 'Not necessarily. The credit offers compared here are described as APIs activated by a key. The CDK offer is redeemed through its supplied instructions. Check the delivery format on the exact listing before purchase.' },
      { question: 'When do Cursor credits expire?', answer: 'The compared API listings state a one-month period from key activation. A daily credit allowance and a fixed total allowance are different packages; check the exact listing for the allocation and any usage restrictions.' },
    ],
  };
  if (slug === 'gemini') return {
    heading: 'Gemini Pro plans and prices in Pakistan',
    title: 'Gemini Pro Plans & Prices in Pakistan | Sasify Solutions',
    description: 'Compare Gemini offers in Pakistan with PKR prices, access arrangements, activation requirements and warranty differences. Review each exact package.',
    intro: 'Gemini listings can be activation offers, bundles or shared slots. The access period is not automatically the warranty period. Compare the available package descriptions and confirm eligibility and activation requirements before purchase.',
    comparisons: [
      ...supplierComparison(['gemini-ai-pro-18-month'], () => ({
        access: 'Listed as an 18-month Gemini AI Pro offer. Review the actual delivered access arrangement and eligibility; this is not a blanket guarantee of every provider feature.',
        activation: 'The listing asks buyers purchasing fewer than five links to activate within 1–2 hours. Read its separate bulk-purchase hold conditions before ordering.',
        warranty: 'An 18-month access period does not mean an 18-month warranty. Check the activation/hold conditions and confirm any additional coverage before payment.',
      })),
      ...supplierComparison(['coursera-org-gemini-3m'], () => ({
        access: 'Coursera Org bundle with a Gemini three-month offer. The Coursera access period and Gemini offer period are separate.',
        activation: 'The instructions describe a Gemini claim through course completion. Review eligibility and the supplied sign-in, email and 2FA requirements first.',
        warranty: 'The listing states a 24-hour warranty with activation/account conditions; it is not coverage for the entire Gemini access period.',
      })),
      ...supplierComparison(['gemini-ultra-antigravity-x5-slot-0-10k-credit-1-month', 'gemini-ultra-antigravity-x5-slot-0-10k-credit-1m'], () => ({
        access: 'Shared Gemini Ultra slot with a variable credit allocation, not the same package as the 18-month offer.',
        activation: 'Read the slot, account and credit-allocation requirements on the exact listing before checkout.',
        warranty: 'Use the warranty stated on that listing. Do not infer coverage from another Gemini package.',
      })),
    ],
    steps: ['Choose the actual access arrangement: activation offer, bundle or shared slot.', 'Check eligibility and whether activation must happen soon after delivery.', 'Review the warranty separately from the advertised access duration.', 'Confirm current availability and price on the product page, complete checkout, and follow its activation instructions.'],
    questions: [
      { question: 'Does an 18-month Gemini offer include an 18-month warranty?', answer: 'Not automatically. Access duration and warranty are different terms. The 18-month listing contains activation and hold conditions; review them and confirm any additional coverage before buying.' },
      { question: 'Is a Coursera plus Gemini bundle the same as standalone Gemini Pro?', answer: 'No. The bundle describes Coursera access and a separate Gemini offer with claim requirements. Confirm the required steps and eligibility rather than assuming instant standalone Gemini activation.' },
    ],
  };
  return null;
}
