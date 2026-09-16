import type { Product } from './products.ts';
import type { SupplierSeoProduct } from './supplier-seo.ts';

type AboutInput = {
  name: string;
  category?: string;
  description?: string;
  duration?: string;
  deliveryInstruction?: string;
  requiresCustomerEmail?: boolean;
};

export type ProductAbout = {
  heading: string;
  paragraphs: string[];
  useCases: string[];
};

const hasAny = (text: string, words: string[]) =>
  words.some((word) => text.includes(word));

function cleanSentence(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function productKind(input: AboutInput) {
  const blob = `${input.name} ${input.category || ''} ${input.description || ''}`.toLowerCase();
  if (hasAny(blob, ['api', 'token', 'credit'])) return 'service';
  if (hasAny(blob, ['vps', 'hosting', 'server', 'domain'])) return 'service';
  if (hasAny(blob, ['subscription', 'premium', 'pro', 'plus', 'plan', 'slot', 'account']))
    return 'subscription';
  if (hasAny(blob, ['redeem', 'verification', 'unlock'])) return 'service';
  return 'product';
}

function capabilityProfile(input: AboutInput) {
  const blob = `${input.name} ${input.category || ''} ${input.description || ''}`.toLowerCase();
  const name = input.name;

  if (hasAny(blob, ['cursor', 'codex', 'replit', 'github', 'kiro', 'lovable'])) {
    return {
      audience: 'developers, students and teams building software projects',
      purpose:
        'AI-assisted coding, debugging, code review, app prototyping and faster development workflows',
      examples: [
        `${name} can help with writing code, fixing bugs, understanding errors and improving existing projects.`,
        'It is useful for web apps, scripts, automation, backend work, frontend changes and learning programming concepts.',
        'Developers usually choose this type of tool when they want coding help directly inside their development workflow.',
      ],
    };
  }

  if (hasAny(blob, ['chatgpt', 'claude', 'gemini', 'grok', 'perplexity'])) {
    return {
      audience: 'students, creators, researchers, freelancers and business users',
      purpose:
        'AI chat, writing, research, study help, document analysis, coding support and daily productivity',
      examples: [
        `${name} is commonly used for writing content, summarizing information, planning work and getting AI assistance for complex tasks.`,
        'It can support study notes, business messages, research outlines, code explanations and productivity workflows.',
        'Choose this type of AI plan when you need stronger model access, higher usage capacity or a more capable AI assistant than a free plan.',
      ],
    };
  }

  if (hasAny(blob, ['netflix', 'prime video', 'youtube premium', 'spotify', 'apple music', 'xbox'])) {
    const quality = hasAny(blob, ['4k', 'ultra hd', 'uhd'])
      ? 'including supported 4K or Ultra HD playback where the plan and device allow it'
      : 'depending on the plan, app and supported device';
    return {
      audience: 'customers who want entertainment access without arranging the full subscription themselves',
      purpose:
        'streaming movies, seasons, music, videos, games or premium entertainment features',
      examples: [
        `${name} is used for entertainment access such as watching movies, shows, videos or listening to premium music ${quality}.`,
        'It is suitable for personal viewing, family entertainment, mobile streaming and smart-TV app usage when supported by the platform.',
        'Check the exact account type, device limits, region, login method and duration before ordering because entertainment platforms can apply their own restrictions.',
      ],
    };
  }

  if (hasAny(blob, ['canva', 'capcut', 'figma', 'adobe', 'freepik', 'leonardo', 'kling', 'heygen', 'veo', 'krea', 'flux', 'minimax', 'xingtu', 'meitu'])) {
    return {
      audience: 'designers, editors, marketers, social media creators and agencies',
      purpose:
        'graphic design, video editing, AI image generation, templates, brand assets and creative production',
      examples: [
        `${name} is useful for creating social media posts, reels, ads, thumbnails, presentations, mockups and branded content.`,
        'Creators use these tools to speed up editing, generate assets, export professional media and manage design work for clients or personal brands.',
        'Before purchase, confirm whether the listing is an invite, account, slot, credits package or redemption code so the activation method matches your workflow.',
      ],
    };
  }

  if (hasAny(blob, ['surfshark', 'express vpn', 'expressvpn', 'protonvpn', 'proton vpn', 'pia vpn', 'hma', 'vpn'])) {
    return {
      audience: 'users who need privacy-focused browsing and secure access on supported devices',
      purpose:
        'VPN browsing, encrypted connections, private network access and safer use of public Wi-Fi',
      examples: [
        `${name} is used to connect through a VPN app or extension for more private browsing and safer network usage.`,
        'A VPN subscription can help when using public Wi-Fi, switching server locations or protecting everyday browsing sessions.',
        'Always check the supported apps, device limits, login method and activation rules because VPN providers may block browser-only or unsupported login flows.',
      ],
    };
  }

  if (hasAny(blob, ['microsoft', 'office', '365', 'notion', 'ilovepdf', 'quillbot', 'scribd', 'linkedin', 'coursera', 'udemy', 'duolingo', 'kahoot', 'jetbrains'])) {
    return {
      audience: 'students, professionals, teachers, office teams and productivity-focused users',
      purpose:
        'documents, learning, study tools, productivity apps, collaboration and professional work',
      examples: [
        `${name} is useful for study, office tasks, file work, online courses, writing support or professional productivity depending on the platform.`,
        'Common uses include preparing documents, improving writing, managing notes, learning new skills, collaborating with others and completing daily work faster.',
        'Review whether the offer is a personal account, team seat, invite, education access, code or slot before buying so the subscription fits your expected use.',
      ],
    };
  }

  if (hasAny(blob, ['hostinger', 'vps', 'hosting', 'server'])) {
    return {
      audience: 'website owners, developers, businesses and resellers who need hosting resources',
      purpose:
        'hosting websites, running web apps, deploying projects, managing storage and controlling server resources',
      examples: [
        `${name} can be used for website hosting, business landing pages, app deployment, testing projects and managing online services.`,
        'VPS and hosting products are useful when you need more control than a simple website builder, including server access, storage and bandwidth based on the selected package.',
        'Confirm the selected package, duration, resource limits and activation process before payment so the hosting plan matches your project requirements.',
      ],
    };
  }

  if (hasAny(blob, ['kaspersky', 'windows', 'autodesk', 'license', 'key', 'cdk', 'coupon', 'redeem'])) {
    return {
      audience: 'customers who need software activation, licenses, security tools or redemption access',
      purpose:
        'activating software, redeeming codes, using premium app features or securing devices',
      examples: [
        `${name} is intended for activating or accessing a specific software, license, code, coupon or digital service.`,
        'These listings are commonly used for app activation, premium feature access, security software, operating-system keys or redemption-based plans.',
        'Check the activation instructions carefully because code, key, coupon and account-based products may have different device, region and warranty rules.',
      ],
    };
  }

  if (hasAny(blob, ['telegram', 'discord', 'facebook', 'outlook', 'hotmail', 'icloud', 'apple id', 'gmail'])) {
    return {
      audience: 'users who need account-related access, social platform tools or communication accounts',
      purpose:
        'account access, social platform features, messaging, email use or verification-related workflows',
      examples: [
        `${name} is an account or platform-related digital product for communication, social media, verification or access needs.`,
        'It may be useful for managing online identities, platform features, email access, community tools or social media workflows depending on the exact listing.',
        'Read the delivery and activation notes before payment because account-based products can have login, recovery, 2FA, region and replacement limitations.',
      ],
    };
  }

  return {
    audience: 'customers comparing digital subscriptions, accounts, tools and online services in Pakistan',
    purpose:
      'accessing the listed digital tool, subscription, account, code, credits or online service',
    examples: [
      `${name} gives access to the listed digital product or subscription through Sasify Solutions after payment verification.`,
      'It is suitable for users who want a ready-to-buy digital tool with clear pricing in PKR, checkout support and product-specific delivery instructions.',
      'Review the product description, activation method, duration, warranty terms and any required customer email before placing the order.',
    ],
  };
}

function buildProductAbout(input: AboutInput): ProductAbout {
  const kind = productKind(input);
  const profile = capabilityProfile(input);
  const duration =
    input.duration && input.duration !== '-'
      ? ` The listed access period is ${input.duration}.`
      : '';
  const customerEmail = input.requiresCustomerEmail
    ? ' This listing may require your customer email during checkout so the supplier can process activation or delivery.'
    : '';
  return {
    heading: `About this ${kind}`,
    paragraphs: [
      cleanSentence(
        `${input.name} is a ${kind} for ${profile.audience}. It is mainly used for ${profile.purpose}.${duration}`,
      ),
      cleanSentence(
        `This section explains the real-world use case of ${input.name} so you can decide whether this tool, subscription, account or service matches what you searched for.${customerEmail}`,
      ),
    ],
    useCases: profile.examples.map(cleanSentence),
  };
}

export function productAbout(product: Product) {
  return buildProductAbout({
    name: product.name,
    category: product.category,
    description: product.description,
    duration: product.duration,
  });
}

export function supplierProductAbout(product: SupplierSeoProduct) {
  return buildProductAbout({
    name: product.name,
    category: product.category,
    description: product.description,
    deliveryInstruction: product.deliveryInstruction,
    requiresCustomerEmail: product.requiresCustomerEmail,
  });
}
