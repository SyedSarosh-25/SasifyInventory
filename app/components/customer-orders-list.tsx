import { CheckCircle2, Clock3, CircleAlert, XCircle } from 'lucide-react';
import { supplierMonogram } from '../supplier-product-utils';
import { groupOrdersByDate } from './customer-orders-model';

type Order = { id: string; product: string; amount: number; status: string; created_at: string };
export function CustomerOrdersList({ orders, busy, onView }: {
  orders: Order[]; busy: boolean; onView: (order: Order) => void;
}) {
  return <div className="minimal-orders-list">
    {groupOrdersByDate(orders).map(group => <section className="minimal-orders-group" key={group.label}>
      <h3 className="minimal-orders-date">{group.label}</h3>
      <ul>
        {group.orders.map(order => {
          const delivered = order.status === 'delivered';
          const state = delivered ? 'delivered' : ['expired', 'cancelled'].includes(order.status) ? order.status : 'pending';
          const Icon = delivered ? CheckCircle2 : state === 'cancelled' ? XCircle : state === 'expired' ? CircleAlert : Clock3;
          const date = new Date(order.created_at);
          return <li className="minimal-order-row" key={order.id}>
            <span className="minimal-order-icon" aria-hidden="true">{supplierMonogram(order.product)}</span>
            <div className="minimal-order-copy">
              <strong translate="no">{order.product}</strong>
              <small>{!Number.isNaN(date.getTime()) && <><time dateTime={order.created_at}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time> · </>}<span translate="no">#{order.id.slice(0, 8)}</span></small>
            </div>
            <div className="minimal-order-total">
              <strong translate="no">PKR {Number(order.amount).toLocaleString('en-US')}</strong>
              <span className={`minimal-order-status ${state}`}><Icon size={14} aria-hidden="true" /><span>{order.status === 'pending' ? 'Awaiting payment' : order.status}</span></span>
            </div>
            <button type="button" className="minimal-order-action" disabled={busy} onClick={() => onView(order)} aria-label={`${delivered ? 'View credentials' : 'View order'}: ${order.product} (${order.id.slice(0, 8)})`}>
              {delivered ? 'View credentials' : 'View order'}
            </button>
          </li>;
        })}
      </ul>
    </section>)}
  </div>;
}
