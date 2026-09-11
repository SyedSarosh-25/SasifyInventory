const identifierPlatforms = new Set([
  'Phone',
  'Username',
  'Telegram',
  'Discord',
  'WhatsApp',
  'Facebook',
  'Instagram',
  'Other',
]);
const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

function text(value, max) {
  return String(value ?? '')
    .replace(/\p{Cc}/gu, '')
    .trim()
    .slice(0, max);
}

export function normalizeScamReport(body) {
  const name = text(body?.name, 160);
  const description = text(body?.description, 4000);
  const amountPkr = Number(body?.amountPkr);
  const identifiers = Array.isArray(body?.identifiers)
    ? body.identifiers
        .map((item) => ({
          platform: text(item?.platform, 40),
          value: text(item?.value, 300),
        }))
        .filter((item) => identifierPlatforms.has(item.platform) && item.value)
        .slice(0, 12)
    : [];
  const paymentMethods = Array.isArray(body?.paymentMethods)
    ? body.paymentMethods
        .map((item) => text(item, 80))
        .filter(Boolean)
        .slice(0, 12)
    : [];
  const evidence = Array.isArray(body?.evidence)
    ? body.evidence
        .map((item) => ({
          filename: text(item?.filename, 120) || 'evidence',
          type: text(item?.type, 40),
          data: String(item?.data || ''),
        }))
        .filter(
          (item) =>
            imageTypes.has(item.type) &&
            /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
              item.data,
            ) &&
            item.data.length <= 850000,
        )
        .slice(0, 3)
    : [];
  const submitterContact = text(body?.submitterContact, 240);
  if (name.length < 2)
    throw new Error('Enter the reported person or account name.');
  if (description.length < 20)
    throw new Error('Add at least 20 characters describing what happened.');
  if (
    !Number.isSafeInteger(amountPkr) ||
    amountPkr < 1 ||
    amountPkr > 1000000000
  )
    throw new Error('Enter the scam amount in PKR.');
  if (!identifiers.length)
    throw new Error('Add at least one public contact or account identifier.');
  if (!paymentMethods.length)
    throw new Error('Add at least one payment method used.');
  if (!evidence.length)
    throw new Error('Attach at least one proof screenshot.');
  if (Array.isArray(body?.evidence) && body.evidence.length !== evidence.length)
    throw new Error(
      'Each proof file must be a PNG, JPG or WebP image under 600 KB.',
    );
  return {
    name,
    description,
    amountPkr,
    identifiers,
    paymentMethods,
    evidence,
    submitterContact,
  };
}

export function publicScamReport(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    amountPkr: row.amount_pkr == null ? null : Number(row.amount_pkr),
    identifiers: row.identifiers || [],
    paymentMethods: row.payment_methods || [],
    evidence: row.evidence || [],
    createdAt: row.created_at,
  };
}

export function publicScamReportSummary(row) {
  return {
    id: row.id,
    name: row.name,
    summary: String(row.description || '').slice(0, 240),
    amountPkr: row.amount_pkr == null ? null : Number(row.amount_pkr),
    identifierCount: Array.isArray(row.identifiers)
      ? row.identifiers.length
      : 0,
    paymentMethodCount: Array.isArray(row.payment_methods)
      ? row.payment_methods.length
      : 0,
    createdAt: row.created_at,
  };
}

export const scamIdentifierPlatforms = [...identifierPlatforms];
