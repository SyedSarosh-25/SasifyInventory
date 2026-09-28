'use client';
import { LocalizedContent } from './language';
import { LanguageSwitcher } from './language';

import { useEffect, useRef, useState } from 'react';
import { AdminShell } from './admin-shell';
import { AdminOperations } from './admin-operations';
import { AdminDailyChart } from './admin-daily-chart';
import { CheckoutAccount } from './customer-account';
import { AdminCustomers } from './admin-customers';
import { AdminResellerRequests } from './admin-reseller-requests';
import { AdminRecordControls, useRecordView } from './admin-record-controls';
import { AdminToolRequests } from './admin-tool-requests';
import { AdminResellerRequirements } from './admin-reseller-requirements';
import { AdminCatalogStatus } from './admin-catalog-status';
import { AdminEmailCampaign } from './admin-email-campaign';
import {
  AdminAuditLogs,
  AdminProducts,
  AdminSettings,
  AdminSupport,
  AdminTransactionHistory,
  AdminUserDetail,
} from './admin-enhancements';
import { supplierOfferDecision, type SupplierCatalogGroup } from './admin-catalog-status-model';
import {
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  KeyRound,
  Landmark,
  MessageCircle,
  Pencil,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Users,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';

type Stock = {
  id: string;
  name: string;
  price: number;
  available: number;
  source?: string;
  description?: string;
  delivery_instruction?: string;
  provider_id?: string;
  provider_name?: string;
  requires_customer_email?: boolean;
  shared_slots_filled?: number;
  shared_slots_total?: number;
};
const PAYMENT_METHOD_OPTIONS = [
  { value: 'wallet' as const, label: 'Wallet transfer', description: 'Easypaisa, JazzCash, NayaPay, SadaPay and more', icon: WalletCards },
  { value: 'bank' as const, label: 'Bank transfer', description: 'All banks', icon: Landmark },
  { value: 'binance' as const, label: 'Binance Pay', description: 'Binance Pay in USDT', icon: WalletCards },
  { value: 'crypto' as const, label: 'Crypto deposit', description: 'Send USDT on the displayed network', icon: WalletCards },
];
type AccountCredentials = {
  email: string;
  password: string;
  twoFactor?: string;
};
type Order = {
  id: string;
  product: string;
  amount: number;
  listedAmount?: number;
  originalAmount?: number;
  couponDiscount?: number;
  paymentAdjustment?: number;
  teamCoupon?: boolean;
  status: string;
  supplierStatus?: string | null;
  expiresAt: string;
  paymentSubmittedAt?: string | null;
  createdAt?: string;
  transactionId?: string;
  paymentMethod?: 'wallet' | 'bank' | 'binance' | 'crypto';
  paymentCurrency?: 'PKR' | 'USDT';
  paymentAmount?: number;
  paymentWindowMinutes?: number;
  sharedSlot?: number;
  sharedSlotsFilled?: number;
  sharedSlotsTotal?: number;
  sharedAccountStatus?: string | null;
  twoFactorCodeAvailable?: boolean;
  payment: { number: string; title: string; provider: string };
  credentials?: AccountCredentials;
  delivery?: { content: string; instructions?: string };
};
const CRYPTO_NETWORK_FEE_USDT = 0.01;
function customerPaymentAmount(order: Order) {
  const amount = Number(order.paymentAmount || 0);
  return order.paymentMethod === 'crypto' && order.paymentCurrency === 'USDT'
    ? amount + CRYPTO_NETWORK_FEE_USDT
    : amount;
}
async function api(
  action: string,
  token = '',
  body?: object,
  id = '',
  extraHeaders: Record<string, string> = {},
) {
  const response = await fetch(
    `/api/commerce?action=${action}${id ? `&id=${encodeURIComponent(id)}` : ''}`,
    {
      method: body ? 'POST' : 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      credentials: 'same-origin',
    },
  );
  const data: any = await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(data.error || 'Request failed. Please retry.'),
      { status: response.status },
    );
  return data;
}

