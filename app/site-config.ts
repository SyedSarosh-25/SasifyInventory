export const defaultSiteOrigin = 'https://www.sasifysolutions.com';

const origin = new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN || defaultSiteOrigin);
if (!['http:', 'https:'].includes(origin.protocol) || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
  throw new Error('NEXT_PUBLIC_SITE_ORIGIN must be a plain HTTP(S) origin.');
}

export const siteOrigin = origin.origin;
export const siteTitle = 'Sasify Solutions | Digital Tools and Services Marketplace';
export const siteDescription = 'Explore AI, design, coding and digital tools in Pakistan. Compare PKR prices, plan durations and warranty details, then order from Sasify Solutions on WhatsApp.';
export const founderProfile = 'https://pk.linkedin.com/in/syedsarosh2';
export const socials = [
  { name: 'Instagram', domain: 'instagram.com', href: 'https://www.instagram.com/sasify_solutions/' },
  { name: 'Facebook', domain: 'facebook.com', href: 'https://www.facebook.com/Sasify_Solutions/' },
  { name: 'TikTok', domain: 'tiktok.com', href: 'https://www.tiktok.com/@sasify_solutions' },
];
