'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fallbackRates, formatMoney, formatPriceReference, isCurrency, parseRateResponse, ratesAreFresh, validRates, type Currency, type ExchangeRates } from '../currency-utils';

const preferenceKey = 'sasify-currency';
const ratesKey = 'sasify-exchange-rates';
const CurrencyContext = createContext<{
  currency: Currency;
  selectCurrency: (currency: Currency) => void;
  rates: ExchangeRates;
  rateUnavailable: boolean;
} | null>(null);

function useCurrency() {
  const value = useContext(CurrencyContext);
  if (!value) throw new Error('CurrencyProvider is required');
  return value;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('PKR');
  const [rates, setRates] = useState(fallbackRates);
  const [rateUnavailable, setRateUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let cached: ExchangeRates | null = null;
    try {
      const preference = localStorage.getItem(preferenceKey);
      if (isCurrency(preference)) setCurrency(preference);
      const stored: unknown = JSON.parse(localStorage.getItem(ratesKey) ?? 'null');
      if (validRates(stored) && Date.parse(stored.updatedAt) <= Date.now() + 300000) {
        cached = stored;
        setRates(stored);
      }
    } catch { /* Currency selection also works when browser storage is unavailable. */ }

    const timeout = setTimeout(() => controller.abort(), 8000);
    if (!cached || !ratesAreFresh(cached)) {
      fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal, credentials: 'omit' })
        .then(async (response) => {
          if (!response.ok) throw new Error('Exchange rate unavailable');
          const fresh = parseRateResponse(await response.json());
          if (!fresh || Date.parse(fresh.updatedAt) > Date.now() + 300000) throw new Error('Invalid exchange rate');
          if (disposed) return;
          setRates(fresh);
          setRateUnavailable(!ratesAreFresh(fresh));
          try { localStorage.setItem(ratesKey, JSON.stringify(fresh)); } catch { /* Use the fetched rate in memory. */ }
        })
        .catch(() => { if (!disposed) setRateUnavailable(true); })
        .finally(() => clearTimeout(timeout));
    } else clearTimeout(timeout);

    function syncPreference(event: StorageEvent) {
      if (event.key === preferenceKey && isCurrency(event.newValue)) setCurrency(event.newValue);
    }
    window.addEventListener('storage', syncPreference);
    return () => { disposed = true; controller.abort(); clearTimeout(timeout); window.removeEventListener('storage', syncPreference); };
  }, []);

  function selectCurrency(next: Currency) {
    setCurrency(next);
    try { localStorage.setItem(preferenceKey, next); } catch { /* Keep the selection for this page. */ }
  }

  return <CurrencyContext.Provider value={{ currency, selectCurrency, rates, rateUnavailable }}>{children}</CurrencyContext.Provider>;
}

export function CurrencyToggle() {
  const { currency, selectCurrency } = useCurrency();
  return <div className="currency-toggle" role="group" aria-label="Display currency">
    {(['PKR', 'USD'] as const).map((option) => (
      <button key={option} type="button" aria-pressed={currency === option} onClick={() => selectCurrency(option)} title={`Show prices in ${option}`}>
        {option}
      </button>
    ))}
  </div>;
}

export function Money({ amount }: { amount: number }) {
  const { currency, rates } = useCurrency();
  return <>{formatMoney(amount, 'PKR', currency, rates)}</>;
}

export function OriginalPrice({ reference }: { reference: string }) {
  const { currency, rates } = useCurrency();
  return <>{formatPriceReference(reference, currency, rates)}</>;
}

export function CurrencyRateNote() {
  const { currency, rates, rateUnavailable } = useCurrency();
  const date = new Date(rates.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return <p className="exchange-rate-note" role="status">
    Prices shown in {currency}. Converted amounts are estimates; final payment is confirmed in PKR.
    {' '}1 USD = PKR {rates.usdToPkr.toFixed(2)}. {rateUnavailable ? 'Last available rate' : 'Rate updated'}: {date}.
    {' '}<a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates by ExchangeRate-API</a>
  </p>;
}