const LOCAL_ADMIN_PREVIEW_DATA = {
  autoVerify: true,
  adminSettings: { business_name: 'Sasify Solutions', default_currency: 'PKR', support_email: 'support@sasifysolutions.com', auto_verify_receipts: 'true' },
  postmarkInboundUsage: { available: true, used: 12, limit: 100, remaining: 88, percentage: 12, windowDays: 30, updatedAt: new Date().toISOString() },
  accounts: [{ id: 'preview-user-1', name: 'Demo Customer', email: 'demo@example.com', username: 'demo_customer', balance: 12500, role: 'customer', reseller_status: 'none', created_at: new Date().toISOString(), email_verified_at: new Date().toISOString() }],
  orders: [{ id: 'preview-order-1', product_id: 'demo-product', product_name: 'AI Credits Starter', supplier_product_name: 'AI Credits Starter', supplier_name: 'Sasify manual catalog', amount: 1499, status: 'delivered', payment_method: 'wallet', created_at: new Date().toISOString(), delivered_at: new Date().toISOString(), payer_name: 'Demo Customer', payment_currency: 'PKR', payment_amount: 1499 }],
  payments: [{ id: 'preview-payment-1', amount: 1499, payment_amount: 1499, currency: 'PKR', subject: 'Demo wallet payment', transaction_id: 'DEMO-TXN-001', payer_name: 'Demo Customer', verified: true, verification_reason: 'authenticated', order_id: 'preview-order-1', receiver_id: 'demo-receiver', received_at: new Date().toISOString(), created_at: new Date().toISOString() }],
  supportTickets: [{ id: 'preview-ticket-1', name: 'Demo Customer', email: 'demo@example.com', subject: 'Example support request', message: 'This is sample local-preview data.', status: 'open', created_at: new Date().toISOString() }],
  auditLogs: [{ id: 'preview-audit-1', action: 'local_preview', object_id: 'preview', details: { note: 'Mock data only' }, created_at: new Date().toISOString() }],
  supplierProducts: [{ id: 'manual:preview-product', provider_id: 'manual', provider_name: 'Sasify manual catalog', name: 'AI Credits Starter', description: 'Demo product for local UI review', canonical_key: 'demo-product', selling_price: 1499, cost_pkr: 900, enabled: true }],
  paymentReceivers: [], coupons: [], inventory: [], sharedAccounts: [], scamReports: [], toolRequests: [], blockedUsers: [], providerStates: [], supplierAlerts: [], supplierKeys: [], commissions: [], dailyFinancials: [], profitBreakdown: [], teamAccess: { configured: false, email: null }, metrics: { orders: 1, delivered: 1, pending: 0, revenue: 1499, profit: 599 }, stock: [], supplierUsdPkrRate: 280, supplierUsdtPkrRate: 280,
};
export function StockBuy({ productId: _productId }: { productId: string }) {
  return null;
}
export function Checkout() {
  const [products, setProducts] = useState<Stock[]>([]),
    [selected, setSelected] = useState('p013');
  const [order, setOrder] = useState<Order | null>(null),
    [id, setId] = useState(''),
    [key, setKey] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorCodeExpiresAt, setTwoFactorCodeExpiresAt] = useState('');
  const [twoFactorCodeBusy, setTwoFactorCodeBusy] = useState(false);
  const [showTwoFactorStep, setShowTwoFactorStep] = useState(false);
  const twoFactorCodeTimer = useRef<number | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [checkoutAccount, setCheckoutAccount] = useState<{ balance: number } | null>(null);
  const [useSasifyWallet, setUseSasifyWallet] = useState(false);
  const [paymentMenuOpen, setPaymentMenuOpen] = useState(false);
  const paymentMenuRef = useRef<HTMLDivElement | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    'wallet' | 'bank' | 'binance' | 'crypto'
  >('wallet');
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false);
  useEffect(() => {
    const requestedProduct = new URLSearchParams(window.location.search).get(
      'product',
    );
    setSelected(
      requestedProduct === 'p093' ? 'p093-ultra' : requestedProduct || 'p013',
    );
    const stored =
      localStorage.getItem('sasify-order') ||
      sessionStorage.getItem('sasify-order');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setId(data.id);
        setKey(data.key);
        localStorage.setItem('sasify-order', stored);
      } catch {
        localStorage.removeItem('sasify-order');
        sessionStorage.removeItem('sasify-order');
      }
    }
    let active = true;
    const loadStock = () =>
      api('catalog')
        .then((data) => {
          if (active) {
            setProducts(data.products);
            setReady(data.ready);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    void loadStock();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    api('account-dashboard').then((data) => setCheckoutAccount(data.account || null)).catch(() => setCheckoutAccount(null));
  }, []);
  useEffect(() => {
    if (!paymentMenuOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!paymentMenuRef.current?.contains(event.target as Node))
        setPaymentMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPaymentMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [paymentMenuOpen]);
  useEffect(() => {
    if (!id || !key) return;
    let active = true;
    const refresh = () =>
      api('status', key, undefined, id)
        .then((data) => {
          if (!active) return;
          if (data.status === 'expired' && !data.transactionId) {
            localStorage.removeItem('sasify-order');
            sessionStorage.removeItem('sasify-order');
            setOrder(null);
            setId('');
            setKey('');
            setNotice(
              'Your previous payment window ended. Please start a new order.',
            );
            return;
          }
          setOrder(data);
          setError('');
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id, key]);
  useEffect(() => {
    if (!error || order || id) return;
    const selectedProduct = products.find((p) => p.id === selected);
    if (Number(selectedProduct?.available || 0) > 0 && /sold out/i.test(error))
      setError('');
  }, [error, id, order, products, selected]);
  const orderStatus = order?.status;
  const orderExpiresAt = order?.expiresAt;
  const orderPaymentSubmittedAt = order?.paymentSubmittedAt;
  useEffect(() => {
    if (
      !orderStatus ||
      !['pending', 'review', 'expired'].includes(orderStatus) ||
      (!orderExpiresAt && !orderPaymentSubmittedAt)
    )
      return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [orderStatus, orderExpiresAt, orderPaymentSubmittedAt]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      const error = e as Error & { status?: number };
      setError(error.message);
      if (error.status === 429) window.alert(error.message);
    } finally {
      setBusy(false);
    }
  }
  function remember(orderId: string, recovery: string) {
    localStorage.setItem(
      'sasify-order',
      JSON.stringify({ id: orderId, key: recovery }),
    );
    setId(orderId);
    setKey(recovery);
  }
  function clear() {
    if (twoFactorCodeTimer.current !== null) {
      window.clearTimeout(twoFactorCodeTimer.current);
      twoFactorCodeTimer.current = null;
    }
    localStorage.removeItem('sasify-order');
    sessionStorage.removeItem('sasify-order');
    setOrder(null);
    setId('');
    setKey('');
    setTwoFactorCode('');
    setTwoFactorCodeExpiresAt('');
    setTwoFactorCodeBusy(false);
    setShowTwoFactorStep(false);
  }
  const product = products.find((p) => p.id === selected);
  const productUnavailable = product?.source === 'supplier' && Number(product.available) <= 0;
  const selectedPayment = PAYMENT_METHOD_OPTIONS.find((option) => option.value === paymentMethod) || PAYMENT_METHOD_OPTIONS[0];
  const walletDiscount = product && useSasifyWallet
    ? Math.floor(Math.max(0, Number(product.price)) * 0.05)
    : 0;
  const walletPayable = product
    ? Math.max(0, Number(product.price) - walletDiscount)
    : 0;
  const checkoutProducts = products.filter((p) => p.id !== 'p093');
  const CUSTOMER_PAYMENT_DISPLAY_SECONDS = 5 * 60;
  const orderExpiryMs = order ? new Date(order.expiresAt).getTime() : 0;
  const createdAtMs = order?.createdAt ? new Date(order.createdAt).getTime() : NaN;
  const customerDisplayExpiryMs = Number.isFinite(createdAtMs)
    ? createdAtMs + CUSTOMER_PAYMENT_DISPLAY_SECONDS * 1000
    : orderExpiryMs;
  const PAYMENT_VERIFICATION_GRACE_SECONDS = 90;
  const secondsLeft =
    order?.status === 'pending'
      ? Math.max(
          0,
          Math.ceil((Math.min(customerDisplayExpiryMs, orderExpiryMs) - now) / 1000),
        )
      : 0;
  const countdown = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const verificationSecondsLeft =
    order?.status === 'pending' && order.paymentSubmittedAt
      ? Math.max(
          0,
          PAYMENT_VERIFICATION_GRACE_SECONDS -
            Math.floor(
              (now - new Date(order.paymentSubmittedAt).getTime()) / 1000,
            ),
        )
      : 0;
  const supportSecondsLeft =
    order && ['review', 'expired'].includes(order.status) && order.paymentSubmittedAt
      ? Math.max(
          0,
          30 -
            Math.floor(
              (now - new Date(order.paymentSubmittedAt).getTime()) / 1000,
            ),
        )
      : 0;
  const supportEnabled =
    order?.status === 'delivered' ||
    order?.status === 'cancelled' ||
    (order &&
      ['review', 'expired'].includes(order.status) &&
      !!order.paymentSubmittedAt &&
      supportSecondsLeft === 0);
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice('Copied.');
    } catch {
      setNotice('Select the text and copy it.');
    }
  }
  async function requestTwoFactorCode() {
    if (!order?.twoFactorCodeAvailable || !id || !key || twoFactorCodeBusy) return;
    setTwoFactorCodeBusy(true);
    setError('');
    try {
      const data = await api('shared-2fa-code', key, { id });
      setTwoFactorCode(data.code);
      setTwoFactorCodeExpiresAt(data.expiresAt);
      setNotice('This one-time 2FA code is shown only once. Enter it immediately on the login screen.');
      setOrder((current) => current ? { ...current, twoFactorCodeAvailable: false } : current);
      twoFactorCodeTimer.current = window.setTimeout(() => {
        setTwoFactorCode('');
        setTwoFactorCodeExpiresAt('');
        setNotice('The one-time 2FA code has expired and cannot be requested again for this order.');
        twoFactorCodeTimer.current = null;
      }, Math.max(0, new Date(data.expiresAt).getTime() - Date.now()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTwoFactorCodeBusy(false);
    }
  }
  return (
    <LocalizedContent><div className="commerce-shell">
      <div className="checkout-language-bar"><LanguageSwitcher /></div>
      <a href="/" className="brand">
        <img
          src="/sasify-logo.png"
          alt="Sasify Solutions"
          width={48}
          height={48}
        />
        <strong>Sasify Solutions</strong>
      </a>
      <a href="/inventory" className="back-link">
        All products
      </a>
      <h1>
        {order ? (order.amount === 0 ? 'Your free order' : 'Complete your payment') : 'Buy online'}
      </h1>
      <CheckoutAccount orderId={order?.status === 'pending' ? id : ''} onWalletBalanceChange={(balance) => setCheckoutAccount((current) => current ? { ...current, balance } : current)} onInsufficientWallet={() => { clear(); setError('Insufficient wallet balance. Add funds first, then try again.'); }} onPaid={() => { void api('status',key,undefined,id).then(setOrder).catch(e=>setError(e.message)); }} />
      <div className="instant-delivery">
        <span className="instant-icon">
          <Zap size={22} />
        </span>
        <div>
          <strong>
            {order?.amount === 0
              ? 'Free coupon delivery'
              : product?.provider_id === 'manual'
                ? 'Manual processing after payment'
              : 'Automatic credential delivery'}
          </strong>
          <p>
            {order?.amount === 0
              ? 'HOR covered the full price. Your account credentials are ready below.'
              : product?.provider_id === 'manual'
                ? 'After payment, our team will process your personal email manually and deliver access from the admin panel.'
              : order?.paymentMethod === 'bank'
                ? 'Your delivery appears here automatically after the signed NayaPay receipt is matched.'
                : ['binance', 'crypto'].includes(order?.paymentMethod || '')
                  ? 'Your delivery appears here automatically after the authenticated Binance receipt is matched.'
                  : 'Pay here and your account credentials will appear on this screen automatically after verification, usually within one minute. No manual delivery delays.'}
          </p>
        </div>
        <span className="instant-badge">{product?.provider_id === 'manual' ? 'Manual' : 'Instant'}</span>
      </div>
      {error && (
        <p role="alert" className="commerce-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!order && !id && (
        <>
          <form
            className="description-section checkout-start"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const data = await api('create', '', {
                  productId: selected,
                  couponCode: useSasifyWallet ? '' : couponCode,
                  useSasifyWallet,
                  ...(product?.requires_customer_email
                    ? { customerEmail: customerEmail.trim() }
                    : {}),
                  paymentMethod,
                });
                remember(data.id, data.recovery);
                if (useSasifyWallet) {
                  try {
                    const walletPayment = await api('account-wallet-pay', '', { id: data.id });
                    const balance = Number(walletPayment?.balance);
                    if (Number.isFinite(balance))
                      setCheckoutAccount((current) => current ? { ...current, balance } : current);
                  } catch (paymentError) {
                    clear();
                    throw paymentError;
                  }
                }
              });
            }}
          >
            <label>
              Select package
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {checkoutProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {product && (
              <div className="checkout-offer">
                <div>
                  <span>Price</span>
                  <strong>PKR {product.price.toLocaleString()}</strong>
                </div>
              </div>
            )}
            {product?.id === 'p093-shared' && (
              <section className="description-section shared-account-checkout-notice">
                <h2>Shared account · 4 members</h2>
                <p>
                  This is shared ChatGPT Plus access. Your data and activity are
                  not private and may be visible to other members. Usage is
                  shared between members, so no individual usage-limit guarantee
                  is provided.
                </p>
                <p>
                  After delivery, shared access is not eligible for replacement,
                  warranty or refund if the shared usage allowance is reached.
                </p>
              </section>
            )}
            {product?.requires_customer_email && (
              <label>
                Customer email (required by this supplier)
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
                <small>
                  The supplier will use this email to process and deliver your
                  purchase.
                </small>
              </label>
            )}
            <aside className="purchase-disclaimer" role="note">
              <strong>Please read before purchasing</strong>
              <p>
                Please read the complete product description, activation
                requirements, duration and warranty terms before payment. If an
                issue arises because the description or requirements were not
                read or followed, Sasify Solutions cannot be held responsible.
              </p>
            </aside>
            <fieldset className="payment-method-picker">
              <legend>How will you send the payment?</legend>
              <label className={`sasify-wallet-card${checkoutAccount ? '' : ' disabled'}${useSasifyWallet ? ' selected' : ''}`}>
                <input
                  type="radio"
                  name="sasify-wallet-choice"
                  disabled={!checkoutAccount}
                  checked={useSasifyWallet}
                  onChange={() => {
                    if (checkoutAccount) {
                      setUseSasifyWallet(true);
                      setCouponCode('');
                      setPaymentMethod('wallet');
                    }
                  }}
                />
                <span className="sasify-wallet-logo" aria-hidden="true"><img src="/sasify-wallet.png" alt="" /></span>
                <span>
                  <strong>Sasify Wallet{useSasifyWallet ? ' · Selected' : ''}</strong>
                  <small>{checkoutAccount ? `Balance: PKR ${Number(checkoutAccount.balance || 0).toLocaleString()} · 5% discount on eligible products` : 'Sign up to unlock · 5% discount on eligible products'}</small>
                </span>
                <a className="payment-method-link" href={checkoutAccount ? '/dashboard?tab=wallet' : '/signup'} onClick={(event) => event.stopPropagation()}>{checkoutAccount ? 'Add funds' : 'Sign up'}</a>
              </label>
              <div className="payment-method-select-group" ref={paymentMenuRef}>
                <span className="payment-method-select-label">Other payment methods</span>
                <button
                  type="button"
                  className={`payment-method-trigger${paymentMenuOpen ? ' open' : ''}`}
                  aria-haspopup="listbox"
                  aria-expanded={paymentMenuOpen}
                  onClick={() => setPaymentMenuOpen((open) => !open)}
                >
                  <span className="payment-method-trigger-copy">
                    <strong>{useSasifyWallet ? 'Select another payment method' : selectedPayment.label}</strong>
                    <small>{useSasifyWallet ? 'Sasify Wallet is selected above' : selectedPayment.description}</small>
                  </span>
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
                {paymentMenuOpen && (
                  <div className="payment-method-menu" role="listbox" aria-label="Other payment methods">
                    {PAYMENT_METHOD_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const selected = !useSasifyWallet && option.value === paymentMethod;
                      return (
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`payment-method-option${selected ? ' selected' : ''}`}
                          key={option.value}
                          onClick={() => {
                            setUseSasifyWallet(false);
                            setPaymentMethod(option.value);
                            setPaymentMenuOpen(false);
                          }}
                        >
                          <span className="payment-method-option-icon"><Icon size={17} aria-hidden="true" /></span>
                          <span className="payment-method-option-copy">
                            <strong>{option.label}</strong>
                            <small>{option.description}</small>
                          </span>
                          {selected && <Check size={18} aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </fieldset>
            {useSasifyWallet && product && product.price > 0 && (
              <div className="wallet-discount-preview" role="status">
                <div>
                  <span>Wallet discount (5%)</span>
                  <strong>−PKR {walletDiscount.toLocaleString('en-PK')}</strong>
                </div>
                <small>Final amount with Sasify Wallet: <strong>PKR {walletPayable.toLocaleString('en-PK')}</strong></small>
              </div>
            )}
            <label className={useSasifyWallet ? 'disabled-field' : undefined}>
              Reseller coupon {useSasifyWallet ? '(not available with Sasify Wallet)' : '(optional)'}
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                autoCapitalize="characters"
                maxLength={32}
                disabled={useSasifyWallet}
              />
              {useSasifyWallet && <small>Coupons cannot be combined with Sasify Wallet payments.</small>}
            </label>
            <button
              className="primary-button"
              disabled={
                busy ||
                !ready ||
                !product || productUnavailable ||
                (product.requires_customer_email && !customerEmail.trim())
              }
            >
              <ShoppingCart size={18} />{' '}
              {busy
                ? 'Preparing checkout...'
                : useSasifyWallet
                  ? 'Buy with Sasify Wallet'
                  : 'Pay online'}
            </button>
            {productUnavailable && <p role="status">This product is currently unavailable. Please return to the inventory and choose another product.</p>}
          </form>
        </>
      )}
      {id && !order && (
        <>
          <p>Loading order...</p>
          <button className="secondary-button" onClick={clear}>
            Back to checkout
          </button>
        </>
      )}
      {order && (
        <>
          <div className="checkout-heading">
            <div>
              <span>{order.product}</span>
              {order.sharedSlot ? (
                <small className="coupon-savings">
                  Shared account slot {order.sharedSlot}/4 · {order.sharedSlotsFilled || order.sharedSlot}/{order.sharedSlotsTotal || 4} filled
                </small>
              ) : null}
              {order.teamCoupon && order.amount === 0 ? (
                <small className="coupon-savings">
                  Team access · No payment required
                </small>
              ) : order.couponDiscount || order.paymentAdjustment ? (
                <>
                  <small>
                    Original price: PKR {order.originalAmount?.toLocaleString()}
                  </small>
                  {order.couponDiscount ? (
                    <small className="coupon-savings">
                      Reseller discount: −PKR{' '}
                      {order.couponDiscount.toLocaleString()}
                    </small>
                  ) : null}
                  {order.paymentAdjustment ? (
                    <small className="coupon-savings">
                      {order.paymentMethod === 'wallet' ? 'Sasify Wallet discount: −PKR ' : 'Unique payment amount: −PKR '}
                      {order.paymentAdjustment.toLocaleString()}
                    </small>
                  ) : null}
                </>
              ) : null}
              <strong>
                {order.paymentCurrency === 'USDT'
                  ? `USDT ${customerPaymentAmount(order).toFixed(2)}`
                  : `PKR ${order.amount.toLocaleString()}`}
              </strong>
            </div>
            <span className={`order-state ${order.status}`}>
              {order.status === 'review'
                ? 'Verifying payment'
                : order.status === 'pending' && order.paymentSubmittedAt
                  ? 'Verification pending'
                  : order.status}
            </span>
          </div>
          {order.status === 'cancelled' && (
            <section className="description-section" role="alert">
              <h2>Order cancelled</h2>
              <p>
                {order.supplierStatus === 'cancelled_without_payment'
                  ? 'No verified payment receipt was found during the verification window. This order was cancelled and the reserved stock was released.'
                  : order.supplierStatus ===
                'cancelled_after_3_supplier_failures'
                  ? 'The supplier failed three times after payment verification, so this order was cancelled automatically. Please contact support to arrange a refund or replacement.'
                  : 'This order is closed and no credentials were delivered.'}
              </p>
            </section>
          )}
          {order.status === 'pending' && !order.paymentSubmittedAt && (
            <section className="description-section">
              <h2>
                {order.paymentMethod === 'bank'
                  ? 'Pay from your bank account'
                  : ['binance', 'crypto'].includes(order.paymentMethod || '')
                    ? order.paymentMethod === 'crypto'
                      ? 'Pay with crypto in USDT'
                      : 'Pay with Binance Pay in USDT'
                    : 'Pay with a wallet for automatic instant delivery'}
              </h2>
              <p className="payment-callout">
                Send exactly{' '}
                <strong>
                  {order.paymentCurrency === 'USDT'
                    ? 'USDT ' + customerPaymentAmount(order).toFixed(2)
                    : 'PKR ' + order.amount.toLocaleString()}
                </strong>{' '}
                to the {order.paymentMethod === 'crypto'
                  ? 'USDT wallet address'
                  : order.paymentMethod === 'binance'
                    ? 'Binance Pay account'
                    : 'NayaPay account'} below.
              </p>
              <p className="payment-source-note">
                <strong>
                  {['binance', 'crypto'].includes(order.paymentMethod || '')
                    ? order.paymentMethod === 'crypto'
                      ? 'Send from your crypto wallet on the displayed network.'
                      : 'Send from your Binance account.'
                    : 'This number belongs to NayaPay.'}
                </strong>{' '}
                {order.paymentMethod === 'crypto'
                  ? `Send via BEP20. The displayed amount includes the USDT ${CRYPTO_NETWORK_FEE_USDT.toFixed(2)} network fee. We expect to receive net USDT ${Number(order.paymentAmount || 0).toFixed(2)} and cover the fee for you.`
                  : order.paymentMethod === 'binance'
                    ? 'Use the exact USDT amount shown. The authenticated Binance email must contain one unique transaction reference.'
                  : order.paymentMethod === 'bank'
                  ? 'Use your bank app and send the exact amount shown. Your reservation remains active for 5 minutes.'
                  : 'Send from Easypaisa, JazzCash, NayaPay, SadaPay or another supported wallet. If you intend to use a bank, cancel this order and select Bank transfer first.'}
              </p>
              {order.paymentAdjustment ? (
                <p className="payment-source-note">
                  This lower whole-rupee amount is unique to your active order.
                  Send the exact amount shown above.
                </p>
              ) : null}
              <p className="support-note">
                WhatsApp support will be enabled 30 seconds after you submit
                payment if delivery has not completed.
              </p>
              <dl className="commerce-details">
                <dt>Account title</dt>
                <dd>{order.payment.title}</dd>
                <dt>{order.paymentMethod === 'crypto'
                  ? 'USDT wallet address'
                  : order.paymentMethod === 'binance'
                    ? 'Binance Pay account'
                    : 'NayaPay number'}</dt>
                <dd>
                  <strong>{order.payment.number}</strong>{' '}
                  <button
                    title="Copy payment number"
                    aria-label="Copy payment number"
                    onClick={() => void copy(order.payment.number)}
                  >
                    <Copy size={16} />
                  </button>
                </dd>
                <dt>Payment timer</dt>
                <dd>
                  <strong className="payment-timer">{countdown}</strong>
                </dd>
              </dl>
              {!order.transactionId && (
                <div className="checkout-cancel-action">
                  <p>
                    Changed your mind? Cancel this payment reservation to
                    release the reserved stock.
                  </p>
                  <button
                    type="button"
                    className="secondary-button danger-action"
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm('Cancel this payment and release the reserved stock?')) return;
                      void run(async () => {
                        await api('cancel', key, { id });
                        clear();
                        window.location.assign('/');
                      });
                    }}
                  >
                    <X size={18} /> Cancel payment and order
                  </button>
                </div>
              )}
            </section>
          )}
          {order.status === 'pending' && order.paymentSubmittedAt && (
            <section className="verification-state" role="status">
              <RefreshCw size={24} />
              <div>
                <strong>Payment verification pending</strong>
                <p>
                  We are checking for your payment receipt. Keep this
                  page open; the order will cancel automatically in{' '}
                  {verificationSecondsLeft} second
                  {verificationSecondsLeft === 1 ? '' : 's'} if no payment is found.
                </p>
              </div>
            </section>
          )}
          {['pending', 'expired'].includes(order.status) &&
            !order.paymentSubmittedAt &&
            !order.transactionId && (
              <form
                className="description-section"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await api('claim', key, { id });
                    setOrder(await api('status', key, undefined, id));
                  });
                }}
              >
                {order.status === 'expired' && (
                  <p>
                    This reservation expired. If you already paid, enter the
                    payment confirmation below so support can review it.
                  </p>
                )}
                <h2>Confirm your payment</h2>
                <p>
                  After sending the exact amount, click below. We will match the
                  verified payment automatically using your unique order amount.
                </p>
                <button className="primary-button" disabled={busy}>
                  {busy ? 'Checking payment...' : 'I paid — verify automatically'}
                </button>
              </form>
            )}
          {order.status === 'review' && (
            <section className="verification-state" role="status">
              <RefreshCw size={24} />
              <div>
                <strong>Checking your payment</strong>
                <p>
                  Keep this page open. It refreshes automatically and{' '}
                  {order.paymentMethod === 'bank'
                    ? 'will deliver after the bank receipt reaches and matches NayaPay.'
                    : ['binance', 'crypto'].includes(order.paymentMethod || '')
                      ? 'will deliver after the authenticated Binance receipt reaches and matches this order.'
                      : 'normally delivers within one minute.'}
                </p>
              </div>
            </section>
          )}
          {['review', 'expired'].includes(order.status) && !supportEnabled && (
            <p className="support-note" role="status">
              WhatsApp support unlocks in {supportSecondsLeft} second
              {supportSecondsLeft === 1 ? '' : 's'} if delivery is still
              pending.
            </p>
          )}
          {order.credentials && (
            <section className="description-section account-delivery-email">
              <div className="account-email-header">
                <div className="account-email-brand"><ShieldCheck size={18} /></div>
                <div><strong>Sasify Solutions</strong><small>Secure account delivery</small></div>
                <span className="account-email-status">Delivered</span>
              </div>
              <div className="account-email-meta"><span><b>Subject:</b> Your account credentials are ready</span><span>Order #{order.id.slice(0, 8)}</span></div>
              <div className="account-email-body">
                <h2>Your account is ready</h2>
                <p>Thank you for trusting Sasify Solutions. Your credentials are below. Keep this message private.</p>
                {order.sharedSlot && <p className="shared-two-factor-step-heading"><strong>Step 1: Log in with your email and password</strong></p>}
                <div className="account-credential-list">
                  {Object.entries(order.credentials).map(([field, value]) => (
                    <label key={field}>
                      <span>{field === 'twoFactor' ? '2FA Key' : field}</span>
                      <div className="commerce-secret">
                        <code>{String(value)}</code>
                        <button title={`Copy ${field}`} aria-label={`Copy ${field}`} onClick={() => void copy(String(value))}><Copy size={18} /></button>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {!order.sharedSlot && <section className="account-delivery-guide" aria-label="Private account setup instructions">
                <div className="account-delivery-guide-heading">
                  <span aria-hidden="true">✓</span>
                  <div>
                    <strong>Complete your account setup</strong>
                    <small>Follow these steps to log in and keep your warranty active.</small>
                  </div>
                </div>
                <div className="account-step-list">
                  <div className="account-step"><span>1</span><div><h3>Log in to ChatGPT</h3><p>Open ChatGPT.com and enter the Email and Password shown above.</p></div></div>
                  <div className="account-step"><span>2</span><div><h3>Generate your login code</h3><p>When ChatGPT requests a 6-digit Authenticator Code, open <a href="/otp" target="_blank" rel="noreferrer">Sasify OTP</a>, enter your 2FA Key and submit it.</p></div></div>
                  <div className="account-step"><span>3</span><div><h3>Finish verification</h3><p>Enter the generated 6-digit code on ChatGPT immediately. The code is time-sensitive.</p></div></div>
                </div>
                <div className="account-delivery-warning">
                  <strong>Important warranty requirement</strong>
                  <p>Transfer the account to your personal email after login. Warranty support is not applicable if the account is not transferred.</p>
                </div>
                <div className="account-email-transfer"><h3>Transfer to your personal email</h3><p>ChatGPT → Settings → Account → Email Change → enter your personal email → verify the 6-digit code sent to that email.</p></div>
                <p className="account-delivery-note"><strong>Do not change or remove the account password or 2FA settings.</strong><br />If an issue occurs, contact Sasify Solutions with your order reference.</p>
              </section>}
              {order.sharedSlot && !showTwoFactorStep && order.twoFactorCodeAvailable && !twoFactorCode && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setShowTwoFactorStep(true)}
                >
                  I have logged in — continue
                </button>
              )}
              {order.sharedSlot && showTwoFactorStep && order.twoFactorCodeAvailable && !twoFactorCode && (
                <div className="shared-two-factor">
                  <strong>Step 2: Enter your one-time 2FA code</strong>
                  <p className="shared-two-factor-warning">
                    You will be shown this code only once, so handle it
                    properly and enter it immediately on the ChatGPT 2FA login
                    screen.
                  </p>
                  <p>
                    This strict action is intended to ensure that only the four
                    assigned members access this shared account and that it is
                    not shared beyond the four available slots.
                  </p>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={twoFactorCodeBusy}
                    onClick={() => void requestTwoFactorCode()}
                  >
                    {twoFactorCodeBusy ? 'Generating code...' : 'Show one-time 2FA code'}
                  </button>
                </div>
              )}
              {order.sharedSlot && twoFactorCode && (
                <label>
                  Step 2: One-time 2FA code
                  <div className="commerce-secret">
                    <code>{twoFactorCode}</code>
                    <button
                      type="button"
                      title="Copy one-time 2FA code"
                      aria-label="Copy one-time 2FA code"
                      onClick={() => void copy(twoFactorCode)}
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                  <small>
                    Enter this code immediately on the same device. It is shown
                    once and expires in 30 seconds
                    {twoFactorCodeExpiresAt
                      ? ` (at ${new Date(twoFactorCodeExpiresAt).toLocaleTimeString()}).`
                      : '.'}
                  </small>
                </label>
              )}
              {order.sharedSlot && !twoFactorCode && !order.twoFactorCodeAvailable && (
                <p className="shared-two-factor-locked">
                  The one-time 2FA code has already been issued for this order.
                </p>
              )}
            </section>
          )}
          {order.delivery && (
            <section className="description-section supplier-delivery">
              <h2>
                <ShieldCheck size={20} /> Your purchase is ready
              </h2>
              <p>
                Keep this information private and follow the activation
                instructions below.
              </p>
              <div className="commerce-secret">
                <pre>{order.delivery.content}</pre>
                <button
                  title="Copy delivery"
                  aria-label="Copy delivery"
                  onClick={() => void copy(order.delivery!.content)}
                >
                  <Copy size={18} />
                </button>
              </div>
              {order.delivery.instructions && (
                <div className="delivery-instructions">
                  <strong>Activation instructions</strong>
                  <p>{order.delivery.instructions}</p>
                </div>
              )}
            </section>
          )}
          {supportEnabled && (
            <section className="description-section support-callout">
              <h2>
                <MessageCircle size={20} /> Need help with this order?
              </h2>
              <p>
                If your credentials do not work or you have any delivery or
                activation issue, contact our support team on WhatsApp. Your
                order reference is included automatically.
              </p>
              <a
                className="whatsapp-purchase"
                href={`https://wa.me/923116185711?text=${encodeURIComponent(`Hi Sasify Solutions, I need support with order ${order.id} for ${order.product}.`)}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={18} /> WhatsApp support
              </a>
            </section>
          )}
          {['cancelled', 'expired', 'delivered'].includes(order.status) && (
            <button className="secondary-button" onClick={clear}>
              Start a new order
            </button>
          )}
        </>
      )}
    </div></LocalizedContent>
  );
}

function SupplierProductRow({
  item,
  busy,
  save,
}: {
  item: any;
  busy: boolean;
  save: (values: {
    sellingPrice: number;
    costPkr: number;
    enabled: boolean;
    canonicalKey: string;
    productName: string;
    productDescription: string;
  }) => Promise<void>;
}) {
  const [sellingPrice, setSellingPrice] = useState(
    String(item.selling_price || ''),
  );
  const [costPkr, setCostPkr] = useState(String(item.cost_pkr || ''));
  const [canonicalKey, setCanonicalKey] = useState(
    String(item.canonical_key || ''),
  );
  const [productName, setProductName] = useState(String(item.name || ''));
  const [productDescription, setProductDescription] = useState(
    String(item.description || ''),
  );
  const [enabled, setEnabled] = useState(Boolean(item.enabled));
  const providerClass = item.provider_id === 'dody' ? 'dodi' : item.provider_id;
  return (
    <article
      className={`supplier-admin-row supplier-admin-row-${providerClass}`}
    >
      <div className="supplier-admin-title">
        <div>
          <span className="admin-eyebrow">
            {item.provider_name || 'Supplier'}
          </span>
          <strong>{item.name}</strong>
          <small>{item.external_product_id || item.id}</small>
          {item.rejectedReason && <small className="supplier-rejected-reason">{item.rejectedReason}</small>}
        </div>
        <span
          className={`${item.supplier_stock > 0 ? 'in-stock' : 'out-stock'} supplier-stock-badge`}
        >
          <i aria-hidden="true" />
          {item.supplier_stock} in stock
        </span>
      </div>
      <p className="supplier-wholesale">
        Wholesale: {item.wholesale_price} {item.currency}
      </p>
      <div className="supplier-copy-controls">
        <label>
          Customer-facing title
          <input
            type="text"
            maxLength={300}
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
        </label>
        <label>
          Customer-facing description
          <textarea
            rows={4}
            maxLength={20000}
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
          />
        </label>
        <small className="supplier-copy-note">
          Saved copy is shown to customers and is preserved during supplier syncs.
        </small>
      </div>
      <div className="supplier-price-controls">
        <label>
          Supplier cost in PKR
          <input
            type="number"
            min="0"
            step="1"
            value={costPkr}
            onChange={(e) => setCostPkr(e.target.value)}
          />
        </label>
        <label className="supplier-selling-price-field">
          Your selling price in PKR
          <input
            type="number"
            min="1"
            step="1"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
          />
          <small>
            {sellingPrice && costPkr
              ? `Margin: PKR ${(Number(sellingPrice) - Number(costPkr)).toLocaleString('en-PK')}`
              : 'Enter the price customers should pay.'}
          </small>
        </label>
        <label>
          Product mapping key
          <input
            type="text"
            pattern="[a-z0-9][a-z0-9:_-]{1,199}"
            value={canonicalKey}
            onChange={(e) => setCanonicalKey(e.target.value.toLowerCase())}
          />
        </label>
        <label className="commerce-check">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />{' '}
          Show on website
        </label>
        <button
          className="secondary-button supplier-save-button"
          disabled={
            busy ||
            !productName.trim() ||
            !sellingPrice ||
            costPkr === '' ||
            !canonicalKey
          }
          onClick={() =>
            void save({
              sellingPrice: Number(sellingPrice),
              costPkr: Number(costPkr),
              enabled,
              canonicalKey,
              productName: productName.trim(),
              productDescription: productDescription.trim(),
            })
          }
        >
          Save changes
        </button>
      </div>
    </article>
  );
}

function CouponRow({
  coupon,
  busy,
  save,
}: {
  coupon: any;
  busy: boolean;
  save: (values: {
    code: string;
    discountPercent: number;
    maxUses: number;
    enabled: boolean;
  }) => Promise<void>;
}) {
  const [code, setCode] = useState(String(coupon.code_display || ''));
  const [discount, setDiscount] = useState(
    String(coupon.discount_percent || '10'),
  );
  const [maxUses, setMaxUses] = useState(String(coupon.max_uses || '10'));
  const [enabled, setEnabled] = useState(Boolean(coupon.enabled));
  return (
    <article className="coupon-admin-row">
      <div className="coupon-admin-summary">
        <div>
          <span className="admin-eyebrow">
            {coupon.code_display === 'HOR'
              ? 'Team coupon'
              : coupon.code_display === 'CUST'
                ? 'Customer commission coupon'
                : 'Reseller coupon'}
          </span>
          <strong>{coupon.code_display}</strong>
        </div>
        <span className={enabled ? 'status-good' : 'status-warn'}>
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
        <small>
          {coupon.unlimited ? `${coupon.used_count} / Unlimited uses` : `${coupon.used_count} / ${coupon.max_uses} uses`}
        </small>
        <small>
          {coupon.code_display === 'HOR'
            ? 'Commission: PKR 50 per delivered account'
            : Number(coupon.commission_percent || 0) > 0
              ? `Commission: ${coupon.commission_percent}% per delivered sale`
              : 'No commission'}
        </small>
      </div>
      <div className="admin-form-grid">
        <label>
          Code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={32}
            required
          />
        </label>
        <label>
          Discount %
          <input
            type="number"
            min={coupon.code_display === 'CUST' ? '0' : '0.01'}
            max="100"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            required
          />
        </label>
        <label>
          Maximum uses
          <input
            type="number"
            min={coupon.used_count || 1}
            step="1"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            required
          />
        </label>
        <label className="commerce-check">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />{' '}
          Enabled
        </label>
        <button
          className="secondary-button admin-span"
          disabled={busy || !code || !discount || !maxUses}
          onClick={() =>
            void save({
              code,
              discountPercent: Number(discount),
              maxUses: Number(maxUses),
              enabled,
            })
          }
        >
          Save coupon settings
        </button>
      </div>
    </article>
  );
}

export function CommerceAdmin() {
  const localPreview = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const [key, setKey] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [accounts, setAccounts] = useState(''),
    [productId, setProduct] = useState('p093-ultra'),
    [purchaseCost, setPurchaseCost] = useState('2000'),
    [orderId, setOrderId] = useState(''),
    [paymentId, setPaymentId] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [manualDeliveryConfirmed, setManualDeliveryConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState<any>(null),
    [orderDelivery, setOrderDelivery] = useState<any>(null),
    [supplierLogs, setSupplierLogs] = useState<any>(null),
    [profitToken, setProfitToken] = useState(''),
    [profitPassword, setProfitPassword] = useState(''),
    [teamEmail, setTeamEmail] = useState(''),
    [teamPassword, setTeamPassword] = useState('');
  const [tab, setTab] = useState<
      | 'overview'
      | 'profit'
      | 'commissions'
      | 'inventory'
      | 'supplier'
      | 'orders'
      | 'payments'
      | 'paymentAccounts'
      | 'coupons'
      | 'scammers'
      | 'blockedUsers'
      | 'team'
      | 'toolRequests'
      | 'requirements'
      | 'customers'
      | 'resellerRequests'
      | 'catalogStatus'
      | 'userDetail'
      | 'products'
      | 'support'
      | 'auditLogs'
      | 'settings'
      | 'transactions'
      | 'emailCampaign'
    >('overview'),
    [inventorySearch, setInventorySearch] = useState(''),
    [supplierSearch, setSupplierSearch] = useState(''),
    [selectedSupplierId, setSelectedSupplierId] = useState(''),
    [supplierKeyValues, setSupplierKeyValues] = useState<Record<string, string>>({}),
    [supplierKeysOpen, setSupplierKeysOpen] = useState(false),
    [supplierProvider, setSupplierProvider] = useState<
      'all' | 'dodi' | 'qamify' | 'mke' | 'piggyai' | 'zoomstore' | 'fatbunny' | 'elitetools'
    >('all'),
    [supplierStockFilter, setSupplierStockFilter] = useState<
      'best-price' | 'in-stock' | 'out-of-stock' | 'rejected'
    >('best-price'),
    [orderFilter, setOrderFilter] = useState<
      'all' | 'delivered' | 'unfulfilled' | 'cancelled'
    >('all'),
    [editing, setEditing] = useState<any>(null),
    [picked, setPicked] = useState<{
      inventoryId: string;
      credentials: AccountCredentials;
    } | null>(null),
    [scamReport, setScamReport] = useState<any>(null),
    [selectedAccountId, setSelectedAccountId] = useState(''),
    [checkingSession, setCheckingSession] = useState(true);
  const [editCost, setEditCost] = useState('0'),
    [editState, setEditState] = useState('available'),
    [editEmail, setEditEmail] = useState(''),
    [editPassword, setEditPassword] = useState(''),
    [editTwoFactor, setEditTwoFactor] = useState('');
  const [newCouponCode, setNewCouponCode] = useState(''),
    [newCouponDiscount, setNewCouponDiscount] = useState('10'),
    [newCouponMaxUses, setNewCouponMaxUses] = useState('10');
  const [paymentFilter, setPaymentFilter] = useState('all');
  // Keep the inbox inclusive by default so newly forwarded Gmail receipts
  // are visible even when they belong to a non-active payment receiver.
  const [paymentReceiverFilter, setPaymentReceiverFilter] = useState('all');
  const seenOrderIds = useRef<Set<string>>(new Set());
  const seenSupplierAlertIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (localPreview) {
      setData(LOCAL_ADMIN_PREVIEW_DATA);
      setNotice('LOCAL PREVIEW · sample data only · backend actions are disabled');
      setCheckingSession(false);
      return;
    }
    let active = true;
    void api('admin-list')
      .then((dashboard) => {
        if (active) setData(dashboard);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, [localPreview]);
  const adminReady = Boolean(data);
  useEffect(() => {
    if (!data) {
      seenOrderIds.current.clear();
      seenSupplierAlertIds.current.clear();
      return;
    }
    const orders = Array.isArray(data.orders) ? data.orders : [];
    const supplierAlerts = Array.isArray(data.supplierAlerts)
      ? data.supplierAlerts
      : [];
    if (seenOrderIds.current.size) {
      const newOrder = orders.find(
        (row: any) => !seenOrderIds.current.has(String(row.id)),
      );
      if (newOrder)
        setNotice(
          `New order received: ${String(newOrder.id).slice(0, 8)} · ${newOrder.product_id}.`,
        );
    }
    if (seenSupplierAlertIds.current.size) {
      const newAlert = supplierAlerts.find(
        (row: any) => !seenSupplierAlertIds.current.has(String(row.id)),
      );
      if (newAlert)
        setNotice(
          `Supplier issue detected for ${String(newAlert.provider_id).toUpperCase()}. Open supplier logs for details.`,
        );
    }
    seenOrderIds.current = new Set(
      orders.map((row: any) => String(row.id)),
    );
    seenSupplierAlertIds.current = new Set(
      supplierAlerts.map((row: any) => String(row.id)),
    );
  }, [data]);
  useEffect(() => {
    if (!adminReady) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void api(
        'admin-list',
        key,
        undefined,
        '',
        profitToken ? { 'X-Profit-Token': profitToken } : {},
      )
        .then((dashboard) => setData(dashboard))
        .catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, [adminReady, key, profitToken]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      const problem = e as Error & { status?: number };
      if (problem.status === 401) {
        setData(null);
        setKey('');
        setProfitToken('');
        setPicked(null);
        setReceipt(null);
        setOrderDelivery(null);
        setSupplierLogs(null);
        setScamReport(null);
      }
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }
  const refresh = async () =>
    setData(
      await api(
        'admin-list',
        key,
        undefined,
        '',
        profitToken ? { 'X-Profit-Token': profitToken } : {},
      ),
    );
  const showSupplierLogs = async (order = '') =>
    setSupplierLogs(await api('admin-supplier-logs', key, undefined, order));
  const unlockProfit = async () => {
    const result = await api('admin-profit-unlock', key, {
      password: profitPassword,
    });
    setProfitToken(result.token);
    setProfitPassword('');
    setNotice('Profit details unlocked for this session.');
    setData(
      await api('admin-list', key, undefined, '', {
        'X-Profit-Token': result.token,
      }),
    );
  };
  const saveTeamCredentials = async () => {
    await api('admin-team-credentials', key, {
      email: teamEmail,
      password: teamPassword,
    });
    setTeamPassword('');
    setNotice('Teammate login credentials saved.');
    await refresh();
  };
  const saveSupplierKey = async (provider: any, remove = false) => {
    const apiKey = supplierKeyValues[provider.providerId] || '';
    if (!remove && !apiKey.trim()) {
      setError('Enter a supplier API key first.');
      return;
    }
    const result = await api('admin-supplier-key', key, {
      providerId: provider.providerId,
      ...(remove ? { remove: true } : { apiKey: apiKey.trim(), sync: true }),
    });
    setSupplierKeyValues((current) => ({
      ...current,
      [provider.providerId]: '',
    }));
    setNotice(
      remove
        ? `${provider.providerName} key removed.`
        : `${provider.providerName} key saved and ${result.synced || 0} products synced.`,
    );
    await refresh();
  };
  const saveSupplierGroupPrice = async (group: SupplierCatalogGroup, sellingPrice: number, productDescription?: string) => {
    const result = await api('admin-supplier-group-update', key, {
      productIds: group.products.map((product) => product.id),
      sellingPrice,
      ...(productDescription !== undefined ? { productDescription } : {}),
    });
    setNotice(
      `${group.name} price saved for ${result.updated || group.products.length} supplier offer${result.updated === 1 ? '' : 's'}.`,
    );
    await refresh();
  };
  const addSharedAccount = async (item: any) => {
    if (!window.confirm('Add this ChatGPT Plus account to the four-slot shared pool?')) return;
    await api('admin-shared-add', key, { inventoryId: item.id, confirmed: true });
    setNotice('ChatGPT account added to the shared pool.');
    await refresh();
  };
  const login = async () => {
    const session = await api('admin-login', '', { email, password });
    setKey(session.token);
    setPassword('');
    setData(await api('admin-list', session.token));
  };
  const logout = async () => {
    await api('admin-logout', '', {});
    setData(null);
    setKey('');
    setProfitToken('');
    setEmail('');
    setPassword('');
    setAccounts('');
    setReceipt(null);
    setOrderDelivery(null);
    setSupplierLogs(null);
    setPicked(null);
    setScamReport(null);
    setNotice('');
  };
  const money = (value: any) => `PKR ${Number(value || 0).toLocaleString()}`;
  const paymentMoney = (row: any) => {
    const currency = String(row?.currency || 'PKR').toUpperCase();
    if (currency === 'USDT') {
      return `USDT ${Number(row?.payment_amount ?? row?.amount ?? 0).toFixed(2)}`;
    }
    return `PKR ${Number(row?.amount ?? row?.payment_amount ?? 0).toLocaleString()}`;
  };
  const verificationReason = (value: unknown) => {
    const text = typeof value === 'string' && value ? value : 'not_evaluated';
    return text.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
  };
  const available = Number(
    data?.stock?.find((row: any) => row.state === 'available')?.count || 0,
  );
  const profitVisible = data?.profitUnlocked === true;
  const filteredInventory = (data?.inventory || []).filter((item: any) =>
    `${item.email} ${item.state}`
      .toLowerCase()
      .includes(inventorySearch.toLowerCase()),
  );
  const supplierProducts = (data?.supplierProducts || []).filter(
    (item: any) => {
      const provider =
        item.provider_name === 'Fat Bunny Hub'
          ? 'fatbunny'
          : item.provider_id === 'dody'
            ? 'dodi'
            : item.provider_id;
      const query = supplierSearch.trim().toLowerCase();
      return (
        (supplierProvider === 'all' || provider === supplierProvider) &&
        (!query ||
          `${item.name} ${item.external_product_id || ''} ${item.canonical_key || ''}`
            .toLowerCase()
            .includes(query))
      );
    },
  );
  const supplierOfferView = supplierOfferDecision((data?.supplierProducts || []) as any);
  const visibleSupplierProducts = supplierProducts.filter((item: any) => {
    if (supplierStockFilter === 'best-price') return supplierOfferView.winners.has(item.id);
    if (supplierStockFilter === 'in-stock') return Number(item.supplier_stock || 0) > 0 && supplierOfferView.winners.has(item.id);
    if (supplierStockFilter === 'out-of-stock') return Number(item.supplier_stock || 0) <= 0 && supplierOfferView.winners.has(item.id);
    return supplierOfferView.rejected.has(item.id);
  }).map((item: any) => {
    const winnerId = supplierOfferView.winnerByRejectedId.get(item.id);
    const winner = winnerId
      ? (data?.supplierProducts || []).find((candidate: any) => candidate.id === winnerId)
      : null;
    return winner
      ? { ...item, rejectedReason: `Higher supplier cost than ${winner.provider_name || 'the selected supplier'} (${winner.name})` }
      : item;
  });
  const supplierRejectedCount = supplierProducts.filter((item: any) => supplierOfferView.rejected.has(item.id)).length;
  const supplierCount = (
    provider:
      | 'all'
      | 'dodi'
      | 'qamify'
      | 'mke'
      | 'piggyai'
      | 'zoomstore'
      | 'fatbunny'
      | 'elitetools',
  ) =>
    provider === 'all'
      ? (data?.supplierProducts || []).length
      : (data?.supplierProducts || []).filter(
          (item: any) =>
            (item.provider_name === 'Fat Bunny Hub'
              ? 'fatbunny'
              : item.provider_id === 'dody'
                ? 'dodi'
                : item.provider_id) === provider,
        ).length;
  const lowBalanceProviders = (data?.providerStates || []).filter(
    (provider: any) => provider.lowBalance,
  );
  const inventoryView = useRecordView(filteredInventory, () => '');
  const supplierView = useRecordView(visibleSupplierProducts, () => '');
  const horCommission =
    (data?.commissionSummary || []).find(
      (item: any) => item.code === 'HOR',
    ) || { sales: 0, total: 0, rate: 0, perSale: 50 };
  const custCommission =
    (data?.commissionSummary || []).find(
      (item: any) => item.code === 'CUST',
    ) || { sales: 0, total: 0, rate: 10, perSale: 0 };
  const totalCommission =
    Number(horCommission.total || 0) + Number(custCommission.total || 0);
  const orderFilterOptions = [
    ['all', 'All orders'],
    ['delivered', 'Delivered'],
    ['unfulfilled', 'Unfulfilled'],
    ['cancelled', 'Cancelled'],
  ] as const;
  const orderMatchesFilter = (row: any) => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'delivered') return row.status === 'delivered';
    if (orderFilter === 'cancelled')
      return ['cancelled', 'expired'].includes(row.status);
    return ['pending', 'review'].includes(row.status);
  };
  const orderRows = (data?.orders || []).filter(orderMatchesFilter);
  const orderView = useRecordView(orderRows, (row: any) => `${row.id} ${row.product_id} ${row.supplier_product_name || ''} ${row.supplier_name || ''} ${row.payer_name || ''} ${row.status}`);
  const paymentReceivers = data?.paymentReceivers || [];
  const activePaymentReceiver = paymentReceivers.find((receiver: any) => receiver.active);
  const paymentReceiverLabel = (receiverId: string) =>
    paymentReceivers.find((receiver: any) => receiver.id === receiverId)?.label || receiverId || 'Unknown account';
  const paymentNeedsReview = (row: any) =>
    !row.verified ||
    ['verified_no_eligible_order', 'verified_after_order_window', 'verified_multiple_eligible_orders', 'verified_auto_delivery_failed'].includes(
      String(row.verification_reason || ''),
    );
  const paymentRows = (data?.payments || []).filter((row: any) => {
    const accountMatches =
      paymentReceiverFilter === 'all' ||
      (paymentReceiverFilter === 'active'
        ? row.receiver_id === activePaymentReceiver?.id
        : row.receiver_id === paymentReceiverFilter);
    const verificationMatches =
      paymentFilter === 'all' ||
      (paymentFilter === 'verified' ? !paymentNeedsReview(row) : paymentNeedsReview(row));
    return accountMatches && verificationMatches;
  });
  const paymentView = useRecordView(paymentRows, (row: any) => `${row.id} ${row.subject} ${row.order_id || ''} ${row.amount} ${row.transaction_id || ''} ${paymentReceiverLabel(row.receiver_id)}`);
  const orderFilterCount = (filter: (typeof orderFilterOptions)[number][0]) =>
    (data?.orders || []).filter((row: any) => {
      if (filter === 'all') return true;
      if (filter === 'delivered') return row.status === 'delivered';
      if (filter === 'cancelled') return ['cancelled', 'expired'].includes(row.status);
      return ['pending', 'review'].includes(row.status);
    }).length;
  const beginEdit = (item: any) => {
    setEditing(item);
    setEditCost(String(item.purchaseCost));
    setEditState(item.state);
    setEditEmail('');
    setEditPassword('');
    setEditTwoFactor('');
  };
  const copyCredential = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice('Credential copied.');
    } catch {
      setNotice('Select the credential and copy it.');
    }
  };
  if (checkingSession)
    return (
      <div
        className="commerce-shell commerce-admin admin-login"
        aria-busy="true"
      >
        <p role="status">Loading admin...</p>
      </div>
    );
  if (!data)
    return (
      <div className="commerce-shell commerce-admin admin-login">
        <a href="/" className="brand">
          <img
            src="/sasify-logo.png"
            alt="Sasify Solutions"
            width={48}
            height={48}
          />
          <strong>Sasify Solutions</strong>
        </a>
        <div className="admin-login-panel">
          <span className="admin-eyebrow">Secure workspace</span>
          <h1>Admin sign in</h1>
          <p>Manage stock, orders, payments and financial performance.</p>
          {error && (
            <p role="alert" className="commerce-error">
              {error}
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(login);
            }}
          >
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <button className="primary-button" disabled={busy}>
              {busy ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  return (
    <AdminShell tab={tab} onNavigate={setTab} busy={busy} autoVerify={data.autoVerify}
      onRefresh={() => void run(refresh)} onLogout={() => void run(logout)}>
      {error && (
        <p role="alert" className="commerce-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="admin-notice">
          {notice}
        </p>
      )}
      {(lowBalanceProviders.length > 0 || data.supplierAlerts?.length > 0) && (
        <details className="admin-panel compact-panel supplier-alert-panel">
          <summary><ShieldAlert size={17} /> Supplier attention needed · {lowBalanceProviders.length} low balances · {data.supplierAlerts?.length || 0} recent issues</summary>
          <div className="panel-heading">
            <div>
              <span className="admin-eyebrow">Attention required</span>
              <h2>Supplier alerts</h2>
            </div>
            <button
              className="secondary-button compact"
              onClick={() => setTab('supplier')}
            >
              Open supplier logs
            </button>
          </div>
          {lowBalanceProviders.map((provider: any) => (
            <p key={`balance-${provider.provider_id}`} className="admin-warning">
              {provider.provider_name} balance is low: {provider.balance}{' '}
              {provider.currency || ''} (alert threshold {provider.lowBalanceThreshold}{' '}
              {provider.currency || ''}).
            </p>
          ))}
          {data.supplierAlerts?.length > 0 && (
            <p className="admin-warning">
              {data.supplierAlerts.length} recent supplier API issue(s) need
              review. Check the detailed request and response logs.
            </p>
          )}
        </details>
      )}
      {tab === 'supplier' && (
        <label className="admin-search supplier-search">
          <Search size={17} />
          <input
            aria-label="Search supplier products"
            placeholder="Search supplier products"
            value={supplierSearch}
            onChange={(e) => { setSupplierSearch(e.target.value); supplierView.setPage(1); }}
          />
          {supplierSearch && (
            <button
              type="button"
              title="Clear supplier search"
              aria-label="Clear supplier search"
              onClick={() => setSupplierSearch('')}
            >
              ×
            </button>
          )}
        </label>
      )}

      {tab === 'coupons' && (
        <div className="admin-workspace">
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">Reseller pricing</span>
                <h2>Coupon settings</h2>
                <p>
                  Coupons apply only to ChatGPT Plus. HOR is currently disabled;
                  historical HOR commission records remain available. CUST
                  keeps the normal price and records 10% per delivered sale.
                  Usage is counted when checkout is created and released if
                  the unpaid reservation expires or is cancelled.
                </p>
              </div>
            </div>
            <form
              className="admin-form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await api('admin-coupon-create', key, {
                    code: newCouponCode,
                    discountPercent: Number(newCouponDiscount),
                    maxUses: Number(newCouponMaxUses),
                    enabled: true,
                  });
                  setNotice(`${newCouponCode.toUpperCase()} coupon created.`);
                  setNewCouponCode('');
                  setNewCouponDiscount('10');
                  setNewCouponMaxUses('10');
                  await refresh();
                });
              }}
            >
              <label>
                Coupon code
                <input
                  value={newCouponCode}
                  onChange={(e) =>
                    setNewCouponCode(e.target.value.toUpperCase())
                  }
                  placeholder="HOR"
                  required
                  maxLength={32}
                />
              </label>
              <label>
                Discount %
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={newCouponDiscount}
                  onChange={(e) => setNewCouponDiscount(e.target.value)}
                  required
                />
              </label>
              <label>
                Maximum uses
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={newCouponMaxUses}
                  onChange={(e) => setNewCouponMaxUses(e.target.value)}
                  required
                />
              </label>
              <button className="primary-button admin-span" disabled={busy}>
                Create coupon
              </button>
            </form>
          </section>
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">Manage</span>
                <h2>Existing coupons</h2>
              </div>
            </div>
            <div className="coupon-admin-list">
              {(data.coupons || []).map((coupon: any) => (
                <CouponRow
                  key={coupon.id}
                  coupon={coupon}
                  busy={busy}
                  save={(values) =>
                    run(async () => {
                      await api('admin-coupon-update', key, {
                        couponId: coupon.id,
                        ...values,
                      });
                      setNotice(`${values.code} coupon updated.`);
                      await refresh();
                    })
                  }
                />
              ))}
            </div>
            {!(data.coupons || []).length && (
              <p>No coupons yet. Create the first reseller coupon above.</p>
            )}
          </section>
        </div>
      )}

      {tab === 'scammers' && (
        <div className="admin-workspace">
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">
                  <ShieldAlert size={15} /> Moderation queue
                </span>
                <h2>Scam reports</h2>
                <p>
                  Only reports marked approved appear on the public Scam reports
                  page. Review the identifiers and proof before publishing.
                </p>
              </div>
            </div>
            <div className="scam-admin-list">
              {(data.scamReports || []).map((report: any) => (
                <article
                  className={`scam-admin-card ${report.status}`}
                  key={report.id}
                >
                  <div className="scam-admin-heading">
                    <div>
                      <span className={`admin-state ${report.status}`}>
                        {report.status}
                      </span>
                      <h3>{report.name}</h3>
                      <small>
                        {new Date(report.created_at).toLocaleString()} ·{' '}
                        {report.evidence_count || 0} proof image
                        {Number(report.evidence_count) === 1 ? '' : 's'}
                        {report.amount_pkr != null
                          ? ` · PKR ${Number(report.amount_pkr).toLocaleString('en-PK')} reported`
                          : ''}
                      </small>
                    </div>
                    <button
                      className="secondary-button compact"
                      disabled={busy}
                      onClick={() =>
                        void run(async () =>
                          setScamReport(
                            await api(
                              'admin-scam-report',
                              key,
                              undefined,
                              report.id,
                            ),
                          ),
                        )
                      }
                    >
                      Review details
                    </button>
                  </div>
                  <p>{report.description}</p>
                  <div className="scam-admin-actions">
                    <button
                      className="secondary-button compact"
                      disabled={busy || report.status === 'approved'}
                      onClick={() =>
                        void run(async () => {
                          await api('admin-scam-report-update', key, {
                            reportId: report.id,
                            status: 'approved',
                          });
                          setNotice(`${report.name} approved for publication.`);
                          await refresh();
                        })
                      }
                    >
                      Approve and publish
                    </button>
                    <button
                      className="secondary-button compact danger-action"
                      disabled={busy || report.status === 'rejected'}
                      onClick={() =>
                        void run(async () => {
                          await api('admin-scam-report-update', key, {
                            reportId: report.id,
                            status: 'rejected',
                          });
                          setNotice(`${report.name} rejected.`);
                          await refresh();
                        })
                      }
                    >
                      Reject
                    </button>
                    {report.status === 'approved' && (
                      <button
                        className="secondary-button compact danger-action"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api('admin-scam-report-update', key, {
                              reportId: report.id,
                              status: 'removed',
                            });
                            setNotice(
                              `${report.name} removed from public reports.`,
                            );
                            await refresh();
                          })
                        }
                      >
                        Remove from public
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {!(data.scamReports || []).length && (
              <p>No scam reports have been submitted.</p>
            )}
          </section>
          {scamReport && (
            <section className="admin-panel scam-admin-detail">
              <div className="panel-heading">
                <div>
                  <span className="admin-eyebrow">Report review</span>
                  <h2>{scamReport.name}</h2>
                </div>
                <button
                  title="Close report"
                  className="icon-command"
                  onClick={() => setScamReport(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <p>
                <strong>Reported amount:</strong>{' '}
                {scamReport.amountPkr != null
                  ? `PKR ${Number(scamReport.amountPkr).toLocaleString('en-PK')}`
                  : 'Not provided'}
              </p>
              <p>{scamReport.description}</p>
              <h3>Identifiers</h3>
              <ul>
                {(scamReport.identifiers || []).map(
                  (item: any, index: number) => (
                    <li key={`${item.platform}-${index}`}>
                      <strong>{item.platform}:</strong> {item.value}
                    </li>
                  ),
                )}
              </ul>
              <h3>Payment methods</h3>
              <p>{(scamReport.paymentMethods || []).join(' · ')}</p>
              {scamReport.submitterContact && (
                <p>
                  <strong>Submitter contact:</strong>{' '}
                  {scamReport.submitterContact}
                </p>
              )}
              {!!scamReport.evidence?.length && (
                <div className="scam-evidence">
                  <strong>Proof images</strong>
                  <div>
                    {scamReport.evidence.map((item: any, index: number) => (
                      <a
                        href={item.data}
                        target="_blank"
                        rel="noreferrer"
                        key={`${item.filename}-${index}`}
                      >
                        <img
                          src={item.data}
                          alt={`Proof screenshot ${index + 1}`}
                        />
                        <span>{item.filename}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {tab === 'overview' && (
        <div className="admin-workspace ops-overview">
          {data.postmarkInboundUsage && (
            <section className="admin-panel postmark-usage-panel postmark-usage-compact" aria-label="Postmark inbound usage">
              <div className="postmark-usage-compact-row">
                <div className="postmark-usage-compact-copy">
                  <span className="admin-eyebrow">Postmark inbound</span>
                  {data.postmarkInboundUsage.available ? (
                    <>
                      <strong>
                        {Number(data.postmarkInboundUsage.used || 0).toLocaleString()} / {Number(data.postmarkInboundUsage.limit || 100).toLocaleString()}
                      </strong>
                      <span className="postmark-usage-compact-meta">
                        {Number(data.postmarkInboundUsage.remaining || 0).toLocaleString()} remaining · last {data.postmarkInboundUsage.windowDays || 30} days
                      </span>
                    </>
                  ) : (
                    <span className="postmark-usage-compact-meta">Usage temporarily unavailable</span>
                  )}
                </div>
                <span className={data.postmarkInboundUsage.available ? 'admin-state available' : 'admin-state'}>
                  {data.postmarkInboundUsage.available ? 'Live' : 'Unavailable'}
                </span>
              </div>
              {data.postmarkInboundUsage.available ? (
                <progress
                  className="postmark-usage-progress"
                  max={Number(data.postmarkInboundUsage.limit || 100)}
                  value={Number(data.postmarkInboundUsage.used || 0)}
                  aria-label="Postmark inbound email usage"
                />
              ) : (
                <span className="postmark-usage-compact-note">Refresh to try again.</span>
              )}
            </section>
          )}
          <section className="metric-grid">
            <article>
              <span>Recognized sales value</span>
              <strong>{money(data.metrics.income)}</strong>
              <small>
                Gross {money(data.metrics.gross_income)} · Customer discounts{' '}
                {money(data.metrics.coupon_discounts)} ·{' '}
                HOR value {profitVisible ? money(data.metrics.hor_profit_credit) : 'Protected'} ·{' '}
                {data.metrics.delivered_orders} delivered ·{' '}
                {data.metrics.admin_withdrawals || 0} admin withdrawals
              </small>
            </article>
            <button
              type="button"
              className="metric-card metric-profit-card"
              onClick={() => setTab('profit')}
            >
              <span>Profit after coupon rules</span>
              <strong className="metric-profit">
                {profitVisible ? money(data.metrics.profit) : 'Protected'}
              </strong>
              <small>
                {profitVisible
                  ? `HOR is a team rule, not a customer discount · value credited ${money(data.metrics.hor_profit_credit)} · other coupons use discounted sale price`
                  : 'Financial data protected. Unlock financial view →'}
              </small>
            </button>
            <article>
              <span>Delivered orders</span>
              <strong>{data.metrics.delivered_orders}</strong>
              <small>
                {data.metrics.active_orders} active orders · {money(data.metrics.monthly_income)} sales this month
              </small>
            </article>
            <article>
              <span>Available stock</span>
              <strong>{available}</strong>
              <small>{data.metrics.active_orders} active orders</small>
            </article>
          </section>
          {Number(data.metrics.missing_costs) > 0 && (
            <p className="admin-warning">
              {data.metrics.missing_costs} fulfilled account(s) have no purchase
              cost. Add their costs in Inventory for accurate profit.
            </p>
          )}
          <AdminDailyChart days={data.dailyFinancials} unlocked={profitVisible} onNavigate={setTab} />
          <AdminOperations orders={data.orders || []} payments={data.payments || []} providers={data.providerStates || []} onNavigate={setTab} />
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">Live operations</span>
                <h2>Business snapshot</h2>
              </div>
            </div>
            <div className="snapshot-grid">
              <div>
                <span>Recorded stock cost</span>
                <strong>{profitVisible ? money(data.metrics.cost) : 'Locked'}</strong>
              </div>
              <div>
                <span>Active orders</span>
                <strong>{data.metrics.active_orders}</strong>
              </div>
              <div>
                <span>Delivered</span>
                <strong>{data.metrics.delivered_orders}</strong>
              </div>
              <div>
                <span>Available credentials</span>
                <strong>{available}</strong>
              </div>
            </div>
          </section>
        </div>
      )}
      {tab === 'profit' && (
        <div className="admin-workspace">
          {profitVisible ? (
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">Financial breakdown</span>
                <h2>Profit details</h2>
                <p>
                  Profit is calculated per delivered order. HOR uses the original
                  sale value; reseller and other coupons use sale value after
                  discount. Each result is reduced by purchase cost and added.
                </p>
              </div>
              <button
                className="secondary-button compact"
                onClick={() => setTab('overview')}
              >
                Back to overview
              </button>
            </div>
            <div className="profit-breakdown-grid">
              {['local', 'supplier'].map((source) => {
                const row = data.profitBreakdown?.find(
                  (item: any) => item.source === source,
                ) || {
                  income: 0,
                  gross_income: 0,
                  coupon_discounts: 0,
                  hor_profit_credit: 0,
                  cost: 0,
                  profit: 0,
                  orders: 0,
                };
                return (
                  <article
                    key={source}
                    className={`profit-breakdown-card ${source}`}
                  >
                    <span className="admin-eyebrow">
                      {source === 'local'
                        ? 'Local inventory'
                        : 'Supplier products'}
                    </span>
                    <h3>
                      {source === 'local'
                        ? 'Direct local stock'
                        : 'Automatic supplier fulfilment'}
                    </h3>
                    <div>
                      <span>Recognized value</span>
                      <strong>{money(row.income)}</strong>
                    </div>
                    <div>
                      <span>Recorded cost</span>
                      <strong>{money(row.cost)}</strong>
                    </div>
                    <div>
                      <span>Coupon discounts</span>
                      <strong>{money(row.coupon_discounts)}</strong>
                    </div>
                    <div>
                      <span>HOR value credited</span>
                      <strong>{money(row.hor_profit_credit)}</strong>
                    </div>
                    <div>
                      <span>Profit</span>
                      <strong className="metric-profit">
                        {money(row.profit)}
                      </strong>
                    </div>
                    <small>
                      {row.orders} fulfilled record{row.orders === 1 ? '' : 's'}
                    </small>
                  </article>
                );
              })}
            </div>
          </section>
          ) : (
            <section className="admin-panel profit-lock-panel">
              <span className="admin-eyebrow">Protected financial data</span>
              <h2>Financial data protected</h2>
              <p>
                Enter your financial password to view profit, costs, and the financial
                breakdown. The password is checked server-side and is never
                stored in the browser.
              </p>
              <form
                className="profit-unlock-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(unlockProfit);
                }}
              >
                <label>
                  Profit password
                  <input
                    type="password"
                    value={profitPassword}
                    onChange={(e) => setProfitPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </label>
                <button className="primary-button" disabled={busy || !profitPassword}>
                  Unlock financial view
                </button>
              </form>
            </section>
          )}
        </div>
      )}
      {tab === 'blockedUsers' && (
        <div className="admin-workspace">
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">Abuse prevention</span>
                <h2>Blocked users</h2>
                <p>IPs blocked after five or more payment-claim attempts. This list is visible only in the admin workspace.</p>
              </div>
            </div>
            {!data.blockedUsers?.length ? <p>No blocked IP addresses yet.</p> : (
              <div className="commerce-table">
                <table>
                  <thead><tr><th>IP address</th><th>Claim attempts</th><th>Orders</th><th>Last attempt</th></tr></thead>
                  <tbody>{data.blockedUsers.map((row: any) => (
                    <tr key={row.ip_address}><td><strong>{row.ip_address}</strong></td><td>{row.attempts}</td><td>{row.order_count}</td><td>{new Date(row.last_attempt_at).toLocaleString()}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
      {tab === 'customers' && <AdminCustomers accounts={data.accounts || []} onSelectUser={(accountId) => { setSelectedAccountId(accountId); setTab('userDetail'); }} />}
      {tab === 'emailCampaign' && (
        <AdminEmailCampaign
          accounts={data.accounts || []}
          busy={busy}
          onSend={async ({ audience, subject, text }) => {
            const result = await api('admin-email-campaign', key, { audience, subject, text });
            setNotice(result.message || 'Email campaign sent.');
            await refresh();
          }}
        />
      )}
      {tab === 'userDetail' && selectedAccountId && (
        <AdminUserDetail accountId={selectedAccountId} accounts={data.accounts || []} api={api} token={key} busy={busy} onBack={() => setTab('customers')} onRefresh={refresh} />
      )}
      {tab === 'products' && <AdminProducts products={data.supplierProducts || []} api={api} token={key} busy={busy} onRefresh={refresh} />}
      {tab === 'support' && <AdminSupport tickets={data.supportTickets || []} api={api} token={key} busy={busy} onRefresh={refresh} />}
      {tab === 'auditLogs' && <AdminAuditLogs logs={data.auditLogs || []} />}
      {tab === 'settings' && <AdminSettings settings={data.adminSettings || {}} api={api} token={key} busy={busy} onRefresh={refresh} />}
      {tab === 'transactions' && <AdminTransactionHistory payments={data.payments || []} orders={data.orders || []} />}
      {tab === 'resellerRequests' && (
        <AdminResellerRequests
          accounts={data.accounts || []}
          busy={busy}
          onReview={(accountId, status) => {
            void run(async () => {
              await api('admin-reseller-review', key, { accountId, status });
              setNotice(`Reseller request ${status}.`);
              await refresh();
            });
          }}
        />
      )}
      {tab === 'toolRequests' && (
        <AdminToolRequests
          requests={data.toolRequests || []}
          busy={busy}
          onStatus={(requestId, status) => {
            void run(async () => {
              await api('admin-tool-request-update', key, { requestId, status });
              setNotice(`Tool request marked ${status}.`);
              await refresh();
            });
          }}
        />
      )}
      {tab === 'requirements' && <AdminResellerRequirements requirements={data.resellerRequirements || []} api={api} token={key} busy={busy} onRefresh={refresh} />}

      {tab === 'team' && (
        <div className="admin-workspace">
          <section className="admin-panel team-access-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">Restricted stock access</span>
                <h2>Teammate login</h2>
                <p>
                  The teammate portal shows available local stock only. Each
                  stock pickup is removed from this admin inventory and records
                  a PKR 50 HOR commission automatically.
                </p>
              </div>
              <span className={`team-access-status ${data.teamAccess?.configured ? 'configured' : 'missing'}`}>
                {data.teamAccess?.configured ? 'Configured' : 'Not configured'}
              </span>
            </div>
            {data.teamAccess?.configured && (
              <p className="team-access-current">
                Current teammate email: <strong>{data.teamAccess.email}</strong>
              </p>
            )}
            <form
              className="admin-form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                void run(saveTeamCredentials);
              }}
            >
              <label>
                Teammate email
                <input
                  type="email"
                  value={teamEmail}
                  onChange={(e) => setTeamEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  autoComplete="off"
                  required
                />
              </label>
              <label>
                Teammate password
                <input
                  type="password"
                  value={teamPassword}
                  onChange={(e) => setTeamPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <button className="primary-button admin-span" disabled={busy}>
                {data.teamAccess?.configured ? 'Update teammate login' : 'Create teammate login'}
              </button>
            </form>
            <div className="team-access-link">
              Teammate sign-in URL: <a href="/team" target="_blank" rel="noreferrer">/team</a>
            </div>
            <div className="ops-permissions">
              <h3>Teammate access scope</h3>
              <p>These permissions reflect the existing stock-only role; they are not editable here.</p>
              <dl><div><dt>View available local stock</dt><dd>Allowed</dd></div><div><dt>Pick up stock · PKR 50 HOR commission</dt><dd>Allowed</dd></div><div><dt>Admin dashboard, financials and supplier keys</dt><dd>Not allowed</dd></div></dl>
            </div>
          </section>
        </div>
      )}

      {tab === 'commissions' && (
        <div className="admin-workspace">
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">Partner payouts</span>
                <h2>Commission tracking</h2>
                <p>
                  Delivered orders and teammate stock pickups are recorded here.
                  Teammate pickups are always counted under HOR at PKR 50 each.
                  CUST keeps the normal price and pays 10% per delivered sale.
                </p>
              </div>
              <button
                className="secondary-button compact"
                onClick={() => setTab('overview')}
              >
                Back to overview
              </button>
            </div>
            <div className="snapshot-grid">
              <div>
                <span>HOR accounts</span>
                <strong>{horCommission.sales}</strong>
                <small>{money(horCommission.total)} payable</small>
              </div>
              <div>
                <span>CUST sales</span>
                <strong>{custCommission.sales}</strong>
                <small>{money(custCommission.total)} payable</small>
              </div>
              <div>
                <span>Total commission</span>
                <strong>{money(totalCommission)}</strong>
                <small>Delivered sales and team pickups</small>
              </div>
            </div>
          </section>
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">Separate totals</span>
                <h2>HOR and CUST commission columns</h2>
              </div>
            </div>
            <div className="commerce-table">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>HOR</th>
                    <th>CUST</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Delivered sales</td>
                    <td>{horCommission.sales}</td>
                    <td>{custCommission.sales}</td>
                    <td>
                      {Number(horCommission.sales || 0) +
                        Number(custCommission.sales || 0)}
                    </td>
                  </tr>
                  <tr>
                    <td>Commission rule</td>
                    <td>PKR 50 per account</td>
                    <td>{custCommission.rate || 10}% of sale</td>
                    <td>—</td>
                  </tr>
                  <tr>
                    <td>Payable commission</td>
                    <td>{money(horCommission.total)}</td>
                    <td>{money(custCommission.total)}</td>
                    <td>{money(totalCommission)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">Order-level detail</span>
                <h2>Commission ledger</h2>
              </div>
            </div>
            {!data.commissions?.length ? (
              <p>No commission-bearing deliveries yet.</p>
            ) : (
              <div className="commerce-table">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Code</th>
                      <th>Sale amount</th>
                      <th>Commission</th>
                      <th>Customer</th>
                      <th>Delivered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.commissions.map((row: any) => (
                      <tr key={row.order_id}>
                        <td>{String(row.order_id).slice(0, 8)}</td>
                        <td>
                          <strong>{row.commission_code}</strong>
                          {row.commission_code === 'HOR' ? (
                            <small>PKR 50 per account</small>
                          ) : (
                            <small>{row.commission_rate}% of sale</small>
                          )}
                        </td>
                        <td>{money(row.amount)}</td>
                        <td>{money(row.commission_amount)}</td>
                        <td>{row.payer_name || '—'}</td>
                        <td>{new Date(row.delivered_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="admin-workspace">
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">Create</span>
                <h2>Add inventory</h2>
                <p>
                  Local inventory is reserved for ChatGPT Plus only. All other
                  products are managed through Supplier Store.
                </p>
              </div>
            </div>
            <form
              className="admin-form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const result = await api('admin-import', key, {
                    productId,
                    accounts,
                    purchaseCost: Number(purchaseCost),
                  });
                  setAccounts('');
                  setNotice(`${result.imported} account(s) imported.`);
                  await refresh();
                });
              }}
            >
              <label>
                Package
                <select
                  value={productId}
                  onChange={(e) => setProduct(e.target.value)}
                >
                  <option value="p093-ultra">
                    Ultra Stable Account · Apple Pay · PKR 3,499
                  </option>
                </select>
              </label>
              <label>
                Purchase cost per account
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)}
                  required
                />
              </label>
              <label className="admin-span">
                Accounts (email | password | 2FA)
                <textarea
                  value={accounts}
                  onChange={(e) => setAccounts(e.target.value)}
                  required
                  rows={5}
                  spellCheck={false}
                  autoComplete="off"
                />
              </label>
              <button className="primary-button admin-span" disabled={busy}>
                Import stock
              </button>
            </form>
          </section>
          <section className="admin-panel shared-account-admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">ChatGPT Plus · PKR 999</span>
                <h2>Shared account pool</h2>
                <p>
                  Add an available ChatGPT Plus account below. Customers consume
                  four slots per account; when one reaches 4/4, checkout moves
                  automatically to the next active account in this pool.
                </p>
              </div>
            </div>
            {!data.sharedAccounts?.length ? (
              <p>No shared accounts configured yet. Use the group button beside an available ChatGPT account.</p>
            ) : (
              <div className="commerce-table">
                <table>
                  <thead>
                    <tr>
                      <th>Inventory account</th>
                      <th>Slots</th>
                      <th>Status</th>
                      <th>Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sharedAccounts.map((shared: any) => {
                      const inventory = data.inventory?.find((item: any) => item.id === shared.inventoryId);
                      return (
                        <tr key={shared.id}>
                          <td>
                            <strong>{inventory?.email || 'Account hidden'}</strong>
                            <small>{String(shared.inventoryId).slice(0, 8)}</small>
                          </td>
                          <td>{shared.slotsFilled}/{shared.slotsTotal} filled</td>
                          <td><span className={`admin-state ${shared.status}`}>{shared.status}</span></td>
                          <td>{new Date(shared.createdAt).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">Read, update, withdraw</span>
                <h2>Inventory accounts</h2>
              </div>
              <label className="admin-search">
                <Search size={17} />
                <input
                  aria-label="Search inventory"
                  placeholder="Search email or status"
                  value={inventorySearch}
                  onChange={(e) => { setInventorySearch(e.target.value); inventoryView.setPage(1); }}
                />
              </label>
            </div>
            <AdminRecordControls view={inventoryView} label="inventory" hideSearch />
            <div className="commerce-table">
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Status</th>
                    <th>Cost</th>
                    <th>Margin</th>
                    <th>Added</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryView.rows.map((item: any) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.email}</strong>
                        <small>
                          Apple Pay · Ultra Stable{' '}
                          · {item.id.slice(0, 8)}
                        </small>
                      </td>
                      <td>
                        <span className={`admin-state ${item.state}`}>
                          {item.state}
                        </span>
                        {item.sharedAccount && (
                          <small>
                            Shared {item.sharedAccount.slotsFilled}/{item.sharedAccount.slotsTotal}
                          </small>
                        )}
                      </td>
                      <td>{money(item.purchaseCost)}</td>
                      <td>
                        {item.sharedAccount
                          ? money(999 - Math.ceil(Number(item.purchaseCost || 0) / 4))
                          : ['delivered', 'withdrawn'].includes(item.state)
                          ? money(3499 - item.purchaseCost)
                          : '-'}
                      </td>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="row-actions">
                          {['p093', 'p093-ultra'].includes(item.productId) &&
                            item.state === 'available' &&
                            !item.sharedAccount && (
                              <button
                                title="Add to four-slot shared pool"
                                aria-label={`Add ${item.email} to shared pool`}
                                disabled={busy}
                                onClick={() => void run(() => addSharedAccount(item))}
                              >
                                <Users size={16} />
                              </button>
                            )}
                          <button
                            title="Pick account credentials"
                            aria-label={`Pick credentials for ${item.email}`}
                            disabled={busy || item.state !== 'available' || Boolean(item.sharedAccount)}
                            onClick={() => {
                              if (
                                window.confirm(
                                  'Pick this account for admin use? It will be removed from sellable stock.',
                                )
                              )
                                void run(async () => {
                                  const result = await api(
                                    'admin-inventory-pick',
                                    key,
                                    { inventoryId: item.id, confirmed: true },
                                  );
                                  setPicked(result);
                                  setEditing(null);
                                  setNotice(
                                    'Account withdrawn from sellable stock.',
                                  );
                                  await refresh();
                                });
                            }}
                          >
                            <KeyRound size={16} />
                          </button>
                          <button
                            title="Edit inventory account"
                            aria-label={`Edit ${item.email}`}
                            disabled={Boolean(item.sharedAccount) || [
                              'reserved',
                              'delivered',
                              'withdrawn',
                            ].includes(item.state)}
                            onClick={() => beginEdit(item)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            title="Delete inventory account"
                            aria-label={`Delete ${item.email}`}
                            disabled={
                              Boolean(item.sharedAccount) || !['available', 'quarantined'].includes(item.state)
                            }
                            onClick={() => {
                              if (
                                window.confirm(
                                  'Delete this unused inventory account permanently?',
                                )
                              )
                                void run(async () => {
                                  await api('admin-inventory-delete', key, {
                                    inventoryId: item.id,
                                    confirmed: true,
                                  });
                                  setNotice('Inventory account deleted.');
                                  if (editing?.id === item.id) setEditing(null);
                                  await refresh();
                                });
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filteredInventory.length && (
              <p>No inventory accounts match this view.</p>
            )}
            {picked && (
              <section className="inventory-editor admin-picked-credentials">
                <div className="panel-heading">
                  <div>
                    <span className="admin-eyebrow">Admin withdrawal</span>
                    <h3>Picked account credentials</h3>
                  </div>
                  <button
                    type="button"
                    title="Close credentials"
                    className="icon-command"
                    onClick={() => setPicked(null)}
                  >
                    <X size={18} />
                  </button>
                </div>
                <p>
                  This account is no longer available for customer orders. Store
                  these credentials securely.
                </p>
                {Object.entries(picked.credentials).map(([field, value]) => (
                  <label key={field}>
                    {field === 'twoFactor' ? '2FA' : field}
                    <div className="commerce-secret">
                      <code>{value}</code>
                      <button
                        title={`Copy ${field}`}
                        aria-label={`Copy ${field}`}
                        onClick={() => void copyCredential(value)}
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  </label>
                ))}
              </section>
            )}
            {editing && (
              <form
                className="inventory-editor"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await api('admin-inventory-update', key, {
                      inventoryId: editing.id,
                      purchaseCost: Number(editCost),
                      state: editState,
                      email: editEmail,
                      password: editPassword,
                      twoFactor: editTwoFactor,
                    });
                    setEditing(null);
                    setNotice('Inventory account updated.');
                    await refresh();
                  });
                }}
              >
                <div className="panel-heading">
                  <div>
                    <span className="admin-eyebrow">Update</span>
                    <h3>{editing.email}</h3>
                  </div>
                  <button
                    type="button"
                    title="Close editor"
                    className="icon-command"
                    onClick={() => setEditing(null)}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="admin-form-grid">
                  <label>
                    Purchase cost
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editCost}
                      onChange={(e) => setEditCost(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Status
                    <select
                      value={editState}
                      disabled={editing.state === 'delivered'}
                      onChange={(e) => setEditState(e.target.value)}
                    >
                      {editing.state === 'delivered' ? (
                        <option value="delivered">Delivered</option>
                      ) : (
                        <>
                          <option value="available">Available</option>
                          <option value="quarantined">Quarantined</option>
                        </>
                      )}
                    </select>
                  </label>
                  {editing.state !== 'delivered' && (
                    <>
                      <p className="admin-span editor-note">
                        Leave all credential fields blank to keep the existing
                        login.
                      </p>
                      <label>
                        Email
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                        />
                      </label>
                      <label>
                        Password
                        <input
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                        />
                      </label>
                      <label className="admin-span">
                        2FA
                        <input
                          value={editTwoFactor}
                          onChange={(e) => setEditTwoFactor(e.target.value)}
                        />
                      </label>
                    </>
                  )}
                  <button className="primary-button admin-span" disabled={busy}>
                    Save changes
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {tab === 'supplier' && (
        <div className="admin-workspace">
          <section className="admin-panel supplier-key-panel">
            <div className="panel-heading supplier-key-heading">
              <div>
                <span className="admin-eyebrow">Secure configuration</span>
                <h2>Supplier integrations</h2>
                <p>
                  Supplier connections are ready for catalog sync and fulfilment.
                  Open the key editor only when you need to replace a key.
                </p>
              </div>
              <button
                type="button"
                className="secondary-button compact supplier-key-toggle"
                aria-expanded={supplierKeysOpen}
                onClick={() => setSupplierKeysOpen((open) => !open)}
              >
                <KeyRound size={16} />
                {supplierKeysOpen ? 'Close key editor' : 'Update keys'}
              </button>
            </div>
            <div className="supplier-key-summary" aria-label="Supplier key status">
              {(data.supplierKeys || []).map((provider: any) => (
                <span
                  className={`supplier-key-pill ${provider.configured ? 'configured' : 'missing'}`}
                  key={provider.providerId}
                >
                  <strong>{provider.providerName}</strong>
                  <small>{provider.configured ? 'Connected' : 'Needs key'}</small>
                </span>
              ))}
            </div>
            {supplierKeysOpen && (
              <div className="supplier-key-list">
                {(data.supplierKeys || []).map((provider: any) => (
                  <div className="supplier-key-row" key={provider.providerId}>
                    <div>
                      <strong>{provider.providerName}</strong>
                      <small>
                        {provider.configured
                          ? provider.source === 'admin'
                            ? 'Admin key configured'
                            : 'Environment key configured'
                          : 'Not configured'}
                      </small>
                    </div>
                    <label>
                      API key
                      <input
                        type="password"
                        value={supplierKeyValues[provider.providerId] || ''}
                        onChange={(e) =>
                          setSupplierKeyValues((current) => ({
                            ...current,
                            [provider.providerId]: e.target.value,
                          }))
                        }
                        placeholder={
                          provider.configured
                            ? 'Enter a new key to replace it'
                            : 'Paste supplier API key'
                        }
                        autoComplete="new-password"
                      />
                    </label>
                    <div className="supplier-key-actions">
                      <button
                        className="secondary-button compact"
                        disabled={busy || !supplierKeyValues[provider.providerId]?.trim()}
                        onClick={() => void run(() => saveSupplierKey(provider))}
                      >
                        Save &amp; sync
                      </button>
                      {provider.source === 'admin' && (
                        <button
                          className="secondary-button compact danger-action"
                          disabled={busy}
                          onClick={() =>
                            void run(() => saveSupplierKey(provider, true))
                          }
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">Supplier catalog</span>
                <h2>
                  {supplierProvider === 'all'
                    ? 'All supplier products'
                    : supplierProvider === 'qamify'
                      ? 'Qamify products'
                      : supplierProvider === 'mke'
                        ? 'MKE Shop products'
                        : supplierProvider === 'piggyai'
                          ? 'PiggyAi products'
                          : supplierProvider === 'fatbunny'
                            ? 'Fat Bunny Hub products'
                            : supplierProvider === 'zoomstore'
                              ? 'Zoom Store products'
                              : supplierProvider === 'elitetools'
                                ? 'Elite Tools Store products'
                                : 'DODI Store products'}
                </h2>
                <p>
                  Choose a supplier to manage its catalog separately. Automatic
                  conversion:{' '}
                  <strong>
                    1 USDT = PKR {data.supplierUsdtPkrRate || 285}
                  </strong>
                  {data.supplierUsdPkrRate && (
                    <>
                      ; <strong>1 USD = PKR {data.supplierUsdPkrRate}</strong>
                    </>
                  )}
                </p>
                {(data.providerStates || [])
                  .filter(
                    (provider: any) =>
                      supplierProvider === 'all' ||
                      (provider.provider_id === 'dody'
                        ? 'dodi'
                        : provider.provider_id) === supplierProvider,
                  )
                  .map((provider: any) => (
                    <small
                      key={provider.provider_id}
                      className={provider.lowBalance ? 'status-warn' : undefined}
                    >
                      {provider.provider_name}: {provider.balance ?? '—'}{' '}
                      {provider.currency || ''}
                      {provider.lowBalance ? ' · LOW BALANCE' : ''}
                    </small>
                  ))}
              </div>
              <div className="commerce-actions">
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const result = await api('admin-supplier-sync', key, {});
                      const summary = (result.providers || [])
                        .map(
                          (provider: any) =>
                            `${provider.providerName}: ${provider.synced} products, balance ${provider.balance ?? '—'} ${provider.currency || ''}${provider.balanceUpdated ? '' : ' (last known balance)'}`,
                        )
                        .join(', ');
                      setNotice(
                        `${result.synced} products synced${summary ? ` (${summary})` : ''}.${result.seoRebuild?.triggered ? ' SEO catalog rebuild started.' : result.seoRebuild?.configured ? ' SEO catalog rebuild could not be started.' : ' SEO catalog rebuild hook is not configured.'}`,
                      );
                      await refresh();
                    })
                  }
                >
                  <RefreshCw size={17} /> Sync providers
                </button>
                <button className="primary-button" disabled={busy} onClick={() => {
                  if (!window.confirm('Set every supplier product with a valid cost to cost × 3 and enable it? Local ChatGPT Plus and all other local products stay unchanged.')) return;
                  void run(async () => { const result = await api('admin-supplier-price-all-3x', key, {}); setNotice(`${result.priced} supplier products are now priced at 3× PKR cost.`); await refresh(); });
                }}>Price all · 3× cost</button>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => void run(() => showSupplierLogs())}
                >
                  <ClipboardList size={17} /> Check logs
                </button>
              </div>
            </div>
            <AdminCatalogStatus
              products={supplierProducts as any}
              busy={busy}
              onManage={(product) => {
                setSelectedSupplierId(product.id);
                setSupplierSearch(product.external_product_id || product.name);
                setSupplierProvider('all');
                setSupplierStockFilter(supplierOfferView.rejected.has(product.id) ? 'rejected' : 'best-price');
                setTab('supplier');
                window.setTimeout(() => document.querySelector('.supplier-raw-offers')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
              }}
              onSaveGroupPrice={(group, sellingPrice, description) =>
                run(() => saveSupplierGroupPrice(group, sellingPrice, description))
              }
            />
            <details className="supplier-raw-offers" open={Boolean(selectedSupplierId) || undefined}>
              <summary>Advanced: edit individual supplier offers</summary>
            <div
              className="supplier-provider-tabs"
              role="tablist"
              aria-label="Supplier product providers"
            >
              {(
                [
                  ['all', 'All suppliers'],
                  ['dodi', 'DODI Store'],
                  ['qamify', 'Qamify'],
                  ['mke', 'MKE Shop'],
                  ['piggyai', 'PiggyAi'],
                  ['fatbunny', 'Fat Bunny Hub'],
                  ['zoomstore', 'Zoom Store'],
                  ['elitetools', 'Elite Tools Store'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={supplierProvider === value}
                  className={supplierProvider === value ? 'active' : ''}
                  onClick={() => { setSupplierProvider(value); supplierView.setPage(1); }}
                >
                  {label}
                  <span>{supplierCount(value)}</span>
                </button>
              ))}
            </div>
            <div className="supplier-catalog-toolbar">
              <div className="supplier-catalog-filter-tabs" role="tablist" aria-label="Supplier product stock filters">
                {(
                  [
                    ['best-price', 'Best-price offers', supplierProducts.filter((item: any) => supplierOfferView.winners.has(item.id)).length],
                    ['in-stock', 'In stock', supplierProducts.filter((item: any) => Number(item.supplier_stock || 0) > 0 && supplierOfferView.winners.has(item.id)).length],
                    ['out-of-stock', 'Out of stock', supplierProducts.filter((item: any) => Number(item.supplier_stock || 0) <= 0 && supplierOfferView.winners.has(item.id)).length],
                    ['rejected', 'Rejected duplicates', supplierRejectedCount],
                  ] as const
                ).map(([value, label, count]) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={supplierStockFilter === value}
                    className={supplierStockFilter === value ? 'active' : ''}
                    key={value}
                    onClick={() => { setSupplierStockFilter(value); supplierView.setPage(1); }}
                  >
                    {label} <span>{count}</span>
                  </button>
                ))}
              </div>
              <p className="supplier-catalog-note">
                Best-price offers keep the lowest saved PKR supplier cost for each matching product. Rejected duplicates are retained for review and are not shown in the main view.
              </p>
            </div>
            <AdminRecordControls view={supplierView} label="supplier products" hideSearch orderLabels={['Catalog order', 'Reverse catalog order']} />
            <div className="supplier-admin-list">
              {supplierView.rows.map((item: any) => (
                <SupplierProductRow
                  key={item.id}
                  item={item}
                  busy={busy}
                  save={(values) =>
                    run(async () => {
                      await api('admin-supplier-update', key, {
                        productId: item.id,
                        ...values,
                      });
                      setNotice(`${item.name} updated.`);
                      await refresh();
                    })
                  }
                />
              ))}
            </div>
            {!supplierProducts.length && (
              <p>
                No products found for{' '}
                {supplierProvider === 'qamify'
                  ? 'Qamify'
                  : supplierProvider === 'dodi'
                    ? 'DODI Store'
                    : supplierProvider === 'mke'
                      ? 'MKE Shop'
                      : supplierProvider === 'piggyai'
                        ? 'PiggyAi'
                        : supplierProvider === 'fatbunny'
                          ? 'Fat Bunny Hub'
                          : supplierProvider === 'zoomstore'
                            ? 'Zoom Store'
                            : supplierProvider === 'elitetools'
                              ? 'Elite Tools Store'
                              : 'the selected supplier'}{' '}
                yet. Select Sync providers to refresh its catalog.
              </p>
            )}
            </details>
          </section>
        </div>
      )}

      {supplierLogs && (
        <section className="admin-panel compact-panel supplier-log-panel">
          <div className="panel-heading">
            <div>
              <span className="admin-eyebrow">Supplier diagnostics</span>
              <h2>Supplier API logs</h2>
            </div>
            <button
              title="Close supplier logs"
              className="icon-command"
              onClick={() => setSupplierLogs(null)}
            >
              <X size={18} />
            </button>
          </div>
          <p>
            Purchase requests and provider responses are shown here. API keys
            and delivered credentials are redacted.
          </p>
          {!supplierLogs.logs?.length && <p>No supplier purchase logs found.</p>}
          <div className="supplier-log-list">
            {(supplierLogs.logs || []).map((log: any) => (
              <article className="supplier-log-entry" key={String(log.id)}>
                <div className="supplier-log-heading">
                  <strong>
                    {String(log.provider_id).toUpperCase()} · {log.operation}
                  </strong>
                  <span>
                    {log.response_status || 'No HTTP response'} ·{' '}
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <small>
                  Order {log.order_id?.slice(0, 8) || '—'} · {log.request_method}{' '}
                  {log.endpoint}
                </small>
                <pre className="commerce-receipt">
                  {`REQUEST HEADERS\n${JSON.stringify(log.request_headers || {}, null, 2)}\n\nREQUEST BODY\n${JSON.stringify(log.request_body, null, 2)}\n\nRESPONSE\n${JSON.stringify(log.response_body, null, 2)}${log.error_message ? `\n\nERROR\n${log.error_message}` : ''}`}
                </pre>
              </article>
            ))}
          </div>
        </section>
      )}
      {orderDelivery && (
        <section className="admin-panel compact-panel">
          <div className="panel-heading">
            <div>
              <span className="admin-eyebrow">Delivery record</span>
              <h2>Sent credentials</h2>
            </div>
            <button
              title="Close delivery"
              className="icon-command"
              onClick={() => setOrderDelivery(null)}
            >
              <X size={18} />
            </button>
          </div>
          <p>
            Order <strong>{orderDelivery.orderId.slice(0, 8)}</strong> ·
            Delivered {new Date(orderDelivery.deliveredAt).toLocaleString()}
          </p>
          {orderDelivery.credentials && (
            <div className="receipt-view">
              <pre className="commerce-receipt">
                {JSON.stringify(orderDelivery.credentials, null, 2)}
              </pre>
              <button
                className="secondary-button compact"
                onClick={() =>
                  void copyCredential(
                    JSON.stringify(orderDelivery.credentials, null, 2),
                  )
                }
              >
                <Copy size={16} /> Copy credentials
              </button>
            </div>
          )}
          {orderDelivery.delivery && (
            <div className="receipt-view">
              <pre className="commerce-receipt">
                {orderDelivery.delivery.content ||
                  JSON.stringify(orderDelivery.delivery, null, 2)}
              </pre>
              <button
                className="secondary-button compact"
                onClick={() =>
                  void copyCredential(
                    orderDelivery.delivery.content ||
                      JSON.stringify(orderDelivery.delivery, null, 2),
                  )
                }
              >
                <Copy size={16} /> Copy delivery
              </button>
            </div>
          )}
        </section>
      )}
      {tab === 'orders' && (
        <div className="admin-workspace">
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">Order management</span>
                <h2>Orders</h2>
                <p>
                  Financial figures use the cost captured when each order was
                  delivered, so inventory edits do not change historical profit.
                </p>
              </div>
            </div>
            <div className="order-filter-bar" role="tablist" aria-label="Filter orders by status">
              {orderFilterOptions.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={orderFilter === value}
                  className={orderFilter === value ? 'active' : ''}
                  onClick={() => { setOrderFilter(value); orderView.setPage(1); }}
                >
                  {label}
                  <span>{orderFilterCount(value)}</span>
                </button>
              ))}
            </div>
            <p className="order-filter-summary">
              Showing {orderRows.length} of {(data.orders || []).length} recent
              orders. Expired reservations are grouped with cancelled orders.
            </p>
            <AdminRecordControls view={orderView} label="orders" />
            {!orderView.count && <p>No orders match these filters. Try another status or search.</p>}
            <div className="commerce-table">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Product</th>
                    <th>Supplier</th>
                    <th>Source</th>
                    <th>Sale</th>
                    <th>Cost</th>
                    <th>Profit</th>
                    <th>Status</th>
                    <th>Payment route</th>
                    <th>Payment match</th>
                    <th>Sender</th>
                    <th>IP address</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orderView.rows.map((row: any) => (
                    <tr key={row.id}>
                      <td>
                        <button
                          className="table-select"
                          onClick={() => setOrderId(row.id)}
                        >
                          {row.id.slice(0, 8)}
                        </button>
                      </td>
                      <td>{row.supplier_product_name || row.product_id}</td>
                      <td>
                        <strong>
                          {row.supplier_name || 'Local inventory'}
                        </strong>
                        {row.supplier_status && (
                          <small>{row.supplier_status}</small>
                        )}
                      </td>
                      <td>
                        <strong>
                          {row.telegram_chat_id || String(row.ip_address || '').startsWith('telegram:')
                            ? 'Telegram bot'
                            : 'Website'}
                        </strong>
                        <small>{row.telegram_chat_id ? `Chat ${row.telegram_chat_id}` : 'Web checkout'}</small>
                      </td>
                      <td>
                        {money(row.amount)}
                        {row.payment_currency === 'USDT' && row.payment_amount != null && (
                          <small>USDT {Number(row.payment_amount).toFixed(2)}</small>
                        )}
                        {row.coupon_code && <small>{row.coupon_code}</small>}
                        {Number(row.listed_amount) > Number(row.amount) && (
                          <small>Listed {money(row.listed_amount)}</small>
                        )}
                      </td>
                      <td>{row.cost_pkr == null ? '—' : money(row.cost_pkr)}</td>
                      <td>
                        {row.profit_pkr == null ? '—' : money(row.profit_pkr)}
                      </td>
                      <td>
                        <span className={`admin-state ${row.status}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <strong>
                          {row.payment_method === 'bank'
                            ? 'Bank transfer'
                            : row.payment_method === 'binance'
                              ? 'Binance Pay'
                              : row.payment_method === 'crypto'
                                ? 'Crypto USDT'
                                : 'Wallet transfer'}
                        </strong>
                      </td>
                      <td>
                        <strong>
                          {row.status === 'delivered'
                            ? 'Delivered'
                            : row.payment_submitted_at
                              ? 'Submitted · checking'
                              : 'Awaiting “I paid”'}
                        </strong>
                        {row.payment_submitted_at && (
                          <small>
                            {new Date(row.payment_submitted_at).toLocaleString()}
                          </small>
                        )}
                        {row.coupon_code && (
                          <small>
                            {row.coupon_code === 'HOR' ? 'HOR team access' : `Coupon ${row.coupon_code}`}
                          </small>
                        )}
                      </td>
                      <td>
                        <strong>{row.payer_name || '-'}</strong>
                        {row.customer_email && <small>Customer email: {row.customer_email}</small>}
                      </td>
                      <td>{row.ip_address || '-'}</td>
                      <td>{new Date(row.created_at).toLocaleString()}</td>
                      <td>
                        <div className="commerce-order-actions">
                        {['pending', 'review'].includes(row.status) && (!row.supplier_product_name || row.provider_id === 'manual') && (
                          <button
                            className="primary-button compact"
                            disabled={busy}
                            onClick={() => {
                              const deliveryContent = row.provider_id === 'manual'
                                ? window.prompt('Enter the access details or delivery message for this customer:')
                                : undefined;
                              if (row.provider_id === 'manual' && !deliveryContent?.trim()) return;
                              if (!window.confirm(row.provider_id === 'manual'
                                ? 'Mark this Muse AI order as delivered and send these details to the customer?'
                                : 'Deliver this order manually without payment verification?')) return;
                              void run(async () => {
                                const result = await api('admin-manual-delivery', key, {
                                  orderId: row.id,
                                  confirmed: true,
                                  ...(deliveryContent ? { deliveryContent: deliveryContent.trim() } : {}),
                                });
                                setOrderId(row.id);
                                setOrderDelivery(await api('admin-order-delivery', key, { orderId: result.orderId }));
                                setNotice(row.provider_id === 'manual' ? 'Manual order marked as delivered.' : 'Credentials delivered manually.');
                                await refresh();
                              });
                            }}
                          >
                            <KeyRound size={16} /> {row.provider_id === 'manual' ? 'Mark done' : 'Deliver manually'}
                          </button>
                        )}
                        {['pending', 'review'].includes(row.status) && (
                          <button
                            className="secondary-button compact danger-action"
                            disabled={busy}
                            onClick={() => {
                              if (!window.confirm('Cancel this order and release its reserved stock?')) return;
                              void run(async () => {
                                await api('admin-cancel', key, { orderId: row.id, confirmed: true });
                                setNotice('Order cancelled and stock released.');
                                if (orderId === row.id) setOrderId('');
                                await refresh();
                              });
                            }}
                          >
                            Cancel order
                          </button>
                        )}
                        <button
                          className="secondary-button compact"
                          disabled={busy || row.status !== 'delivered'}
                          onClick={() =>
                            void run(async () =>
                              setOrderDelivery(
                                await api('admin-order-delivery', key, {
                                  orderId: row.id,
                                }),
                              ),
                            )
                          }
                        >
                          View sent delivery
                        </button>
                        {row.supplier_product_name && (
                          <button
                            className="secondary-button compact"
                            disabled={busy}
                            onClick={() =>
                              void run(() => showSupplierLogs(row.id))
                            }
                          >
                            <ClipboardList size={16} /> Check API logs
                          </button>
                        )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="admin-panel compact-panel">
            <h2>Release unpaid reservation</h2>
            <p>
              Selected order:{' '}
              <strong>{orderId ? orderId.slice(0, 8) : 'None'}</strong>. Verify
              that no payment is owed before cancelling.
            </p>
            <button
              className="secondary-button danger-action"
              disabled={busy || !orderId}
              onClick={() => {
                if (
                  window.confirm(
                    'Cancel this undelivered order and release its stock?',
                  )
                )
                  void run(async () => {
                    await api('admin-cancel', key, {
                      orderId,
                      confirmed: true,
                    });
                    setNotice('Reservation cancelled and stock released.');
                    setOrderId('');
                    await refresh();
                  });
              }}
            >
              Cancel selected reservation
            </button>
          </section>
          <section className="admin-panel compact-panel">
            <h2>Manual credential delivery</h2>
            <p>
              Use only after independently approving delivery. This explicit
              action does not verify or attach a payment. Supplier orders must
              be delivered through their supplier flow.
            </p>
            <form
              className="admin-form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const result = await api('admin-manual-delivery', key, {
                    orderId,
                    confirmed: manualDeliveryConfirmed,
                  });
                  setManualDeliveryConfirmed(false);
                  setNotice('Credentials delivered manually.');
                  setOrderDelivery(
                    await api('admin-order-delivery', key, {
                      orderId: result.orderId,
                    }),
                  );
                  await refresh();
                });
              }}
            >
              <label>
                Order ID
                <input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  required
                  placeholder="Select an order above"
                />
              </label>
              <label className="commerce-check admin-span">
                <input
                  type="checkbox"
                  checked={manualDeliveryConfirmed}
                  onChange={(e) => setManualDeliveryConfirmed(e.target.checked)}
                />{' '}
                I authorize manual delivery without payment verification.
              </label>
              <button
                className="primary-button admin-span"
                disabled={busy || !manualDeliveryConfirmed}
              >
                <KeyRound size={18} /> Deliver credentials manually
              </button>
            </form>
          </section>
        </div>
      )}

      {tab === 'paymentAccounts' && (
        <div className="admin-workspace">
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">Admin-only control</span>
                <h2>Payment receiving accounts</h2>
                <p>
                  Select which receiving account is shown at checkout and used
                  for automatic receipt verification. Existing orders keep the
                  account selected when they were created.
                </p>
              </div>
            </div>
            <div className="supplier-key-list">
              {(data.paymentReceivers || []).map((receiver: any) => (
                <div className="supplier-key-row" key={receiver.id}>
                  <div>
                    <strong>{receiver.label}</strong>
                    <small>{receiver.title} · {receiver.account_number}</small>
                    {receiver.active && <small>Currently active</small>}
                  </div>
                  <button
                    type="button"
                    className={receiver.active ? 'secondary-button compact' : 'primary-button compact'}
                    disabled={busy || receiver.active}
                    onClick={() => void run(async () => {
                      await api('admin-payment-receiver-switch', key, { receiverId: receiver.id });
                      setPaymentReceiverFilter('active');
                      setNotice(`${receiver.title} is now the active payment account.`);
                      await refresh();
                    })}
                  >
                    {receiver.active ? 'Active account' : 'Use this account'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'payments' && (
        <div className="admin-workspace">
          <section className="admin-panel">
            <div className="panel-heading">
              <div>
                <span className="admin-eyebrow">NayaPay inbox</span>
                <h2>Received payments</h2>
                <p>
                  Customers no longer submit transaction IDs. Match payments
                  using the exact amount, receipt time and receipt details.
                </p>
              </div>
            </div>
            <div className="order-filter-bar" aria-label="Payment verification filters">
              {['all', 'verified', 'review'].map(value => <button key={value} type="button" aria-pressed={paymentFilter === value} className={paymentFilter === value ? 'active' : ''} onClick={() => { setPaymentFilter(value); paymentView.setPage(1); }}>{value === 'all' ? 'All payments' : value === 'verified' ? 'Verified receipts' : 'Needs review'}</button>)}
            </div>
            <div className="order-filter-bar" aria-label="Payment receiving account filters">
              <button
                type="button"
                aria-pressed={paymentReceiverFilter === 'active'}
                className={paymentReceiverFilter === 'active' ? 'active' : ''}
                onClick={() => { setPaymentReceiverFilter('active'); paymentView.setPage(1); }}
              >
                Current account{activePaymentReceiver ? ` · ${activePaymentReceiver.label}` : ''}
              </button>
              <button
                type="button"
                aria-pressed={paymentReceiverFilter === 'all'}
                className={paymentReceiverFilter === 'all' ? 'active' : ''}
                onClick={() => { setPaymentReceiverFilter('all'); paymentView.setPage(1); }}
              >
                All accounts
              </button>
              {paymentReceivers.map((receiver: any) => (
                <button
                  key={receiver.id}
                  type="button"
                  aria-pressed={paymentReceiverFilter === receiver.id}
                  className={paymentReceiverFilter === receiver.id ? 'active' : ''}
                  onClick={() => { setPaymentReceiverFilter(receiver.id); paymentView.setPage(1); }}
                >
                  {receiver.label}
                </button>
              ))}
            </div>
            <p className="order-filter-summary">
              Showing receipts received by {paymentReceiverFilter === 'all'
                ? 'all payment accounts'
                : paymentReceiverFilter === 'active'
                  ? (activePaymentReceiver?.label || 'the current account')
                  : paymentReceiverLabel(paymentReceiverFilter)}.
            </p>
            <AdminRecordControls view={paymentView} label="payments" />
            {!paymentView.count && <p>No payments match these filters.</p>}
            <div className="commerce-table">
              <table>
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>Amount</th>
                    <th>Verification</th>
                    <th>Order</th>
                    <th>Received</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentView.rows.map((row: any) => (
                    <tr key={row.id}>
                      <td>
                        <button
                          className="table-select"
                          onClick={() => {
                            setPaymentId(row.id);
                            if (row.order_id) setOrderId(row.order_id);
                          }}
                        >
                          {row.subject}
                        </button>
                        <small>{row.id.slice(0, 8)}</small>
                        <small>{paymentReceiverLabel(row.receiver_id)}</small>
                      </td>
                      <td>{paymentMoney(row)}</td>
                      <td>
                        <strong>
                          {paymentNeedsReview(row) ? 'Needs review' : 'Verified receipt'}
                        </strong>
                        <small>
                          {row.transaction_id
                            ? 'Reference captured in receipt'
                            : 'No reference captured'}
                        </small>
                        <small>{verificationReason(row.verification_reason)}</small>
                        {row.verification_reason_before_manual && (
                          <small>
                            Before manual approval: {verificationReason(row.verification_reason_before_manual)}
                          </small>
                        )}
                        {row.fulfillment_error_code && (
                          <small>
                            Auto-delivery error: {row.fulfillment_error_code}
                            {row.fulfillment_error_message ? ` — ${row.fulfillment_error_message}` : ''}
                          </small>
                        )}
                      </td>
                      <td>{row.order_id?.slice(0, 8) || 'Unassigned'}</td>
                      <td>
                        {row.received_at
                          ? new Date(row.received_at).toLocaleString()
                          : 'Unknown'}
                      </td>
                      <td>
                        <button
                          className="secondary-button compact"
                          onClick={() =>
                            void run(async () =>
                              setReceipt(
                                await api('admin-payment', key, {
                                  paymentId: row.id,
                                }),
                              ),
                            )
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {receipt && (
              <div className="receipt-view">
                <button
                  title="Close receipt"
                  className="icon-command"
                  onClick={() => setReceipt(null)}
                >
                  <X size={18} />
                </button>
                <pre className="commerce-receipt">
                  {receipt.subject}
                  {'\n'}
                  {receipt.text}
                </pre>
              </div>
            )}
          </section>
          <section className="admin-panel compact-panel">
            <h2>Manual payment match and delivery</h2>
            <p>
              Select an order and its payment receipt. No customer transaction
              ID is required; the system attaches the receipt reference during
              your approval.
            </p>
            <form
              className="admin-form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await api('admin-approve', key, {
                    orderId,
                    paymentId,
                    confirmed,
                  });
                  setConfirmed(false);
                  setNotice('Order delivered.');
                  await refresh();
                });
              }}
            >
              <label>
                Order ID
                <input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  required
                />
              </label>
              <label>
                Payment ID
                <input
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                  required
                />
              </label>
              <label className="commerce-check admin-span">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />{' '}
                I verified the payment recipient, customer and exact amount in the receipt.
              </label>
              <button
                className="primary-button admin-span"
                disabled={busy || !confirmed}
              >
                Match payment and deliver account
              </button>
            </form>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
