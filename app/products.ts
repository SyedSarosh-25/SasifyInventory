import { customerProduct } from '../commerce/product-display.mjs';

export type Product = {
  id: string;
  slug: string;
  category: string;
  name: string;
  duration: string;
  vendor: string;
  sellingPricePkr: number;
  originalPrice: string;
  originalPricePkr?: number;
  /** Used by the storefront's new-products ticker for locally published offers. */
  publishedAt?: string;
  contactOnly?: boolean;
  /** Storefront availability rules for locally managed products. */
  availabilityMode?: 'live' | 'preorder' | 'manual';
  requiresCustomerEmail?: boolean;
  activationSla?: string;
  preorderDate?: string;
  stockLabel?: string;
  variants?: ProductVariant[];
  details?: string[];
  priceNotice?: string;
  sourceUrl: string;
  description: string;
};

export type ProductVariant = {
  id?: string;
  name: string;
  duration: string;
  sellingPricePkr: number;
  originalPricePkr: number;
  warrantyDays?: number;
};

const catalogProducts: Product[] = [
  {
    id: 'p093-shared',
    slug: 'chatgpt-plus-shared-account',
    category: 'AI Assistants & Research',
    name: 'ChatGPT Plus · Shared Account',
    duration: '1 Month',
    vendor: 'Sasify Solutions',
    sellingPricePkr: 999,
    originalPrice: 'PKR 5,700/month',
    originalPricePkr: 5700,
    publishedAt: '2026-09-14T18:35:53+05:00',
    sourceUrl: 'https://openai.com/chatgpt/pricing/',
    availabilityMode: 'live',
    description:
      'One-month ChatGPT Plus access through a shared account. Each account is shared by up to four members, with the email and password delivered after payment verification and a one-time 2FA login code available on the original checkout device.',
    details: [
      'Shared ChatGPT account: your data and activity are not private and may be visible to the other members using the same account.',
      'Usage is shared between all four members. Sasify Solutions cannot guarantee individual usage limits or availability after the shared allowance is reached.',
      'Includes a 25-day replacement warranty. Usage is shared; if the shared usage limit is temporarily reached, it resets automatically after a short cooldown (replacement is not provided for temporary usage exhaustion, only for login or account failure).',
      'The shared pool is filled slot-by-slot: 1/4, 2/4, 3/4 and 4/4. A new admin-approved account is used automatically when the current account is full. The authenticator secret is never shown to customers.',
    ],
  },
  {
    id: 'p093',
    slug: 'chatgpt-plus-1-month',
    category: 'AI Assistants & Research',
    name: 'ChatGPT Plus',
    duration: '1 Month',
    vendor: 'Sasify Solutions',
    sellingPricePkr: 3699,
    originalPrice: 'PKR 5,700/month',
    priceNotice: 'Price Revised Due to Increase By Vendors',
    originalPricePkr: 5700,
    sourceUrl: 'https://openai.com/chatgpt/pricing/',
    description:
      'One-month ChatGPT Plus access for advanced models, higher limits, file analysis, image generation and productivity workflows.',
    availabilityMode: 'live',
    variants: [
      {
        id: 'p093-ultra',
        name: 'Ultra Stable Account · Apple Pay',
        duration: '1 Month',
        sellingPricePkr: 3699,
        originalPricePkr: 5700,
        warrantyDays: 30,
      },
      {
        id: 'p093-momo',
        name: 'Partially Stable Account',
        duration: '1 Month',
        sellingPricePkr: 2999,
        originalPricePkr: 5700,
      },
    ],
  },
  {
    id: 'p012',
    slug: 'claude-team-plan-premium',
    category: 'AI Assistants & Research',
    name: 'Claude Team Plan Premium',
    duration: '1 Month',
    vendor: 'Zoom Store / Alternate Supplier',
    sellingPricePkr: 21999,
    originalPrice: 'PKR 35,625 per seat/month (US$125 official monthly reference)',
    originalPricePkr: 35625,
    publishedAt: '2026-09-10T12:56:41+05:00',
    sourceUrl: 'https://claude.com/pricing',
    description:
      'One-month Claude Team Premium seat for AI-assisted writing, research, document analysis, coding and productivity inside a Team workspace.',
    availabilityMode: 'preorder',
    requiresCustomerEmail: true,
    preorderDate: '2026-10-05',
    stockLabel: 'Ready To Deliver',
    details: [
      'Premium is the higher-usage seat type within Claude Team, with usage limits and feature availability determined by Anthropic.',
      "This is a fully private seat delivered to the client's own email address. It is not a shared login.",
      'Claude Team may include access to features such as Claude Code and Cowork, depending on the workspace configuration and Anthropic’s current feature availability.',
      'Individual account-related issues will be assisted where possible. However, if the complete workspace or organization is disabled due to a Claude-side or platform-wide issue, warranty, replacement or refund will not be provided.',
      'Please read the product details carefully before purchasing to avoid any misunderstanding later.',
    ],
  },
  {
    id: 'p013',
    slug: 'claude-team-plan-standard',
    category: 'AI Assistants & Research',
    name: 'Claude Team Plan Standard',
    duration: '1 Month',
    vendor: 'Zoom Store / Alternate Supplier',
    sellingPricePkr: 4299,
    originalPrice: 'PKR 7,500 per seat/month',
    originalPricePkr: 7500,
    publishedAt: '2026-09-10T12:56:41+05:00',
    sourceUrl: 'https://claude.com/pricing',
    description:
      'One-month Claude Team Standard seat for AI-assisted writing, research, document analysis, coding and productivity inside a Team workspace.',
    availabilityMode: 'preorder',
    requiresCustomerEmail: true,
    preorderDate: '2026-10-05',
    stockLabel: 'Ready To Deliver',
    details: [
      'Standard is the entry-level seat type within Claude Team, with usage limits and feature availability determined by Anthropic.',
      "This is a fully private seat delivered to the client's own email address. It is not a shared login.",
      'Claude Team may include access to features such as Claude Code and Cowork, depending on the workspace configuration and Anthropic’s current feature availability.',
      'Individual account-related issues will be assisted where possible. However, if the complete workspace or organization is disabled due to a Claude-side or platform-wide issue, warranty, replacement or refund will not be provided.',
      'Please read the product details carefully before purchasing to avoid any misunderstanding later.',
    ],
  },
  {
    id: 'p100',
    slug: 'hostinger-unlimited-12-months',
    category: 'Productivity & Business',
    name: 'Hostinger Unlimited Web Hosting',
    duration: '12 Months',
    vendor: 'Sasify Solutions',
    sellingPricePkr: 4500,
    originalPrice: 'PKR 29,988/year (annualized Pakistan reference)',
    originalPricePkr: 29988,
    publishedAt: '2026-09-10T12:56:41+05:00',
    sourceUrl: 'https://www.hostinger.com/web-hosting',
    description:
      'Hostinger Unlimited web hosting for 12 months with generous website resources for personal and business sites.',
    availabilityMode: 'manual',
    requiresCustomerEmail: true,
    activationSla: 'Within 6 hours',
    stockLabel: 'In stock · 999',
  },
  {
    id: 'p101',
    slug: 'hostinger-vps',
    category: 'Productivity & Business',
    name: 'Hostinger VPS',
    duration: '12 Months',
    vendor: 'Sasify Solutions',
    sellingPricePkr: 0,
    contactOnly: true,
    publishedAt: '2026-09-10T13:02:36+05:00',
    originalPrice: 'KVM packages from PKR 28,788',
    sourceUrl: 'https://www.hostinger.com/vps',
    description:
      'Hostinger KVM VPS packages for 12 months with dedicated resources, NVMe storage, high-speed bandwidth and full VPS access and control. Choose the KVM package that fits your project and contact Sasify Solutions on WhatsApp to purchase.',
    details: [
      '12-month validity for every package.',
      'Powerful KVM VPS with dedicated resources, NVMe storage and high-speed bandwidth.',
      'Full VPS access and control. Contact us on WhatsApp for availability and purchase.',
    ],
    variants: [
      {
        name: 'KVM1 VPS',
        duration: '12 Months',
        sellingPricePkr: 14999,
        originalPricePkr: 28788,
      },
      {
        name: 'KVM2 VPS',
        duration: '12 Months',
        sellingPricePkr: 24999,
        originalPricePkr: 38388,
      },
      {
        name: 'KVM4 VPS',
        duration: '12 Months',
        sellingPricePkr: 29999,
        originalPricePkr: 51588,
      },
      {
        name: 'KVM8 VPS',
        duration: '12 Months',
        sellingPricePkr: 49999,
        originalPricePkr: 101988,
      },
    ],
  },
];

export const products: Product[] = catalogProducts.map(customerProduct);

