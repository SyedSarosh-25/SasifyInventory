// Match only a known storefront alias, never every *.vercel.app deployment.
// Previews remain available for testing; API/webhook requests stay on their host.
export function canonicalStorefrontRoute(host, origin) {
  const destination = new URL(origin);
  if (destination.protocol !== 'https:' || destination.pathname !== '/' ||
      destination.search || destination.hash || destination.username || destination.password) {
    throw new Error('Canonical storefront destination must be a plain HTTPS origin.');
  }
  if (!/^[a-z0-9.-]+$/.test(host) || host === destination.host) {
    throw new Error('Redirect source must be a distinct, explicit hostname.');
  }
  return {
    src: '/((?!api(?:/|$)).*)',
    has: [{ type: 'host', value: host }],
    status: 308,
    headers: { Location: `${destination.origin}/$1` },
  };
}
