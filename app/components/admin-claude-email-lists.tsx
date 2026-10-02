'use client';

import { useState } from 'react';
import { confirmedClaudeEmailLists, type ClaudeEmailOrder } from './claude-email-lists-model';

export function AdminClaudeEmailLists({ orders }: { orders: ClaudeEmailOrder[] }) {
  const [notice, setNotice] = useState('');
  return <section aria-label="Confirmed Claude activation emails" style={{ marginBottom: 24 }}>
    <h3>Confirmed Claude activation emails</h3>
    <p>Emails customers entered for Claude activation. Confirmed orders only; repeated emails appear once per plan.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
      {confirmedClaudeEmailLists(orders).map((list) => <article className="manual-order-card" key={list.name}>
        <h3>{list.name} · {list.emails.length} emails</h3>
        <p>{list.orderCount} confirmed orders{list.missingCount > 0 ? ` · ${list.missingCount} missing or invalid activation emails` : ''}</p>
        <textarea aria-label={`${list.name} activation emails`} readOnly value={list.emails.join('\n')} rows={6}
          placeholder="No confirmed activation emails" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" className="secondary-button compact" disabled={!list.emails.length} onClick={async () => {
            try { await navigator.clipboard.writeText(list.emails.join('\n')); setNotice(`${list.name} emails copied.`); }
            catch { setNotice('Copy failed. Select and copy the emails from the list.'); }
          }}>Copy {list.name} emails</button>
          <button type="button" className="secondary-button compact" disabled={!list.emails.length} onClick={() => {
            const url = URL.createObjectURL(new Blob([list.emails.join('\r\n') + '\r\n'], { type: 'text/plain;charset=utf-8' }));
            const link = document.createElement('a'); link.href = url;
            link.download = `claude-${list.name.toLowerCase()}-confirmed-emails.txt`; link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setNotice(`${list.name} email list downloaded.`);
          }}>Download .txt</button>
        </div>
      </article>)}
    </div>
    <p role="status">{notice}</p>
  </section>;
}
