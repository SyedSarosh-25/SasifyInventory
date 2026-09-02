export type Currency = 'PKR' | 'USD';
type SourceCurrency = Currency | 'EUR';
export type ExchangeRates = { usdToPkr: number; usdToEur: number; updatedAt: string };

// Last verified daily reference from https://open.er-api.com/v6/latest/USD.
export const fallbackRates: ExchangeRates = {
  usdToPkr: 277.866264,
  usdToEur: 0.862503,
  updatedAt: '2026-09-02T00:02:31.000Z',
};

export function isCurrency(value: unknown): value is Currency {
  return value === 'PKR' || value === 'USD';
}

export function validRates(value: unknown): value is ExchangeRates {
  if (!value || typeof value !== 'object') return false;
  const rates = value as Partial<ExchangeRates>;
  return typeof rates.usdToPkr === 'number' && Number.isFinite(rates.usdToPkr) && rates.usdToPkr > 0
    && typeof rates.usdToEur === 'number' && Number.isFinite(rates.usdToEur) && rates.usdToEur > 0
    && typeof rates.updatedAt === 'string' && Number.isFinite(Date.parse(rates.updatedAt));
}

export function parseRateResponse(value: unknown): ExchangeRates | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as { result?: unknown; base_code?: unknown; rates?: { PKR?: unknown; EUR?: unknown }; time_last_update_unix?: unknown };
  if (data.result !== 'success' || data.base_code !== 'USD' || typeof data.time_last_update_unix !== 'number') return null;
  const date = new Date(data.time_last_update_unix * 1000);
  if (!Number.isFinite(date.getTime())) return null;
  const candidate = { usdToPkr: data.rates?.PKR, usdToEur: data.rates?.EUR, updatedAt: date.toISOString() };
  return validRates(candidate) ? candidate : null;
}

export function ratesAreFresh(rates: ExchangeRates, now = Date.now()) {
  const age = now - Date.parse(rates.updatedAt);
  return age >= -5 * 60 * 1000 && age < 24 * 60 * 60 * 1000;
}

export function formatMoney(amount: number, source: SourceCurrency, target: Currency, rates: ExchangeRates) {
  const usd = source === 'PKR' ? amount / rates.usdToPkr : source === 'EUR' ? amount / rates.usdToEur : amount;
  const value = source === target ? amount : target === 'PKR' ? usd * rates.usdToPkr : usd;
  return `${target} ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: target === 'USD' ? 2 : 0,
    maximumFractionDigits: target === 'USD' ? 2 : 0,
  }).format(value)}`;
}

export function formatPriceReference(reference: string, target: Currency, rates: ExchangeRates) {
  // Convert only explicitly currency-labelled amounts, preserving terms and credit quantities.
  return reference.replace(/(US\$|\$|PKR\s+|EUR\s+)(\d+(?:,\d{3})*(?:\.\d+)?)/g, (_match, token: string, number: string) => {
    const source: SourceCurrency = token.startsWith('PKR') ? 'PKR' : token.startsWith('EUR') ? 'EUR' : 'USD';
    return formatMoney(Number(number.replaceAll(',', '')), source, target, rates);
  });
}
