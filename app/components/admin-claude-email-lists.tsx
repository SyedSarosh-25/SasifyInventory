'use client';

import { useState } from 'react';
import { confirmedClaudeEmailLists, type ClaudeEmailOrder } from './claude-email-lists-model';

function formatOrderDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-PK', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

export function AdminClaudeEmailLists({ orders }: { orders: ClaudeEmailOrder[] }) {
  const [notice, setNotice] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showDates, setShowDates] = useState(false);

  const lists = confirmedClaudeEmailLists(orders, sortOrder);

  return (
    <section aria-label="Confirmed Claude activation emails" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <div>
          <h3 style={{ margin: 0, marginBottom: 4 }}>Confirmed Claude activation emails</h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
            Emails customers entered for Claude activation. Confirmed orders only; repeated emails appear once per plan.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#f8fafc', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label htmlFor="claude-sort-order" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
              Sort by date:
            </label>
            <select
              id="claude-sort-order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
              style={{
                fontSize: '0.82rem',
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#1e293b',
                cursor: 'pointer',
              }}
            >
              <option value="desc">⬇️ Newest first (latest orders)</option>
              <option value="asc">⬆️ Oldest first (earliest orders)</option>
            </select>
          </div>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={showDates}
              onChange={(e) => setShowDates(e.target.checked)}
            />
            <span>Show order dates</span>
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
        {lists.map((list) => {
          const datesMap = ((list as unknown as { orderDates?: Record<string, string> }).orderDates) || {};
          const textareaValue = showDates
            ? list.emails.map((e) => (datesMap[e] ? `${e} · ${formatOrderDate(datesMap[e])}` : e)).join('\n')
            : list.emails.join('\n');

          return (
            <article className="manual-order-card" key={list.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                <h3>{list.name} · {list.emails.length} emails</h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                  📅 {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
                </span>
              </div>
              <p>
                {list.orderCount} confirmed orders
                {list.missingCount > 0 ? ` · ${list.missingCount} missing or invalid activation emails` : ''}
              </p>
              <textarea
                aria-label={`${list.name} activation emails`}
                readOnly
                value={textareaValue}
                rows={6}
                placeholder="No confirmed activation emails"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  marginBottom: 12,
                  fontFamily: 'monospace',
                  fontSize: '0.82rem',
                }}
              />
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="secondary-button compact"
                  disabled={!list.emails.length}
                  onClick={async () => {
                    try {
                      // Always copy clean emails so paste into Claude Team bulk invite works seamlessly
                      await navigator.clipboard.writeText(list.emails.join('\n'));
                      setNotice(`${list.name} emails copied (${sortOrder === 'desc' ? 'newest first' : 'oldest first'}).`);
                    } catch {
                      setNotice('Copy failed. Select and copy the emails from the list.');
                    }
                  }}
                >
                  Copy {list.name} emails
                </button>
                <button
                  type="button"
                  className="secondary-button compact"
                  disabled={!list.emails.length}
                  onClick={() => {
                    const textContent = showDates
                      ? list.emails.map((e) => (datesMap[e] ? `${e}\t${datesMap[e]}` : e)).join('\r\n')
                      : list.emails.join('\r\n');
                    const url = URL.createObjectURL(
                      new Blob([textContent + '\r\n'], { type: 'text/plain;charset=utf-8' }),
                    );
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `claude-${list.name.toLowerCase()}-${sortOrder}-emails.txt`;
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    setNotice(`${list.name} email list downloaded (${sortOrder === 'desc' ? 'newest first' : 'oldest first'}).`);
                  }}
                >
                  Download .txt
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <p role="status">{notice}</p>
    </section>
  );
}
