export type Currency = 'PKR' | 'USD';
export const USD_TO_PKR = 285;

export function isCurrency(value: unknown): value is Currency {
  return value === 'PKR' || value === 'USD';
}

export function formatMoney(amount: number, source: Currency, target: Currency) {
  const value = source === target ? amount : target === 'PKR' ? amount * USD_TO_PKR : amount / USD_TO_PKR;
  return `${target} ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: target === 'USD' ? 2 : 0,
    maximumFractionDigits: target === 'USD' ? 2 : 0,
  }).format(value)}`;
}

export function formatPriceReference(reference: string, target: Currency) {
  // Other provider currencies remain unchanged because only USD/PKR has a configured rate.
  return reference.replace(/(US\$|\$|PKR\s+)(\d+(?:,\d{3})*(?:\.\d+)?)/g, (_match, token: string, number: string) => {
    const source: Currency = token.startsWith('PKR') ? 'PKR' : 'USD';
    return formatMoney(Number(number.replaceAll(',', '')), source, target);
  });
}
