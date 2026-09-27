'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Pencil, Plus, Save, Trash2, WalletCards, X } from 'lucide-react';

type AdminApi = (action: string, token?: string, body?: object) => Promise<any>;
type Account = { id: string; name: string; email: string; username?: string | null; balance: number; role: string; reseller_status?: string };

const money = (value: number | string) => `PKR ${Number(value || 0).toLocaleString('en-PK')}`;
const card = 'admin-panel admin-enhancement-card';

export function AdminUserDetail({ accountId, accounts, api, token, busy, onBack, onRefresh }: { accountId: string; accounts: Account[]; api: AdminApi; token: string; busy: boolean; onBack: () => void; onRefresh: () => Promise<void> }) {
  const [detail, setDetail] = useState<any>(null);
  const [adjustment, setAdjustment] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const account = accounts.find((row) => row.id === accountId);
  const load = useCallback(async () => {
    try {
      setDetail(await api('admin-user-detail', token, { accountId }));
    } catch {
      setDetail({ account: account || { id: accountId, name: 'Preview user', email: 'demo@example.com', balance: 0, role: 'customer' }, orders: [], deposits: [], ledger: [] });
    }
  }, [account, accountId, api, token]);
  useEffect(() => { void load(); }, [load]);
  async function adjust() {
    await api('admin-wallet-adjust', token, { accountId, amount: Number(adjustment), note });
    setAdjustment(''); setNote(''); setMessage('Wallet balance updated.'); await load(); await onRefresh();
  }
  return <section className={card}>
    <div className="admin-enhancement-heading"><div><button className="secondary-button compact" onClick={onBack}><ArrowLeft size={15} /> Users</button><span className="admin-eyebrow">Account workspace</span><h2>{account?.name || detail?.account?.name || 'User detail'}</h2><p>Complete account, wallet and purchase history.</p></div><span className="admin-state delivered">{detail?.account?.role || account?.role || 'customer'}</span></div>
    {!detail ? <p role="status">Loading account detail…</p> : <div className="admin-enhancement-grid">
      <div className="admin-detail-stack">
        <article className="admin-subpanel"><h3>Account profile</h3><dl className="admin-detail-list"><div><dt>Name</dt><dd>{detail.account.name}</dd></div><div><dt>Email</dt><dd>{detail.account.email}</dd></div><div><dt>Username</dt><dd>{detail.account.username ? `@${detail.account.username}` : '—'}</dd></div><div><dt>Joined</dt><dd>{new Date(detail.account.created_at).toLocaleString()}</dd></div><div><dt>Email</dt><dd>{detail.account.email_verified_at ? 'Verified' : 'Not verified'}</dd></div><div><dt>Reseller</dt><dd>{detail.account.reseller_status}</dd></div></dl></article>
        <article className="admin-subpanel"><div className="admin-subpanel-title"><h3>Wallet ledger</h3><strong>{money(detail.account.balance)}</strong></div>{detail.ledger.length ? <div className="admin-mini-list">{detail.ledger.map((row: any) => <div key={row.id}><span>{row.description}<small>{new Date(row.created_at).toLocaleString()}</small></span><strong className={Number(row.amount) >= 0 ? 'positive' : 'negative'}>{Number(row.amount) >= 0 ? '+' : ''}{money(row.amount)}</strong></div>)}</div> : <p>No wallet activity yet.</p>}</article>
      </div>
      <div className="admin-detail-stack">
        <article className="admin-subpanel"><div className="admin-subpanel-title"><div><h3>Adjust wallet balance</h3><p>Use a positive amount to credit or a negative amount to debit.</p></div><WalletCards size={23} /></div><div className="admin-form-grid"><label>Amount (PKR)<input type="number" step="1" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} placeholder="e.g. 500 or -500" /></label><label>Reason<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Refund, correction, goodwill…" /></label><button className="primary-button admin-span" disabled={busy || !Number(adjustment) || note.trim().length < 3} onClick={() => void adjust()}><Save size={15} /> Save adjustment</button></div>{message && <p className="admin-success"><Check size={15} /> {message}</p>}</article>
        <article className="admin-subpanel"><h3>Orders</h3>{detail.orders.length ? <div className="admin-mini-list">{detail.orders.map((row: any) => <div key={row.id}><span><strong>{row.product_name || row.product_id}</strong><small>{new Date(row.created_at).toLocaleString()} · {row.payment_method || '—'}</small></span><span><strong>{money(row.amount)}</strong><small className={`admin-state ${row.status}`}>{row.status}</small></span></div>)}</div> : <p>No orders yet.</p>}</article>
        <article className="admin-subpanel"><h3>Deposits</h3>{detail.deposits.length ? <div className="admin-mini-list">{detail.deposits.map((row: any) => <div key={row.id}><span><strong>{money(row.amount)}</strong><small>{row.method} · {new Date(row.created_at).toLocaleString()}</small></span><span className={`admin-state ${row.status}`}>{row.status}</span></div>)}</div> : <p>No deposits yet.</p>}</article>
      </div>
    </div>}
  </section>;
}

