'use client';
import { useState } from 'react';
import type { AccountStats } from './admin-customers';

const statusLabel = (status: AccountStats['reseller_status']) =>
  status === 'approved'
    ? 'Approved'
    : status === 'rejected'
      ? 'Rejected'
      : 'Pending review';

export function AdminResellerRequests({
  accounts,
  busy,
  onReview,
}: {
  accounts: AccountStats[];
  busy: boolean;
  onReview: (id: string, status: 'approved' | 'rejected') => void;
}) {
  const [view, setView] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const requests = accounts
    .filter((account) => account.reseller_status === view)
    .sort((left, right) => {
      const leftPending = left.reseller_status === 'pending' ? 1 : 0;
      const rightPending = right.reseller_status === 'pending' ? 1 : 0;
      return (
        rightPending - leftPending ||
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      );
    });
  const counts = {
    pending: accounts.filter((account) => account.reseller_status === 'pending').length,
    approved: accounts.filter((account) => account.reseller_status === 'approved').length,
    rejected: accounts.filter((account) => account.reseller_status === 'rejected').length,
  };

  return (
    <section className="admin-panel admin-reseller-requests">
      <div className="panel-heading">
        <div>
          <h2>Reseller requests</h2>
          <p>
            {counts.pending} awaiting review · {counts.approved} approved · {counts.rejected} rejected
          </p>
        </div>
        <div className="admin-reseller-tabs" role="tablist" aria-label="Reseller request status">
          {(['pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={view === status}
              className={view === status ? 'active' : ''}
              onClick={() => setView(status)}
            >
              {status === 'pending' ? 'Pending' : status[0].toUpperCase() + status.slice(1)} ({counts[status]})
            </button>
          ))}
        </div>
      </div>
      {!requests.length ? (
        <div className="admin-reseller-empty">
          <strong>No {view} reseller requests</strong>
          <p>{view === 'pending' ? 'New applications will appear here when a customer applies.' : `Applications moved to ${view} will appear here.`}</p>
        </div>
      ) : (
        <div className="admin-customers-table-wrap">
          <table className="admin-customers-table admin-reseller-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Email verification</th>
                <th>Request status</th>
                <th>Wallet balance</th>
                <th>Orders</th>
                <th>Delivered</th>
                <th>Joined</th>
                <th>Review actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((account) => (
                <tr key={account.id}>
                  <td>
                    <strong>{account.name}</strong>
                    <br />
                    {account.username ? `@${account.username}` : 'No username'}
                    <br />
                    {account.email}
                    <br />
                    <small>{account.id}</small>
                  </td>
                  <td>{account.email_verified_at ? 'Verified' : 'Not verified'}</td>
                  <td>
                    <span
                      className={`admin-reseller-status status-${account.reseller_status}`}
                    >
                      {statusLabel(account.reseller_status)}
                    </span>
                  </td>
                  <td>PKR {Number(account.balance).toLocaleString('en-US')}</td>
                  <td>{account.total_orders}</td>
                  <td>{account.delivered_orders}</td>
                  <td>{new Date(account.created_at).toLocaleDateString()}</td>
                  <td className="admin-reseller-actions">
                    {account.reseller_status !== 'approved' && (
                      <button
                        className="primary-button"
                        disabled={busy || !account.email_verified_at}
                        title={
                          account.email_verified_at
                            ? 'Approve reseller request'
                            : 'Applicant must verify their email before approval'
                        }
                        onClick={() => onReview(account.id, 'approved')}
                      >
                        Approve
                      </button>
                    )}
                    {account.reseller_status !== 'rejected' && (
                      <button
                        className="secondary-button danger-action"
                        disabled={busy}
                        onClick={() => {
                          if (account.reseller_status === 'approved' && !window.confirm(`Remove ${account.name} as a reseller? Their account will return to customer status.`)) return;
                          onReview(account.id, 'rejected');
                        }}
                      >
                        {account.reseller_status === 'approved'
                          ? 'Remove reseller'
                          : 'Reject'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
