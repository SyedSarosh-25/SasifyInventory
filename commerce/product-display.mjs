// Customer-facing copy only. Supplier IDs, mappings, source records and delivered
// credentials must never be changed by these presentation rules.
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

export function customerProductName(product) {
  return tidy(String(product?.name || '').replace(new RegExp(noWarrantyPattern, 'gi'), ''));
}

export function customerProductText(value, product) {
  const text = String(value || '');
  // Protect links: a supplier URL may legitimately contain /nw or /warranty.
  const urls = [];
  let cleaned = text.replace(/https?:\/\/[^\s<>]+/gi, url => {
    urls.push(url);
    return `\uE000${urls.length - 1}\uE001`;
  });
  // Preserve each supplier's positive, listing-specific warranty terms. Only
  // labels that say there is no warranty are removed from customer copy.
  cleaned = cleaned
    .replace(new RegExp(String.raw`(?:no(?:\s+any)?|without|not)\s+warranty(?:\s+(?:after|upon|for)\s+[^.!?\n]*)?`, 'gi'), '')
    .replace(new RegExp(noWarrantyPattern, 'gi'), '')
    .replace(/\b(?:not warrantied|not covered under warranty)\b/gi, '')
    .replace(/\(\s*\)/g, '');
  return tidy(cleaned).replace(/\uE000(\d+)\uE001/g, (_, index) => urls[Number(index)]);
}

export function customerProduct(product) {
  const description = customerProductText(product.description, product);
  return {
    ...product,
    name: customerProductName(product),
    ...(product.description != null ? { description } : {}),
    ...(product.delivery_instruction != null ? {
      delivery_instruction: customerProductText(product.delivery_instruction, product),
    } : {}),
  };
}
