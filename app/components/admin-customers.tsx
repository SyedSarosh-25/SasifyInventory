'use client';
import { useState } from 'react';
type AccountStats = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: string;
  reseller_status: 'none' | 'pending' | 'approved' | 'rejected';
  balance: number;
  created_at: string;
  email_verified_at: string | null;
  total_orders: number;
  delivered_orders: number;
  pending_orders: number;
  total_spent: string;
  total_deposited: string;
  review_deposits: number;
  last_order_at: string | null;
};
const money = (value: number | string) =>
  `PKR ${Number(value).toLocaleString('en-US')}`;
export function AdminCustomers({
  accounts,
  busy,
  onReview,
}: {
  accounts: AccountStats[];
  busy: boolean;
  onReview: (id: string, status: 'approved' | 'rejected') => void;
}) {
  const [search, setSearch] = useState(''),
    [role, setRole] = useState('all');
  const rows = accounts.filter(
    (a) =>
      (role === 'all' ||
        (role === 'customer' &&
          a.role === 'customer' &&
          a.reseller_status === 'none') ||
        (role === 'reseller' &&
          (a.role === 'reseller' || a.reseller_status !== 'none'))) &&
      `${a.name} ${a.username || ''} ${a.email} ${a.id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section className="admin-panel">
      <h2>Registered users</h2>
      <p>
        {accounts.length} users · Total wallet balance:{' '}
        {money(accounts.reduce((sum, a) => sum + Number(a.balance), 0))} ·
        Delivered sales:{' '}
        {money(accounts.reduce((sum, a) => sum + Number(a.total_spent), 0))}
      </p>
      <div className="admin-form-row">
        <label>
          Search users
          <input
            type="search"
            placeholder="Name, email or user ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Account type
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">All users</option>
            <option value="customer">Customers</option>
            <option value="reseller">Resellers</option>
          </select>
        </label>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Type</th>
              <th>Email status</th>
              <th>Reseller approval</th>
              <th>Review</th>
              <th>Current balance</th>
              <th>Orders</th>
              <th>Delivered</th>
              <th>Pending / review</th>
              <th>Total spent</th>
              <th>Deposited</th>
              <th>Deposits to review</th>
              <th>Joined</th>
              <th>Last order</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.name}</strong>
                  <br />
                  {a.username ? `@${a.username}` : 'No username'}
                  <br />
                  {a.email}
                  <br />
                  <small>{a.id}</small>
                </td>
                <td>
                  {a.role === 'reseller'
                    ? 'Reseller'
                    : a.reseller_status !== 'none'
                      ? 'Reseller applicant'
                      : 'Customer'}
                </td>
                <td>{a.email_verified_at ? 'Verified' : 'Not verified'}</td>
                <td>
                  {a.reseller_status !== 'none'
                    ? a.reseller_status
                    : 'Not required'}
                </td>
                <td>
                  {a.reseller_status !== 'none' && (
                    <>
                      {a.reseller_status !== 'approved' && (
                        <button
                          disabled={busy || !a.email_verified_at}
                          onClick={() => onReview(a.id, 'approved')}
                        >
                          Approve
                        </button>
                      )}
                      {a.reseller_status !== 'rejected' && (
                        <button
                          disabled={busy}
                          onClick={() => onReview(a.id, 'rejected')}
                        >
                          {a.reseller_status === 'approved'
                            ? 'Revoke approval'
                            : 'Reject'}
                        </button>
                      )}
                    </>
                  )}
                </td>
                <td>{money(a.balance)}</td>
                <td>{a.total_orders}</td>
                <td>{a.delivered_orders}</td>
                <td>{a.pending_orders}</td>
                <td>{money(a.total_spent)}</td>
                <td>{money(a.total_deposited)}</td>
                <td>{a.review_deposits}</td>
                <td>{new Date(a.created_at).toLocaleString()}</td>
                <td>
                  {a.last_order_at
                    ? new Date(a.last_order_at).toLocaleString()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p>No registered users match this view.</p>}
    </section>
  );
}
