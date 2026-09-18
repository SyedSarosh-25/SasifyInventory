'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, LogOut, Package, RefreshCw, Users, Zap } from 'lucide-react';

type TeamProduct = {
  productId: string;
  productName: string;
  available: number;
};

type Credentials = {
  email: string;
  password: string;
  twoFactor: string;
};

async function teamApi(action: string, token = '', body?: object) {
  const response = await fetch(`/api/commerce?action=${action}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    credentials: 'same-origin',
  });
  const data: any = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(data.error || 'Request failed. Please retry.'), {
      status: response.status,
    });
  return data;
}

export function TeamPortal() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState<TeamProduct[]>([]);
  const [picked, setPicked] = useState<{
    productName: string;
    credentials: Credentials;
    commission: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadStock = async (sessionToken = token) => {
    const data = await teamApi('team-stock', sessionToken);
    setProducts(data.products || []);
  };

  useEffect(() => {
    let active = true;
    void teamApi('team-stock')
      .then((data) => {
        if (active) setProducts(data.products || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const login = async () => {
    const session = await teamApi('team-login', '', { email, password });
    setToken(session.token);
    setEmail(session.email || email);
    setPassword('');
    await loadStock(session.token);
  };

  const takeStock = async (product: TeamProduct) => {
    if (!window.confirm(`Take one ${product.productName} account from available stock?`))
      return;
    const data = await teamApi('team-inventory-pick', token, {
      productId: product.productId,
    });
    setPicked({
      productName: data.productName,
      credentials: data.credentials,
      commission: Number(data.commission?.amountPkr || 50),
    });
    setNotice('Stock picked successfully. The admin inventory and HOR commission ledger have been updated.');
    await loadStock();
  };

  const logout = async () => {
    await teamApi('team-logout', token, {});
    setToken('');
    setProducts([]);
    setPicked(null);
    setNotice('Signed out.');
  };

  if (!token)
    return (
      <div className="team-shell team-login-shell">
        <div className="team-brand">
          <Users size={20} /> Sasify team workspace
        </div>
        <section className="team-panel team-login-panel">
          <span className="team-kicker">Restricted access</span>
          <h1>Team stock login</h1>
          <p>Sign in to view and pick available local stock. Financial data and supplier settings are not available here.</p>
          {error && <p className="team-error" role="alert">{error}</p>}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(login);
            }}
          >
            <label>
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
            </label>
            <button className="team-primary-button" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <a className="team-admin-link" href="/orders-admin">Admin sign in</a>
        </section>
      </div>
    );

  return (
    <div className="team-shell">
      <header className="team-header">
        <div>
          <div className="team-brand"><Users size={20} /> Sasify team workspace</div>
          <h1>Available stock</h1>
          <p>Pick an account when you need it. Every pickup updates the main admin inventory immediately.</p>
        </div>
        <div className="team-header-actions">
          <button className="team-secondary-button" disabled={busy} onClick={() => void run(loadStock)}><RefreshCw size={16} /> Refresh</button>
          <button className="team-secondary-button" disabled={busy} onClick={() => void run(logout)}><LogOut size={16} /> Sign out</button>
        </div>
      </header>
      {error && <p className="team-error" role="alert">{error}</p>}
      {notice && <p className="team-notice" role="status">{notice}</p>}
      <section className="team-panel team-info-panel">
        <Zap size={22} />
        <div><strong>Controlled stock pickup</strong><p>Available local accounts appear here, including unallocated shared ChatGPT Plus accounts. One pickup records a PKR 50 HOR commission.</p></div>
      </section>
      {picked && (
        <section className="team-panel team-delivery-panel">
          <div className="team-delivery-heading"><CheckCircle2 size={22} /><div><span className="team-kicker">Stock picked</span><h2>{picked.productName}</h2></div></div>
          <div className="team-credentials">
            <div><span>Email</span><strong>{picked.credentials.email}</strong></div>
            <div><span>Password</span><strong>{picked.credentials.password}</strong></div>
            <div><span>2FA / recovery</span><strong>{picked.credentials.twoFactor}</strong></div>
          </div>
          <small>HOR commission recorded: PKR {picked.commission.toLocaleString()}</small>
        </section>
      )}
      <section className="team-panel">
        <div className="team-section-heading"><div><span className="team-kicker">Live inventory</span><h2>Choose stock</h2></div><Package size={22} /></div>
        {loading ? <p className="team-loading"><RefreshCw size={18} /> Loading available stock…</p> : !products.length ? <p className="team-empty">No available local stock right now.</p> : <div className="team-stock-grid">{products.map((product) => <article className="team-stock-card" key={product.productId}><div><span>{product.productName}</span><strong>{product.available} available</strong></div><button className="team-primary-button" disabled={busy} onClick={() => void run(() => takeStock(product))}>Take one stock</button></article>)}</div>}
      </section>
    </div>
  );
}
