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
  contactOnly?: boolean;
  variants?: ProductVariant[];
  details?: string[];
  sourceUrl: string;
  description: string;
};

export type ProductVariant = {
  name: string;
  duration: string;
  sellingPricePkr: number;
  originalPricePkr: number;
};

export const products: Product[] = [
  {
    id: 'p012',
    slug: 'claude-team-plan-premium',
    category: 'AI Assistants & Research',
    name: 'Claude Team Plan Premium',
    duration: '1 Month',
    vendor: 'Zoom Store / Alternate Supplier',
    sellingPricePkr: 24999,
    originalPrice: 'PKR 35,000 per seat/month',
    originalPricePkr: 35000,
    sourceUrl: 'https://claude.com/pricing',
    description: 'One-month Claude Team Premium seat for demanding writing, research, coding and document-analysis workflows, with higher usage capacity than a Standard seat.',
    details: [
      'Premium is the higher-usage seat type within Claude Team, not an API credit package.',
      'Claude Team includes Claude Code and Cowork. Feature access remains subject to the workspace settings and provider limits.',
      "The original price shown is Anthropic's monthly US per-seat reference. Provider minimum-seat requirements and regional taxes may apply when purchasing directly.",
    ],
  },
  {
    id: 'p013',
    slug: 'claude-team-plan-standard',
    category: 'AI Assistants & Research',
    name: 'Claude Team Plan Standard',
    duration: '1 Month',
    vendor: 'Zoom Store / Alternate Supplier',
    sellingPricePkr: 5199,
    originalPrice: 'PKR 7,500 per seat/month',
    originalPricePkr: 7500,
    sourceUrl: 'https://claude.com/pricing',
    description: 'One-month Claude Team Standard seat for AI-assisted writing, research, document analysis and coding in a team workspace.',
    details: [
      'Standard is the entry seat type within Claude Team, with usage limits set by Anthropic.',
      "This is a totally private seat delivered to the client's email, not a shared login.",
      'Claude Team includes Claude Code and Cowork. Feature access remains subject to the workspace settings and provider limits.',
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
    originalPrice: 'PKR 38,000/year',
    originalPricePkr: 38000,
    sourceUrl: 'https://www.hostinger.com/web-hosting',
    description: 'Hostinger Unlimited web hosting for 12 months with generous website resources for personal and business sites.',
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
    originalPrice: 'KVM packages from PKR 28,788',
    sourceUrl: 'https://www.hostinger.com/vps',
    description: 'Hostinger KVM VPS packages for 12 months with dedicated resources, NVMe storage, high-speed bandwidth and full VPS access and control. Choose the KVM package that fits your project and contact Sasify Solutions on WhatsApp to purchase.',
    details: [
      '12-month validity for every package.',
      'Powerful KVM VPS with dedicated resources, NVMe storage and high-speed bandwidth.',
      'Full VPS access and control. Contact us on WhatsApp for availability and purchase.',
    ],
    variants: [
      { name: 'KVM1 VPS', duration: '12 Months', sellingPricePkr: 14999, originalPricePkr: 28788 },
      { name: 'KVM2 VPS', duration: '12 Months', sellingPricePkr: 24999, originalPricePkr: 38388 },
      { name: 'KVM4 VPS', duration: '12 Months', sellingPricePkr: 29999, originalPricePkr: 51588 },
      { name: 'KVM8 VPS', duration: '12 Months', sellingPricePkr: 49999, originalPricePkr: 101988 },
    ],
  },
];
