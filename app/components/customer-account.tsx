'use client';
import { useEffect, useState, type SyntheticEvent } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  BadgePercent,
  CircleDollarSign,
  ClipboardList,
  Eye,
  EyeOff,
  LayoutDashboard,
  Mail,
  PackageCheck,
  Phone,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  WalletCards,
} from 'lucide-react';
import { SiteHeader, SiteFooter } from './site-chrome';
import './customer-account.css';

async function request(action: string, body?: object, id?: string) {
  const response = await fetch(
    `/api/commerce?action=${action}${id ? `&id=${encodeURIComponent(id)}` : ''}`,
    {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const data: any = await response.json();
  if (!response.ok || data.ok === false)
    throw Object.assign(new Error(data.error || 'Please try again.'), {
      status: response.status,
    });
  return data;
}
type Account = {
  name: string;
  email: string;
  username?: string | null;
  role: string;
  balance: number;
  reseller_status?: 'none' | 'pending' | 'approved' | 'rejected';
};
type CustomerOrder = {
  id: string;
  product: string;
  amount: number;
  savings?: number;
  status: string;
  created_at: string;
};
type Deposit = {
  id: string;
  amount: number;
  currency: string;
  payment_amount: string;
  method: string;
  status: string;
  created_at: string;
  expires_at: string;
};
type Dashboard = {
  account: Account;
  orders: CustomerOrder[];
  savings?: number;
  deposits: Deposit[];
  ledger: { amount: number; description: string; created_at: string }[];
  requirements: { id: string; tool_name: string; description: string; status: string; response_contact?: string | null; responded_at?: string | null; created_at: string }[];
};
const money = (amount: number) =>
  `PKR ${Number(amount).toLocaleString('en-US')}`;
const emailPattern =
  /^[^\s@]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
const usernamePattern = /^[a-z0-9](?:[a-z0-9._-]{1,22}[a-z0-9])$/;
const usernameIsAllowed = (value: string) =>
  usernamePattern.test(value) &&
  !/(?:^|[._-])(?:gmail|googlemail)\.com$/i.test(value) &&
  !/^\d{7,}$/.test(value.replace(/[^a-z0-9]/gi, ''));

function PasswordField({
  label,
  name,
  autoComplete,
  minLength,
  maxLength,
}: {
  label: string;
  name: string;
  autoComplete: string;
  minLength: number;
  maxLength: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label>
      {label}
      <span className="account-password-control">
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          required
        />
        <button
          className="account-password-toggle"
          type="button"
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}

export function AccountAuth({ signup = false }: { signup?: boolean }) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'details' | 'otp' | 'password'>('details');
  const [name, setName] = useState(''),
    [username, setUsername] = useState(''),
    [email, setEmail] = useState('');
  const [challengeId, setChallengeId] = useState(''),
    [verificationToken, setVerificationToken] = useState('');
  const [notice, setNotice] = useState(''),
    [resendAt, setResendAt] = useState(0),
    [now, setNow] = useState(Date.now());
  const emailLooksValid = emailPattern.test(email.trim());
  const usernameLooksValid = usernameIsAllowed(username.trim().toLowerCase());
  useEffect(() => {
    if (step !== 'otp') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);
  async function sendCode() {
    if (!name.trim()) throw new Error('Enter your full name.');
    const normalizedUsername = username.trim().toLowerCase();
    if (!usernameIsAllowed(normalizedUsername))
      throw new Error(
        'Use a random username only. Do not enter your Gmail/email address, gmail.com, or a phone number.',
      );
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail))
      throw new Error('Enter a valid email address.');
    setEmail(normalizedEmail);
    setUsername(normalizedUsername);
    const result = await request('account-send-otp', {
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
    });
    setChallengeId(result.challengeId);
    setVerificationToken('');
    setStep('otp');
    setResendAt(Date.now() + 60000);
    setNow(Date.now());
    setNotice(
      `Verification code sent to ${normalizedEmail}. Check your inbox and spam folder.`,
    );
  }
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const fields = new FormData(event.currentTarget);
    try {
      if (signup && step === 'details') {
        await sendCode();
        return;
      }
      if (signup && step === 'otp') {
        const result = await request('account-verify-otp', {
          challengeId,
          code: fields.get('code'),
        });
        setVerificationToken(result.verificationToken);
        setStep('password');
        setNotice('Email verified. Continue below to set your password.');
        return;
      }
      if (signup && fields.get('password') !== fields.get('confirmPassword'))
        throw new Error('Passwords do not match.');
      await request(signup ? 'account-signup' : 'account-login', {
        email: signup ? email : fields.get('email'),
        username: signup ? username : undefined,
        password: fields.get('password'),
        confirmPassword: fields.get('confirmPassword'),
        challengeId,
        verificationToken,
      });
      window.location.assign('/dashboard');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <SiteHeader accountMode={signup ? 'signup' : 'login'} />
      <main className="account-auth">
        <section className={`account-intro${signup ? ' account-intro-signup' : ''}`}>
          <span className="account-eyebrow">YOUR SASIFY ACCOUNT</span>
          {!signup && <div className="account-hero-art account-hero-art-image" aria-hidden="true">
            <img src="/sasify-account-hero.png" alt="" />
          </div>}
          <h1>{signup ? 'Your digital world, together.' : 'Welcome back.'}</h1>
          <p>
            Keep your purchases, credentials and wallet together in one calm,
            secure space built around you.
          </p>
          {signup && <div className="account-hero-art account-hero-art-image" aria-hidden="true">
            <video className="account-hero-video" autoPlay muted loop playsInline preload="metadata" poster="/sasify-signup-hero.png">
              <source src="/wallet-video.mp4" type="video/mp4" />
            </video>
          </div>}
          <div className="account-benefits">
            <p>
              <ShoppingBag size={20} />{' '}
              <span>Your orders, always within reach</span>
            </p>
            <p>
              <ShieldCheck size={20} />{' '}
              <span>Secure access to purchased credentials</span>
            </p>
            <p>
              <WalletCards size={20} />{' '}
              <span>
                Your personal Sasify wallet, with 5% off every purchase
              </span>
            </p>
          </div>
        </section>
        <form className="account-card" onSubmit={submit}>
          <h2>{signup ? 'Create your account' : 'Log in to Sasify'}</h2>
          <p>
            {signup
              ? 'Create your customer account in a few seconds.'
              : 'Your purchases are waiting for you.'}
          </p>
          {notice && (
            <p className="account-notice" role="status">
              {notice}
            </p>
          )}
          {signup && step === 'details' && (
            <>
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label>
                Username
                <input
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={24}
                  minLength={3}
                  pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,22}[A-Za-z0-9]"
                  title="3–24 characters. Use letters, numbers, dots, underscores, or hyphens; start and end with a letter or number."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <small>
                  Use a random username, e.g. sky_user482. Do not enter your
                  Gmail/email address, <code>gmail.com</code>, or phone number.
                </small>
              </label>
            </>
          )}
          {(!signup || step !== 'password') && (
            <label className={signup ? 'account-email-label' : undefined}>
              Email address
              <span className="account-email-row">
                <span className="account-input-with-icon">
                  <Mail size={17} />
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={signup && step === 'otp'}
                    required
                  />
                </span>
                {signup && (
                  <button
                    type="button"
                    className="account-otp-button"
                    disabled={
                      busy ||
                      !name.trim() ||
                      !usernameLooksValid ||
                      !emailLooksValid ||
                      (step === 'otp' && now < resendAt)
                    }
                    onClick={async () => {
                      setBusy(true);
                      setError('');
                      try {
                        await sendCode();
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {step === 'otp'
                      ? now < resendAt
                        ? `Resend ${Math.ceil((resendAt - now) / 1000)}s`
                        : 'Resend OTP'
                      : 'Get OTP'}
                  </button>
                )}
              </span>
            </label>
          )}
          {signup && step === 'otp' && (
            <label>
              Email verification code
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                placeholder="6-digit code"
                required
              />
              <small>Expires in 10 minutes.</small>
              <button
                type="submit"
                className="account-verify-button"
                disabled={busy}
              >
                Continue to password
              </button>
            </label>
          )}
          {signup ? (
            <fieldset
              className={`account-password-fields${step !== 'password' ? ' is-locked' : ''}`}
              disabled={step !== 'password' || busy}
              aria-describedby={
                step !== 'password' ? 'account-password-lock-note' : undefined
              }
            >
              <PasswordField
                label="Password"
                name="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={256}
              />
              <PasswordField
                label="Confirm password"
                name="confirmPassword"
                autoComplete="new-password"
                minLength={12}
                maxLength={256}
              />
            </fieldset>
          ) : (
            <>
              <PasswordField
                label="Password"
                name="password"
                autoComplete="current-password"
                minLength={1}
                maxLength={256}
              />
              <a className="account-forgot-password" href="/forgot-password">
                Forgot password?
              </a>
            </>
          )}
          {signup && step !== 'password' && (
            <small
              id="account-password-lock-note"
              className="account-lock-note"
            >
              Verify your email to unlock password setup.
            </small>
          )}
          {signup && step === 'password' && (
            <small className="account-password-hint">
              Use at least 12 characters for your password.
            </small>
          )}
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
          <button
            className={`primary-button${signup && step !== 'password' ? ' is-locked' : ''}`}
            disabled={busy || (signup && step !== 'password')}
          >
            {busy ? 'Please wait…' : signup ? 'Create account' : 'Log in'}
          </button>
          {signup && step !== 'details' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStep('details');
                setVerificationToken('');
                setNotice('');
                setError('');
              }}
            >
              ← Change details / restart
            </button>
          )}
          <p>
            {signup ? 'Already have an account?' : 'New to Sasify?'}{' '}
            <a href={signup ? '/login' : '/signup'}>
              {signup ? 'Log in' : 'Create an account'}
            </a>
          </p>
          {signup && (
            <small>
              By signing up, you agree to our <a href="/terms">Terms</a> and{' '}
              <a href="/privacy">Privacy Policy</a>.
            </small>
          )}
        </form>
      </main>
      <SiteFooter />
    </>
  );
}

