import { favicon, initials } from './product-utils.ts';

const supplierDomains: Array<[RegExp, string]> = [
  [/chatgpt|openai/i, 'chatgpt.com'],
  [/claude/i, 'claude.ai'],
  [/capcut/i, 'capcut.com'],
  [/grok|\bx premium\b|twitter/i, 'x.com'],
  [/canva/i, 'canva.com'],
  [/cursor/i, 'cursor.com'],
  [/gemini/i, 'gemini.google.com'],
  [/perplexity/i, 'perplexity.ai'],
  [/deepseek/i, 'deepseek.com'],
  [/sora/i, 'openai.com'],
  [/manus/i, 'manus.im'],
  [/suno/i, 'suno.com'],
  [/elevenlabs/i, 'elevenlabs.io'],
  [/higgsfield/i, 'higgsfield.ai'],
  [/kling/i, 'klingai.com'],
  [/replit/i, 'replit.com'],
  [/lovable/i, 'lovable.dev'],
  [/bolt(?:\.new)?/i, 'bolt.new'],
  [/netflix/i, 'netflix.com'],
  [/spotify/i, 'spotify.com'],
  [/youtube/i, 'youtube.com'],
  [/prime video|amazon prime/i, 'primevideo.com'],
  [/telegram/i, 'telegram.org'],
  [/notion/i, 'notion.so'],
  [/hostinger/i, 'hostinger.com'],
  [/surfshark/i, 'surfshark.com'],
  [/nordvpn/i, 'nordvpn.com'],
  [/expressvpn/i, 'expressvpn.com'],
  [/midjourney/i, 'midjourney.com'],
  [/runway/i, 'runwayml.com'],
  [/figma/i, 'figma.com'],
  [/github/i, 'github.com'],
  [/microsoft|office 365/i, 'microsoft.com'],
  [/adobe/i, 'adobe.com'],
  [/grammarly/i, 'grammarly.com'],
  [/udemy/i, 'udemy.com'],
  [/coursera/i, 'coursera.org'],
  [/linkedin/i, 'linkedin.com'],
];

