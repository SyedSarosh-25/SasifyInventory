const duplicateNoise = new Set([
  'a', 'an', 'the', 'cdk', 'comes', 'for', 'full', 'has', 'included', 'no', 'not', 'supper', 'with',
  'without', 'warranty', 'nw', 'fw', 'preorder', 'pre',
]);
const durationUnit = /^(d|day|days|m|mo|month|months|y|year|years|w|week|weeks)$/;
const durationWords = new Map([
  ['one', 1], ['two', 2], ['three', 3], ['four', 4], ['five', 5],
  ['six', 6], ['seven', 7], ['eight', 8], ['nine', 9], ['ten', 10],
  ['twelve', 12],
]);

function normalizedDuration(amount, unit) {
  if (['d', 'day', 'days'].includes(unit)) {
    return amount >= 28 && amount <= 31 ? 'duration-1m' : `duration-${amount}d`;
  }
  if (['m', 'mo', 'month', 'months'].includes(unit)) return `duration-${amount}m`;
  if (['y', 'year', 'years'].includes(unit)) return `duration-${amount}y`;
  return `duration-${amount}w`;
}

/**
 * Groups equivalent supplier offers while retaining the actual plan duration.
 * Warranty labels and harmless wording vary by supplier; duration must not.
 */
export function supplierProductKey(name) {
  const tokens = String(name || '')
    .toLowerCase()
    .replace(/(\d),(?=\d)/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) => {
      if (token === 'supergrok' || token === 'suppergrok') return ['super', 'grok'];
      return [token];
    });
  const identity = [];
  let duration = '';
  let warrantyDuration = '';
  const recordDuration = (index, consumed, amount, unit) => {
    const value = normalizedDuration(amount, unit);
    const after = tokens[index + consumed + 1] || '';
    const warrantyContext = after === 'warranty' || after === 'fw' || tokens[index - 1] === 'warranty';
    if (warrantyContext) warrantyDuration ||= value;
    else duration ||= value;
  };
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const compact = token.match(/^(\d+)(d|day|days|m|mo|month|months|y|year|years|w|week|weeks)$/);
    if (compact) {
      recordDuration(index, 0, Number(compact[1]), compact[2]);
      continue;
    }
    const numeric = token.match(/^\d+$/);
    const numericUnit = tokens[index + 1] || '';
    if (numeric && durationUnit.test(numericUnit)) {
      recordDuration(index, 1, Number(token), numericUnit);
      index += 1;
      continue;
    }
    const wordAmount = durationWords.get(token);
    if (wordAmount && durationUnit.test(numericUnit)) {
      recordDuration(index, 1, wordAmount, numericUnit);
      index += 1;
      continue;
    }
    if (durationUnit.test(token) && (/^\d+$/.test(tokens[index - 1] || '') || durationWords.has(tokens[index - 1] || ''))) continue;
    if (duplicateNoise.has(token)) continue;
    identity.push(token);
  }
  let normalizedTokens = [...new Set(identity)];
  // Suppliers use both "Grok Heavy" and "SuperGrok Heavy" for this same
  // Heavy-month offer. Keep SuperGrok distinct for non-Heavy plans.
  if (normalizedTokens.includes('grok') && normalizedTokens.includes('heavy')) {
    normalizedTokens = normalizedTokens.filter((token) => token !== 'super');
  }
  const normalizedIdentity = normalizedTokens.sort().join('-');
  if (!normalizedIdentity) return null;
  duration ||= warrantyDuration;
  return `auto:${normalizedIdentity}${duration ? `-${duration}` : ''}`.slice(0, 200);
}

function supplierOfferCost(product) {
  const cost = Number(product?.cost_pkr);
  if (Number.isFinite(cost) && cost >= 0) return cost;
  const wholesale = Number(product?.wholesale_price);
  return Number.isFinite(wholesale) && wholesale >= 0 ? wholesale : Number.POSITIVE_INFINITY;
}

function isBetterSupplierOffer(candidate, current) {
  const candidateInStock = Number(candidate?.supplier_stock ?? candidate?.available) > 0;
  const currentInStock = Number(current?.supplier_stock ?? current?.available) > 0;
  if (candidateInStock !== currentInStock) return candidateInStock;
  const candidateCost = supplierOfferCost(candidate);
  const currentCost = supplierOfferCost(current);
  if (candidateCost !== currentCost) return candidateCost < currentCost;
  return String(candidate?.id || '') < String(current?.id || '');
}

/**
 * Keep one supplier offer per equivalent product for customer catalogues.
 * In-stock offers win first; among those, the lowest supplier cost wins.
 */
export function selectLowestSupplierOffers(products = []) {
  const groups = [];
  const aliasToGroup = new Map();
  for (const product of products) {
    const canonicalKey = String(product?.canonical_key || '').trim();
    const aliases = canonicalKey && (product?.canonical_manual === true || !canonicalKey.startsWith('auto:'))
      ? [canonicalKey]
      : [supplierProductKey(product?.name)].filter(Boolean);
    if (!aliases.length) continue;
    const matchingGroups = [
      ...new Set(
        aliases
          .map((alias) => aliasToGroup.get(alias))
          .filter((group) => group !== undefined),
      ),
    ];
    let group;
    if (!matchingGroups.length) {
      group = { aliases: new Set(), product: null };
      groups.push(group);
    } else {
      group = matchingGroups[0];
      for (const other of matchingGroups.slice(1)) {
        for (const alias of other.aliases) {
          group.aliases.add(alias);
          aliasToGroup.set(alias, group);
        }
        if (
          other.product &&
          (!group.product || isBetterSupplierOffer(other.product, group.product))
        )
          group.product = other.product;
        groups.splice(groups.indexOf(other), 1);
      }
    }
    for (const alias of aliases) {
      group.aliases.add(alias);
      aliasToGroup.set(alias, group);
    }
    if (!group.product || isBetterSupplierOffer(product, group.product))
      group.product = product;
  }
  return groups.map((group) => group.product).filter(Boolean);
}
