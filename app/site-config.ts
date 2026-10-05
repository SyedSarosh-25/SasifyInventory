export const defaultSiteOrigin = 'https://www.sasifysolutions.com';

const origin = new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN || defaultSiteOrigin);
if (!['http:', 'https:'].includes(origin.protocol) || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
  throw new Error('NEXT_PUBLIC_SITE_ORIGIN must be a plain HTTP(S) origin.');
}

export const siteOrigin = origin.origin;
export const siteTitle = 'Sasify Solutions | Automated Tools & Subscriptions Pakistan';
export const siteDescription = 'Pakistan\'s 1st fully automated digital store for tools & subscriptions. Buy genuine AI, design, coding and productivity licenses in PKR with instant delivery.';
export const founderProfile = 'https://pk.linkedin.com/in/syedsarosh2';
export const googleBusinessProfile = 'https://www.google.com/maps/place/Sasify+Digital+Solutions/@33.5298115,73.1663875,16z/data=!4m18!1m9!3m8!1s0x38dfed9bda8bf345:0xb57a60ba54b9be1e!2sSasify+Digital+Solutions!8m2!3d33.5298115!4d73.1663875!9m1!1b1!16s%2Fg%2F11yzclp9ps!3m7!1m9!1s0x38dfed9bda8bf345:0xb57a60ba54b9be1e!2sSasify+Digital+Solutions!8m2!3d33.5298115!4d73.1663875!9m1!1b1!16s%2Fg%2F11yzclp9ps!18m1!1e1?entry=ttu';
export const socials = [
  { name: 'Instagram', domain: 'instagram.com', href: 'https://www.instagram.com/sasify_solutions/' },
  { name: 'Facebook', domain: 'facebook.com', href: 'https://www.facebook.com/Sasify_Solutions/' },
  { name: 'TikTok', domain: 'tiktok.com', href: 'https://www.tiktok.com/@sasify_solutions' },
];