export function AdminSupport({ tickets, api, token, busy, onRefresh }: { tickets: any[]; api: AdminApi; token: string; busy: boolean; onRefresh: () => Promise<void> }) {
  const [reply, setReply] = useState<Record<string, string>>({});
  async function update(ticketId: string, status: string) { await api('admin-support-update', token, { ticketId, status, reply: reply[ticketId] || undefined }); await onRefresh(); }
  return <section className={card}><div className="admin-enhancement-heading"><div><span className="admin-eyebrow">Customer care</span><h2>Support tickets</h2><p>Review customer issues, reply, and move each ticket through resolution.</p></div><span className="admin-count-badge">{tickets.filter((t) => ['open','in_progress'].includes(t.status)).length} open</span></div><div className="admin-ticket-list">{tickets.length ? tickets.map((ticket) => <article className="admin-ticket" key={ticket.id}><div className="admin-ticket-main"><div><span className={`admin-state ${ticket.status}`}>{ticket.status.replace('_', ' ')}</span><h3>{ticket.subject}</h3><p>{ticket.name} · {ticket.email}</p></div><time>{new Date(ticket.created_at).toLocaleString()}</time></div><p className="admin-ticket-message">{ticket.message}</p><div className="admin-ticket-actions"><input value={reply[ticket.id] || ''} onChange={(e) => setReply((current) => ({ ...current, [ticket.id]: e.target.value }))} placeholder="Add an admin reply…" /><select value={ticket.status} onChange={(e) => void update(ticket.id, e.target.value)} disabled={busy}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select><button className="secondary-button compact" disabled={busy || !reply[ticket.id]?.trim()} onClick={() => void update(ticket.id, ticket.status)}><Save size={14} /> Reply</button></div>{ticket.admin_reply && <p className="admin-ticket-reply">Previous reply: {ticket.admin_reply}</p>}</article>) : <div className="admin-empty-state"><h3>No support tickets yet</h3><p>New customer support requests will appear here.</p></div>}</div></section>;
}

export function AdminAuditLogs({ logs }: { logs: any[] }) {
  return <section className={card}><div className="admin-enhancement-heading"><div><span className="admin-eyebrow">Traceability</span><h2>Audit logs</h2><p>Recent administrative and payment events recorded by the platform.</p></div><span className="admin-count-badge">{logs.length} events</span></div><div className="admin-audit-list">{logs.map((log) => <div key={log.id}><span className="audit-icon"><Check size={14} /></span><div><strong>{String(log.action).replaceAll('_', ' ')}</strong><small>{log.object_id || 'System event'} · {new Date(log.created_at).toLocaleString()}</small></div>{log.details && <code>{JSON.stringify(log.details)}</code>}</div>)}</div></section>;
}

export function AdminProducts({ products, api, token, busy, onRefresh }: { products: any[]; api: AdminApi; token: string; busy: boolean; onRefresh: () => Promise<void> }) {
  const [editing, setEditing] = useState<any>(null);
  const [create, setCreate] = useState({ name: '', description: '', sellingPrice: '', costPkr: '', canonicalKey: '' });
  async function saveProduct() { await api('admin-product-create', token, create); setCreate({ name: '', description: '', sellingPrice: '', costPkr: '', canonicalKey: '' }); await onRefresh(); }
  async function updateProduct(product: any) { await api('admin-supplier-update', token, { productId: product.id, sellingPrice: Number(product.selling_price || product.sellingPrice), costPkr: Number(product.cost_pkr || 0), canonicalKey: product.canonical_key, productName: product.name, productDescription: product.description, enabled: product.enabled !== false }); setEditing(null); await onRefresh(); }
  async function removeProduct(id: string) { if (!window.confirm('Delete this manually created product?')) return; await api('admin-product-delete', token, { productId: id }); await onRefresh(); }
  return <section className={card}><div className="admin-enhancement-heading"><div><span className="admin-eyebrow">Catalog control</span><h2>Products</h2><p>Create and maintain the customer-facing product records without leaving the admin workspace.</p></div><span className="admin-count-badge">{products.length} products</span></div><form className="admin-product-create" onSubmit={(e) => { e.preventDefault(); void saveProduct(); }}><input required placeholder="Product name" value={create.name} onChange={(e) => setCreate({ ...create, name: e.target.value })} /><input placeholder="Catalog key (optional)" value={create.canonicalKey} onChange={(e) => setCreate({ ...create, canonicalKey: e.target.value })} /><input required type="number" min="1" placeholder="Selling price" value={create.sellingPrice} onChange={(e) => setCreate({ ...create, sellingPrice: e.target.value })} /><input type="number" min="0" placeholder="Cost" value={create.costPkr} onChange={(e) => setCreate({ ...create, costPkr: e.target.value })} /><input className="wide" placeholder="Short description" value={create.description} onChange={(e) => setCreate({ ...create, description: e.target.value })} /><button className="primary-button" disabled={busy}><Plus size={15} /> Create product</button></form><div className="admin-product-list">{products.map((product) => editing?.id === product.id ? <article className="admin-product-row is-editing" key={product.id}><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /><input type="number" value={editing.selling_price || ''} onChange={(e) => setEditing({ ...editing, selling_price: e.target.value })} /><textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /><button className="secondary-button compact" onClick={() => void updateProduct(editing)}><Save size={14} /> Save</button><button className="icon-command" onClick={() => setEditing(null)}><X size={15} /></button></article> : <article className="admin-product-row" key={product.id}><div><strong>{product.name}</strong><small>{product.provider_name || product.provider_id} · {product.canonical_key}</small></div><strong>{money(product.selling_price || product.price)}</strong><span className={`admin-state ${product.enabled === false ? 'cancelled' : 'delivered'}`}>{product.enabled === false ? 'Hidden' : 'Live'}</span><button className="icon-command" onClick={() => setEditing({ ...product })} aria-label={`Edit ${product.name}`}><Pencil size={15} /></button>{String(product.provider_id) === 'manual' && <button className="icon-command danger" onClick={() => void removeProduct(product.id)} aria-label={`Delete ${product.name}`}><Trash2 size={15} /></button>}</article>)}</div></section>;
}

