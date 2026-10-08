'use client';

import { useMemo, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  Search,
  Filter,
  DollarSign,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

export type WalletWithdrawalItem = {
  id: string;
  account_id: string;
  amount: number;
  payout_method: string;
  account_number: string;
  account_title: string;
  notes?: string | null;
  status: 'pending' | 'completed' | 'rejected';
  admin_note?: string | null;
  created_at: string;
  completed_at?: string | null;
  rejected_at?: string | null;
  customer_name?: string;
  customer_email?: string;
  customer_balance?: number;
};

type Props = {
  withdrawals: WalletWithdrawalItem[];
  api: (action: string, token: string, body?: any) => Promise<any>;
  token: string;
  busy: boolean;
  onRefresh: () => Promise<void>;
};

export function AdminWalletWithdrawals({
  withdrawals = [],
  api,
  token,
  busy,
  onRefresh,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Complete modal / prompt state
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completeNote, setCompleteNote] = useState('');
  const [completeSubmitting, setCompleteSubmitting] = useState(false);

  // Reject modal / prompt state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const pendingList = useMemo(
    () => withdrawals.filter((w) => w.status === 'pending'),
    [withdrawals],
  );
  const completedList = useMemo(
    () => withdrawals.filter((w) => w.status === 'completed'),
    [withdrawals],
  );

  const pendingAmount = useMemo(
    () => pendingList.reduce((acc, curr) => acc + Number(curr.amount || 0), 0),
    [pendingList],
  );
  const completedAmount = useMemo(
    () => completedList.reduce((acc, curr) => acc + Number(curr.amount || 0), 0),
    [completedList],
  );

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      const matchStatus = statusFilter === 'all' || w.status === statusFilter;
      const matchMethod =
        methodFilter === 'all' ||
        w.payout_method.toLowerCase() === methodFilter.toLowerCase();
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        (w.customer_name && w.customer_name.toLowerCase().includes(q)) ||
        (w.customer_email && w.customer_email.toLowerCase().includes(q)) ||
        (w.account_number && w.account_number.toLowerCase().includes(q)) ||
        (w.account_title && w.account_title.toLowerCase().includes(q)) ||
        (w.payout_method && w.payout_method.toLowerCase().includes(q));
      return matchStatus && matchMethod && matchSearch;
    });
  }, [withdrawals, statusFilter, methodFilter, search]);

  const copyToClipboard = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleComplete = async (item: WalletWithdrawalItem) => {
    setActionError(null);
    setCompleteSubmitting(true);
    try {
      await api('admin-wallet-withdrawal-complete', token, {
        id: item.id,
        adminNote: completeNote.trim() || undefined,
      });
      setActionSuccess(`Withdrawal of PKR ${item.amount.toLocaleString()} marked as completed!`);
      setCompletingId(null);
      setCompleteNote('');
      await onRefresh();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to complete withdrawal.');
    } finally {
      setCompleteSubmitting(false);
    }
  };

  const handleReject = async (item: WalletWithdrawalItem) => {
    if (!rejectReason.trim()) {
      setActionError('Please provide a reason for rejecting the withdrawal.');
      return;
    }
    setActionError(null);
    setRejectSubmitting(true);
    try {
      await api('admin-wallet-withdrawal-reject', token, {
        id: item.id,
        reason: rejectReason.trim(),
      });
      setActionSuccess(`Withdrawal rejected. PKR ${item.amount.toLocaleString()} has been refunded to customer's wallet.`);
      setRejectingId(null);
      setRejectReason('');
      await onRefresh();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject withdrawal.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const formatMethodLabel = (method: string) => {
    const m = method.toLowerCase();
    if (m === 'binance' || m.includes('binance')) return 'Binance Pay';
    if (m === 'easypaisa') return 'Easypaisa';
    if (m === 'jazzcash') return 'JazzCash';
    if (m === 'sadapay') return 'SadaPay';
    if (m === 'nayapay') return 'NayaPay';
    if (m.includes('bank')) return 'Bank Transfer';
    return method;
  };

  return (
    <div className="admin-workspace">
      {/* Header section */}
      <section className="admin-panel">
        <div className="panel-heading">
          <div>
            <span className="admin-eyebrow">
              <Banknote size={15} /> FINANCE & PAYOUTS
            </span>
            <h2>Wallet Withdrawals</h2>
            <p>
              Review customer wallet withdrawal requests. Manually transfer the requested amount to the customer&apos;s provided bank/wallet details and click <strong>Successfully Withdrawn</strong>.
            </p>
          </div>
        </div>

        {/* Metric summary cards */}
        <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 14, marginBottom: 18 }}>
          <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <span className="stat-label">Pending Payouts</span>
            <div className="stat-value" style={{ color: '#d97706' }}>
              PKR {pendingAmount.toLocaleString()}
            </div>
            <small style={{ color: '#64748b' }}>{pendingList.length} request(s) awaiting payout</small>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
            <span className="stat-label">Successfully Paid</span>
            <div className="stat-value" style={{ color: '#059669' }}>
              PKR {completedAmount.toLocaleString()}
            </div>
            <small style={{ color: '#64748b' }}>{completedList.length} completed payout(s)</small>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
            <span className="stat-label">Total Requests</span>
            <div className="stat-value" style={{ color: '#2563eb' }}>
              {withdrawals.length}
            </div>
            <small style={{ color: '#64748b' }}>Across all customers</small>
          </div>
        </div>

        {/* Alerts / Feedback */}
        {actionSuccess && (
          <div style={{ margin: '12px 0', padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, color: '#065f46', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} /> {actionSuccess}
          </div>
        )}
        {actionError && (
          <div style={{ margin: '12px 0', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} /> {actionError}
          </div>
        )}

        {/* Filters and search bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          {/* Status filter tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={statusFilter === 'all' ? 'active-filter' : 'plain-button'}
              onClick={() => setStatusFilter('all')}
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6 }}
            >
              All ({withdrawals.length})
            </button>
            <button
              type="button"
              className={statusFilter === 'pending' ? 'active-filter' : 'plain-button'}
              onClick={() => setStatusFilter('pending')}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                borderRadius: 6,
                fontWeight: pendingList.length > 0 ? 700 : 400,
                color: pendingList.length > 0 ? '#b45309' : undefined,
              }}
            >
              Pending ({pendingList.length})
            </button>
            <button
              type="button"
              className={statusFilter === 'completed' ? 'active-filter' : 'plain-button'}
              onClick={() => setStatusFilter('completed')}
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6 }}
            >
              Completed ({completedList.length})
            </button>
            <button
              type="button"
              className={statusFilter === 'rejected' ? 'active-filter' : 'plain-button'}
              onClick={() => setStatusFilter('rejected')}
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6 }}
            >
              Rejected ({withdrawals.filter((w) => w.status === 'rejected').length})
            </button>
          </div>

          {/* Search & Method dropdown */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value="all">All Methods</option>
              <option value="binance">Binance Pay</option>
              <option value="easypaisa">Easypaisa</option>
              <option value="jazzcash">JazzCash</option>
              <option value="sadapay">SadaPay</option>
              <option value="nayapay">NayaPay</option>
              <option value="bank">Bank Transfer</option>
            </select>

            <div style={{ position: 'relative', minWidth: 220 }}>
              <input
                type="text"
                placeholder="Search customer, account, title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '6px 10px 6px 30px',
                  fontSize: 12,
                  width: '100%',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                }}
              />
              <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>
        </div>

        {/* Withdrawals Table */}
        <div className="commerce-table reviews-admin-table-wrap" style={{ marginTop: 16 }}>
          <table className="reviews-admin-table admin-table" style={{ width: '100%', minWidth: 980 }}>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Date & Status</th>
                <th style={{ width: 180 }}>Customer</th>
                <th style={{ width: 120 }}>Amount</th>
                <th style={{ width: 130 }}>Method</th>
                <th style={{ minWidth: 200 }}>Account Details</th>
                <th style={{ width: 220 }}>Actions / Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px 12px', color: '#64748b' }}>
                    No withdrawal requests found.
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map((item) => {
                  const isPending = item.status === 'pending';
                  const isCompleted = item.status === 'completed';
                  const isRejected = item.status === 'rejected';

                  return (
                    <tr key={item.id} style={{ background: isPending ? '#fffdf7' : undefined }}>
                      {/* Date & Status */}
                      <td>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              width: 'fit-content',
                              textTransform: 'uppercase',
                              background: isCompleted ? '#dcfce7' : isPending ? '#fef3c7' : '#fee2e2',
                              color: isCompleted ? '#15803d' : isPending ? '#b45309' : '#b91c1c',
                            }}
                          >
                            {isCompleted && <CheckCircle2 size={12} />}
                            {isPending && <Clock size={12} />}
                            {isRejected && <XCircle size={12} />}
                            {item.status}
                          </span>
                          <small style={{ color: '#64748b', fontSize: 11 }}>
                            {new Date(item.created_at).toLocaleDateString()}{' '}
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </small>
                        </div>
                      </td>

                      {/* Customer */}
                      <td>
                        <div style={{ display: 'grid', gap: 2 }}>
                          <strong style={{ fontSize: 13, color: '#0f172a' }}>
                            {item.customer_name || 'Customer'}
                          </strong>
                          <span style={{ fontSize: 11, color: '#475569' }}>
                            {item.customer_email || '—'}
                          </span>
                          {typeof item.customer_balance === 'number' && (
                            <small style={{ fontSize: 10, color: '#64748b' }}>
                              Current Balance: PKR {item.customer_balance.toLocaleString()}
                            </small>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                          <strong style={{ fontSize: 15, color: '#0f172a', fontWeight: 800 }}>
                            PKR {Number(item.amount).toLocaleString()}
                          </strong>
                        </div>
                      </td>

                      {/* Payout Method */}
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#334155',
                          }}
                        >
                          {formatMethodLabel(item.payout_method)}
                        </span>
                      </td>

                      {/* Account Details */}
                      <td>
                        <div style={{ display: 'grid', gap: 3 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#64748b' }}>
                              {item.payout_method.toLowerCase().includes('binance') ? 'Binance Name:' : 'Title:'}
                            </span>
                            <strong style={{ fontSize: 13, color: '#0f172a' }}>
                              {item.account_title}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#64748b' }}>
                              {item.payout_method.toLowerCase().includes('binance') ? 'Pay ID / Email:' : 'Number:'}
                            </span>
                            <code
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#1e293b',
                              }}
                            >
                              {item.account_number}
                            </code>
                            <button
                              type="button"
                              title="Copy account number"
                              onClick={() => copyToClipboard(item.account_number, item.id)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                padding: 2,
                                color: copiedId === item.id ? '#16a34a' : '#64748b',
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                          {item.notes && (
                            <small style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>
                              Note: {item.notes}
                            </small>
                          )}
                        </div>
                      </td>

                      {/* Actions / Admin Notes */}
                      <td>
                        {isPending && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {completingId === item.id ? (
                              <div style={{ background: '#f0fdf4', padding: 8, borderRadius: 6, border: '1px solid #bbf7d0' }}>
                                <small style={{ display: 'block', fontSize: 11, color: '#166534', marginBottom: 4, fontWeight: 600 }}>
                                  Enter optional Transaction ID / Reference:
                                </small>
                                <input
                                  type="text"
                                  placeholder="e.g. TRX-12345678"
                                  value={completeNote}
                                  onChange={(e) => setCompleteNote(e.target.value)}
                                  style={{ width: '100%', fontSize: 12, padding: '4px 6px', borderRadius: 4, border: '1px solid #86efac', marginBottom: 6 }}
                                />
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button
                                    type="button"
                                    disabled={completeSubmitting}
                                    onClick={() => handleComplete(item)}
                                    style={{
                                      padding: '4px 10px',
                                      background: '#16a34a',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {completeSubmitting ? 'Confirming…' : 'Confirm Payout'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={completeSubmitting}
                                    onClick={() => { setCompletingId(null); setCompleteNote(''); }}
                                    style={{
                                      padding: '4px 8px',
                                      background: '#f1f5f9',
                                      color: '#475569',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: 4,
                                      fontSize: 11,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : rejectingId === item.id ? (
                              <div style={{ background: '#fef2f2', padding: 8, borderRadius: 6, border: '1px solid #fecaca' }}>
                                <small style={{ display: 'block', fontSize: 11, color: '#991b1b', marginBottom: 4, fontWeight: 600 }}>
                                  Reason for rejecting (will refund customer):
                                </small>
                                <input
                                  type="text"
                                  placeholder="e.g. Account title doesn't match"
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  style={{ width: '100%', fontSize: 12, padding: '4px 6px', borderRadius: 4, border: '1px solid #fca5a5', marginBottom: 6 }}
                                />
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button
                                    type="button"
                                    disabled={rejectSubmitting}
                                    onClick={() => handleReject(item)}
                                    style={{
                                      padding: '4px 10px',
                                      background: '#dc2626',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {rejectSubmitting ? 'Rejecting…' : 'Reject & Refund'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={rejectSubmitting}
                                    onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                    style={{
                                      padding: '4px 8px',
                                      background: '#f1f5f9',
                                      color: '#475569',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: 4,
                                      fontSize: 11,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => { setCompletingId(item.id); setRejectingId(null); }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '6px 12px',
                                    background: '#16a34a',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                  }}
                                >
                                  <CheckCircle2 size={14} /> Successfully Withdrawn
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => { setRejectingId(item.id); setCompletingId(null); }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '6px 10px',
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <XCircle size={14} /> Reject & Refund
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {isCompleted && (
                          <div style={{ display: 'grid', gap: 2 }}>
                            <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>
                              ✓ Paid on {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : '—'}
                            </span>
                            {item.admin_note && (
                              <small style={{ fontSize: 11, color: '#334155', background: '#f8fafc', padding: '2px 6px', borderRadius: 4 }}>
                                Ref: {item.admin_note}
                              </small>
                            )}
                          </div>
                        )}

                        {isRejected && (
                          <div style={{ display: 'grid', gap: 2 }}>
                            <span style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>
                              ✕ Refunded on {item.rejected_at ? new Date(item.rejected_at).toLocaleDateString() : '—'}
                            </span>
                            {item.admin_note && (
                              <small style={{ fontSize: 11, color: '#64748b' }}>
                                Reason: {item.admin_note}
                              </small>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
