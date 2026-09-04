import { products } from './products.ts';
import { formatPkr } from './product-utils.ts';

const planIds = ['p093', 'p094', 'p095', 'p013', 'p012', 'p096', 'p028', 'p088'];
export const guidePlans = planIds.map((id) => {
  const product = products.find((item) => item.id === id);
  if (!product) throw new Error(`Buying guide product missing: ${id}`);
  return product;
});

export const guideQuestions = [
  {
    question: 'What are the ChatGPT and Codex package prices at Sasify Solutions?',
    answer: `${guidePlans.slice(0, 3).map((p) => `${p.name} costs ${formatPkr(p.sellingPricePkr)} for ${p.duration}`).join('; ')}. These are separate Sasify listings. Shared access is not exclusive personal access; confirm the account arrangement and usage limits of your chosen listing before payment.`,
  },
  {
    question: 'What do the Claude Team Standard and Premium listings cost?',
    answer: `${guidePlans.slice(3, 5).map((p) => `${p.name} costs ${formatPkr(p.sellingPricePkr)} for ${p.duration}`).join('; ')}. These listings describe a team seat, not ownership of an entire team workspace. Ask about workspace requirements and provider usage limits before ordering.`,
  },
  {
    question: 'Is Canva Pro Invite a one-time payment for a year?',
    answer: `Yes. Sasify Solutions lists Canva Pro Invite at ${formatPkr(guidePlans[5].sellingPricePkr)} for ${guidePlans[5].duration}. Pay once to Sasify Solutions for the year, with no monthly payments to us during that year. It is an invite listing, not the Canva Pro Panel listing. Confirm invitation requirements and warranty coverage before paying.`,
  },
  {
    question: 'Are shared, team, invite and credit packages interchangeable?',
    answer: 'No. Shared access is not exclusive to one buyer. A team seat is access within a workspace, and an invite package has invitation requirements. A credit package describes an allocation, not necessarily unlimited use or a fixed subscription period. Follow the specific listing and confirm privacy, device and provider restrictions before choosing.',
  },
  {
    question: 'What is the warranty on Sasify Solutions products?',
    answer: 'All products come with a warranty period. One-month and 30-day packages include a full 25-day warranty from Sasify Solutions. For yearly plans and other packages, confirm the warranty duration and coverage before payment. A one-year access period does not by itself mean a one-year warranty.',
  },
  {
    question: 'How are original prices and savings compared?',
    answer: 'Our price is the listed Sasify package total. Original prices are provider comparison references, not a promise that the Sasify access arrangement is identical. A monthly reference is multiplied by the plan duration in months; an annual-only reference uses the duration in years. Savings equal the full-plan reference minus our package price. Provider taxes, regional prices and access options can differ.',
  },
  {
    question: 'How do I confirm and buy a plan?',
    answer: 'Choose the exact product page and select Buy now on WhatsApp. Contact Sasify Solutions at +923116185711 to confirm availability, access arrangement, payment instructions, activation requirements and warranty coverage before paying. There is no checkout payment taken on this website.',
  },
];
