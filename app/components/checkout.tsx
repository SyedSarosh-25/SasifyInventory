'use client';
import { useEffect, useState } from 'react';
import { ClipboardList, Copy, KeyRound, LayoutDashboard, MessageCircle, Package, Pencil, RefreshCw, Search, ShieldCheck, ShoppingCart, Trash2, WalletCards, X, Zap } from 'lucide-react';

type Stock = { id: string; name: string; price: number; available: number; source?: string; description?: string; delivery_instruction?: string; provider_id?: string; provider_name?: string };
type AccountCredentials = { email: string; password: string; twoFactor: string };
type Order = { id: string; product: string; amount: number; status: string; expiresAt: string; transactionId?: string; payment: { number: string; title: string; provider: string }; credentials?: AccountCredentials; delivery?: { content: string; instructions?: string } };
async function api(action: string, token = '', body?: object, id = '') {
  const response = await fetch(`/api/commerce?action=${action}${id ? `&id=${encodeURIComponent(id)}` : ''}`, {
    method: body ? 'POST' : 'GET', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined, cache: 'no-store', credentials: 'same-origin',
  });
  const data: any = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Request failed. Please retry.'), { status:response.status });
  return data;
}
export function StockBuy({ productId }: { productId: string }) {
  const [stock, setStock] = useState<Stock | null>(null);
  useEffect(() => {
    let active = true;
    const load = () => api('stock').then((data) => { if (active) setStock(data.ready ? data.products.find((p: Stock) => p.id === productId) || null : null); }).catch(() => { if (active) setStock(null); });
    void load(); const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [productId]);
  if (!stock) return null;
  return <div className="online-stock"><p>{stock.available > 0 ? `${stock.available} accounts available` : 'Online stock sold out'}</p>{stock.available > 0 && <a className="primary-button detail-buy" href={`/checkout?product=${productId}`}><ShoppingCart size={18} /> Buy online</a>}</div>;
}
export function Checkout() {
  const [products, setProducts] = useState<Stock[]>([]), [selected, setSelected] = useState('p093');
  const [order, setOrder] = useState<Order | null>(null), [id, setId] = useState(''), [key, setKey] = useState('');
  const [transactionId, setTransaction] = useState('');
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [ready, setReady] = useState(false);
  useEffect(() => {
    setSelected(new URLSearchParams(window.location.search).get('product') || 'p093');
    const stored = localStorage.getItem('sasify-order') || sessionStorage.getItem('sasify-order');
    if (stored) { try { const data = JSON.parse(stored); setId(data.id); setKey(data.key); localStorage.setItem('sasify-order',stored); } catch { localStorage.removeItem('sasify-order'); sessionStorage.removeItem('sasify-order'); } }
    let active = true;
    const loadStock = () => api('stock').then((data) => { if (active) { setProducts(data.products); setReady(data.ready); } }).catch((e) => { if (active) setError(e.message); });
    void loadStock(); const timer = setInterval(loadStock,15000);
    return () => { active=false; clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (!id || !key) return;
    let active = true;
    const refresh = () => api('status', key, undefined, id).then((data) => {
      if (!active) return;
      if (data.status === 'expired' && !data.transactionId) {
        localStorage.removeItem('sasify-order');
        sessionStorage.removeItem('sasify-order');
        setOrder(null); setId(''); setKey(''); setTransaction('');
        setNotice('Your previous payment window ended. Please start a new order.');
        return;
      }
      setOrder(data); setError('');
    }).catch((e) => { if (active) setError(e.message); });
    void refresh(); const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 4000);
    return () => { active = false; clearInterval(timer); };
  }, [id, key]);
  useEffect(() => {
    if (order?.status !== 'pending') return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [order?.status, order?.expiresAt]);
  async function run(action: () => Promise<void>) { setBusy(true); setError(''); try { await action(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  function remember(orderId: string, recovery: string) { localStorage.setItem('sasify-order', JSON.stringify({ id: orderId, key: recovery })); setId(orderId); setKey(recovery); }
  function clear() { localStorage.removeItem('sasify-order'); sessionStorage.removeItem('sasify-order'); setOrder(null); setId(''); setKey(''); setTransaction(''); }
  const product = products.find((p) => p.id === selected);
  const secondsLeft = order?.status === 'pending' ? Math.max(0, Math.ceil((new Date(order.expiresAt).getTime() - now) / 1000)) : 0;
  const countdown = `${String(Math.floor(secondsLeft / 60)).padStart(2,'0')}:${String(secondsLeft % 60).padStart(2,'0')}`;
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setNotice('Copied.'); } catch { setNotice('Select the text and copy it.'); } }
  return <div className="commerce-shell">
    <a href="/" className="brand"><img src="/sasify-logo.png" alt="Sasify Solutions" width={48} height={48} /><strong>Sasify Solutions</strong></a>
    <a href="/inventory" className="back-link">All products</a><h1>{order ? 'Complete your payment' : 'Buy online'}</h1>
    <div className="instant-delivery"><span className="instant-icon"><Zap size={22} /></span><div><strong>Automatic credential delivery</strong><p>Pay here and your account credentials will appear on this screen automatically after verification, usually within one minute. No manual delivery delays.</p></div><span className="instant-badge">Instant</span></div>
    {error && <p role="alert" className="commerce-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!order && !id && <>
      <form className="description-section checkout-start" onSubmit={(e) => { e.preventDefault(); void run(async () => { const data = await api('create', '', { productId: selected }); remember(data.id, data.recovery); }); }}>
        <label>Select package<select value={selected} onChange={(e) => setSelected(e.target.value)}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        {product && <div className="checkout-offer"><div><span>Price</span><strong>PKR {product.price.toLocaleString()}</strong></div><div><span>Available stock</span><strong className={product.available ? 'in-stock' : 'out-stock'}>{product.available}</strong></div></div>}
        <button className="primary-button" disabled={busy || !ready || !product?.available}><ShoppingCart size={18} /> {busy ? 'Preparing checkout...' : 'Pay online'}</button>
        {ready && !product?.available && <p>Sold out online. <a href="https://wa.me/923116185711">Contact us on WhatsApp</a>.</p>}
      </form>
    </>}
    {id && !order && <><p>Loading order...</p><button className="secondary-button" onClick={clear}>Back to checkout</button></>}
    {order && <>
      <div className="checkout-heading"><div><span>{order.product}</span><strong>PKR {order.amount.toLocaleString()}</strong></div><span className={`order-state ${order.status}`}>{order.status === 'review' ? 'Verifying payment' : order.status}</span></div>
      {order.status === 'pending' && <section className="description-section"><h2>Pay with NayaPay for automatic instant delivery</h2>
        <p className="payment-callout">Send exactly <strong>PKR {order.amount.toLocaleString()}</strong> to the NayaPay account below.</p>
        <p className="payment-source-note"><strong>This number is for NayaPay payments.</strong> You can transfer to it from any bank account, Easypaisa, JazzCash or NayaPay.</p>
        <dl className="commerce-details"><dt>Account title</dt><dd>{order.payment.title}</dd><dt>NayaPay number</dt><dd><strong>{order.payment.number}</strong> <button title="Copy payment number" aria-label="Copy payment number" onClick={() => void copy(order.payment.number)}><Copy size={16} /></button></dd><dt>Payment timer</dt><dd><strong className="payment-timer">{countdown}</strong></dd></dl>
        <div className="alternate-payment"><div><strong>Want to use another payment method?</strong><p>Purchase directly on WhatsApp and our team will guide you.</p></div><a className="whatsapp-purchase" href={`https://wa.me/923116185711?text=${encodeURIComponent(`Hi Sasify Solutions, I want to purchase ${order.product} using another payment method.`)}`} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Buy on WhatsApp</a></div>
      </section>}
      {['pending','expired'].includes(order.status) && !order.transactionId && <form className="description-section" onSubmit={(e) => { e.preventDefault(); void run(async () => { await api('claim',key,{ id,transactionId }); setOrder(await api('status',key,undefined,id)); }); }}>
        {order.status === 'expired' && <p>This reservation expired. If you already paid, enter the transaction ID for review.</p>}
        <h2>Enter transaction ID</h2><p><strong>Only your transaction ID is required.</strong> Copy it from your payment receipt or confirmation message and submit it below. No payment screenshot is needed.</p>
        <label>Transaction ID<input value={transactionId} onChange={(e) => setTransaction(e.target.value)} required minLength={6} maxLength={80} placeholder="e.g. 247854" autoCapitalize="characters" /></label>
        <button className="primary-button" disabled={busy}>{busy ? 'Submitting...' : 'Submit and verify payment'}</button>
      </form>}
      {order.status === 'review' && <section className="verification-state" role="status"><RefreshCw size={24} /><div><strong>Checking your payment</strong><p>Keep this page open. It refreshes automatically and normally delivers within one minute.</p></div></section>}
      {order.credentials && <section className="description-section"><h2><ShieldCheck size={20} /> Your account is ready</h2>
        {Object.entries(order.credentials).map(([field,value]) => <label key={field}>{field === 'twoFactor' ? '2FA' : field}<div className="commerce-secret"><code>{value}</code><button title={`Copy ${field}`} aria-label={`Copy ${field}`} onClick={() => void copy(value)}><Copy size={18} /></button></div></label>)}
      </section>}
      {order.delivery && <section className="description-section supplier-delivery"><h2><ShieldCheck size={20} /> Your purchase is ready</h2><p>Keep this information private and follow the activation instructions below.</p><div className="commerce-secret"><pre>{order.delivery.content}</pre><button title="Copy delivery" aria-label="Copy delivery" onClick={() => void copy(order.delivery!.content)}><Copy size={18} /></button></div>{order.delivery.instructions && <div className="delivery-instructions"><strong>Activation instructions</strong><p>{order.delivery.instructions}</p></div>}</section>}
      {['cancelled','expired','delivered'].includes(order.status) && <button className="secondary-button" onClick={clear}>Start a new order</button>}
    </>}
  </div>;
}

function SupplierProductRow({ item, busy, save }: { item:any; busy:boolean; save:(values:{ sellingPrice:number; costPkr:number; enabled:boolean; canonicalKey:string })=>Promise<void> }) {
  const [sellingPrice,setSellingPrice]=useState(String(item.selling_price || ''));
  const [costPkr,setCostPkr]=useState(String(item.cost_pkr || ''));
  const [canonicalKey,setCanonicalKey]=useState(String(item.canonical_key || ''));
  const [enabled,setEnabled]=useState(Boolean(item.enabled));
  const providerClass = item.provider_id === 'dody' ? 'dodi' : item.provider_id;
  return <article className={`supplier-admin-row supplier-admin-row-${providerClass}`}><div className="supplier-admin-title"><div><span className="admin-eyebrow">{item.provider_name || 'Supplier'}</span><strong>{item.name}</strong><small>{item.external_product_id || item.id}</small></div><span className={`${item.supplier_stock>0?'in-stock':'out-stock'} supplier-stock-badge`}><i aria-hidden="true" />{item.supplier_stock} in stock</span></div><p className="supplier-wholesale">Wholesale: {item.wholesale_price} {item.currency}</p><div className="supplier-price-controls"><label>Cost in PKR<input type="number" min="0" step="1" value={costPkr} onChange={(e)=>setCostPkr(e.target.value)}/></label><label>Selling price<input type="number" min="1" step="1" value={sellingPrice} onChange={(e)=>setSellingPrice(e.target.value)}/></label><label>Product mapping key<input type="text" pattern="[a-z0-9][a-z0-9:_-]{1,199}" value={canonicalKey} onChange={(e)=>setCanonicalKey(e.target.value.toLowerCase())}/></label><label className="commerce-check"><input type="checkbox" checked={enabled} onChange={(e)=>setEnabled(e.target.checked)}/> Show on website</label><button className="secondary-button supplier-save-button" disabled={busy||!sellingPrice||costPkr===''||!canonicalKey} onClick={()=>void save({sellingPrice:Number(sellingPrice),costPkr:Number(costPkr),enabled,canonicalKey})}>Save changes</button></div></article>;
}

export function CommerceAdmin() {
  const [key,setKey] = useState(''), [email,setEmail] = useState(''), [password,setPassword] = useState(''), [data,setData] = useState<any>(null), [error,setError] = useState(''), [notice,setNotice] = useState('');
  const [accounts,setAccounts] = useState(''), [productId,setProduct] = useState('p093'), [purchaseCost,setPurchaseCost] = useState('2000'), [orderId,setOrderId] = useState(''), [paymentId,setPaymentId] = useState(''), [confirmed,setConfirmed] = useState(false), [busy,setBusy] = useState(false), [receipt,setReceipt] = useState<any>(null);
  const [tab,setTab] = useState<'overview'|'inventory'|'supplier'|'orders'|'payments'>('overview'), [inventorySearch,setInventorySearch] = useState(''), [supplierSearch,setSupplierSearch] = useState(''), [supplierProvider,setSupplierProvider] = useState<'all'|'dodi'|'qamify'|'mke'|'piggyai'>('all'), [editing,setEditing] = useState<any>(null), [picked,setPicked] = useState<{ inventoryId:string; credentials:AccountCredentials } | null>(null), [checkingSession,setCheckingSession] = useState(true);
  const [editCost,setEditCost] = useState('0'), [editState,setEditState] = useState('available'), [editEmail,setEditEmail] = useState(''), [editPassword,setEditPassword] = useState(''), [editTwoFactor,setEditTwoFactor] = useState('');
  useEffect(()=>{let active=true;void api('admin-list').then((dashboard)=>{if(active)setData(dashboard);}).catch(()=>{}).finally(()=>{if(active)setCheckingSession(false);});return()=>{active=false;};},[]);
  async function run(fn: () => Promise<void>) { setBusy(true); setError(''); try { await fn(); } catch(e) { const problem=e as Error&{status?:number};if(problem.status===401){setData(null);setKey('');setPicked(null);setReceipt(null);}setError(problem.message); } finally { setBusy(false); } }
  const refresh = async () => setData(await api('admin-list',key));
  const login = async () => { const session=await api('admin-login','',{email,password});setKey(session.token);setPassword('');setData(await api('admin-list',session.token)); };
  const logout = async () => { await api('admin-logout','',{});setData(null);setKey('');setEmail('');setPassword('');setAccounts('');setReceipt(null);setPicked(null);setNotice(''); };
  const money=(value:any)=>`PKR ${Number(value || 0).toLocaleString()}`;
  const available=Number(data?.stock?.find((row:any)=>row.state==='available')?.count || 0);
  const filteredInventory=(data?.inventory || []).filter((item:any)=>`${item.email} ${item.state}`.toLowerCase().includes(inventorySearch.toLowerCase()));
  const supplierProducts=(data?.supplierProducts || []).filter((item:any)=>{const provider=(item.provider_id==='dody'?'dodi':item.provider_id);const query=supplierSearch.trim().toLowerCase();return (supplierProvider==='all' || provider===supplierProvider) && (!query || `${item.name} ${item.external_product_id || ''} ${item.canonical_key || ''}`.toLowerCase().includes(query));});
  const supplierCount=(provider:'all'|'dodi'|'qamify'|'mke'|'piggyai')=>provider==='all'?(data?.supplierProducts || []).length:(data?.supplierProducts || []).filter((item:any)=>(item.provider_id==='dody'?'dodi':item.provider_id)===provider).length;
  const beginEdit=(item:any)=>{setEditing(item);setEditCost(String(item.purchaseCost));setEditState(item.state);setEditEmail('');setEditPassword('');setEditTwoFactor('');};
  const copyCredential=async(value:string)=>{try{await navigator.clipboard.writeText(value);setNotice('Credential copied.');}catch{setNotice('Select the credential and copy it.');}};
  if (checkingSession) return <div className="commerce-shell commerce-admin admin-login" aria-busy="true"><p role="status">Loading admin...</p></div>;
  if (!data) return <div className="commerce-shell commerce-admin admin-login"><a href="/" className="brand"><img src="/sasify-logo.png" alt="Sasify Solutions" width={48} height={48}/><strong>Sasify Solutions</strong></a><div className="admin-login-panel"><span className="admin-eyebrow">Secure workspace</span><h1>Admin sign in</h1><p>Manage stock, orders, payments and financial performance.</p>{error && <p role="alert" className="commerce-error">{error}</p>}<form onSubmit={(e)=>{e.preventDefault();void run(login);}}><label>Email<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required autoComplete="username"/></label><label>Password<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required autoComplete="current-password"/></label><button className="primary-button" disabled={busy}>{busy?'Signing in...':'Sign in'}</button></form></div></div>;
  return <div className="commerce-shell commerce-admin">
    <header className="admin-header"><div><span className="admin-eyebrow">Sasify operations</span><h1>Commerce admin</h1><p>Automatic verification: <strong className={data.autoVerify?'status-good':'status-warn'}>{data.autoVerify?'Enabled':'Manual'}</strong></p></div><div className="commerce-actions"><button title="Refresh dashboard" className="icon-command" disabled={busy} onClick={()=>void run(refresh)}><RefreshCw size={18}/></button><button className="secondary-button" disabled={busy} onClick={()=>void run(logout)}>Sign out</button></div></header>
    {error&&<p role="alert" className="commerce-error">{error}</p>}{notice&&<p role="status" className="admin-notice">{notice}</p>}
    <nav className="admin-tabs" aria-label="Admin sections">{[
      ['overview','Overview',LayoutDashboard],['inventory','Inventory',Package],['supplier','Supplier Store',ShoppingCart],['orders','Orders',ClipboardList],['payments','Payments',WalletCards]
    ].map(([value,label,Icon]:any)=><button key={value} className={tab===value?'active':''} onClick={()=>setTab(value)}><Icon size={18}/>{label}</button>)}</nav>
    {tab==='supplier'&&<label className="admin-search supplier-search"><Search size={17}/><input aria-label="Search supplier products" placeholder="Search supplier products" value={supplierSearch} onChange={(e)=>setSupplierSearch(e.target.value)}/>{supplierSearch&&<button type="button" title="Clear supplier search" aria-label="Clear supplier search" onClick={()=>setSupplierSearch('')}>×</button>}</label>}

    {tab==='overview'&&<div className="admin-workspace"><section className="metric-grid">
      <article><span>Total income</span><strong>{money(data.metrics.income)}</strong><small>{data.metrics.delivered_orders} delivered orders</small></article>
      <article><span>Total profit</span><strong className="metric-profit">{money(data.metrics.profit)}</strong><small>Income minus recorded costs</small></article>
      <article><span>This month</span><strong>{money(data.metrics.monthly_income)}</strong><small>Profit {money(data.metrics.monthly_profit)}</small></article>
      <article><span>Available stock</span><strong>{available}</strong><small>{data.metrics.active_orders} active orders</small></article>
    </section>{Number(data.metrics.missing_costs)>0&&<p className="admin-warning">{data.metrics.missing_costs} delivered account(s) have no purchase cost. Add their costs in Inventory for accurate profit.</p>}
      <section className="admin-panel"><div className="panel-heading"><div><span className="admin-eyebrow">Live operations</span><h2>Business snapshot</h2></div></div><div className="snapshot-grid"><div><span>Recorded stock cost</span><strong>{money(data.metrics.cost)}</strong></div><div><span>Active orders</span><strong>{data.metrics.active_orders}</strong></div><div><span>Delivered</span><strong>{data.metrics.delivered_orders}</strong></div><div><span>Available credentials</span><strong>{available}</strong></div></div></section>
    </div>}

    {tab==='inventory'&&<div className="admin-workspace"><section className="admin-panel"><div className="panel-heading"><div><span className="admin-eyebrow">Create</span><h2>Add inventory</h2></div></div><form className="admin-form-grid" onSubmit={(e)=>{e.preventDefault();void run(async()=>{const result=await api('admin-import',key,{productId,accounts,purchaseCost:Number(purchaseCost)});setAccounts('');setNotice(`${result.imported} account(s) imported.`);await refresh();});}}><label>Package<select value={productId} onChange={(e)=>setProduct(e.target.value)}><option value="p093">ChatGPT Plus</option></select></label><label>Purchase cost per account<input type="number" min="0" step="1" value={purchaseCost} onChange={(e)=>setPurchaseCost(e.target.value)} required/></label><label className="admin-span">Accounts (email | password | 2FA)<textarea value={accounts} onChange={(e)=>setAccounts(e.target.value)} required rows={5} spellCheck={false} autoComplete="off"/></label><button className="primary-button admin-span" disabled={busy}>Import stock</button></form></section>
      <section className="admin-panel"><div className="panel-heading"><div><span className="admin-eyebrow">Read, update, withdraw</span><h2>Inventory accounts</h2></div><label className="admin-search"><Search size={17}/><input aria-label="Search inventory" placeholder="Search email or status" value={inventorySearch} onChange={(e)=>setInventorySearch(e.target.value)}/></label></div><div className="commerce-table"><table><thead><tr><th>Account</th><th>Status</th><th>Cost</th><th>Margin</th><th>Added</th><th>Actions</th></tr></thead><tbody>{filteredInventory.map((item:any)=><tr key={item.id}><td><strong>{item.email}</strong><small>{item.id.slice(0,8)}</small></td><td><span className={`admin-state ${item.state}`}>{item.state}</span></td><td>{money(item.purchaseCost)}</td><td>{item.state==='delivered'?money(3250-item.purchaseCost):'-'}</td><td>{new Date(item.createdAt).toLocaleDateString()}</td><td><div className="row-actions"><button title="Pick account credentials" aria-label={`Pick credentials for ${item.email}`} disabled={busy||item.state!=='available'} onClick={()=>{if(window.confirm('Pick this account for admin use? It will be removed from sellable stock.'))void run(async()=>{const result=await api('admin-inventory-pick',key,{inventoryId:item.id,confirmed:true});setPicked(result);setEditing(null);setNotice('Account withdrawn from sellable stock.');await refresh();});}}><KeyRound size={16}/></button><button title="Edit inventory account" aria-label={`Edit ${item.email}`} disabled={['reserved','delivered','withdrawn'].includes(item.state)} onClick={()=>beginEdit(item)}><Pencil size={16}/></button><button title="Delete inventory account" aria-label={`Delete ${item.email}`} disabled={!['available','quarantined'].includes(item.state)} onClick={()=>{if(window.confirm('Delete this unused inventory account permanently?'))void run(async()=>{await api('admin-inventory-delete',key,{inventoryId:item.id,confirmed:true});setNotice('Inventory account deleted.');if(editing?.id===item.id)setEditing(null);await refresh();});}}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>{!filteredInventory.length&&<p>No inventory accounts match this view.</p>}
      {picked&&<section className="inventory-editor admin-picked-credentials"><div className="panel-heading"><div><span className="admin-eyebrow">Admin withdrawal</span><h3>Picked account credentials</h3></div><button type="button" title="Close credentials" className="icon-command" onClick={()=>setPicked(null)}><X size={18}/></button></div><p>This account is no longer available for customer orders. Store these credentials securely.</p>{Object.entries(picked.credentials).map(([field,value])=><label key={field}>{field==='twoFactor'?'2FA':field}<div className="commerce-secret"><code>{value}</code><button title={`Copy ${field}`} aria-label={`Copy ${field}`} onClick={()=>void copyCredential(value)}><Copy size={18}/></button></div></label>)}</section>}
      {editing&&<form className="inventory-editor" onSubmit={(e)=>{e.preventDefault();void run(async()=>{await api('admin-inventory-update',key,{inventoryId:editing.id,purchaseCost:Number(editCost),state:editState,email:editEmail,password:editPassword,twoFactor:editTwoFactor});setEditing(null);setNotice('Inventory account updated.');await refresh();});}}><div className="panel-heading"><div><span className="admin-eyebrow">Update</span><h3>{editing.email}</h3></div><button type="button" title="Close editor" className="icon-command" onClick={()=>setEditing(null)}><X size={18}/></button></div><div className="admin-form-grid"><label>Purchase cost<input type="number" min="0" step="1" value={editCost} onChange={(e)=>setEditCost(e.target.value)} required/></label><label>Status<select value={editState} disabled={editing.state==='delivered'} onChange={(e)=>setEditState(e.target.value)}>{editing.state==='delivered'?<option value="delivered">Delivered</option>:<><option value="available">Available</option><option value="quarantined">Quarantined</option></>}</select></label>{editing.state!=='delivered'&&<><p className="admin-span editor-note">Leave all credential fields blank to keep the existing login.</p><label>Email<input type="email" value={editEmail} onChange={(e)=>setEditEmail(e.target.value)}/></label><label>Password<input value={editPassword} onChange={(e)=>setEditPassword(e.target.value)}/></label><label className="admin-span">2FA<input value={editTwoFactor} onChange={(e)=>setEditTwoFactor(e.target.value)}/></label></>}<button className="primary-button admin-span" disabled={busy}>Save changes</button></div></form>}</section></div>}

    {tab==='supplier'&&<div className="admin-workspace"><section className="admin-panel"><div className="panel-heading"><div><span className="admin-eyebrow">Supplier catalog</span><h2>{supplierProvider==='all'?'All supplier products':supplierProvider==='qamify'?'Qamify products':supplierProvider==='mke'?'MKE Shop products':supplierProvider==='piggyai'?'PiggyAi products':'DODI Store products'}</h2><p>Choose a supplier to manage its catalog separately. Automatic conversion: <strong>1 USDT = PKR {data.supplierUsdtPkrRate || 285}</strong>{data.supplierUsdPkrRate&&<>; <strong>1 USD = PKR {data.supplierUsdPkrRate}</strong></>}</p>{(data.providerStates||[]).filter((provider:any)=>supplierProvider==='all'||(provider.provider_id==='dody'?'dodi':provider.provider_id)===supplierProvider).map((provider:any)=><small key={provider.provider_id}>{provider.provider_name}: {provider.balance ?? '—'} {provider.currency || ''}</small>)}</div><button className="secondary-button" disabled={busy} onClick={()=>void run(async()=>{const result=await api('admin-supplier-sync',key,{});const summary=(result.providers||[]).map((provider:any)=>`${provider.providerName}: ${provider.synced}`).join(', ');setNotice(`${result.synced} products synced${summary?` (${summary})`:''}.`);await refresh();})}><RefreshCw size={17}/> Sync providers</button></div><div className="supplier-provider-tabs" role="tablist" aria-label="Supplier product providers">{([['all','All suppliers'],['dodi','DODI Store'],['qamify','Qamify'],['mke','MKE Shop'],['piggyai','PiggyAi']] as const).map(([value,label])=><button key={value} type="button" role="tab" aria-selected={supplierProvider===value} className={supplierProvider===value?'active':''} onClick={()=>setSupplierProvider(value)}>{label}<span>{supplierCount(value)}</span></button>)}</div><div className="supplier-admin-list">{supplierProducts.map((item:any)=><SupplierProductRow key={item.id} item={item} busy={busy} save={(values)=>run(async()=>{await api('admin-supplier-update',key,{productId:item.id,...values});setNotice(`${item.name} updated.`);await refresh();})}/>)}</div>{!supplierProducts.length&&<p>No products found for {supplierProvider==='qamify'?'Qamify':supplierProvider==='dodi'?'DODI Store':supplierProvider==='mke'?'MKE Shop':supplierProvider==='piggyai'?'PiggyAi':'the selected supplier'} yet. Select Sync providers to refresh its catalog.</p>}</section></div>}

    {tab==='orders'&&<div className="admin-workspace"><section className="admin-panel"><div className="panel-heading"><div><span className="admin-eyebrow">Order management</span><h2>Orders</h2></div></div><div className="commerce-table"><table><thead><tr><th>Order</th><th>Amount</th><th>Status</th><th>Transaction</th><th>Sender</th><th>Date</th></tr></thead><tbody>{data.orders.map((row:any)=><tr key={row.id}><td><button className="table-select" onClick={()=>setOrderId(row.id)}>{row.id.slice(0,8)}</button></td><td>{money(row.amount)}</td><td><span className={`admin-state ${row.status}`}>{row.status}</span></td><td>{row.transaction_id||'-'}</td><td>{row.payer_name||'-'}</td><td>{new Date(row.created_at).toLocaleString()}</td></tr>)}</tbody></table></div></section><section className="admin-panel compact-panel"><h2>Release unpaid reservation</h2><p>Selected order: <strong>{orderId?orderId.slice(0,8):'None'}</strong>. Verify that no payment is owed before cancelling.</p><button className="secondary-button danger-action" disabled={busy||!orderId} onClick={()=>{if(window.confirm('Cancel this undelivered order and release its stock?'))void run(async()=>{await api('admin-cancel',key,{orderId,confirmed:true});setNotice('Reservation cancelled and stock released.');setOrderId('');await refresh();});}}>Cancel selected reservation</button></section></div>}

    {tab==='payments'&&<div className="admin-workspace"><section className="admin-panel"><div className="panel-heading"><div><span className="admin-eyebrow">NayaPay inbox</span><h2>Received payments</h2></div></div><div className="commerce-table"><table><thead><tr><th>Payment</th><th>Amount</th><th>Transaction</th><th>Order</th><th>Receipt</th></tr></thead><tbody>{data.payments.map((row:any)=><tr key={row.id}><td><button className="table-select" onClick={()=>setPaymentId(row.id)}>{row.subject}</button><small>{row.id.slice(0,8)}</small></td><td>{money(row.amount)}</td><td>{row.transaction_id||'Unparsed'}</td><td>{row.order_id?.slice(0,8)||'Unassigned'}</td><td><button className="secondary-button compact" onClick={()=>void run(async()=>setReceipt(await api('admin-payment',key,{paymentId:row.id})))}>View</button></td></tr>)}</tbody></table></div>{receipt&&<div className="receipt-view"><button title="Close receipt" className="icon-command" onClick={()=>setReceipt(null)}><X size={18}/></button><pre className="commerce-receipt">{receipt.subject}{'\n'}{receipt.text}</pre></div>}</section><section className="admin-panel compact-panel"><h2>Manual payment delivery</h2><form className="admin-form-grid" onSubmit={(e)=>{e.preventDefault();void run(async()=>{await api('admin-approve',key,{orderId,paymentId,confirmed});setConfirmed(false);setNotice('Order delivered.');await refresh();});}}><label>Order ID<input value={orderId} onChange={(e)=>setOrderId(e.target.value)} required/></label><label>Payment ID<input value={paymentId} onChange={(e)=>setPaymentId(e.target.value)} required/></label><label className="commerce-check admin-span"><input type="checkbox" checked={confirmed} onChange={(e)=>setConfirmed(e.target.checked)}/> I verified the payment, customer and amount in NayaPay.</label><button className="primary-button admin-span" disabled={busy||!confirmed}>Confirm and deliver account</button></form></section></div>}
  </div>;
}
