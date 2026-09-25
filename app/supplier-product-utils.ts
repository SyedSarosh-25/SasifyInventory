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
