// Payment restrictions supplement (never replace) coupon validity checks.
export function couponPaymentError(code, usingSasifyWallet) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return null;
  if (usingSasifyWallet && normalized !== 'PURBA')
    return 'Only PURBA can be used with Sasify Wallet.';
  if (!usingSasifyWallet && normalized === 'PURBA')
    return 'PURBA is available only with Sasify Wallet.';
  return null;
}
