'use client';

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Check,
  Copy,
  Clock,
  ShieldCheck,
  Zap,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Wallet,
  ArrowRight,
  Search,
} from 'lucide-react';
import './virtual-numbers.css';

interface Service {
  id: number | string;
  code: string;
  name: string;
  active: boolean;
  popular?: boolean;
}

interface Country {
  id: number | string;
  code: string;
  name: string;
  dial_code: string;
  emoji: string;
  active: boolean;
}

interface Product {
  id: number | string;
  catalog_product_id?: number | string;
  name: string;
  country_id: number | string;
  platform_id: number | string;
  operator_id?: number | string | null;
  operator_name?: string;
  available: number;
  cost_usd: number;
  price_pkr: number;
  active: boolean;
}

interface ActiveOrder {
  id: string;
  orderId?: string;
  smscode_order_id?: string;
  service_name: string;
  country_name: string;
  phone_number: string;
  status: string;
  otp_code?: string | null;
  otp_message?: string | null;
  expires_at: string;
  price_pkr: number;
  can_cancel?: boolean;
  can_finish?: boolean;
}

export function VirtualNumbers() {
  const [activeTab, setActiveTab] = useState<'rent' | 'history'>('rent');
  const [services, setServices] = useState<Service[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [account, setAccount] = useState<{ id: string; email: string } | null>(null);
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [pastOrders, setPastOrders] = useState<ActiveOrder[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Restore active order from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('sasify_active_vn');
      if (saved) {
        const parsed: ActiveOrder = JSON.parse(saved);
        if (
          parsed &&
          parsed.expires_at &&
          new Date(parsed.expires_at).getTime() > Date.now() &&
          ['ACTIVE', 'RECEIVED'].includes(parsed.status)
        ) {
          setActiveOrder(parsed);
        } else {
          sessionStorage.removeItem('sasify_active_vn');
        }
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, []);

  // Helper to persist or clear active order in sessionStorage
  const saveActiveOrder = (order: ActiveOrder | null) => {
    setActiveOrder(order);
    try {
      if (order && ['ACTIVE', 'RECEIVED'].includes(order.status)) {
        sessionStorage.setItem('sasify_active_vn', JSON.stringify(order));
      } else {
        sessionStorage.removeItem('sasify_active_vn');
      }
    } catch {
      // Ignore storage errors
    }
  };

  // Load catalog on mount
  useEffect(() => {
    let mounted = true;
    async function loadCatalog() {
      try {
        const res = await fetch('/api/commerce?action=virtual-numbers-catalog', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data.ok) {
          setServices(data.services || []);
          setCountries(data.countries || []);
          setProducts(data.products || []);
          setWalletBalance(data.walletBalance ?? null);
          setAccount(data.account ?? null);

          // Default select WhatsApp and Indonesia or first available
          if (!selectedService && data.services?.length) {
            const defaultService =
              data.services.find((s: Service) => s.code === 'whatsapp') || data.services[0];
            setSelectedService(defaultService);
          }
          if (!selectedCountry && data.countries?.length) {
            const defaultCountry =
              data.countries.find((c: Country) => c.code === 'id') || data.countries[0];
            setSelectedCountry(defaultCountry);
          }
        }
      } catch (err: any) {
        console.warn('Failed to load virtual numbers catalog:', err);
      }
    }
    loadCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  // Load history if logged in and tab switched to history
  useEffect(() => {
    if (activeTab === 'history' && account) {
      fetch('/api/commerce?action=virtual-numbers-my-orders', {
        credentials: 'same-origin',
        cache: 'no-store',
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.ok) setPastOrders(data.orders || []);
        })
        .catch(() => {});
    }
  }, [activeTab, account]);

  // Timer countdown for active order
  useEffect(() => {
    if (!activeOrder || activeOrder.status !== 'ACTIVE') return;
    const expiryTime = new Date(activeOrder.expires_at).getTime();

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeOrder]);

  // Polling for incoming SMS / OTP code when order is ACTIVE
  useEffect(() => {
    if (!activeOrder || activeOrder.status !== 'ACTIVE') return;
    const pollId = activeOrder.id || activeOrder.orderId;

    const poller = setInterval(async () => {
      try {
        const res = await fetch(`/api/commerce?action=virtual-number-status&id=${encodeURIComponent(pollId)}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && data.order) {
          const updated = data.order;
          if (updated.status !== 'ACTIVE' || updated.otp_code) {
            saveActiveOrder({
              ...activeOrder,
              ...updated,
            });
            if (updated.otp_code) {
              setNotice('Verification SMS received successfully!');
            }
          }
        }
      } catch {
        // Continue polling silently
      }
    }, 3500);

    return () => clearInterval(poller);
  }, [activeOrder]);

  // Filter services by search
  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    s.code.toLowerCase().includes(serviceSearch.toLowerCase()),
  );

  // Find matching price/product
  const currentProduct = products.find(
    (p) =>
      String(p.country_id) === String(selectedCountry?.id) &&
      String(p.platform_id) === String(selectedService?.id),
  ) || products[0];

  const estimatedPkr = currentProduct?.price_pkr || 250;
  const hasSufficientWallet = walletBalance !== null && walletBalance >= estimatedPkr;

  // Rent handler
  const handleRent = async () => {
    if (!selectedService || !selectedCountry) return;
    if (!account) {
      window.location.href = '/login?redirect=/virtual-numbers';
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch('/api/commerce?action=virtual-number-rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          countryId: selectedCountry.id,
          countryName: selectedCountry.name,
          countryCode: selectedCountry.code,
          catalogProductId: currentProduct?.catalog_product_id || currentProduct?.id,
          maxPriceUsd: currentProduct?.cost_usd || 0.50,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to allocate virtual number.');
      }

      const newOrder: ActiveOrder = {
        id: data.orderId,
        orderId: data.orderId,
        smscode_order_id: data.smscodeOrderId,
        service_name: selectedService.name,
        country_name: selectedCountry.name,
        phone_number: data.phoneNumber,
        status: data.status,
        expires_at: data.expiresAt,
        price_pkr: data.pricePkr,
        can_cancel: true,
      };

      saveActiveOrder(newOrder);

      if (typeof data.balance === 'number') {
        setWalletBalance(data.balance);
      }

      setNotice('Number allocated successfully! Waiting for your SMS verification code...');
    } catch (err: any) {
      setError(err.message || 'Could not complete number reservation.');
    } finally {
      setBusy(false);
    }
  };

  // Cancel & refund handler
  const handleCancel = async () => {
    if (!activeOrder) return;
    if (!confirm(`Are you sure you want to cancel this number? Rs ${activeOrder.price_pkr} will be 100% refunded to your Sasify Wallet immediately.`)) {
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/commerce?action=virtual-number-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: activeOrder.id || activeOrder.orderId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Could not cancel order.');
      }
      if (typeof data.newBalance === 'number') {
        setWalletBalance(data.newBalance);
      }
      saveActiveOrder(null);
      setNotice(`Number cancelled. Rs ${data.refundedAmount || activeOrder.price_pkr} has been refunded to your Sasify Wallet.`);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order.');
    } finally {
      setBusy(false);
    }
  };

  // Finish order handler
  const handleFinish = async () => {
    if (!activeOrder) return;
    setBusy(true);
    try {
      await fetch('/api/commerce?action=virtual-number-finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: activeOrder.id || activeOrder.orderId }),
      });
      saveActiveOrder(null);
      setNotice('Order completed successfully! Thank you for choosing Sasify Solutions.');
    } catch (err: any) {
      console.warn('Finish error:', err);
    } finally {
      setBusy(false);
    }
  };

  // Copy helper
  const copyToClipboard = async (text: string, type: 'phone' | 'otp') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'phone') {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      } else {
        setCopiedOtp(true);
        setTimeout(() => setCopiedOtp(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="vn-shell">
      {/* Intro Badges */}
      <div className="vn-intro-badges">
        <span className="vn-pill vn-pill-warning">
          <AlertCircle className="h-4 w-4 text-amber-600" /> One-Time OTP Use Only
        </span>
        <span className="vn-pill">
          <Zap className="h-4 w-4 text-emerald-600" /> Instant SMS Delivery
        </span>
        <span className="vn-pill">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> 100% Private &amp; Disposable
        </span>
        <span className="vn-pill">
          <RotateCcw className="h-4 w-4 text-emerald-600" /> Auto-Refund Guarantee
        </span>
        <span className="vn-pill">
          <Wallet className="h-4 w-4 text-emerald-600" /> 1-Click Sasify Wallet Pay
        </span>
      </div>

      {/* Tabs */}
      <div className="vn-tabs">
        <button
          className={`vn-tab ${activeTab === 'rent' ? 'active' : ''}`}
          onClick={() => setActiveTab('rent')}
        >
          <Smartphone className="h-4 w-4" /> Rent Number
        </button>
        {account && (
          <button
            className={`vn-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Clock className="h-4 w-4" /> My Rented Numbers
          </button>
        )}
      </div>

      {notice && (
        <div className="p-4 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-4 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ACTIVE ORDER CARD */}
      {activeOrder && activeOrder.status !== 'COMPLETED' && (
        <div className="vn-active-banner">
          <div className="vn-active-header">
            <div className="vn-pulse-badge">
              <span className="vn-pulse-dot" />
              <span>
                {activeOrder.status === 'RECEIVED'
                  ? 'Code Received'
                  : 'Live · Waiting for SMS'}
              </span>
            </div>
            <div className="vn-timer">
              <Clock className="h-4 w-4" />
              <span>{remainingSeconds > 0 ? formatTimer(remainingSeconds) : 'Expiring soon'}</span>
            </div>
          </div>

          <div className="vn-phone-section">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                {activeOrder.service_name} ({activeOrder.country_name})
              </div>
              <div className="vn-phone-number">{activeOrder.phone_number}</div>
            </div>
            <button
              className={`vn-copy-btn ${copiedPhone ? 'copied' : ''}`}
              onClick={() => copyToClipboard(activeOrder.phone_number, 'phone')}
            >
              {copiedPhone ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiedPhone ? 'Copied!' : 'Copy Number'}</span>
            </button>
          </div>

          {/* OTP display when received */}
          {activeOrder.otp_code ? (
            <div className="vn-otp-display">
              <div className="vn-otp-label">Verification Code (Single-Use OTP)</div>
              <div className="vn-otp-digits">{activeOrder.otp_code}</div>
              {activeOrder.otp_message && (
                <div className="vn-otp-message">"{activeOrder.otp_message}"</div>
              )}
              <div className="mt-4">
                <button
                  className={`vn-copy-btn ${copiedOtp ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(activeOrder.otp_code || '', 'otp')}
                >
                  {copiedOtp ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedOtp ? 'Copied Code!' : 'Copy Verification Code'}</span>
                </button>
              </div>
              <div className="vn-otp-notice">
                ⚠️ <strong>Important Account Notice:</strong> This one-time number is now closed and cannot receive future SMS. Go to your {activeOrder.service_name} settings immediately to add an email address or authenticator app for future logins.
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-200">
              💡 Enter this number in <strong>{activeOrder.service_name}</strong>. This is a <strong>one-time disposable number</strong> for single activation. Keep this page open — your code will display automatically as soon as it arrives!
            </p>
          )}

          <div className="vn-active-actions">
            {activeOrder.can_cancel && !activeOrder.otp_code && (
              <button
                className="vn-cancel-btn"
                disabled={busy}
                onClick={handleCancel}
              >
                <RotateCcw className="h-4 w-4" /> Cancel &amp; Refund (Rs {activeOrder.price_pkr})
              </button>
            )}
            {activeOrder.otp_code && (
              <button
                className="vn-finish-btn"
                disabled={busy}
                onClick={handleFinish}
              >
                <Check className="h-4 w-4" /> Mark as Done
              </button>
            )}
          </div>
        </div>
      )}

      {/* RENT TAB */}
      {activeTab === 'rent' && (
        <>
          {/* Step 1: Select Platform */}
          <div className="vn-card">
            <h2 className="vn-card-title">
              <Smartphone className="h-5 w-5 text-emerald-600" />
              1. Choose Service / App
            </h2>
            <p className="vn-card-subtitle">
              Select the service you want to verify or create an account on.
            </p>

            <div className="relative">
              <input
                type="text"
                className="vn-service-search"
                placeholder="Search app (WhatsApp, Telegram, ChatGPT...)"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
            </div>

            <div className="vn-services-grid">
              {filteredServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  className={`vn-service-btn ${selectedService?.id === service.id ? 'selected' : ''}`}
                  onClick={() => setSelectedService(service)}
                >
                  <div className="vn-service-info">
                    <span className="vn-service-name">{service.name}</span>
                  </div>
                  {service.popular && <span className="vn-service-tag">Popular</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Select Country */}
          <div className="vn-card">
            <h2 className="vn-card-title">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              2. Choose Country
            </h2>
            <p className="vn-card-subtitle">
              Select the country origin for your virtual phone number.
            </p>

            <div className="vn-countries-grid">
              {countries.map((country) => (
                <button
                  key={country.id}
                  type="button"
                  className={`vn-country-btn ${selectedCountry?.id === country.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCountry(country)}
                >
                  <span className="vn-country-flag">{country.emoji}</span>
                  <div className="vn-country-details">
                    <span className="vn-country-name">{country.name}</span>
                    <span className="vn-country-code">+{country.dial_code}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Confirmation & Wallet Checkout */}
          <div className="vn-checkout-panel">
            <div className="vn-summary-row">
              <div className="vn-summary-details">
                <span className="vn-summary-label">Selected Route</span>
                <span className="vn-summary-title">
                  {selectedService?.name || 'Service'} · {selectedCountry?.emoji} {selectedCountry?.name || 'Country'} (+{selectedCountry?.dial_code})
                </span>
                <div className="vn-wallet-status">
                  <Wallet className="h-4 w-4 text-emerald-700" />
                  {account ? (
                    <span>
                      Sasify Wallet Balance:{' '}
                      <strong>Rs {(walletBalance || 0).toLocaleString()}</strong>
                    </span>
                  ) : (
                    <span>Sign in with your Sasify Account for 1-click instant wallet activation</span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="vn-summary-label">Total Amount</div>
                <div className="vn-summary-price">Rs {estimatedPkr}</div>
              </div>
            </div>

            {/* One-Time OTP Usage Disclaimer */}
            <div className="vn-one-time-banner">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="vn-one-time-text">
                <strong>One-Time Verification Only:</strong> This temporary line is valid for a single SMS code during this 15-minute session. It is disposable and cannot be reused for future logins or repeated 2FA. Remember to configure email or authenticator app backup in your account settings after signing up.
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center flex-wrap gap-4">
              <div className="text-xs text-gray-500">
                🔒 <strong>100% Money-Back Guarantee:</strong> If the provider does not deliver an SMS code within 15 minutes, your wallet is refunded automatically in 1 second.
              </div>

              <div className="vn-action-buttons">
                {account ? (
                  hasSufficientWallet ? (
                    <button
                      className="vn-rent-btn"
                      disabled={busy}
                      onClick={handleRent}
                    >
                      <Zap className="h-5 w-5" />
                      <span>{busy ? 'Reserving...' : `Rent Number Now — Rs ${estimatedPkr}`}</span>
                    </button>
                  ) : (
                    <a href="/dashboard" className="vn-deposit-btn">
                      <Wallet className="h-4 w-4" /> Top-up Wallet (Needs Rs {estimatedPkr})
                    </a>
                  )
                ) : (
                  <>
                    <a href="/login?redirect=/virtual-numbers" className="vn-rent-btn">
                      <span>Log in to Rent Number</span>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <a href="/signup?redirect=/virtual-numbers" className="vn-deposit-btn">
                      <span>Sign up in 10s</span>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="vn-card">
          <h2 className="vn-card-title">
            <Clock className="h-5 w-5 text-emerald-600" />
            My Number History
          </h2>
          {pastOrders.length === 0 ? (
            <p className="text-gray-500 py-6 text-center text-sm">
              You haven't rented any virtual numbers yet.
            </p>
          ) : (
            <div className="vn-table-wrap">
              <table className="vn-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Country</th>
                    <th>Phone Number</th>
                    <th>OTP Code</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="font-semibold">{order.service_name}</td>
                      <td>{order.country_name}</td>
                      <td className="font-mono text-xs">{order.phone_number}</td>
                      <td className="font-mono font-bold text-emerald-700">
                        {order.otp_code || '—'}
                      </td>
                      <td>Rs {order.price_pkr}</td>
                      <td>
                        <span className={`vn-badge vn-badge-${order.status.toLowerCase()}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
