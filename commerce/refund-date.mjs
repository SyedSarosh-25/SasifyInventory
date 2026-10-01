// Browser-safe date handling shared by the refund form and server validation.
export const refundActivationDatePattern = '[0-9]{1,2}(/|-)[0-9]{1,2}(/|-)[0-9]{4}';

export function normalizeRefundDate(value) {
  const input = typeof value === 'string' ? value.trim() : '';
  const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dayFirst = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!iso && !dayFirst) return null;
  const [year, month, day] = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : [Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day)
    return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
