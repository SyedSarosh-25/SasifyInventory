'use client';
import type { AdminSection } from './admin-shell';

type RecentOrder = {
  id: string;
  product_id: string;
  supplier_product_name?: string;
  status: string;
  amount: number;
  created_at?: string;
};
type Provider = {
  provider_id: string;
  provider_name: string;
  balance?: number | null;
  currency?: string;
  synced_at?: string;
  lowBalance?: boolean;
};
export function AdminOperations({
  orders,
  payments,
  providers,
  onNavigate,
}: {
  orders: RecentOrder[];
  payments: { verified: boolean; order_id?: string }[];
  providers: Provider[];
  onNavigate: (tab: AdminSection) => void;
}) {
  const verified = payments.filter((row) => row.verified).length;
  return (
    <div className="ops-overview-lower">
      <section className="admin-panel">
        <div className="panel-heading">
          <div>
            <span className="admin-eyebrow">Order activity</span>
            <h2>Recent orders</h2>
          </div>
          <button
            className="secondary-button compact"
            onClick={() => onNavigate('orders')}
          >
            View orders →
          </button>
        </div>
        {orders.slice(0, 5).map((order) => (
          <button
            className="ops-recent-order"
            key={order.id}
            onClick={() => onNavigate('orders')}
          >
            <span>
              <strong>{order.supplier_product_name || order.product_id}</strong>
              <small>
                #{order.id.slice(0, 8)} ·{' '}
                {order.created_at
                  ? new Date(order.created_at).toLocaleDateString()
                  : 'Date unavailable'}
              </small>
            </span>
            <span>
              <strong>PKR {Number(order.amount).toLocaleString()}</strong>
              <small>{order.status}</small>
            </span>
          </button>
        ))}
        {!orders.length && <p>No orders yet. New orders will appear here.</p>}
      </section>
      <section className="admin-panel">
        <div className="panel-heading">
          <div>
            <span className="admin-eyebrow">Receipt monitoring</span>
            <h2>Payment inbox</h2>
          </div>
        </div>
        <div className="ops-status-row">
          <span>Verified receipts</span>
          <strong>{verified}</strong>
        </div>
        <div className="ops-status-row">
          <span>Needs review</span>
          <strong>{payments.length - verified}</strong>
        </div>
        <div className="ops-status-row">
          <span>Not assigned to an order</span>
          <strong>{payments.filter((row) => !row.order_id).length}</strong>
        </div>
        <p className="ops-data-note">
          Based on {payments.length} loaded receipts, not the full payment
          history.
        </p>
        <button
          className="secondary-button compact"
          onClick={() => onNavigate('payments')}
        >
          Review payments →
        </button>
      </section>
      <section className="admin-panel ops-provider-overview">
        <div className="panel-heading">
          <div>
            <span className="admin-eyebrow">Supplier monitoring</span>
            <h2>Supplier balances</h2>
          </div>
          <button
            className="secondary-button compact"
            onClick={() => onNavigate('supplier')}
          >
            Manage suppliers →
          </button>
        </div>
        <div className="ops-provider-grid">
          {providers.map((provider) => (
            <div className="ops-provider-card" key={provider.provider_id}>
              <strong>{provider.provider_name}</strong>
              <span>
                {provider.balance == null
                  ? 'Balance unavailable'
                  : `${provider.balance} ${provider.currency || ''}`}
              </span>
              <small>
                {provider.lowBalance ? 'Low balance' : 'Last reported balance'}{' '}
                ·{' '}
                {provider.synced_at
                  ? new Date(provider.synced_at).toLocaleString()
                  : 'Sync time unavailable'}
              </small>
            </div>
          ))}
        </div>
        {!providers.length && (
          <p>
            No supplier balance data has been loaded. Open Supplier Store to
            check configuration.
          </p>
        )}
      </section>
    </div>
  );
}
