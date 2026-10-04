import { products } from './products.ts';
import { formatPkr } from './product-utils.ts';

const planIds = ['p013', 'p012', 'p100', 'p101'];
export const guidePlans = planIds.map((id) => {
  const product = products.find((item) => item.id === id);
  if (!product) throw new Error(`Buying guide product missing: ${id}`);
  return product;
});

export const guideQuestions = [
  {
    question: 'What are the Claude Team and Hostinger package prices at Sasify Solutions?',
    answer: `${guidePlans.slice(0, 3).map((p) => `${p.name} costs ${formatPkr(p.sellingPricePkr)} for ${p.duration}`).join('; ')}. These are separate Sasify listings. Review the exact access arrangement and usage limits on your chosen product page before payment.`,
  },
  {
    question: 'What do the Claude Team Standard and Premium listings cost?',
    answer: `${guidePlans.slice(0, 2).map((p) => `${p.name} costs ${formatPkr(p.sellingPricePkr)} for ${p.duration}`).join('; ')}. These listings describe a team seat, not ownership of an entire team workspace. Review the listed workspace requirements and provider usage limits before ordering.`,
  },
  {
    question: 'What Hostinger products are available?',
    answer: `Sasify Solutions lists ${guidePlans[2].name} at ${formatPkr(guidePlans[2].sellingPricePkr)} for ${guidePlans[2].duration}. ${guidePlans[3].name} has KVM package options shown on its product page and is purchased through WhatsApp. Confirm package availability and details before paying.`,
  },
  {
    question: 'Are shared, team, invite and credit packages interchangeable?',
    answer: 'No. Shared access is not exclusive to one buyer. A team seat is access within a workspace, and an invite package has invitation requirements. A credit package describes an allocation, not necessarily unlimited use or a fixed subscription period. Review the specific listing’s privacy, device and provider restrictions before choosing.',
  },
  {
    question: 'What is the warranty on Sasify Solutions products?',
    answer: 'Warranty terms are specific to each listing. Review the stated warranty duration and coverage for the exact product before payment. ChatGPT keeps its listed account-specific warranty; the Ultra Stable Apple Pay option includes a full 30-day warranty.',
  },
  {
    question: 'How are original prices and savings compared?',
    answer: 'Our price is the listed Sasify package total. Original prices are provider comparison references, not a promise that the Sasify access arrangement is identical. A monthly reference is multiplied by the plan duration in months; an annual-only reference uses the duration in years. Savings equal the full-plan reference minus our package price. Provider taxes, regional prices and access options can differ.',
  },
  {
    question: 'How do I confirm and buy a plan?',
    answer: 'Choose the exact product page and select Buy online. Send the exact payment shown at checkout, then submit the transaction ID. Your digital purchase is delivered automatically after payment verification. If you have a delivery or activation issue, use the WhatsApp support button shown with your order.',
  },
];
