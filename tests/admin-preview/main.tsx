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
  profitUnlocked: false,
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
