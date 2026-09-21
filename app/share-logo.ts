// Inline the real PNG at build time so the OG renderer does not need to fetch
// a file:// URL or depend on the current deployment origin.
// @ts-expect-error Vite's ?inline asset query returns a data URL at build time.
import sasifyLogoDataUri from '../public/sasify-logo.png?inline';

export const sasifyLogoDataUriValue = sasifyLogoDataUri;
