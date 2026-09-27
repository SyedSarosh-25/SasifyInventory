// Product-family examples and the tag pattern were checked against 77 public
// ikudigitaltools.com product pages (September 2026). Other labels below are
// adapted to Sasify's actual listings; they are not claimed as competitor data.
type TagKind = 'subscription' | 'credits' | 'plan' | 'product' | 'service';
type Family = { test: RegExp; label: string; kind?: TagKind; hint?: string };

const families: Family[] = [
  { test: /chatgpt-plus-shared/, label: 'ChatGPT Plus shared account' },
  { test: /chatgpt-plus/, label: 'ChatGPT Plus' },
  { test: /chatgpt-business/, label: 'ChatGPT Business' },
  { test: /chatgpt-k12/, label: 'ChatGPT Education' },
  { test: /chatgpt/, label: 'ChatGPT', kind: 'plan' },
  { test: /chatprd/, label: 'ChatPRD' },
  { test: /gpt-6-astra-api/, label: 'GPT-6 Astra API', kind: 'credits' },
  { test: /codex/, label: 'Codex API', kind: 'credits', hint: 'Codex API credits' },
  { test: /claude.*api|api.*claude/, label: 'Claude API', kind: 'credits', hint: 'Claude API credits' },
  { test: /claude-team/, label: 'Claude Team' },
  { test: /claude/, label: 'Claude AI' },
  { test: /(?:api-)?cu(?:r|s)or|cursor/, label: 'Cursor Pro', kind: 'credits' },
  { test: /canva.*edu/, label: 'Canva Education' },
  { test: /canva.*panel/, label: 'Canva Pro Panel' },
  { test: /canva/, label: 'Canva Pro', hint: 'Canva Pro design tools' },
  { test: /capcut.*team/, label: 'CapCut Pro Team', hint: 'CapCut Pro Team video editing' },
  { test: /capcut/, label: 'CapCut Pro', hint: 'CapCut Pro video editing' },
  { test: /figma.*education/, label: 'Figma Education' },
  { test: /figma/, label: 'Figma Pro' },
  { test: /adobe.*express/, label: 'Adobe Express' },
  { test: /adobe.*firefly/, label: 'Adobe Firefly' },
  { test: /adobe/, label: 'Adobe Creative Cloud' },
  { test: /autodesk/, label: 'Autodesk' },
  { test: /gemini/, label: 'Google Gemini' },
  { test: /grok.*api/, label: 'Grok API', kind: 'credits' },
  { test: /grok/, label: 'Super Grok' },
  { test: /perplexity/, label: 'Perplexity Pro' },
  { test: /duolingo/, label: 'Duolingo Super' },
  { test: /microsoft.*copilot/, label: 'Microsoft Copilot' },
  { test: /microsoft.*office.*key/, label: 'Microsoft Office 2024 key', kind: 'product' },
  { test: /key-windows/, label: 'Windows 10/11 Pro key', kind: 'product' },
  { test: /microsoft|ms-office|admin-ms365/, label: 'Microsoft 365' },
  { test: /notion.*business/, label: 'Notion Business' },
  { test: /notion/, label: 'Notion Plus' },
  { test: /hostinger.*vps/, label: 'Hostinger VPS', kind: 'service' },
  { test: /hostinger/, label: 'Hostinger hosting', kind: 'service' },
  { test: /nord-vpn/, label: 'NordVPN' },
  { test: /surfshark/, label: 'Surfshark VPN' },
  { test: /express-vpn/, label: 'ExpressVPN' },
  { test: /proton-unlimited/, label: 'Proton Unlimited' },
  { test: /kaspersky/, label: 'Kaspersky Premium' },
  { test: /adguard-vpn/, label: 'AdGuard VPN' },
  { test: /hotspot-shield/, label: 'Hotspot Shield VPN' },
  { test: /ipvanish/, label: 'IPVanish VPN' },
  { test: /key-hma/, label: 'HMA VPN key', kind: 'product' },
  { test: /vpn/, label: 'VPN', kind: 'plan' },
  { test: /spotify/, label: 'Spotify Premium' },
  { test: /apple-music/, label: 'Apple Music' },
  { test: /amazon-prime/, label: 'Amazon Prime Video' },
  { test: /youtube-premium/, label: 'YouTube Premium' },
  { test: /hbo-max/, label: 'HBO Max' },
  { test: /xbox-game-pass/, label: 'Xbox Game Pass Ultimate' },
  { test: /linkedin.*sales/, label: 'LinkedIn Sales Navigator' },
  { test: /linkedin/, label: 'LinkedIn Premium' },
  { test: /outlook|hotmail/, label: 'Microsoft Outlook', kind: 'product' },
  { test: /apple-id/, label: 'Apple ID 2FA', kind: 'service' },
  { test: /gmail/, label: 'Gmail account', kind: 'product' },
  { test: /headspace/, label: 'Headspace Premium' },
  { test: /coursera/, label: 'Coursera Premium' },
  { test: /udemy/, label: 'Udemy Personal Plan' },
  { test: /scribd/, label: 'Scribd Premium' },
  { test: /quizlet/, label: 'Quizlet Plus' },
  { test: /lovable/, label: 'Lovable' },
  { test: /replit/, label: 'Replit Core' },
  { test: /jetbrains/, label: 'JetBrains Edu Pack' },
  { test: /zoom/, label: 'Zoom Pro' },
  { test: /freepik/, label: 'Freepik Magnific', kind: 'credits' },
  { test: /heygen/, label: 'HeyGen Creator' },
  { test: /eleven.*reader/, label: 'ElevenReader Ultra' },
  { test: /elevenlabs/, label: 'ElevenLabs', kind: 'credits' },
  { test: /leonardo/, label: 'Leonardo AI', kind: 'credits' },
  { test: /krea/, label: 'Krea AI', kind: 'credits' },
  { test: /kling/, label: 'Kling AI', kind: 'credits' },
  { test: /minimax/, label: 'Minimax AI', kind: 'credits' },
  { test: /gamma/, label: 'Gamma AI' },
  { test: /muse-ai/, label: 'Muse AI', kind: 'credits' },
  { test: /runway/, label: 'Runway Pro' },
  { test: /suno/, label: 'Suno Pro' },
  { test: /n8n/, label: 'n8n Starter' },
  { test: /framer/, label: 'Framer Basic' },
  { test: /meitu/, label: 'Meitu SVIP' },
  { test: /grammarly/, label: 'Grammarly AI Pro' },
  { test: /quillbot/, label: 'QuillBot Premium' },
  { test: /ilovepdf/, label: 'iLovePDF Premium' },
  { test: /300-buy-sell-groups-telegram-links/, label: 'Telegram buy-sell group links', kind: 'product' },
  { test: /telegram/, label: 'Telegram group members', kind: 'service' },
  { test: /account-x-stock/, label: 'X account', kind: 'product' },
  { test: /upgrade-x/, label: 'X Premium' },
  { test: /code-redeem-50-aws/, label: 'AWS credit code', kind: 'credits' },
  { test: /code-redeem-100-gcp/, label: 'Google Cloud credit code', kind: 'credits' },
  { test: /akool/, label: 'Akool AI', kind: 'credits' },
  { test: /cuty/, label: 'Cuty AI', kind: 'credits' },
  { test: /manus/, label: 'Manus Pro' },
  { test: /proxyscrape/, label: 'ProxyScrape residential proxy', kind: 'service' },
  { test: /unlock-facebook/, label: 'Facebook account recovery', kind: 'service' },
  { test: /veo3/, label: 'Veo 3 Antigravity', kind: 'credits' },
  { test: /vidiq/, label: 'vidIQ Boost' },
  { test: /link-gift-elevenereadr/, label: 'ElevenReader Ultra' },
  { test: /blox-fruits/, label: 'Blox Fruits Roblox', kind: 'product' },
];

