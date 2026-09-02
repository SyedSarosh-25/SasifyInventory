'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { formatMoney, formatPriceReference, isCurrency, type Currency } from '../currency-utils';
import type { Product } from '../products';
import { originalPricePkr } from '../product-utils';

const preferenceKey = 'sasify-currency';
const CurrencyContext = createContext<{
  currency: Currency;
  selectCurrency: (currency: Currency) => void;
} | null>(null);

function useCurrency() {
  const value = useContext(CurrencyContext);
  if (!value) throw new Error('CurrencyProvider is required');
  return value;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('PKR');

  useEffect(() => {
    try {
      const preference = localStorage.getItem(preferenceKey);
      if (isCurrency(preference)) setCurrency(preference);
      localStorage.removeItem('sasify-exchange-rates');
    } catch { /* Currency selection also works when browser storage is unavailable. */ }

    function syncPreference(event: StorageEvent) {
      if (event.key === preferenceKey && isCurrency(event.newValue)) setCurrency(event.newValue);
    }
    window.addEventListener('storage', syncPreference);
    return () => window.removeEventListener('storage', syncPreference);
  }, []);

  function selectCurrency(next: Currency) {
    setCurrency(next);
    try { localStorage.setItem(preferenceKey, next); } catch { /* Keep the selection for this page. */ }
  }

  return <CurrencyContext.Provider value={{ currency, selectCurrency }}>{children}</CurrencyContext.Provider>;
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
  const { currency } = useCurrency();
  return <>{formatMoney(amount, 'PKR', currency)}</>;
}

export function OriginalPrice({ reference }: { reference: string }) {
  const { currency } = useCurrency();
  return <>{formatPriceReference(reference, currency)}</>;
}

export function ProductOriginalPrice({ product }: { product: Product }) {
  const amount = originalPricePkr(product);
  return amount === null ? <OriginalPrice reference={product.originalPrice} /> : <Money amount={amount} />;
}