export function AccountRecovery({ reset = false }: { reset?: boolean }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [requested, setRequested] = useState(false),
    [complete, setComplete] = useState(false),
    [resetToken, setResetToken] = useState('');
  useEffect(() => {
    if (reset)
      setResetToken(
        new URLSearchParams(window.location.search).get('token') || '',
      );
  }, [reset]);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const fields = new FormData(event.currentTarget);
    const fieldText = (name: string) => {
      const value = fields.get(name);
      return typeof value === 'string' ? value : '';
    };
    try {
      if (!reset) {
        const username = fieldText('username')
          .trim()
          .toLowerCase();
        if (!/^[a-z0-9](?:[a-z0-9._-]{1,22}[a-z0-9])$/.test(username))
          throw new Error('Enter a valid username.');
        const result = await request('account-request-password-reset', {
          username,
        });
        setNotice(result.message);
        setRequested(true);
        return;
      }
      if (!resetToken)
        throw new Error(
          'This reset link is missing or invalid. Request a new link below.',
        );
      const password = fieldText('password'),
        confirmPassword = fieldText('confirmPassword');
      if (password !== confirmPassword)
        throw new Error('Passwords do not match.');
      const result = await request('account-reset-password', {
        token: resetToken,
        password,
        confirmPassword,
      });
      setNotice(result.message);
      setComplete(true);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const hasResetToken = Boolean(resetToken);

  return (
    <>
      <SiteHeader accountMode="recovery" />
      <main className="account-recovery-page">
        <section className="account-card account-recovery-card">
          <span className="account-eyebrow">
            {reset ? 'SECURE ACCOUNT RECOVERY' : 'ACCOUNT RECOVERY'}
          </span>
          <h1>{reset ? 'Choose a new password' : 'Forgot your password?'}</h1>
          <p>
            {reset
              ? 'Set a new password for your Sasify account.'
              : 'Enter your username and we’ll email a one-time reset link to the address saved on your account.'}
          </p>
          {notice && (
            <p className="account-notice" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
          {reset && !hasResetToken ? (
            <a
              className="primary-button account-recovery-button"
              href="/forgot-password"
            >
              Request a new reset link
            </a>
          ) : reset && complete ? (
            <a className="primary-button account-recovery-button" href="/login">
              Go to log in
            </a>
          ) : !reset && requested ? (
            <p className="account-recovery-hint">
              For privacy, this confirmation is the same whether or not the
              username is registered. Check the matching email inbox and spam
              folder.
            </p>
          ) : (
            <form onSubmit={submit}>
              {reset ? (
                <>
                  <PasswordField
                    label="New password"
                    name="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={256}
                  />
                  <PasswordField
                    label="Confirm new password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={256}
                  />
                  <small>Use at least 12 characters.</small>
                </>
              ) : (
                <label>
                  Username
                  <input
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    minLength={3}
                    maxLength={24}
                    pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,22}[A-Za-z0-9]"
                    required
                  />
                </label>
              )}
              <button
                className="primary-button account-recovery-button"
                disabled={busy}
              >
                {busy
                  ? 'Please wait…'
                  : reset
                    ? 'Reset password'
                    : 'Email reset link'}
              </button>
            </form>
          )}
          <p className="account-recovery-back">
            <a href="/login">← Back to log in</a>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

export function CustomerDashboard() {
  const [data, setData] = useState<Dashboard | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('overview'),
    [deposit, setDeposit] = useState<Deposit | null>(null),
    [receiver, setReceiver] = useState<{
      number: string;
      title: string;
    } | null>(null);
  const [depositAmount, setDepositAmount] = useState('1000');
  const [depositMethod, setDepositMethod] = useState('bank');
  const [checkingDeposits, setCheckingDeposits] = useState(false);
  const [requirementContacts, setRequirementContacts] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<any>(null);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  async function refresh() {
    setData(await request('account-dashboard'));
  }
  useEffect(() => {
    refresh().catch((e) => {
      if (e.status === 401) window.location.replace('/login');
      else setError(e.message);
    });
  }, []);
  const hasOpenDeposits = Boolean(
    data?.deposits.some((item) => ['pending', 'review'].includes(item.status)),
  );
  useEffect(() => {
    if (!hasOpenDeposits) {
      setCheckingDeposits(false);
      return;
    }
    let active = true;
    const checkDeposits = async () => {
      if (document.visibilityState !== 'visible') return;
      setCheckingDeposits(true);
      try {
        const latest = await request('account-dashboard');
        if (active) setData(latest);
      } catch {
        // The next automatic check will retry without interrupting the user.
      } finally {
        if (active) setCheckingDeposits(false);
      }
    };
    void checkDeposits();
    const timer = window.setInterval(() => void checkDeposits(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [hasOpenDeposits]);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function addFunds(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      const result = await request('account-deposit', {
        amount: Number(depositAmount),
        method: depositMethod,
      });
      setDeposit(result.deposit);
      setReceiver(result.receiver);
      if (result.reused)
        setNotice(
          'You already have this top-up open. Reusing its payment instructions and five-minute timer.',
        );
    });
  }
  function cancelDepositRequest(depositId: string) {
    if (!window.confirm('Cancel this deposit request? Any payment sent after cancellation will not be matched to it.')) return;
    void run(async () => {
      await request('account-deposit-cancel', { id: depositId });
      if (deposit?.id === depositId) {
        setDeposit(null);
        setReceiver(null);
      }
      setNotice('Deposit request cancelled.');
    });
  }
  async function applyForReseller() {
    await run(async () => {
      const result = await request('account-apply-reseller', {});
      setNotice(result.message);
    });
  }
  async function respondToRequirement(requirementId: string) {
    await run(async () => {
      const contactNumber = requirementContacts[requirementId]?.trim() || '';
      const result = await request('reseller-requirement-respond', { requirementId, contactNumber });
      setNotice(result.message);
      setRequirementContacts((current) => ({ ...current, [requirementId]: '' }));
    });
  }
  return (
    <main className="account-dashboard account-dashboard-clean">
        <div className="customer-dashboard-layout">
          <aside className="customer-dashboard-sidebar">
            <div className="dashboard-user-card">
              <span className="dashboard-avatar" aria-hidden="true">
                {data?.account.name.slice(0, 1).toUpperCase() || 'S'}
              </span>
              <span className="dashboard-user-copy">
                <strong>{data?.account.name || 'Your account'}</strong>
                <small>
                  {data?.account.role === 'reseller' ? 'Reseller' : 'Customer'}
                </small>
              </span>
            </div>
            <nav className="account-tabs" aria-label="Account sections">
              {[
                { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
                { id: 'orders', label: 'My orders', Icon: ShoppingBag },
                { id: 'wallet', label: 'Wallet & deposits', Icon: CircleDollarSign },
                { id: 'profile', label: 'Profile', Icon: ShieldCheck },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  aria-current={tab === id ? 'page' : undefined}
                  onClick={() => {
                    setTab(id);
                    setDetail(null);
                  }}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
              {data?.account.role === 'reseller' && data.account.reseller_status === 'approved' && (
                <button aria-current={tab === 'requirements' ? 'page' : undefined} onClick={() => { setTab('requirements'); setDetail(null); }}>
                  <ClipboardList size={18} />
                  <span>Required by Sasify</span>
                </button>
              )}
            </nav>
            <a className="dashboard-sidebar-help" href="mailto:Support@SasifySolutions.com">
              Need help? <span>Contact support</span>
            </a>
          </aside>
          <div className="customer-dashboard-main">
            <header className="dashboard-topbar">
              <div>
                <span className="account-eyebrow">
                  {data?.account.role === 'reseller'
                    ? 'RESELLER WORKSPACE'
                    : 'YOUR SASIFY WORKSPACE'}
                </span>
                <h1>
                  {data
                    ? `Welcome back, ${data.account.name.split(' ')[0]}`
                    : 'Your dashboard'}
                </h1>
                <p>Track your orders, wallet and account details.</p>
              </div>
              <div className="dashboard-topbar-actions">
                <a className="dashboard-browse-link" href="/inventory">
                  Browse products <ArrowRight size={16} />
                </a>
                <button
                  className="account-secondary dashboard-logout"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await request('account-logout', {});
                      window.location.assign('/login');
                    })
                  }
                >
                  Log out
                </button>
              </div>
            </header>
            {error && (
              <p className="account-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="account-notice" role="status">
                {notice}
              </p>
            )}
            {!data && !error && <p role="status">Loading your dashboard…</p>}
            {data && (
              <>
                <section className="dashboard-wallet-hero">
                  <div>
                    <span className="dashboard-hero-label">
                      <CircleDollarSign size={17} /> WALLET BALANCE
                    </span>
                    <h2>{money(data.account.balance)}</h2>
                    <p>Pay from your wallet and get 5% off every purchase.</p>
                    <div className="dashboard-wallet-actions">
                      <button onClick={() => setTab('wallet')}>
                        <ArrowDownToLine size={16} /> Add funds
                      </button>
                      {data.account.role === 'reseller' && data.account.reseller_status === 'approved' ? (
                        <button className="dashboard-requirements-button" onClick={() => setTab('requirements')}>
                          <ClipboardList size={16} /> Sasify Requirements
                          {data.requirements.filter((item) => item.status === 'open').length > 0 && <span className="dashboard-requirements-count">{data.requirements.filter((item) => item.status === 'open').length}</span>}
                        </button>
                      ) : data.account.reseller_status === 'pending' ? (
                        <button className="dashboard-reseller-apply-button" disabled><ShieldCheck size={16} /> Application pending</button>
                      ) : (
                        <button className="dashboard-reseller-apply-button" onClick={() => void applyForReseller()} disabled={busy}><ShieldCheck size={16} /> Apply as a reseller</button>
                      )}
                    </div>
                  </div>
                  <div className="dashboard-hero-mark" aria-hidden="true">
                    <WalletCards size={74} strokeWidth={1.2} />
                    <BadgePercent size={29} />
                  </div>
                </section>
                <div className="dashboard-metrics">
                  <section>
                    <span className="dashboard-metric-icon"><ShoppingBag size={18} /></span>
                    <small>Total orders</small>
                    <strong>{data.orders.length}</strong>
                    <span>Purchases on this account</span>
                  </section>
                  <section>
                    <span className="dashboard-metric-icon is-green"><PackageCheck size={18} /></span>
                    <small>Delivered</small>
                    <strong>{data.orders.filter((o) => o.status === 'delivered').length}</strong>
                    <span>Ready in your order history</span>
                  </section>
                  <section>
                    <span className="dashboard-metric-icon is-amber"><RefreshCw size={18} /></span>
                    <small>In progress</small>
                    <strong>{data.orders.filter((o) => !['delivered', 'cancelled', 'expired'].includes(o.status)).length}</strong>
                    <span>Awaiting payment or delivery</span>
                  </section>
                  <section>
                    <span className="dashboard-metric-icon is-purple"><BadgePercent size={18} /></span>
                    <small>Your savings</small>
                    <strong>{money(data.orders.reduce((total, order) => total + Number(order.savings || 0), 0))}</strong>
                    <span>Discounts you received</span>
                  </section>
                </div>
                {tab === 'overview' && (
                  <div className="dashboard-overview-grid">
                    <section className="dashboard-panel dashboard-recent-panel">
                      <div className="dashboard-panel-heading">
                        <div><span>YOUR ACTIVITY</span><h2>Recent orders</h2></div>
                        <button onClick={() => setTab('orders')}>View all <ArrowRight size={15} /></button>
                      </div>
                      {!data.orders.length ? (
                        <div className="account-empty dashboard-empty">
                          <span className="dashboard-empty-icon"><ShoppingBag size={23} /></span>
                          <h3>Your first order starts here</h3>
                          <p>Explore the catalog and your purchases will show up in this dashboard.</p>
                          <a className="primary-button" href="/inventory">Explore products</a>
                        </div>
                      ) : (
                        data.orders.slice(0, 4).map((order) => (
                          <article className="account-order dashboard-order" key={order.id}>
                            <span className="dashboard-order-icon"><PackageCheck size={18} /></span>
                            <div>
                              <strong>{order.product}</strong>
                              <small>{new Date(order.created_at).toLocaleDateString()} · {order.id.slice(0, 8)}</small>
                            </div>
                            <span className="dashboard-order-amount">{money(order.amount)}</span>
                            <span className={`account-status status-${order.status}`}>{order.status === 'pending' ? 'Awaiting payment' : order.status}</span>
                            <button aria-label={`View ${order.product}`} onClick={() => setTab('orders')}>View</button>
                          </article>
                        ))
                      )}
                    </section>
                    <section className="dashboard-panel dashboard-quick-panel">
                      <span>QUICK ACCESS</span>
                      <h2>What would you like to do?</h2>
                      <button onClick={() => setTab('wallet')}><CircleDollarSign size={19} /><span><strong>Manage wallet</strong><small>Add funds and review deposits</small></span><ArrowRight size={17} /></button>
                      <button onClick={() => setTab('profile')}><ShieldCheck size={19} /><span><strong>Account details</strong><small>Review your profile and status</small></span><ArrowRight size={17} /></button>
                      <a href="/inventory"><ShoppingBag size={19} /><span><strong>Shop inventory</strong><small>Find your next digital tool</small></span><ArrowRight size={17} /></a>
                    </section>
                    {data.account.role === 'reseller' && data.account.reseller_status === 'approved' && (
                      <section className="dashboard-panel dashboard-requirements-preview">
                        <div className="dashboard-panel-heading"><div><span>OPPORTUNITIES</span><h2>Required by Sasify</h2></div><button onClick={() => setTab('requirements')}>View all <ArrowRight size={15} /></button></div>
                        {!data.requirements.filter((item) => item.status === 'open').length ? <div className="dashboard-requirements-empty"><ClipboardList size={22} /><span>No open requirements right now.</span></div> : data.requirements.filter((item) => item.status === 'open').slice(0, 3).map((requirement) => <button className="dashboard-requirement-row" key={requirement.id} onClick={() => setTab('requirements')}><span className="dashboard-requirement-icon"><ClipboardList size={17} /></span><span><strong>{requirement.tool_name}</strong><small>{requirement.description}</small></span><ArrowRight size={16} /></button>)}
                      </section>
                    )}
                  </div>
                )}
            {tab === 'orders' && (
              <section className="account-card">
                <div className="account-heading">
                  <h2>My orders</h2>
                  <button disabled={busy} onClick={() => run(refresh)}>
                    Refresh
                  </button>
                </div>
                <p>
                  Orders placed while logged in appear here. Guest and Telegram
                  purchases are not linked automatically.
                </p>
                {!data.orders.length ? (
                  <div className="account-empty">
                    <h3>Your next favourite tool starts here.</h3>
                    <p>You have not placed an order with this account yet.</p>
                    <a className="primary-button" href="/inventory">
                      Explore products
                    </a>
                  </div>
                ) : (
                  data.orders.map((order) => (
                    <article className="account-order" key={order.id}>
                      <div>
                        <strong>{order.product}</strong>
                        <small>
                          {new Date(order.created_at).toLocaleString()} ·{' '}
                          {order.id.slice(0, 8)}
                        </small>
                      </div>
                      <span>{money(order.amount)}</span>
                      <span className="account-status">
                        {order.status === 'pending'
                          ? 'Awaiting payment'
                          : order.status}
                      </span>
                      <button
                        disabled={busy}
                        onClick={() =>
                          run(async () =>
                            setDetail(
                              await request('status', undefined, order.id),
                            ),
                          )
                        }
                      >
                        {order.status === 'delivered'
                          ? 'View credentials'
                          : 'View order'}
                      </button>
                    </article>
                  ))
                )}
                {detail && (
                  <section className="account-detail">
                    <button onClick={() => setDetail(null)}>
                      ← Back to orders
                    </button>
                    <h3>{detail.product}</h3>
                    <p>
                      {money(detail.amount)} ·{' '}
                      {detail.status === 'pending'
                        ? 'Awaiting payment'
                        : detail.status}
                    </p>
                    {detail.credentials && (
                      <dl>
                        {Object.entries(detail.credentials).map(
                          ([name, value]) => (
                            <div key={name}>
                              <dt>{name}</dt>
                              <dd>{String(value)}</dd>
                            </div>
                          ),
                        )}
                      </dl>
                    )}
                    {detail.delivery && (
                      <pre>
                        {typeof detail.delivery === 'string'
                          ? detail.delivery
                          : [
                              detail.delivery.content,
                              detail.delivery.instructions,
                            ]
                              .filter(Boolean)
                              .join('\n\n')}
                      </pre>
                    )}
                    {detail.status === 'pending' && !detail.transactionId && (
                      <>
                        <button
                          className="primary-button"
                          disabled={
                            busy || data.account.balance < detail.amount
                          }
                          onClick={() =>
                            run(async () => {
                              const result = await request(
                                'account-wallet-pay',
                                { id: detail.id },
                              );
                              setNotice(
                                result.error || 'Order paid with your wallet.',
                              );
                              setDetail(
                                await request('status', undefined, detail.id),
                              );
                            })
                          }
                        >
                          Pay {money(detail.amount)} from wallet
                        </button>
                        {data.account.balance < detail.amount && (
                          <p>Add funds to your wallet to pay this order.</p>
                        )}
                      </>
                    )}
                  </section>
                )}
              </section>
            )}
            {tab === 'wallet' && (
              <div className="account-wallet-grid">
                <section className="account-card wallet-funding-card">
                  <div className="wallet-funding-header">
                    <div>
                      <span className="wallet-funding-kicker"><CircleDollarSign size={15} /> WALLET TOP-UP</span>
                      <h2>Add funds</h2>
                      <p>Add balance securely and use your Sasify Wallet for instant checkout discounts.</p>
                    </div>
                    <div className="wallet-balance-pill">
                      <small>Available now</small>
                      <strong>{money(data.account.balance)}</strong>
                    </div>
                  </div>
                  <div className="wallet-funding-steps" aria-label="Add funds steps">
                    <span><b>1</b> Choose amount</span>
                    <span><b>2</b> Send payment</span>
                    <span><b>3</b> Auto-verified</span>
                  </div>
                  <form onSubmit={addFunds}>
                    <label>
                      Amount (PKR)
                      <input
                        name="amount"
                        type="number"
                        min={100}
                        max={1000000}
                        step={1}
                        value={depositAmount}
                        onChange={(event) => setDepositAmount(event.target.value)}
                        required
                      />
                    </label>
                    <div className="wallet-amount-presets" aria-label="Suggested amounts">
                      {[1000, 2500, 5000, 10000].map((amount) => (
                        <button type="button" key={amount} className={depositAmount === String(amount) ? 'selected' : ''} onClick={() => setDepositAmount(String(amount))}>
                          PKR {amount.toLocaleString()}
                        </button>
                      ))}
                    </div>
                    <label>
                      Payment method
                      <select name="method" value={depositMethod} onChange={(event) => setDepositMethod(event.target.value)}>
                        <option value="bank">Bank transfer / NayaPay</option>
                        <option value="binance">Binance Pay</option>
                        <option value="crypto">
                          Crypto USDT · BEP20 · minimum USDT 6
                        </option>
                      </select>
                    </label>
                    <button className="primary-button wallet-funding-submit" disabled={busy}>
                      {busy ? 'Preparing instructions…' : 'Continue to payment'} <ArrowRight size={17} />
                    </button>
                  </form>
                  <div className="wallet-auto-verify" role="status">
                    <span className={`wallet-auto-verify-icon${checkingDeposits ? ' is-checking' : ''}`}><RefreshCw size={16} /></span>
                    <div>
                      <strong>{checkingDeposits ? 'Checking for your payment…' : 'Auto-verification is active'}</strong>
                      <small>No reference or screenshot needed. We check every 5 seconds and update your balance automatically after a verified payment.</small>
                    </div>
                  </div>
                  {deposit && receiver && (
                    <div className="account-detail wallet-payment-instructions">
                      <div className="wallet-instructions-heading">
                        <div>
                          <span className="wallet-funding-kicker">PAYMENT INSTRUCTIONS</span>
                          <h3>Send the exact amount</h3>
                        </div>
                        <span className="account-deposit-status">Waiting</span>
                      </div>
                      <div className="wallet-transfer-amount">
                        <strong>
                          {deposit.method === 'crypto'
                            ? (Number(deposit.payment_amount) + 0.01).toFixed(2)
                            : Number(deposit.payment_amount).toFixed(
                                deposit.currency === 'USDT' ? 2 : 0,
                              )}
                        </strong>
                        <span>{deposit.currency}</span>
                      </div>
                      <div className="wallet-receiver-row">
                        <div><small>Send to</small><strong>{receiver.title}</strong></div>
                        <code>{receiver.number}</code>
                      </div>
                      {deposit.method === 'crypto' && (
                        <p className="wallet-instructions-note">
                          BEP20 only. Your deposit must arrive as{' '}
                          {Number(deposit.payment_amount).toFixed(2)} USDT net.
                          Confirm your sending platform&apos;s fee before
                          transferring.
                        </p>
                      )}
                      <p className="wallet-credit-note"><ShieldCheck size={15} /> Wallet credit: {money(deposit.amount)} · expires in 5 minutes</p>
                    </div>
                  )}
                </section>
                <section className="account-card">
                  <h2>Deposit history</h2>
                  {!data.deposits.length && <p>No deposits yet.</p>}
                  {data.deposits.map((item) => (
                    <div className="account-deposit" key={item.id}>
                      <div className="account-deposit-heading">
                        <div>
                          <strong>{money(item.amount)}</strong>
                          <small>
                            {item.method} ·{' '}
                            {new Date(item.created_at).toLocaleString()}
                          </small>
                        </div>
                        <span className={`account-deposit-status status-${item.status === 'pending' && Date.parse(item.expires_at) <= clock ? 'expired' : item.status}`}>
                          {item.status === 'credited'
                            ? 'Added to wallet'
                            : item.status === 'review'
                              ? 'Needs review'
                              : item.status === 'cancelled'
                                ? 'Request cancelled'
                              : item.status === 'expired' || Date.parse(item.expires_at) <= clock
                                ? 'Request expired'
                                : 'Waiting for payment'}
                        </span>
                      </div>
                      {item.status === 'pending' && Date.parse(item.expires_at) > clock && (
                        <p>
                          Expires in {Math.floor((Date.parse(item.expires_at) - clock) / 60000)}:{String(Math.floor(((Date.parse(item.expires_at) - clock) % 60000) / 1000)).padStart(2, '0')}. A verified payment received before expiry will be credited automatically.
                        </p>
                      )}
                      {(item.status === 'expired' || (item.status === 'pending' && Date.parse(item.expires_at) <= clock)) && (
                        <p>This request expired after five minutes. Start a new top-up to get fresh payment instructions.</p>
                      )}
                      {item.status === 'review' && (
                        <p>
                          Please contact support and share the deposit date and
                          amount so we can check it safely.
                        </p>
                      )}
                      {['pending', 'review'].includes(item.status) && Date.parse(item.expires_at) > clock && (
                        <div className="account-deposit-actions">
                          <button className="account-deposit-cancel" disabled={busy} onClick={() => cancelDepositRequest(item.id)}>Cancel request</button>
                        </div>
                      )}
                    </div>
                  ))}
                </section>
                <section className="account-card">
                  <h2>Wallet activity</h2>
                  {!data.ledger.length && (
                    <p>
                      Your verified deposits and wallet purchases will appear
                      here.
                    </p>
                  )}
                  {data.ledger.map((entry, i) => (
                    <div className="account-order" key={i}>
                      <div>
                        {entry.description}
                        <small>
                          {new Date(entry.created_at).toLocaleString()}
                        </small>
                      </div>
                      <strong>
                        {entry.amount > 0 ? '+' : ''}
                        {money(entry.amount)}
                      </strong>
                    </div>
                  ))}
                </section>
              </div>
            )}
            {tab === 'profile' && (
              <div className="account-profile-grid">
                <section className="account-card">
                  <h2>Account details</h2>
                  <dl>
                    <dt>Name</dt>
                    <dd>{data.account.name}</dd>
                    {data.account.username && (
                      <>
                        <dt>Username</dt>
                        <dd>@{data.account.username}</dd>
                      </>
                    )}
                    <dt>Email</dt>
                    <dd>{data.account.email}</dd>
                    <dt>Account type</dt>
                    <dd>
                      {data.account.role === 'reseller'
                        ? 'Reseller'
                        : 'Customer'}
                    </dd>
                  </dl>
                  <p>
                    Need help with your account?{' '}
                    <a href="mailto:Support@SasifySolutions.com">
                      Contact support
                    </a>
                    .
                  </p>
                </section>
                <section className="account-card account-reseller-card">
                  <span className="account-reseller-kicker">
                    GROW WITH SASIFY
                  </span>
                  <h2>
                    {data.account.role === 'reseller'
                      ? 'Reseller account'
                      : 'Become a reseller'}
                  </h2>
                  {data.account.role === 'reseller' &&
                  data.account.reseller_status === 'approved' ? (
                    <p>
                      Your reseller access is approved. You can now work with
                      Sasify as a reseller.
                    </p>
                  ) : data.account.reseller_status === 'pending' ? (
                    <p>
                      Your application is with our admin team. You can continue
                      using your customer account while it is reviewed.
                    </p>
                  ) : (
                    <>
                      <p>
                        Apply from your customer dashboard and unlock reseller
                        access after admin approval.
                      </p>
                      <button
                        className="account-reseller-apply"
                        disabled={busy}
                        onClick={applyForReseller}
                      >
                        Apply as reseller <span>→</span>
                      </button>
                    </>
                  )}
                  {data.account.reseller_status === 'rejected' && (
                    <small>You can apply again whenever you are ready.</small>
                  )}
                </section>
              </div>
            )}
            {tab === 'requirements' && data.account.role === 'reseller' && data.account.reseller_status === 'approved' && (
              <section className="account-card reseller-requirements-panel">
                <div className="dashboard-panel-heading"><div><span>GROW WITH SASIFY</span><h2>Required by Sasify</h2></div><span>{data.requirements.filter((item) => item.status === 'open').length} open</span></div>
                <p>Sasify posts tools and services needed by our customers and reseller network. If you can provide one, share your contact number and we will contact you about pricing and availability.</p>
                {!data.requirements.length ? <div className="account-empty"><h3>No open requirements</h3><p>New opportunities will appear here when Sasify needs a tool.</p></div> : <div className="reseller-requirement-list">{data.requirements.map((requirement) => <article className="reseller-requirement-card" key={requirement.id}><span className={`account-status status-${requirement.status}`}>{requirement.status}</span><h3>{requirement.tool_name}</h3><p>{requirement.description}</p>{requirement.response_contact ? <div className="reseller-requirement-responded"><Phone size={16} /> You responded with {requirement.response_contact}</div> : requirement.status === 'open' && <div className="reseller-requirement-action"><input type="tel" value={requirementContacts[requirement.id] || ''} onChange={(event) => setRequirementContacts((current) => ({ ...current, [requirement.id]: event.target.value }))} placeholder="Your contact number" /><button className="primary-button" disabled={busy || !requirementContacts[requirement.id]?.trim()} onClick={() => void respondToRequirement(requirement.id)}>I Can Provide This</button></div>}</article>)}</div>}
              </section>
            )}
          </>
        )}
          </div>
        </div>
    </main>
  );
}

export function CheckoutAccount({
  orderId,
  onWalletBalanceChange,
  onInsufficientWallet,
  onPaid,
}: {
  orderId: string;
  onWalletBalanceChange?: (balance: number) => void;
  onInsufficientWallet?: () => void;
  onPaid: () => void;
}) {
  const [account, setAccount] = useState<Account | null>(null),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    request('account-dashboard')
      .then((data) => setAccount(data.account))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);
  if (!loaded) return null;
  if (!account)
    return (
      <div className="guest-checkout-prompt">
        <div>
          <strong>Sign up now and save 5% on every order*</strong>
          <span>Use your Sasify Wallet for faster checkout and member savings.</span>
        </div>
        <a href="/signup" className="primary-button compact">Create account</a>
        <small>*Wallet discount applies to eligible orders.</small>
      </div>
    );
  return (
    <div className="account-checkout">
      <a className="account-checkout-dashboard" href="/dashboard">
        <span className="account-checkout-eyebrow">Signed in</span>
        <strong>My dashboard</strong>
        <small>View orders and account details</small>
      </a>
      <span className="account-checkout-wallet">
        <small>Wallet balance</small>
        <strong>{money(account.balance)}</strong>
      </span>
      {orderId && (
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              const result = await request('account-wallet-pay', {
                id: orderId,
              });
              if (result.error) throw new Error(result.error);
              const balance = Number(result.balance);
              if (Number.isFinite(balance)) {
                setAccount((current) => current ? { ...current, balance } : current);
                onWalletBalanceChange?.(balance);
              }
              onPaid();
            } catch (e) {
              const message = (e as Error).message;
              if (/insufficient wallet balance/i.test(message)) {
                onInsufficientWallet?.();
                setError('Insufficient wallet balance. Add funds first.');
              } else {
                setError(message);
              }
            } finally {
              setBusy(false);
            }
          }}
        >
          Pay from Sasify Wallet · 5% off
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
