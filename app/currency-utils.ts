export type Currency = 'PKR' | 'USD' | 'INR';
export const USD_TO_PKR = 285;
export const PKR_TO_INR = 3; // 3 PKR = 1 INR

export function isCurrency(value: unknown): value is Currency {
  return value === 'PKR' || value === 'USD' || value === 'INR';
}

export function formatMoney(amount: number, source: Currency, target: Currency) {
  // Convert source amount to PKR first
  let pkr = amount;
  if (source === 'USD') {
    pkr = amount * USD_TO_PKR;
  } else if (source === 'INR') {
    pkr = amount * PKR_TO_INR; // 1 INR = 3 PKR
  }

  // Convert PKR to target currency
  let targetAmount = pkr;
  if (target === 'USD') {
    targetAmount = pkr / USD_TO_PKR;
  } else if (target === 'INR') {
    targetAmount = pkr / PKR_TO_INR; // 3 PKR = 1 INR
  }

  const fractionDigits = target === 'USD' ? 2 : 0;
  return `${target} ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(targetAmount)}`;
}

export function formatPriceReference(reference: string, target: Currency) {
  // Other provider currencies remain unchanged because only USD/PKR/INR has a configured rate.
  return reference.replace(/(US\$|\$|PKR\s+|INR\s+)(\d+(?:,\d{3})*(?:\.\d+)?)/g, (_match, token: string, number: string) => {
    const source: Currency = token.startsWith('PKR') ? 'PKR' : token.startsWith('INR') ? 'INR' : 'USD';
    return formatMoney(Number(number.replaceAll(',', '')), source, target);
  });
}
