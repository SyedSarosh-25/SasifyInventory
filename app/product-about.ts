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
  searchTerms: string[];
  useCases: string[];
};

const hasAny = (text: string, words: string[]) =>
  words.some((word) => text.includes(word));

function cleanSentence(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function readableSearchName(input: AboutInput) {
  const brandText = `${input.name} ${input.category || ''}`.toLowerCase();
  const inBrand = (value: string) => brandText.includes(value);
  if (inBrand('chatgpt')) return 'ChatGPT Plus';
  if (inBrand('cursor')) return 'Cursor AI';
  if (inBrand('canva')) return 'Canva Pro';
  if (inBrand('netflix')) return 'Netflix screen';
  if (inBrand('capcut')) return 'CapCut Pro';
  if (inBrand('figma')) return 'Figma Pro';
  if (inBrand('adobe') && /premiere|premier/.test(brandText))
    return 'Adobe Premiere Pro';
  if (inBrand('adobe') && inBrand('express')) return 'Adobe Express';
  if (inBrand('adobe') && inBrand('photoshop')) return 'Adobe Photoshop';
  if (inBrand('adobe') && inBrand('lightroom')) return 'Adobe Lightroom';
  if (inBrand('adobe')) return 'Adobe subscription';
  if (inBrand('freepik')) return 'Freepik Premium';
  if (inBrand('heygen')) return 'HeyGen AI';
  if (inBrand('kling')) return 'Kling AI';
  if (inBrand('veo')) return 'Veo 3';
  if (inBrand('elevenlabs')) return 'ElevenLabs';
  if (inBrand('minimax')) return 'Minimax AI';
  if (inBrand('claude')) return 'Claude AI';
  if (inBrand('gemini')) return 'Gemini AI';
  if (inBrand('grok')) return 'Grok AI';
  if (inBrand('perplexity')) return 'Perplexity Pro';
  if (inBrand('youtube')) return 'YouTube Premium';
  if (inBrand('spotify')) return 'Spotify Premium';
  if (inBrand('microsoft') || inBrand('office 365') || inBrand('ms office'))
    return 'Microsoft 365';
  if (inBrand('hostinger') && inBrand('vps')) return 'Hostinger VPS';
  if (inBrand('hostinger')) return 'Hostinger hosting';
  if (brandText.includes('vpn')) {
    if (inBrand('surfshark')) return 'Surfshark VPN';
    if (inBrand('express')) return 'ExpressVPN';
    if (inBrand('proton')) return 'Proton VPN';
    return 'VPN subscription';
  }
  return input.name
    .replace(/[·|()[\]{}]/g, ' ')
    .replace(/\b(full warranty|warranty|fw|official|account|slot|invite|code|redeem)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 5)
    .join(' ');
}

const keywordFamilies = [
  { matches: ['chatgpt'], terms: ['ChatGPT Plus price in Pakistan', 'buy ChatGPT Plus Pakistan', 'ChatGPT Plus subscription Pakistan', 'ChatGPT Plus account Pakistan', 'ChatGPT Plus shared account Pakistan', 'ChatGPT Plus 1 month Pakistan'] },
  { matches: ['claude'], terms: ['Claude AI price in Pakistan', 'buy Claude subscription Pakistan', 'Claude Pro Pakistan', 'Claude Team plan Pakistan', 'Claude AI account Pakistan', 'Claude API credits Pakistan'] },
  { matches: ['cursor'], terms: ['Cursor AI price in Pakistan', 'buy Cursor Pro Pakistan', 'Cursor AI subscription Pakistan', 'Cursor AI credits Pakistan', 'Cursor coding tool Pakistan', 'AI coding tool Pakistan'] },
  { matches: ['canva'], terms: ['Canva Pro price in Pakistan', 'buy Canva Pro Pakistan', 'Canva Pro subscription Pakistan', 'Canva Pro account Pakistan', 'Canva Edu Pakistan', 'Canva design tool Pakistan'] },
  { matches: ['netflix'], terms: ['Netflix screen price in Pakistan', 'Netflix account Pakistan', 'Netflix 4K screen Pakistan', 'Netflix subscription Pakistan', 'buy Netflix Pakistan', 'Netflix streaming Pakistan'] },
  { matches: ['capcut'], terms: ['CapCut Pro price in Pakistan', 'buy CapCut Pro Pakistan', 'CapCut Pro subscription Pakistan', 'CapCut Pro account Pakistan', 'CapCut video editor Pakistan', 'video editing app Pakistan'] },
  { matches: ['adobe', 'premiere'], requireAll: true, terms: ['Adobe Premiere Pro price in Pakistan', 'buy Adobe Premiere Pro Pakistan', 'Adobe Premiere Pro subscription Pakistan', 'Adobe Premiere Pro account Pakistan', 'Adobe video editing software Pakistan', 'video editing software Pakistan'] },
  { matches: ['adobe', 'express'], requireAll: true, terms: ['Adobe Express price in Pakistan', 'buy Adobe Express Pakistan', 'Adobe Express subscription Pakistan', 'Adobe Express account Pakistan', 'Adobe graphic design app Pakistan', 'graphic design app Pakistan'] },
  { matches: ['adobe'], terms: ['Adobe subscription price in Pakistan', 'buy Adobe subscription Pakistan', 'Adobe Creative Cloud Pakistan', 'Adobe account Pakistan', 'Adobe software Pakistan', 'creative software Pakistan'] },
  { matches: ['figma'], terms: ['Figma Pro price in Pakistan', 'buy Figma Pro Pakistan', 'Figma subscription Pakistan', 'Figma Pro account Pakistan', 'Figma Education Pakistan', 'UI design tool Pakistan'] },
  { matches: ['freepik'], terms: ['Freepik Premium price in Pakistan', 'buy Freepik Premium Pakistan', 'Freepik subscription Pakistan', 'Freepik Magnific Pakistan', 'Freepik credits Pakistan', 'AI image tool Pakistan'] },
  { matches: ['heygen'], terms: ['HeyGen AI price in Pakistan', 'buy HeyGen Creator Pakistan', 'HeyGen subscription Pakistan', 'HeyGen AI account Pakistan', 'AI avatar tool Pakistan', 'AI video tool Pakistan'] },
  { matches: ['kling'], terms: ['Kling AI price in Pakistan', 'buy Kling AI Pakistan', 'Kling AI subscription Pakistan', 'Kling AI credits Pakistan', 'Kling 26K credits Pakistan', 'AI video tool Pakistan'] },
  { matches: ['veo'], terms: ['Veo 3 price in Pakistan', 'buy Veo 3 Pakistan', 'Veo 3 subscription Pakistan', 'Veo 3 credits Pakistan', 'Veo AI video Pakistan', 'AI video tool Pakistan'] },
  { matches: ['elevenlabs'], terms: ['ElevenLabs price in Pakistan', 'buy ElevenLabs Pakistan', 'ElevenLabs subscription Pakistan', 'ElevenLabs credits Pakistan', 'ElevenLabs 1M credits Pakistan', 'AI voice tool Pakistan'] },
  { matches: ['minimax'], terms: ['Minimax AI price in Pakistan', 'buy Minimax AI Pakistan', 'Minimax AI subscription Pakistan', 'Minimax credits Pakistan', 'Minimax voice AI Pakistan', 'AI voice tool Pakistan'] },
  { matches: ['gemini'], terms: ['Gemini Pro price in Pakistan', 'buy Gemini Pro Pakistan', 'Gemini AI subscription Pakistan', 'Gemini AI 18 months Pakistan', 'Gemini AI account Pakistan', 'AI assistant Pakistan'] },
  { matches: ['grok'], terms: ['Grok Premium price in Pakistan', 'buy Grok subscription Pakistan', 'SuperGrok Pakistan', 'Grok AI account Pakistan', 'Grok 1 month Pakistan', 'AI assistant Pakistan'] },
  { matches: ['perplexity'], terms: ['Perplexity Pro price in Pakistan', 'buy Perplexity Pro Pakistan', 'Perplexity subscription Pakistan', 'Perplexity AI account Pakistan', 'AI research tool Pakistan', 'AI assistant Pakistan'] },
  { matches: ['coursera'], terms: ['Coursera Premium price in Pakistan', 'buy Coursera Premium Pakistan', 'Coursera subscription Pakistan', 'Coursera account Pakistan', 'Coursera Gemini package Pakistan', 'online learning subscription Pakistan'] },
  { matches: ['codex'], terms: ['Codex API credits Pakistan', 'buy Codex API credits Pakistan', 'Codex token package Pakistan', 'Codex 1 day Pakistan', 'AI API credits Pakistan', 'developer API credits Pakistan'] },
  { matches: ['upgrade x', 'x premium'], terms: ['X Premium price in Pakistan', 'buy X Premium Pakistan', 'X Premium subscription Pakistan', 'X Premium account Pakistan', 'X monetization Pakistan', 'X Premium 3 months Pakistan'] },
  { matches: ['hostinger'], terms: ['Hostinger hosting price in Pakistan', 'buy Hostinger hosting Pakistan', 'Hostinger hosting service Pakistan', 'Hostinger hosting account Pakistan', 'Hostinger VPS Pakistan', 'web hosting Pakistan'] },
  { matches: ['microsoft', 'office 365', 'ms office', 'office'], terms: ['Microsoft 365 price in Pakistan', 'buy Microsoft 365 Pakistan', 'Microsoft 365 subscription Pakistan', 'Office 365 Family Pakistan', 'Microsoft 365 account Pakistan', 'productivity subscription Pakistan'] },
  { matches: ['autodesk'], terms: ['Autodesk price in Pakistan', 'buy Autodesk Pakistan', 'AutoCAD subscription Pakistan', 'Autodesk license Pakistan', 'Autodesk 3 year license Pakistan', 'design software Pakistan'] },
  { matches: ['kaspersky'], terms: ['Kaspersky Premium price in Pakistan', 'buy Kaspersky Premium Pakistan', 'Kaspersky subscription Pakistan', 'Kaspersky VPN Pakistan', 'Kaspersky account Pakistan', 'security software Pakistan'] },
  { matches: ['xbox'], terms: ['Xbox Game Pass price in Pakistan', 'buy Xbox Game Pass Pakistan', 'Xbox Game Pass Ultimate Pakistan', 'Xbox subscription Pakistan', 'PC Game Pass Pakistan', 'gaming subscription Pakistan'] },
  { matches: ['github'], terms: ['GitHub Student Pack Pakistan', 'buy GitHub Student upgrade Pakistan', 'GitHub Education Pakistan', 'GitHub Pro Pakistan', 'GitHub subscription Pakistan', 'developer tools Pakistan'] },
  { matches: ['udemy'], terms: ['Udemy subscription price in Pakistan', 'buy Udemy Personal Plan Pakistan', 'Udemy Personal Plan Pakistan', 'Udemy account Pakistan', 'Udemy courses Pakistan', 'online learning subscription Pakistan'] },
  { matches: ['discord'], terms: ['Discord Nitro price in Pakistan', 'buy Discord Nitro Pakistan', 'Discord subscription Pakistan', 'Discord Nitro account Pakistan', 'Discord gifting badge Pakistan', 'gaming communication tool Pakistan'] },
  { matches: ['apple id'], terms: ['Apple ID 2FA Pakistan', 'buy Apple ID 2FA service Pakistan', 'Apple ID Gmail Pakistan', 'Apple account verification Pakistan', 'Apple ID support Pakistan', 'Apple account service Pakistan'] },
  { matches: ['youtube'], terms: ['YouTube Premium price in Pakistan', 'buy YouTube Premium Pakistan', 'YouTube Premium subscription Pakistan', 'YouTube Premium account Pakistan', 'YouTube Premium 1 month Pakistan', 'streaming subscription Pakistan'] },
  { matches: ['spotify'], terms: ['Spotify Premium price in Pakistan', 'buy Spotify Premium Pakistan', 'Spotify Premium subscription Pakistan', 'Spotify Premium account Pakistan', 'Spotify 3 months Pakistan', 'music subscription Pakistan'] },
  { matches: ['prime video'], terms: ['Amazon Prime Video price in Pakistan', 'buy Amazon Prime Video Pakistan', 'Prime Video subscription Pakistan', 'Prime Video account Pakistan', 'Amazon streaming Pakistan', 'streaming subscription Pakistan'] },
  { matches: ['apple music'], terms: ['Apple Music price in Pakistan', 'buy Apple Music Pakistan', 'Apple Music subscription Pakistan', 'Apple Music account Pakistan', 'Apple Music 5 months Pakistan', 'music subscription Pakistan'] },
  { matches: ['outlook', 'hotmail'], terms: ['Outlook account Pakistan', 'buy Outlook email account Pakistan', 'Outlook mail Pakistan', 'Microsoft email account Pakistan', 'business email Pakistan', 'email account service Pakistan'] },
  { matches: ['gmail'], terms: ['Gmail account Pakistan', 'buy Gmail account Pakistan', 'Gmail service Pakistan', 'Google email account Pakistan', 'email account service Pakistan', 'Gmail verification Pakistan'] },
  { matches: ['duolingo'], terms: ['Duolingo Max price in Pakistan', 'buy Duolingo Max Pakistan', 'Duolingo Super Pakistan', 'Duolingo subscription Pakistan', 'Duolingo language learning Pakistan', 'education subscription Pakistan'] },
  { matches: ['notion'], terms: ['Notion Plus price in Pakistan', 'buy Notion Plus Pakistan', 'Notion Business Pakistan', 'Notion Education Pakistan', 'Notion subscription Pakistan', 'productivity app Pakistan'] },
  { matches: ['quillbot'], terms: ['QuillBot Premium price in Pakistan', 'buy QuillBot Premium Pakistan', 'QuillBot subscription Pakistan', 'QuillBot account Pakistan', 'AI writing tool Pakistan', 'writing assistant Pakistan'] },
  { matches: ['jetbrains'], terms: ['JetBrains student pack Pakistan', 'buy JetBrains Edu Pack Pakistan', 'JetBrains subscription Pakistan', 'JetBrains account Pakistan', 'developer software Pakistan', 'coding tools Pakistan'] },
  { matches: ['replit'], terms: ['Replit Core price in Pakistan', 'buy Replit Core Pakistan', 'Replit subscription Pakistan', 'Replit account Pakistan', 'online coding tool Pakistan', 'AI coding tool Pakistan'] },
  { matches: ['lovable'], terms: ['Lovable AI price in Pakistan', 'buy Lovable Pro Pakistan', 'Lovable subscription Pakistan', 'Lovable AI credits Pakistan', 'AI app builder Pakistan', 'no-code development tool Pakistan'] },
  { matches: ['xingtu'], terms: ['Xingtu VIP price in Pakistan', 'buy Xingtu VIP Pakistan', 'Xingtu subscription Pakistan', 'Xingtu photo editor Pakistan', 'Xingtu account Pakistan', 'photo editing app Pakistan'] },
  { matches: ['meitu'], terms: ['Meitu VIP price in Pakistan', 'buy Meitu VIP Pakistan', 'Meitu subscription Pakistan', 'Meitu photo editor Pakistan', 'Meitu account Pakistan', 'photo editing app Pakistan'] },
  { matches: ['leonardo'], terms: ['Leonardo AI price in Pakistan', 'buy Leonardo AI Pakistan', 'Leonardo AI subscription Pakistan', 'Leonardo AI credits Pakistan', 'AI image tool Pakistan', 'AI creative tool Pakistan'] },
  { matches: ['krea'], terms: ['Krea AI price in Pakistan', 'buy Krea AI Pakistan', 'Krea AI credits Pakistan', 'Krea subscription Pakistan', 'AI image tool Pakistan', 'AI creative tool Pakistan'] },
  { matches: ['flux'], terms: ['Flux AI price in Pakistan', 'buy Flux AI Pakistan', 'Flux AI subscription Pakistan', 'Flux credits Pakistan', 'AI image tool Pakistan', 'AI creative tool Pakistan'] },
  { matches: ['ilovepdf'], terms: ['iLovePDF Premium price in Pakistan', 'buy iLovePDF Premium Pakistan', 'iLovePDF subscription Pakistan', 'iLovePDF account Pakistan', 'PDF tool Pakistan', 'productivity app Pakistan'] },
  { matches: ['scribd'], terms: ['Scribd Premium price in Pakistan', 'buy Scribd Premium Pakistan', 'Scribd subscription Pakistan', 'Scribd account Pakistan', 'ebook subscription Pakistan', 'reading subscription Pakistan'] },
  { matches: ['kahoot'], terms: ['Kahoot Gold price in Pakistan', 'buy Kahoot Gold Pakistan', 'Kahoot subscription Pakistan', 'Kahoot account Pakistan', 'education tool Pakistan', 'learning subscription Pakistan'] },
  { matches: ['linkedin'], terms: ['LinkedIn Premium price in Pakistan', 'buy LinkedIn Premium Pakistan', 'LinkedIn Career Pakistan', 'LinkedIn subscription Pakistan', 'LinkedIn Premium account Pakistan', 'professional subscription Pakistan'] },
  { matches: ['zoom'], terms: ['Zoom Pro price in Pakistan', 'buy Zoom Pro Pakistan', 'Zoom Pro subscription Pakistan', 'Zoom Pro account Pakistan', 'Zoom annual subscription Pakistan', 'video meeting tool Pakistan'] },
  { matches: ['vpn', 'surfshark', 'expressvpn', 'nord vpn', 'proton vpn', 'pia vpn'], terms: ['VPN subscription price in Pakistan', 'buy VPN Pakistan', 'VPN account Pakistan', 'NordVPN Pakistan', 'ExpressVPN Pakistan', 'VPN service Pakistan'] },
  { matches: ['telegram'], terms: ['Telegram members Pakistan', 'Telegram group members Pakistan', 'Telegram buy-sell groups Pakistan', 'buy Telegram members Pakistan', 'Telegram marketing Pakistan', 'Telegram digital product Pakistan'] },
];

// Bing Keyword Research was checked with Country = All and Language = All.
// Keep only relevant brand, product and use-case phrases; exclude free/cracked,
// download-only, login and unrelated spelling suggestions from the rendered copy.
const globalKeywordFamilies = [
  { matches: ['chatgpt'], terms: ['ChatGPT Plus', 'chat gpt plus', 'gpt plus', 'ChatGPT subscription', 'ChatGPT Plus price'] },
  { matches: ['claude'], terms: ['Claude AI', 'Claude subscription', 'Claude AI writing tool', 'Claude API credits', 'AI assistant'] },
  { matches: ['cursor'], terms: ['Cursor AI', 'cursor IDE', 'Cursor AI coding', 'Cursor subscription', 'AI coding tool'] },
  { matches: ['canva'], terms: ['Canva Pro', 'canva professional', 'Canva app', 'Canva Pro subscription', 'Canva Pro price'] },
  { matches: ['capcut'], terms: ['CapCut Pro', 'cap cut pro', 'CapCut Pro PC', 'CapCut video editor', 'CapCut subscription'] },
  { matches: ['adobe', 'premiere'], requireAll: true, terms: ['Adobe Premiere Pro', 'Premiere Pro', 'Adobe video editing', 'video editing software', 'Adobe Premiere subscription'] },
  { matches: ['adobe', 'express'], requireAll: true, terms: ['Adobe Express', 'Adobe Express app', 'Adobe Express design', 'Adobe Express subscription', 'graphic design app'] },
  { matches: ['figma'], terms: ['Figma Pro', 'Figma design', 'Figma app', 'Figma subscription', 'UI design tool'] },
  { matches: ['freepik'], terms: ['Freepik Premium', 'Freepik AI', 'Freepik subscription', 'Freepik credits', 'AI image tool'] },
  { matches: ['elevenlabs'], terms: ['ElevenLabs', 'ElevenLabs AI voice', 'ElevenLabs text to speech', 'ElevenLabs subscription', 'AI voice tool'] },
  { matches: ['minimax'], terms: ['Minimax AI', 'Minimax AI video', 'Minimax AI voice', 'Minimax credits', 'AI video tool'] },
  { matches: ['grok'], terms: ['Grok AI', 'SuperGrok', 'Grok subscription', 'Grok Premium', 'AI assistant'] },
  { matches: ['gemini'], terms: ['Gemini AI', 'Gemini Pro', 'Google Gemini', 'Gemini subscription', 'AI assistant'] },
  { matches: ['perplexity'], terms: ['Perplexity AI', 'Perplexity Pro', 'Perplexity subscription', 'AI research tool', 'AI search'] },
  { matches: ['krea'], terms: ['Krea AI', 'krea', 'Krea AI image', 'Krea AI subscription', 'AI image tool'] },
  { matches: ['runway'], terms: ['Runway AI', 'Runway ML', 'Runway AI video', 'Runway AI video generator', 'AI video tool'] },
  { matches: ['microsoft', 'office 365', 'ms office', 'office'], terms: ['Microsoft 365', 'Office 365', 'Microsoft 365 Copilot', 'Microsoft Office', 'productivity software'] },
  { matches: ['notion'], terms: ['Notion', 'Notion AI', 'Notion app', 'Notion Business', 'productivity app'] },
  { matches: ['quillbot'], terms: ['QuillBot', 'paraphrase generator', 'rewriter', 'AI writing tool', 'writing assistant'] },
  { matches: ['youtube'], terms: ['YouTube Premium', 'YouTube subscription', 'ad-free YouTube', 'streaming subscription', 'YouTube videos'] },
  { matches: ['prime video'], terms: ['Amazon Prime Video', 'Prime Video', 'Amazon streaming', 'streaming subscription', 'movies and series streaming'] },
  { matches: ['apple music'], terms: ['Apple Music', 'Apple Music subscription', 'music streaming', 'music subscription', 'Apple Music account'] },
  { matches: ['hostinger'], terms: ['Hostinger VPS', 'Hostinger hosting', 'web hosting', 'VPS hosting', 'website hosting'] },
  { matches: ['zoom'], terms: ['Zoom Pro', 'Zoom meeting', 'video meeting tool', 'Zoom subscription', 'online meetings'] },
  { matches: ['linkedin'], terms: ['LinkedIn Premium', 'LinkedIn Career', 'LinkedIn subscription', 'professional networking', 'job search tool'] },
  { matches: ['jetbrains'], terms: ['JetBrains', 'JetBrains student pack', 'coding tools', 'developer software', 'IDE subscription'] },
  { matches: ['replit'], terms: ['Replit', 'Replit Core', 'online coding tool', 'AI coding tool', 'Replit subscription'] },
  { matches: ['ilovepdf'], terms: ['iLovePDF', 'iLovePDF Premium', 'PDF editor', 'PDF tool', 'PDF converter'] },
  { matches: ['duolingo'], terms: ['Duolingo', 'Super Duolingo', 'language learning app', 'Duolingo subscription', 'online language learning'] },
  { matches: ['vpn'], terms: ['VPN subscription', 'VPN service', 'VPN app', 'private browsing', 'secure Wi-Fi'] },
];

function listingKeywordModifiers(input: AboutInput, term: string) {
  const source = `${input.name} ${input.duration || ''}`.toLowerCase();
  const modifiers: string[] = [];
  const duration = source.match(/\b(\d+)\s*(months?|m|years?|y|days?|d)\b/);
  if (duration) {
    const unit = duration[2].startsWith('m') ? 'month' : duration[2].startsWith('y') ? 'year' : 'day';
    modifiers.push(`${term} ${duration[1]} ${unit} Pakistan`);
  }
  if (/credit|token/.test(source)) modifiers.push(`${term} credits Pakistan`);
  if (/shared/.test(source)) modifiers.push(`${term} shared account Pakistan`);
  if (/edu|education/.test(source)) modifiers.push(`${term} education Pakistan`);
  if (/slot/.test(source)) modifiers.push(`${term} slot Pakistan`);
  if (/api/.test(source)) modifiers.push(`${term} API Pakistan`);
  return modifiers;
}

function searchIntentPhrases(input: AboutInput, kind: string) {
  // Match families from the listing name only. Category labels can be broad
  // (for example, a Telegram product may sit under a VPN category) and should
  // not inject unrelated commercial keywords into the page.
  const brandText = input.name.toLowerCase();
  const term = readableSearchName(input);
  const family = keywordFamilies.find(({ matches, requireAll }) =>
    requireAll
      ? matches.every((match) => brandText.includes(match))
      : matches.some((match) => brandText.includes(match)),
  );
  const globalFamily = globalKeywordFamilies.find(({ matches, requireAll }) =>
    requireAll
      ? matches.every((match) => brandText.includes(match))
      : matches.some((match) => brandText.includes(match)),
  );
  const descriptor = kind === 'subscription' ? 'subscription' : kind === 'service' ? 'service' : 'digital product';
  const base = family?.terms || [
    `${term} price in Pakistan`,
    `buy ${term} Pakistan`,
    `${term} ${descriptor} Pakistan`,
    `${term} account Pakistan`,
  ];
  // Keep the product-specific, location-qualified phrases first. The global
  // research terms are useful supporting language, but placing them first can
  // push the high-intent Pakistan phrases out of the rendered SEO section.
  return [...new Set([...base, ...(globalFamily?.terms || []), ...listingKeywordModifiers(input, term)])].slice(0, 8);
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
  const brandText = `${input.name} ${input.category || ''}`.toLowerCase();
  const name = input.name;

  if (hasAny(brandText, ['cursor', 'codex', 'replit', 'github', 'kiro', 'lovable'])) {
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

  if (hasAny(brandText, ['chatgpt', 'claude', 'gemini', 'grok', 'perplexity'])) {
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

  if (hasAny(brandText, ['netflix', 'prime video', 'youtube premium', 'spotify', 'apple music', 'xbox'])) {
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

  if (hasAny(brandText, ['canva', 'capcut', 'figma', 'adobe', 'freepik', 'leonardo', 'kling', 'heygen', 'veo', 'runway', 'krea', 'flux', 'minimax', 'xingtu', 'meitu', 'elevenlabs'])) {
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

  if (hasAny(brandText, ['surfshark', 'express vpn', 'expressvpn', 'protonvpn', 'proton vpn', 'pia vpn', 'hma', 'vpn'])) {
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
  const searchPhrases = searchIntentPhrases(input, kind);
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
      cleanSentence(
        `For global search intent, this page covers people comparing ${searchPhrases.slice(0, -1).join(', ')} and ${searchPhrases.at(-1)} before buying online; Pakistan pricing and checkout details are shown where relevant.`,
      ),
    ],
    searchTerms: searchPhrases,
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
