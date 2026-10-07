export type ToolPlanFeatureProduct = {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  requires_customer_email?: boolean;
  requiresCustomerEmail?: boolean;
  activation_sla?: string;
  activationSla?: string;
  source?: 'local' | 'supplier';
  localProduct?: {
    details?: string[];
  };
};

export function extractWarrantyText(name: string, desc?: string, durationLabel?: string): string {
  const text = `${name || ''} ${desc || ''}`;
  const wMatch = text.match(/\b(?:warranty|guarantee)\s*[:\-]?\s*(\d+[- ]*(?:days?|months?|years?|d|m|y|h|hours?))\b/i)
    || text.match(/\b(\d+[- ]*(?:days?|months?|years?|d|m|y|h|hours?))\s*(?:warranty|guarantee)\b/i)
    || text.match(/\bw(\d+[dmyh])\b/i);

  if (wMatch) {
    let raw = wMatch[1].replace(/\s+/g, ' ').replace(/-/g, '-').trim();
    // Normalize casing, e.g. "5-DAY" -> "5-Day", "1 YEAR" -> "1 Year"
    raw = raw.replace(/(\d+)[- ]*([a-z]+)/i, (_, num, unit) => {
      const u = unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();
      return `${num}-${u}`;
    });
    return `${raw} replacement warranty`;
  }
  if (/\b(?:25[- ]?day)\b/i.test(text) || /\bshared\b/i.test(name || '')) {
    return '25-Day replacement warranty included';
  }
  if (durationLabel) {
    return `Full replacement warranty for ${durationLabel}`;
  }
  return '100% Full Replacement Warranty included';
}

