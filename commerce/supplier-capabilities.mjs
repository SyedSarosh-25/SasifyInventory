const EMAIL_REQUIREMENT_KEYS = [
  'requires_customer_email',
  'requiresCustomerEmail',
  'customer_email_required',
  'customerEmailRequired',
  'email_required',
  'emailRequired',
  'requires_email',
  'requiresEmail',
];

function flag(value) {
  if (value === true || value === 1) return true;
  return ['true', 'yes', 'required', '1'].includes(
    String(value || '').trim().toLowerCase(),
  );
}

function hasEmailRequirement(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return EMAIL_REQUIREMENT_KEYS.some((key) => flag(value[key]));
}

export function supplierRequiresCustomerEmail(product, providerId = '') {
  const configuredProviders = new Set(
    String(process.env.SUPPLIER_EMAIL_REQUIRED_PROVIDERS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  if (configuredProviders.has(String(providerId || '').trim().toLowerCase()))
    return true;
  return [
    product,
    product?.requirements,
    product?.metadata,
    product?.meta,
    product?.purchase,
  ].some(hasEmailRequirement);
}

export function normalizeCustomerEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email) return null;
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
  )
    throw new Error('Enter a valid email address for this supplier product.');
  return email;
}
