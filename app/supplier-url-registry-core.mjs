const normalizedName = (value) => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
const keysOf = (product) => [...new Set([product.canonical_key, product.canonicalKey, product.id].filter(Boolean).map(String))];

// Never fuzzy-match different durations, plans or access types.
export function findSupplierUrl(product, entries) {
  const keys = keysOf(product);
  const keyed = entries.filter((entry) => entry.keys.some((key) => keys.includes(key)));
  if (keyed.length === 1) return keyed[0];
  if (keyed.length > 1) throw new Error('Conflicting saved supplier URL identities');
  const name = normalizedName(product.name);
  const named = entries.filter((entry) => entry.names.includes(name));
  return name && named.length === 1 ? named[0] : null;
}

export function claimSupplierUrl(product, entries, desiredSlug, reservedSlugs = []) {
  let entry = findSupplierUrl(product, entries);
  if (!entry) {
    const occupied = new Set([...reservedSlugs, ...entries.flatMap((item) => [item.slug, ...item.aliases])]);
    let slug = desiredSlug;
    for (let suffix = 2; occupied.has(slug); suffix++) slug = `${desiredSlug}-${suffix}`;
    entry = { slug, keys: [], names: [], aliases: [] };
    entries.push(entry);
  }
  entry.keys = [...new Set([...entry.keys, ...keysOf(product)])];
  entry.names = [...new Set([...entry.names, normalizedName(product.name)].filter(Boolean))];
  if (product.slug && product.slug !== entry.slug && !entry.aliases.includes(product.slug)) entry.aliases.push(product.slug);
  return entry;
}

export function supplierUrlRedirects(entries, activeSlugs) {
  const active = new Set(activeSlugs);
  const routes = new Map();
  for (const entry of entries) {
    if (!active.has(entry.slug)) continue;
    for (const alias of entry.aliases) {
      if (alias === entry.slug || active.has(alias)) continue;
      if (routes.has(alias) && routes.get(alias) !== entry.slug) throw new Error(`Ambiguous supplier URL alias: ${alias}`);
      routes.set(alias, entry.slug);
    }
  }
  return [...routes].sort(([a], [b]) => a.localeCompare(b));
}