export function supplierLogo(name: string, providedUrl = '') {
  const provided = String(providedUrl).trim();
  if (/^https?:\/\//i.test(provided) || /^\/(?!\/)/.test(provided)) return provided;
  if (/\bmuse\s*ai\b/i.test(name)) return '/muse-ai-logo.png';
  const domain = supplierDomains.find(([pattern]) => pattern.test(name))?.[1];
  return domain ? favicon(domain) : '';
}

export function supplierMonogram(name: string) {
  return initials(name) || '⚡';
}

export type CuratedBullet = {
  label: string;
  detail: string;
};

export type CuratedProductStructure = {
  summary: string;
  bullets: CuratedBullet[];
  activationNote?: string;
};

export function getCuratedProductDetails(product?: { name?: string; description?: string } | null): CuratedProductStructure {
  const name = String(product?.name || '').toLowerCase();

  if (/icloud/i.test(name)) {
    return {
      summary: 'Upgrade your personal Apple ID with official iCloud+ storage at wholesale rates.',
      bullets: [
        { label: '2TB Cloud Storage', detail: 'Ample space to safely back up your entire photo library, 4K videos, documents, and device backups.' },
        { label: '100% Private & Secure', detail: 'Activated via official Apple Family Sharing. Other family members cannot see your private photos, files, or messages.' },
        { label: 'Apple iCloud+ Perks', detail: 'Includes iCloud Private Relay, Hide My Email, and HomeKit Secure Video.' },
        { label: 'Universal Device Sync', detail: 'Instant automatic synchronization across iPhone, iPad, Mac, and Windows PC.' },
        { label: 'Full Replacement Warranty', detail: 'Dedicated technical support and full duration replacement warranty coverage.' }
      ],
      activationNote: 'Delivered automatically via WhatsApp. Provide your Apple ID email for the instant family invitation link (no Apple password required).'
    };
  }

  if (/chatgpt|openai|\bgpt\b/i.test(name)) {
    const isShared = /share|slot/i.test(name);
    return {
      summary: isShared
        ? 'Official ChatGPT Plus shared access featuring top OpenAI models and advanced productivity tools.'
        : 'Official ChatGPT Plus subscription for professional productivity, coding, research, and creative workflows.',
      bullets: [
        { label: 'Frontier AI Models', detail: 'Full access to GPT-4o, canvas workspaces, voice mode, and specialized reasoning models.' },
        { label: 'Advanced Features', detail: 'High-resolution DALL-E image generation, code interpreter, and real-time web browsing.' },
        { label: 'Multi-Device Access', detail: 'Use seamlessly across web browsers, desktop apps, and iOS/Android mobile apps.' },
        { label: 'Replacement Warranty', detail: isShared ? '25-day replacement warranty with automatic account refresh and uninterrupted support.' : 'Full term replacement warranty with prompt credential and login assistance.' }
      ],
      activationNote: isShared
        ? 'Direct credentials sent to your WhatsApp immediately upon order confirmation. Auto-resets every 25 days with full warranty.'
        : 'Instant delivery of secure login credentials or direct account activation via WhatsApp.'
    };
  }

  if (/claude/i.test(name)) {
    return {
      summary: "Access Anthropic's flagship AI models with industry-leading reasoning, coding, and comprehension.",
      bullets: [
        { label: 'Claude 3.5 Sonnet', detail: 'Top-tier benchmark performance in software engineering, mathematics, visual data analysis, and technical writing.' },
        { label: 'Massive Context Window', detail: 'Effortlessly process long documents, large codebases, research papers, and books.' },
        { label: 'Private Workspace', detail: 'Focused, secure environment for everyday professional workflows.' },
        { label: 'Full Replacement Warranty', detail: 'Verified access backed by active replacement support throughout your validity.' }
      ],
      activationNote: 'Direct login credentials sent immediately via WhatsApp.'
    };
  }

  if (/capcut/i.test(name)) {
    return {
      summary: 'Premium CapCut Pro subscription for content creators on mobile and PC.',
      bullets: [
        { label: 'VIP Features Unlocked', detail: 'All premium effects, transitions, animations, and audio filters with zero watermarks.' },
        { label: 'AI Video Tools', detail: 'Auto smart captions, AI script-to-video generator, vocal isolation, and instant background cutout.' },
        { label: '4K 60fps High-Bitrate Export', detail: 'Ultra HD video exports optimized for TikTok, Instagram Reels, and YouTube.' },
        { label: 'Universal Compatibility', detail: 'Works seamlessly on Windows, Mac, Android, and iOS.' },
        { label: 'Full Duration Warranty', detail: 'Guaranteed access and replacement support throughout the entire duration.' }
      ],
      activationNote: 'Delivered via WhatsApp with direct VIP login or activation code.'
    };
  }

  if (/canva/i.test(name)) {
    return {
      summary: 'Official Canva Pro creative subscription activated directly on your personal account.',
      bullets: [
        { label: '100M+ Premium Content', detail: 'Unlimited stock photos, 4K videos, audio tracks, vectors, and premium graphic templates.' },
        { label: 'Magic Studio AI', detail: 'Magic Eraser, background remover, Magic Expand, and text-to-image design generation.' },
        { label: 'Brand Kits & Pro Downloads', detail: 'Unlimited brand kits, custom fonts, transparent PNGs, and SVG exports.' },
        { label: 'Personal Account Access', detail: 'Activated directly on your personal Canva account without affecting existing designs.' },
        { label: 'Full Replacement Warranty', detail: 'Guaranteed active access throughout the subscription term.' }
      ],
      activationNote: 'Delivered via WhatsApp with an official team invitation link to activate on your existing Canva email.'
    };
  }

  if (/adobe/i.test(name)) {
    return {
      summary: 'Complete Adobe Creative Cloud suite for professional designers, video editors, and digital artists.',
      bullets: [
        { label: 'Full App Suite', detail: 'Photoshop, Illustrator, Premiere Pro, After Effects, InDesign, and Lightroom.' },
        { label: 'Generative AI Powered', detail: 'Built-in Adobe Firefly generative fill, expand, and text effects.' },
        { label: 'Multi-Platform Support', detail: 'Install on desktop, iPad, and mobile devices.' },
        { label: 'Cloud Storage & Sync', detail: 'Creative Cloud libraries and multi-device asset synchronization.' },
        { label: 'Full Replacement Warranty', detail: 'Reliable subscription backed by active replacement support.' }
      ],
      activationNote: 'Invitation link or pre-activated enterprise account sent via WhatsApp.'
    };
  }

  if (/microsoft|office 365/i.test(name)) {
    return {
      summary: 'Official Microsoft 365 subscription with 1TB OneDrive cloud storage and premium desktop apps.',
      bullets: [
        { label: '1TB OneDrive Storage', detail: 'Secure automatic backup for photos, files, and documents across all devices.' },
        { label: 'Full Office Apps', detail: 'Premium versions of Word, Excel, PowerPoint, Outlook, and OneNote.' },
        { label: 'Multi-Device Sync', detail: 'Works smoothly on Windows, Mac, iPad, iPhone, and Android.' },
        { label: 'Full Replacement Warranty', detail: 'Dedicated replacement warranty and customer support.' }
      ],
      activationNote: 'Delivered via WhatsApp with official account setup instructions.'
    };
  }

  if (/youtube/i.test(name)) {
    return {
      summary: 'Enjoy uninterrupted, ad-free streaming across all YouTube apps and devices.',
      bullets: [
        { label: '100% Ad-Free Video', detail: 'Zero advertisements before, during, or after video playback.' },
        { label: 'Background Play & PiP', detail: 'Audio continues playing with your screen locked or while using other apps.' },
        { label: 'YouTube Music Premium', detail: 'Stream over 100M songs and live performances with background audio.' },
        { label: 'Offline Video Downloads', detail: 'Save full videos and playlists directly to your device for offline viewing.' },
        { label: 'Full Replacement Warranty', detail: 'Guaranteed active subscription for the full duration.' }
      ],
      activationNote: 'Delivered via WhatsApp through an official family group invitation link sent to your Google email.'
    };
  }

  if (/spotify/i.test(name)) {
    return {
      summary: 'Stream over 100 million songs ad-free with high-fidelity audio on your personal account.',
      bullets: [
        { label: 'Ad-Free Music', detail: 'Completely ad-free listening with unlimited skips and on-demand track playback.' },
        { label: 'Offline Listening', detail: 'Download your favorite playlists and albums for offline listening on mobile and desktop.' },
        { label: 'High-Fidelity Audio', detail: 'Crystal-clear sound streaming up to 320kbps.' },
        { label: 'Full Replacement Warranty', detail: 'Replacement guarantee throughout your subscription term.' }
      ],
      activationNote: 'Activated on your personal Spotify account via invitation link or login setup.'
    };
  }

  if (/linkedin/i.test(name)) {
    return {
      summary: 'Accelerate your career, networking, and outreach with official LinkedIn Business / Premium.',
      bullets: [
        { label: 'InMail Messaging Credits', detail: 'Directly reach recruiters, founders, and key industry decision-makers.' },
        { label: 'Full Profile Visibility', detail: 'See everyone who viewed your profile over the past 90 days.' },
        { label: 'LinkedIn Learning Access', detail: 'Unlimited access to over 16,000+ expert business and technology courses.' },
        { label: 'Advanced Search & Insights', detail: 'Competitive benchmarking and applicant insights for career advancement.' },
        { label: 'Full Replacement Warranty', detail: 'Active warranty coverage for the duration of the plan.' }
      ],
      activationNote: 'Direct upgrade link or pre-activated business credentials sent via WhatsApp.'
    };
  }

  if (/vpn|surfshark|expressvpn|nordvpn|ipvanish|adguard/i.test(name)) {
    return {
      summary: 'High-speed encrypted VPN security to protect your privacy, data, and access worldwide content.',
      bullets: [
        { label: 'Military-Grade Encryption', detail: 'Protects your passwords, browsing history, and data on public and home Wi-Fi.' },
        { label: 'Global Server Access', detail: 'Bypass geo-restrictions and ISP throttling across dozens of high-speed countries.' },
        { label: 'Strict No-Logs & Kill Switch', detail: 'Certified privacy protection with automatic internet kill-switch.' },
        { label: 'Multi-Platform', detail: 'Easy installation on Windows, macOS, Android, iOS, and smart TVs.' },
        { label: 'Full Replacement Warranty', detail: 'Dedicated warranty and fast replacement support.' }
      ],
      activationNote: 'Official login credentials delivered instantly to WhatsApp.'
    };
  }

  if (/cursor/i.test(name)) {
    return {
      summary: "The AI-first code editor designed for pair programming with frontier AI models.",
      bullets: [
        { label: 'Multi-File Editing', detail: 'Intelligently edit and refactor across multiple files and directories at once.' },
        { label: 'Full Codebase Indexing', detail: 'The AI understands your entire project context, types, and dependencies.' },
        { label: 'Frontier AI Models', detail: 'Instant access to Claude 3.5 Sonnet and GPT-4o inside your IDE.' },
        { label: 'Full Replacement Warranty', detail: 'Continuous replacement warranty and active support.' }
      ],
      activationNote: 'Instant delivery of account setup credentials via WhatsApp.'
    };
  }

  if (/notion/i.test(name)) {
    return {
      summary: 'All-in-one collaborative workspace for notes, docs, project management, and knowledge bases.',
      bullets: [
        { label: 'Unlimited Blocks & Uploads', detail: 'Zero limits on workspace size, uploads, or document length.' },
        { label: 'Advanced Team Tools', detail: 'Page history, granular access permissions, and synced team databases.' },
        { label: 'Full Replacement Warranty', detail: 'Active subscription guarantee throughout the selected duration.' }
      ],
      activationNote: 'Delivered via WhatsApp with simple team invitation link.'
    };
  }

  if (/perplexity/i.test(name)) {
    return {
      summary: 'Next-generation AI research and conversational search engine with cited web sources.',
      bullets: [
        { label: 'Multi-Model Flexibility', detail: 'Choose between Claude 3.5 Sonnet, GPT-4o, and Sonar reasoning models.' },
        { label: 'Pro Search & Deep Research', detail: 'In-depth research queries with real-time web citations and structured answers.' },
        { label: 'File & Document Analysis', detail: 'Upload PDFs, spreadsheets, and code for deep analysis.' },
        { label: 'Full Replacement Warranty', detail: 'Complete duration replacement coverage.' }
      ],
      activationNote: 'Instant delivery of verified login credentials via WhatsApp.'
    };
  }

  if (/grammarly/i.test(name)) {
    return {
      summary: 'AI writing assistant offering real-time tone adjustment, clarity rewrites, and error detection.',
      bullets: [
        { label: 'Style & Tone Suggestions', detail: 'Tone detection, clarity improvements, and vocabulary enhancement.' },
        { label: 'Plagiarism Detection', detail: 'Check text against billions of online pages to ensure originality.' },
        { label: 'Everywhere Compatibility', detail: 'Works seamlessly across web browsers, desktop apps, MS Office, and mobile keyboards.' },
        { label: 'Full Replacement Warranty', detail: 'Active warranty coverage throughout the period.' }
      ],
      activationNote: 'Delivered via WhatsApp with direct setup credentials or invite link.'
    };
  }

  if (/midjourney|leonardo|kling|runway|freepik|suno|elevenlabs/i.test(name)) {
    return {
      summary: 'Premium AI generation and creative asset access with commercial licensing and high-speed credits.',
      bullets: [
        { label: 'Fast Generation Hours', detail: 'Priority queue processing for fast image, audio, or video rendering.' },
        { label: 'Commercial Usage Rights', detail: 'Full commercial licensing rights for your generated creations.' },
        { label: 'High-Resolution Outputs', detail: 'Maximum export quality and uncompressed downloads.' },
        { label: 'Full Replacement Warranty', detail: 'Active replacement support throughout the term.' }
      ],
      activationNote: 'Delivered via WhatsApp with verified credentials.'
    };
  }

  const productName = product?.name || 'This service';
  return {
    summary: `Official digital subscription access for ${productName} with verified activation and full warranty.`,
    bullets: [
      { label: 'Instant Automated Delivery', detail: 'Setup details and access links sent immediately to WhatsApp upon order confirmation.' },
      { label: 'Guaranteed Access', detail: 'Official, secure activation according to package specifications.' },
      { label: 'Full Duration Warranty', detail: 'Complete replacement guarantee and active technical support throughout the period.' },
      { label: 'Dedicated Customer Support', detail: 'Direct WhatsApp assistance for any questions or setup guidance.' }
    ],
    activationNote: 'After payment verification, fulfillment begins automatically via WhatsApp.'
  };
}

export function curatedProductDescription(product?: { name?: string; description?: string } | null): string {
  const details = getCuratedProductDetails(product);
  const bulletLines = details.bullets.map(b => (b.label ? `${b.label}: ${b.detail}` : b.detail)).join(' ');
  return `${details.summary} ${bulletLines} ${details.activationNote || ''}`.trim();
}
