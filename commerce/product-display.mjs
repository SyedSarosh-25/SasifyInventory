// Customer-facing copy only. Supplier IDs, mappings, source records and delivered
// credentials must never be changed by these presentation rules.
const durationPattern = String.raw`\d+(?:\s*[-–]\s*\d+)?[\s-]*(?:hours?|hrs?|h|days?|d|weeks?|w|months?|mos?|m|years?|yrs?|y)\b`;
const noWarrantyPattern = String.raw`(?:non[\s-]*warranty|(?:no(?:\s+any)?|without|not)\s+warranty|warranty\s+(?:is\s+)?not\s+included|\bnw\b)`;

export function isChatGptPlan(product) {
  return /^p093(?:-|$)/i.test(String(product?.id || '')) || /\bchat[\s-]*gpt\b/i.test(String(product?.name || ''));
}

function tidy(value) {
  return value
    .replace(/\(\s*\)|\[\s*\]/g, '')
    .replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
    .replace(/[ \t]{2,}/g, ' ')
    .split(/\r?\n/)
    .map(line => line.replace(/^[\s,;|]+|[\s,;|–—-]+$/g, ''))
    .filter(line => !line || /[\p{L}\p{N}]/u.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripPeriodClaims(text, replacement = '', includeFull = false) {
  const qualifier = includeFull ? '(?:(?:full|full-time|hold)\\s+)?' : '(?:hold\\s+)?';
  return text
    // Remove the following limit first: "2 years warranty 1 year" is a two-year plan.
    .replace(new RegExp(String.raw`(?:package\s+)?warranty(?:\s+(?:period|lasts?|is|for|of|is\s+for))*\s*:?\s*${durationPattern}`, 'gi'), replacement)
    .replace(new RegExp(String.raw`${durationPattern}\s+${qualifier}warranty\b(?:\s+from\s+my\s+side(?:\s+on\s+subscription)?)?`, 'gi'), replacement)
    .replace(new RegExp(String.raw`(?:package\s+is\s+)?warranted\s+for\s+${durationPattern}`, 'gi'), 'covered for the full plan duration');
}

export function customerProductName(product) {
  let name = String(product?.name || '').replace(new RegExp(noWarrantyPattern, 'gi'), '');
  if (!isChatGptPlan(product)) {
    name = stripPeriodClaims(name)
      .replace(/\b(?:comes\s+with|has\s+a|with)?\s*(?:full(?:[- ]time)?\s+|login\s+)?warranty\b/gi, '')
      .replace(/\(\s*FW\s*\)/gi, '')
      .replace(/\s+(?:has\s+a|comes\s+with|with)\s*$/gi, '');
  }
  return tidy(name);
}

export function fullPlanWarranty(product) {
  const duration = String(product?.duration || '').trim();
  // Only a declared duration is authoritative. A supplier title can describe
  // credits, an activation deadline or a bonus with a different access period.
  const matched = duration.match(new RegExp(`^(${durationPattern})$`, 'i'))?.[1];
  return matched
    ? `Full warranty from Sasify Solutions for the entire ${matched} plan duration.`
    : 'Full warranty from Sasify Solutions for the entire plan duration.';
}

export function customerProductText(value, product) {
  const text = String(value || '');
  // Protect links: a supplier URL may legitimately contain /nw or /warranty.
  const urls = [];
  let cleaned = text.replace(/https?:\/\/[^\s<>]+/gi, url => {
    urls.push(url);
    return `\uE000${urls.length - 1}\uE001`;
  });
  if (isChatGptPlan(product)) {
    cleaned = cleaned.replace(new RegExp(noWarrantyPattern, 'gi'), '');
  } else {
    // Remove only the warranty wording. Keep the supplier's instructions,
    // device limits, links and product details around it.
    cleaned = cleaned
      .replace(new RegExp(String.raw`(?:no(?:\s+any)?|without|not)\s+warranty(?:\s+(?:after|upon|for)\s+[^.!?\n]*)?`, 'gi'), '')
      .replace(new RegExp(noWarrantyPattern, 'gi'), '')
      .replace(/\b(?:not warrantied|not covered under warranty)\b/gi, '')
      .replace(/warranty\s+(?:till|until)\s+(?:login|activation)\b/gi, 'full plan warranty')
      .replace(/warranty\s+ends\b/gi, 'full plan warranty applies');
    cleaned = stripPeriodClaims(cleaned, 'full plan warranty', true)
      .replace(/\b(?:full(?:[- ]time)?\s+)?warranty\s*(?:period)?\s*:\s*full\s+duration\b/gi, 'Full plan warranty')
      .replace(/\b(?:warranty\s+)?(?:period|policy)\s*:\s*\b/gi, '')
      .replace(/\(\s*\)/g, '');
  }
  return tidy(cleaned).replace(/\uE000(\d+)\uE001/g, (_, index) => urls[Number(index)]);
}

export function customerProduct(product) {
  const description = customerProductText(product.description, product);
  const warranty = isChatGptPlan(product) ? '' : fullPlanWarranty(product);
  return {
    ...product,
    name: customerProductName(product),
    ...(product.description != null ? { description } : {}),
    ...(product.delivery_instruction != null ? {
      delivery_instruction: customerProductText(product.delivery_instruction, product),
    } : {}),
    ...(warranty ? { warranty } : {}),
  };
}
