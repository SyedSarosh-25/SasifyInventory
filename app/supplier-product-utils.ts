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

export function curatedProductDescription(product: { name?: string; description?: string }): string {
  const name = String(product?.name || '').toLowerCase();

  if (/icloud/i.test(name)) {
    return 'Upgrade your personal Apple ID with official iCloud+ storage at wholesale rates. Safely back up your entire photo library, 4K videos, notes, device backups, and files across iPhone, iPad, Mac, and Windows PC. Activated securely via official Apple Family Sharing with 100% privacy — other family members cannot see your private photos or files. Includes premium iCloud+ features such as iCloud Private Relay, Hide My Email, and HomeKit Secure Video, backed by full duration replacement warranty.';
  }
  if (/chatgpt|openai|\bgpt\b/i.test(name)) {
    return 'Official ChatGPT access featuring GPT-4o, canvas, advanced voice, code execution, web browsing, and custom GPT models. Ideal for programming, research, content creation, and everyday productivity. Includes full setup credentials and active replacement warranty.';
  }
  if (/claude/i.test(name)) {
    return 'Access Anthropic\'s state-of-the-art Claude models including Claude 3.5 Sonnet. Industry-leading reasoning, coding, long-document comprehension, and writing assistance with private workspace access and active support.';
  }
  if (/capcut/i.test(name)) {
    return 'Premium CapCut Pro subscription for mobile and PC. Unlock VIP video editing tools, AI smart captions, 4K 60fps exports, premium transitions, effects, and text animations with full replacement warranty.';
  }
  if (/canva/i.test(name)) {
    return 'Official Canva Pro creative subscription activated directly on your personal account. Enjoy 100M+ premium stock photos, graphics, videos, brand kits, background remover, and Magic AI tools.';
  }
  if (/adobe/i.test(name)) {
    return 'Full suite access to Adobe Creative Cloud apps including Photoshop, Illustrator, Premiere Pro, After Effects, and Lightroom for desktop, iPad, and mobile with active duration support.';
  }
  if (/microsoft|office 365/i.test(name)) {
    return 'Official Microsoft 365 subscription with 1TB OneDrive cloud storage and premium Word, Excel, PowerPoint, and Outlook desktop and mobile apps with full replacement warranty.';
  }
  if (/youtube/i.test(name)) {
    return 'Enjoy uninterrupted, ad-free YouTube videos, background playback while using other apps, offline downloads, and YouTube Music streaming on your personal profile.';
  }
  if (/spotify/i.test(name)) {
    return 'Stream over 100 million songs ad-free with unlimited skips, high-fidelity audio, offline listening, and group sessions on your personal Spotify account.';
  }
  if (/linkedin/i.test(name)) {
    return 'Enhance your professional career and outreach with LinkedIn Business. Enjoy unlimited profile browsing, InMail messaging credits, detailed viewer insights, and full LinkedIn Learning access.';
  }
  if (/vpn|surfshark|expressvpn|nordvpn|ipvanish|adguard/i.test(name)) {
    return 'High-speed encrypted VPN security. Protect your privacy, hide your IP address, bypass ISP throttling and geo-restrictions with fast multi-country servers and kill-switch protection.';
  }
  if (/cursor/i.test(name)) {
    return 'The AI-first code editor built on VS Code. Features multi-file editing, codebase indexing, and intelligent real-time code completion for developers.';
  }
  if (/notion/i.test(name)) {
    return 'Unlimited blocks, collaborative workspaces, version history, and advanced team wikis with Notion Plus for seamless project and knowledge management.';
  }
  if (/perplexity/i.test(name)) {
    return 'Next-generation AI search engine featuring Claude 3.5 Sonnet, GPT-4o, unlimited Pro searches, deep research synthesis, and file analysis with full replacement warranty.';
  }
  if (/grammarly/i.test(name)) {
    return 'Advanced AI writing assistant offering real-time tone adjustment, vocabulary suggestions, clarity rewrites, and plagiarism detection across all apps and browsers.';
  }
  if (/midjourney|leonardo|kling|runway|freepik/i.test(name)) {
    return 'Premium AI generation and creative asset access with commercial licensing, high-speed priority generation, and high-resolution downloads.';
  }
  return `${product?.name || 'This product'} provides official digital subscription access with automated WhatsApp delivery, verified activation, and full duration replacement warranty coverage.`;
}