function fallbackLabel(name: string) {
  return name.replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/\b(?:full warranty|warranty|fw|\d+\s*(?:days?|months?|years?|d|m|y))\b.*$/i, '')
    .replace(/[()[\]{}]/g, ' ').replace(/\s+/g, ' ').trim()
    .split(' ').slice(0, 5).join(' ') || name;
}

export function productSearchTags(name: string, slug: string) {
  const family = families.find(({ test }) => test.test(slug));
  const label = family?.label || fallbackLabel(name);
  const kind = family?.kind || 'subscription';
  if (slug === 'chatgpt-plus-1-month') return [
    'ChatGPT Plus', 'chat gpt plus', 'gpt plus', 'ChatGPT subscription',
    'ChatGPT Plus price', 'ChatGPT Plus price in Pakistan',
    'buy ChatGPT Plus Pakistan', 'ChatGPT Plus subscription Pakistan',
  ];
  if (slug === 'chatgpt-plus-shared-account') return [
    'ChatGPT Plus', 'chat gpt plus', 'gpt plus', 'ChatGPT subscription',
    'ChatGPT Plus price', 'ChatGPT Plus price in Pakistan',
    'ChatGPT Plus subscription Pakistan', 'ChatGPT Plus shared account Pakistan',
  ];
  if (slug.startsWith('figma-') && !slug.includes('education')) return [
    'Figma', 'Figma Pro', 'Figma subscription', 'Figma price',
    'Figma price in Pakistan', 'buy Figma Pakistan', 'Figma subscription Pakistan',
  ];
  const tags = [label];
  if (family?.hint) tags.push(family.hint);
  if (kind === 'credits') tags.push(`${label} credits`);
  else if (kind === 'service') tags.push(`${label} plans`);
  else if (kind === 'product') tags.push(`${label} Pakistan`);
  else tags.push(`${label} subscription`);
  tags.push(`${label} price`, `${label} price in Pakistan`);
  if (slug !== 'hostinger-vps') tags.push(`buy ${label} Pakistan`);
  if (kind === 'credits') tags.push(`${label} credits Pakistan`);
  else if (kind === 'service') tags.push(`${label} plans Pakistan`);
  else if (kind === 'product') tags.push(`${label} online Pakistan`);
  else tags.push(`${label} subscription Pakistan`);
  return [...new Set(tags)];
}