export function getToolPlanFeatures(product: ToolPlanFeatureProduct, durationLabel?: string): string[] {
  const name = String(product.name || '').toLowerCase();
  const desc = String(product.description || '');
  const id = String(product.id || '').toLowerCase();
  const isShared = /\bshared\b/i.test(name);
  const isUltra = /\b(?:ultra|stable)\b/i.test(name) || id.includes('ultra');
  const isMomo = /\b(?:momo|partially)\b/i.test(name) || id.includes('momo');
  const isPrivate = /\b(?:private|own\s*email)\b/i.test(name) || Boolean(product.requires_customer_email || product.requiresCustomerEmail);
  const isApi = /\b(?:api|token|tokens|credits?|cdk)\b/i.test(name);
  const isEdu = /\b(?:edu|student|education|k12)\b/i.test(name);
  const isBusiness = /\b(?:business|team|enterprise|org)\b/i.test(name);

  const warrantyText = extractWarrantyText(product.name, desc, durationLabel);

  // 1. ChatGPT Family
  if (name.includes('chatgpt') || name.includes('chat gpt') || (name.includes('gpt') && !name.includes('gemini'))) {
    if (isShared) {
      return [
        '4-member shared pool with private chat history mode',
        'Full GPT-4o, OpenAI o1, Canvas & Voice mode access',
        warrantyText,
        'Instant automated 2FA login code on checkout device',
      ];
    }
    if (name.includes('pro')) {
      return [
        'Full ChatGPT Pro access with unlimited o1 pro mode',
        'Highest compute priority & advanced model limits',
        'Dedicated account credentials with persistent history',
        warrantyText,
      ];
    }
    if (isBusiness) {
      return [
        isPrivate ? 'Private Business seat invite on personal email' : 'Dedicated seat inside managed Business workspace',
        'Access to GPT-4o, o1, Canvas & higher message limits',
        'Enterprise-grade privacy with zero model training',
        warrantyText,
      ];
    }
    if (isEdu) {
      return [
        'Official Student / Edu plan access with GPT-4o',
        'Advanced data analysis, image generation & coding',
        'Long-term validity for academic & research workflows',
        warrantyText,
      ];
    }
    if (isUltra || (id === 'p093' && !isMomo)) {
      return [
        '100% Private dedicated account on personal email',
        'Full access to GPT-4o, OpenAI o1, Canvas & DALL-E 3',
        'Standard OpenAI 3-hour limit · Multi-device login',
        '30-Day full replacement warranty & priority support',
      ];
    }
    if (isMomo) {
      return [
        'Pre-activated dedicated account credentials',
        'Full access to GPT-4o, OpenAI o1, Canvas & DALL-E 3',
        warrantyText,
        'Cost-effective private access · Instant delivery',
      ];
    }
    if (isApi) {
      return [
        'Official OpenAI API credit quota & API key',
        'Compatible with Cursor, NextChat, typingMind & apps',
        `${durationLabel ? `${durationLabel} validity` : 'Full validity'} with balance guarantee`,
        'Instant API key delivery to WhatsApp & Email',
      ];
    }
    return [
      'Full access to GPT-4o, OpenAI o1, Canvas & DALL-E 3',
      isPrivate ? 'Private account on your own personal email' : 'Verified dedicated account credentials',
      warrantyText,
      'Instant delivery to your WhatsApp & Email',
    ];
  }

  // 2. Claude Family
  if (name.includes('claude')) {
    if (name.includes('premium') || id === 'p012') {
      return [
        'Private seat on personal email inside Team workspace',
        'Higher Claude 3.5 Sonnet & Opus usage limits',
        'Support for Projects, Artifacts, Cowork & Claude Code',
        'Priority email delivery · 1-month validity',
      ];
    }
    if (name.includes('standard') || id === 'p013') {
      return [
        'Private seat on personal email inside Team workspace',
        'Access to Claude 3.5 Sonnet & Claude 3 Opus',
        'Full workspace Projects & Artifacts collaboration',
        'Ready to deliver · 1-month validity',
      ];
    }
    if (isApi) {
      return [
        'Claude API token package & gateway access',
        'Compatible with Claude Code, Cursor, Cline & IDEs',
        `${durationLabel ? `${durationLabel} validity` : '30-Day validity'} with full warranty`,
        'Instant redemption code & API guide provided',
      ];
    }
    return [
      'Access to Claude 3.5 Sonnet, Opus & Artifacts',
      isPrivate ? 'Private upgrade on your own personal email' : 'Dedicated account with verified login',
      warrantyText,
      'Instant delivery to your WhatsApp & Email',
    ];
  }

  // 3. CapCut
  if (name.includes('capcut') || name.includes('cap cut')) {
    return [
      'Unlock all Pro effects, transitions, animations & fonts',
      '4K 60FPS high-bitrate export with zero watermark',
      'Smart AI background removal, auto captions & speed curves',
      `Works on PC, Mac, iOS & Android · ${warrantyText}`,
    ];
  }

  // 4. Canva
  if (name.includes('canva')) {
    if (name.includes('admin') || name.includes('seats')) {
      return [
        'Canva Admin panel access with invite & seat management',
        '100M+ premium stock photos, graphics, videos & templates',
        'Magic Studio AI tools: Magic Resize, Eraser & Brand Kit',
        warrantyText,
      ];
    }
    return [
      '100M+ premium stock photos, graphics, videos & templates',
      '1-Click Magic Resize, Background Remover & Brand Kit',
      'Direct private upgrade on your personal email',
      warrantyText,
    ];
  }

  // 5. Cursor AI
  if (name.includes('cursor')) {
    return [
      isApi ? 'High-quota Cursor Pro requests (Claude 3.5 & GPT-4o)' : '500 fast premium requests (Claude 3.5 Sonnet & GPT-4o)',
      'Unlimited slow requests & Cursor Composer multi-file agent',
      'Full codebase indexing, AI chat & terminal debugging',
      warrantyText,
    ];
  }

  // 6. Hostinger
  if (name.includes('hostinger')) {
    if (name.includes('vps') || id === 'p101') {
      return [
        'High-performance KVM VPS with dedicated RAM & vCPU',
        'Ultra-fast NVMe storage, dedicated IP & high-speed port',
        'Full root access: Ubuntu, Debian, AlmaLinux or CentOS',
        '12-Month full package validity & 24/7 server uptime',
      ];
    }
    return [
      'Host unlimited websites with unmetered bandwidth & NVMe',
      'Free SSL certificates, business emails & 1-click WordPress',
      'Easy-to-use hPanel control with 99.9% uptime guarantee',
      'Activated on your personal email within 6 hours SLA',
    ];
  }

  // 7. Perplexity
  if (name.includes('perplexity')) {
    return [
      'Unlimited Pro Search with Claude 3.5 Sonnet & GPT-4o',
      'File, PDF & document analysis with direct web citations',
      'Official Pro activation code / CDK for Web, iOS & Android',
      warrantyText,
    ];
  }

  // 8. Figma
  if (name.includes('figma')) {
    return [
      'Unlimited Figma files, team libraries & version history',
      'Dev Mode inspection, code generation & interactive prototypes',
      'Direct private upgrade on your personal email',
      warrantyText,
    ];
  }

  // 9. Adobe
  if (name.includes('adobe')) {
    return [
      'Genuine Adobe desktop & mobile apps with Cloud sync',
      'Adobe Firefly generative AI credits included',
      'Direct activation on personal Adobe ID email',
      warrantyText,
    ];
  }

  // 10. Midjourney
  if (name.includes('midjourney')) {
    return [
      'Fast GPU hours for ultra-realistic photorealistic AI imagery',
      'Full commercial usage rights for client & marketing work',
      'Access via private Discord DM bot or web generator',
      warrantyText,
    ];
  }

  // 11. ElevenLabs & Minimax
  if (name.includes('elevenlabs') || name.includes('minimax')) {
    return [
      'Ultra-realistic AI voice synthesis & voice cloning',
      'Multi-lingual speech generation & studio audio mastering',
      'Guaranteed credit quota for lifetime or full duration',
      'Instant CDK code / account delivery to WhatsApp & Email',
    ];
  }

  // 12. Grok / SuperGrok
  if (name.includes('grok')) {
    return [
      'Unrestricted Grok 2 & Grok 3 AI models with real-time X search',
      'Flux-powered unrestricted AI image generation',
      'Dedicated account credentials with persistent chat history',
      warrantyText,
    ];
  }

  // 13. Streaming (Netflix, Spotify, YouTube, Prime)
  if (name.includes('netflix')) {
    return [
      '4K Ultra HD + HDR premium streaming screen',
      'Private profile slot protected by your personal PIN',
      'Works on Smart TV, PC, phone & tablet without geo-block',
      warrantyText,
    ];
  }
  if (name.includes('spotify')) {
    return [
      '100% Ad-free uninterrupted music & podcast listening',
      'Extreme 320kbps audio quality & offline song downloads',
      'Direct upgrade on personal account or fresh profile',
      warrantyText,
    ];
  }
  if (name.includes('youtube')) {
    return [
      'Ad-free YouTube videos with background audio playback',
      'Full YouTube Music Premium subscription included',
      'Family invite activation directly to your personal Google email',
      warrantyText,
    ];
  }
  if (name.includes('prime video') || (name.includes('amazon') && name.includes('prime'))) {
    return [
      'Official Amazon Prime Video 4K UHD streaming',
      'Full access to Amazon Originals, movies & TV series',
      'Multi-device playback with offline downloads',
      warrantyText,
    ];
  }

  // 14. Microsoft / Windows / Office
  if (name.includes('office') || name.includes('microsoft 365') || name.includes('ms office') || name.includes('windows')) {
    return [
      'Genuine Word, Excel, PowerPoint, Outlook & Access',
      'Official permanent license or subscription activation',
      'Compatible with Windows PC, Mac & Mobile devices',
      'Guaranteed genuine activation with technical support',
    ];
  }

  // 15. Notion
  if (name.includes('notion')) {
    return [
      'Unlimited pages, blocks & collaborative team workspaces',
      'Advanced permissions, version history & document export',
      isPrivate ? 'Activated on your own personal email' : 'Dedicated login credentials with full access',
      warrantyText,
    ];
  }

  // 16. Gemini
  if (name.includes('gemini')) {
    return [
      'Gemini Advanced access with 1M+ token context window',
      'Deep research, document analysis, Python coding & logic',
      'Direct activation link or dedicated account credentials',
      warrantyText,
    ];
  }

  // 17. VPN
  if (name.includes('vpn') || name.includes('surfshark') || name.includes('nordvpn') || name.includes('expressvpn')) {
    return [
      'High-speed global servers in 60+ countries with no speed cap',
      'Strict no-logs policy & military-grade AES-256 encryption',
      'Unblocks Netflix, ChatGPT, Hulu & geo-restricted websites',
      warrantyText,
    ];
  }

  // 18. Developer Tools (JetBrains, GitHub, Replit)
  if (name.includes('jetbrains') || name.includes('github') || name.includes('replit')) {
    return [
      'Official developer tools & full IDE suite access',
      'All premium features, plugins & cloud compute unlocked',
      'Direct license / student pack activation on personal account',
      warrantyText,
    ];
  }

  // 19. Social & Learning (X Premium, Duolingo, Headspace, Coursera)
  if (name.includes('upgrade x') || name.includes('x premium')) {
    return [
      'Official blue checkmark verification on your X profile',
      'Monetization eligibility, longer posts & edit button',
      'Grok AI access & algorithmic priority boost',
      `${warrantyText} on your own handle`,
    ];
  }
  if (name.includes('duolingo') || name.includes('headspace') || name.includes('coursera')) {
    return [
      'Full premium unlocked access with no ads or interruptions',
      'Unlimited lessons, downloads & certificate features',
      'Direct activation on your personal email or profile',
      warrantyText,
    ];
  }

  // 20. Freepik / Creative
  if (name.includes('freepik')) {
    return [
      'Unlimited premium vectors, stock photos, PSDs & icons',
      'Freepik AI image generator & Magnific upscaler access',
      'Commercial license included for client & marketing work',
      warrantyText,
    ];
  }

  // 21. Outlook / Email accounts
  if (name.includes('outlook') || name.includes('hotmail') || name.includes('gmail')) {
    return [
      'Fresh verified email account with IMAP/POP3 access',
      'Clean creation IP with recovery info included',
      'Ready for business signups, tools & service registrations',
      'Instant credentials delivery with login guarantee',
    ];
  }

  // 22. Grammarly
  if (name.includes('grammarly')) {
    return [
      'Full Grammarly Premium & AI Pro writing assistance',
      'Tone adjustments, clarity rewrites & plagiarism checks',
      'Works across browser extensions, desktop app & MS Word',
      warrantyText,
    ];
  }

  // Smart Dynamic Fallback
  const bullet1 = isPrivate
    ? 'Private account upgrade on your personal email'
    : isShared
      ? 'Verified credentials with private chat/data mode'
      : isApi
        ? 'Official digital activation code / API quota'
        : isEdu
          ? 'Verified student / education status account'
          : 'Verified login credentials with zero issues';

  const cleanDescLine = desc
    .split(/[\r\n]+/)
    .map(line => line.replace(/^[\s•\-\*✔️✅👍📦💎🚀📌]+/, '').trim())
    .find(line => line.length >= 15 && line.length <= 80 && !/requirement|note|warning|vietnamese|bảo hành/i.test(line));

  const bullet2 = cleanDescLine || 'Full access to all official features and tools';
  const bullet3 = warrantyText;
  const sla = product.activation_sla || product.activationSla;
  const bullet4 = sla
    ? `Delivered to WhatsApp & Email (${sla})`
    : 'Instant delivery to your WhatsApp & Email';

  return [bullet1, bullet2, bullet3, bullet4];
}
