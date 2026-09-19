import { createRoot } from 'react-dom/client';
import { CommerceAdmin } from '../../app/components/checkout';
import '../../app/globals.css';
import '../../app/orders-admin/admin.css';

const orders = Array.from({ length: 32 }, (_, index) => ({
  id: `test-order-${String(index).padStart(3, '0')}`,
  product_id: 'p093-ultra',
  amount: 3499,
  listed_amount: 3499,
  status: index % 3 === 0 ? 'review' : 'delivered',
  payment_method: 'bank',
  created_at: new Date(Date.UTC(2026, 8, 14, 10, 59 - index)).toISOString(),
  cost_pkr: null,
  profit_pkr: null,
}));
const payments = orders.map((order, index) => ({
  id: `receipt-${index}`,
  amount: order.amount,
  subject: `Local test receipt ${index}`,
  verified: index % 3 !== 0,
  order_id: index % 3 ? order.id : null,
  received_at: order.created_at,
  verification_reason: 'verified',
}));
const dashboard = {
  metrics: {
    income: 177207,
    gross_income: 233941,
    coupon_discounts: 56734,
    delivered_orders: 48,
    admin_withdrawals: 23,
    active_orders: 1,
    monthly_income: 177207,
    profit: null,
    monthly_profit: null,
    cost: null,
    missing_costs: null,
  },
  autoVerify: true,
  profitUnlocked: true,
  dailyFinancials: Array.from({ length: 30 }, (_, index) => ({
    date: new Date(Date.now() - (29 - index) * 86400000).toISOString().slice(0, 10),
    revenue: 1800 + ((index * 1739) % 14000),
    profit: index === 24 ? -1200 : 500 + ((index * 631) % 6000),
    missingCosts: 0,
  })),
  orders,
  payments,
  inventory: [
    {
      id: 'test-stock',
      productId: 'p093-ultra',
      email: 'test@example.invalid',
      state: 'available',
      purchaseCost: 0,
      createdAt: '2026-09-14T09:00:00Z',
    },
  ],
  stock: [{ product_id: 'p093-ultra', state: 'available', count: 7 }],
  supplierProducts: Array.from({ length: 32 }, (_, index) => ({
    id: `test-product-${index}`,
    name: `Synthetic product ${index}`,
    provider_id: 'elitetools',
    provider_name: 'Elite Tools Store',
    external_product_id: `preview-${index}`,
    canonical_key: `test-${index}`,
    selling_price: 100,
    cost_pkr: 50,
    wholesale_price: 0.1,
    currency: 'USD',
    supplier_stock: index,
    enabled: false,
  })),
  supplierKeys: [
    {
      providerId: 'elitetools',
      providerName: 'Elite Tools Store',
      configured: true,
      source: 'admin',
    },
  ],
  providerStates: [
    {
      provider_id: 'elitetools',
      provider_name: 'Elite Tools Store',
      balance: 0.1,
      currency: 'USD',
      lowBalance: true,
      lowBalanceThreshold: 5,
      synced_at: '2026-09-14T10:00:00Z',
    },
  ],
  supplierAlerts: [],
  coupons: [],
  scamReports: [],
  commissions: [],
  commissionSummary: [],
  teamCommissions: [],
  teamAccess: { configured: true, email: 'teammate@example.invalid' },
};
function DeliveryMockup() {
  return <main style={{ maxWidth: 760, margin: '40px auto', padding: 20, color: '#20385d', fontFamily: 'Inter, system-ui, sans-serif' }}>
    <div className="account-delivery-email" style={{ boxShadow: '0 12px 35px #233d7212' }}>
      <div className="account-email-header"><div className="account-email-brand">✓</div><div><strong>Sasify Solutions</strong><small>Secure account delivery</small></div><span className="account-email-status">Delivered</span></div>
      <div className="account-email-meta"><span><b>Subject:</b> Your account credentials are ready</span><span>Order #a8f42c1d</span></div>
      <div className="account-email-body"><h2>Your account is ready</h2><p>Thank you for trusting Sasify Solutions. Your credentials are below. Keep this message private.</p>
      <div className="account-credential-list">{['Email: customer@example.com', 'Password: ••••••••••••', '2FA Key: DEMO-KEY-ONLY'].map((text) => <label key={text}><span>{text.split(':')[0]}</span><div className="commerce-secret"><code>{text.split(':').slice(1).join(':').trim()}</code><button style={{ width: 'auto', minWidth: 48, whiteSpace: 'nowrap', padding: '4px 8px' }}>Copy</button></div></label>)}</div></div>
      <section className="account-delivery-guide" style={{ marginTop: 22 }}>
        <div className="account-delivery-guide-heading"><span>✓</span><div><strong>Complete your account setup</strong><small>Follow these steps to log in and keep your warranty active.</small></div></div>
        <div className="account-step-list"><div className="account-step"><span>1</span><div><h3>Log in to ChatGPT</h3><p>Open ChatGPT.com and enter the Email and Password shown above.</p></div></div><div className="account-step"><span>2</span><div><h3>Generate your login code</h3><p>When ChatGPT requests a 6-digit Authenticator Code, open <a href="/otp">Sasify OTP</a>, enter your 2FA Key and submit it.</p></div></div><div className="account-step"><span>3</span><div><h3>Finish verification</h3><p>Enter the generated 6-digit code on ChatGPT immediately. The code is time-sensitive.</p></div></div></div>
        <div className="account-delivery-warning"><strong>Important warranty requirement</strong><p>Transfer the account to your personal email after login. Warranty support is not applicable if the account is not transferred.</p></div>
        <div className="account-email-transfer"><h3>Transfer to your personal email</h3><p>ChatGPT → Settings → Account → Email Change → enter your personal email → verify the 6-digit code sent to that email.</p></div>
        <p className="account-delivery-note"><strong>Do not change or remove the account password or 2FA settings.</strong><br />If an issue occurs, contact Sasify Solutions with your order reference.</p>
      </section>
    </div>
  </main>;
}

// A test-only network boundary: every request terminates here, including mutations.
window.fetch = async (input, init) => {
  const action = new URL(
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    location.origin,
  ).searchParams.get('action');
  if (action === 'admin-list' && (!init?.method || init.method === 'GET'))
    return new Response(JSON.stringify(dashboard), {
      headers: { 'Content-Type': 'application/json' },
    });
  return new Response(
    JSON.stringify({
      error: 'Local visual test: mutations and external requests are disabled.',
    }),
    { status: 409, headers: { 'Content-Type': 'application/json' } },
  );
};
createRoot(document.getElementById('root')!).render(
  location.pathname === '/delivery' ? <DeliveryMockup /> :
  <>
    <div
      style={{
        background: '#fffbeb',
        padding: 8,
        textAlign: 'center',
        position: 'relative',
        zIndex: 40,
      }}
    >
      LOCAL VISUAL TEST · Synthetic data · All mutations disabled
    </div>
    <main className="admin-page">
      <CommerceAdmin />
    </main>
  </>,
);