export function AdminSettings({ settings, api, token, busy, onRefresh }: { settings: Record<string, string>; api: AdminApi; token: string; busy: boolean; onRefresh: () => Promise<void> }) {
  const [form, setForm] = useState({ business_name: settings.business_name || '', default_currency: settings.default_currency || 'PKR', support_email: settings.support_email || '', auto_verify_receipts: settings.auto_verify_receipts || 'false' });
  async function save() { await api('admin-settings-update', token, { settings: form }); await onRefresh(); }
  return <section className={card}><div className="admin-enhancement-heading"><div><span className="admin-eyebrow">Workspace configuration</span><h2>Admin settings</h2><p>Keep the operational defaults and customer support identity in one place.</p></div><span className="admin-state delivered">Protected</span></div><div className="admin-settings-grid"><label>Business name<input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></label><label>Support email<input type="email" value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} /></label><label>Default currency<select value={form.default_currency} onChange={(e) => setForm({ ...form, default_currency: e.target.value })}><option>PKR</option><option>USD</option></select></label><label className="admin-setting-switch">Automatic receipt verification<input type="checkbox" checked={form.auto_verify_receipts === 'true'} onChange={(e) => setForm({ ...form, auto_verify_receipts: String(e.target.checked) })} /></label></div><button className="primary-button" disabled={busy} onClick={() => void save()}><Save size={15} /> Save settings</button></section>;
}

export function AdminTransactionHistory({ payments, orders }: { payments: any[]; orders: any[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const orderMap = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);
  const rows = payments.filter((payment) => {
    const haystack = [payment.transaction_id, payment.payer_name, payment.subject, payment.receiver_id, payment.order_id].filter(Boolean).join(' ').toLowerCase();
    const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'verified' && payment.verified) || (filter === 'pending' && !payment.verified);
    return matchesQuery && matchesFilter;
  });
  return <section className={card}>
    <div className="admin-enhancement-heading"><div><span className="admin-eyebrow">Money movement</span><h2>Transaction history</h2><p>Search every incoming payment and connect it to its order, verification state, and receiver.</p></div><span className="admin-count-badge">{rows.length} shown</span></div>
    <div className="admin-history-toolbar"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search transaction, payer, order or receiver" /><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All transactions</option><option value="verified">Verified</option><option value="pending">Needs review</option></select></div>
    <div className="commerce-table admin-history-table"><table><thead><tr><th>Transaction</th><th>Payer</th><th>Amount</th><th>Receiver</th><th>Order / state</th><th>Received</th></tr></thead><tbody>{rows.length ? rows.map((payment) => { const order = orderMap.get(payment.order_id); return <tr key={payment.id}><td><strong>{payment.transaction_id || payment.id}</strong><small>{payment.currency || 'PKR'} · {payment.verified ? 'Verified' : payment.verification_reason || 'Pending review'}</small></td><td>{payment.payer_name || 'Unknown'}<small>{payment.subject || '—'}</small></td><td><strong>PKR {Number(payment.amount || payment.payment_amount || 0).toLocaleString('en-PK')}</strong></td><td>{payment.receiver_id || '—'}</td><td>{order ? <><strong>{order.id}</strong><small>{order.status}</small></> : <><strong>{payment.order_id || 'Unlinked'}</strong><small>Payment record</small></>}</td><td>{payment.received_at || payment.created_at ? new Date(payment.received_at || payment.created_at).toLocaleString() : '—'}</td></tr>; }) : <tr><td colSpan={6}><div className="admin-empty-state"><h3>No transactions match</h3><p>Try a different search or filter.</p></div></td></tr>}</tbody></table></div>
  </section>;
}
