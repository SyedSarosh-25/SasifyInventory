'use client';
import { LocalizedContent } from './language';


import { Check, Clipboard, Eye, EyeOff, KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { generateTotp, totpRemainingSeconds } from '../totp-utils';

export function TotpGenerator() {
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(30);
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const generate = useCallback(async () => {
    if (!secret.trim()) {
      setError('Paste your 2FA setup key before generating a code.');
      setCode('');
      return;
    }
    setBusy(true);
    setCopied(false);
    try {
      setCode(await generateTotp(secret));
      setRemaining(totpRemainingSeconds());
      setError('');
    } catch (generationError) {
      setCode('');
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'We could not read that 2FA setup key.',
      );
    } finally {
      setBusy(false);
    }
  }, [secret]);

  useEffect(() => {
    if (!code) return undefined;
    const timer = window.setInterval(() => {
      const nextRemaining = totpRemainingSeconds();
      setRemaining(nextRemaining);
      if (nextRemaining === 30) void generate();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [code, generate]);

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Copy was blocked by the browser. Select the code and copy it manually.');
    }
  };

  const clear = () => {
    setSecret('');
    setCode('');
    setError('');
    setCopied(false);
    setShowSecret(false);
    setRemaining(30);
  };

  return (
    <LocalizedContent><section className="totp-generator" aria-labelledby="totp-generator-title">
      <div className="totp-generator-heading">
        <span className="totp-generator-icon" aria-hidden="true"><KeyRound /></span>
        <div>
          <span className="section-kicker"><ShieldCheck size={15} /> Private browser tool</span>
          <h2 id="totp-generator-title">Get your 6-digit OTP</h2>
          <p>Paste the 2FA setup key supplied with your digital account to generate the current 30-second code.</p>
        </div>
      </div>

      <div className="totp-security-note" role="note">
        <strong>Your setup key stays on this device.</strong>
        <span>It is processed in your browser only. We do not send, save or log it. Never paste bank, wallet or SMS verification secrets here.</span>
      </div>

      <label className="totp-secret-label" htmlFor="totp-secret">
        2FA setup key
        <span className="totp-secret-input-wrap">
          <input
            id="totp-secret"
            type={showSecret ? 'text' : 'password'}
            value={secret}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Paste the key, for example JBSW Y3DP EH..."
            onChange={(event) => {
              setSecret(event.target.value);
              setCode('');
              setError('');
              setCopied(false);
            }}
          />
          <button
            type="button"
            className="totp-icon-button"
            aria-label={showSecret ? 'Hide setup key' : 'Show setup key'}
            title={showSecret ? 'Hide setup key' : 'Show setup key'}
            onClick={() => setShowSecret((visible) => !visible)}
          >
            {showSecret ? <EyeOff /> : <Eye />}
          </button>
        </span>
      </label>

      <div className="totp-actions">
        <button type="button" className="primary-button" onClick={() => void generate()} disabled={busy || !secret.trim()}>
          <KeyRound size={18} /> {busy ? 'Generating...' : 'Get OTP'}
        </button>
        <button type="button" className="secondary-button" onClick={clear} disabled={!secret && !code}>
          <Trash2 size={17} /> Clear
        </button>
      </div>

      {error && <p className="totp-error" role="alert">{error}</p>}

      {code && !error && (
        <div className="totp-result" aria-live="polite">
          <div>
            <span className="totp-result-label">Your current OTP</span>
            <strong>{code}</strong>
            <span className="totp-countdown">Refreshes in {remaining}s</span>
          </div>
          <button type="button" className="secondary-button" onClick={() => void copyCode()}>
            {copied ? <Check size={17} /> : <Clipboard size={17} />}
            {copied ? 'Copied' : 'Copy code'}
          </button>
        </div>
      )}

      <ol className="totp-steps">
        <li>Open the account’s delivery message and copy the 2FA setup key.</li>
        <li>Paste the key above and select <strong>Get OTP</strong>.</li>
        <li>Enter the six-digit code in the account login before the timer ends.</li>
      </ol>
    </section></LocalizedContent>
  );
}
