const duplicateNoise = new Set([
  'a', 'an', 'the', 'for', 'full', 'has', 'included', 'no', 'not', 'with',
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
    .filter(Boolean);
  const identity = [];
  let duration = '';
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const compact = token.match(/^(\d+)(d|day|days|m|mo|month|months|y|year|years|w|week|weeks)$/);
    if (compact) {
      duration = normalizedDuration(Number(compact[1]), compact[2]);
      continue;
    }
    const numeric = token.match(/^\d+$/);
    const numericUnit = tokens[index + 1] || '';
    if (numeric && durationUnit.test(numericUnit)) {
      duration = normalizedDuration(Number(token), numericUnit);
      index += 1;
      continue;
    }
    const wordAmount = durationWords.get(token);
    if (wordAmount && durationUnit.test(numericUnit)) {
      duration = normalizedDuration(wordAmount, numericUnit);
      index += 1;
      continue;
    }
    if (durationUnit.test(token) && (/^\d+$/.test(tokens[index - 1] || '') || durationWords.has(tokens[index - 1] || ''))) continue;
    if (duplicateNoise.has(token)) continue;
    identity.push(token);
  }
  const normalizedIdentity = [...new Set(identity)].sort().join('-');
  if (!normalizedIdentity) return null;
  return `auto:${normalizedIdentity}${duration ? `-${duration}` : ''}`.slice(0, 200);
}
