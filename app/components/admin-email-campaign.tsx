'use client';

import { Mail, Send, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';

export type CampaignAccount = {
  email: string;
  email_verified_at: string | null;
};

export type EmailCampaignPayload = {
  audience: 'all' | 'verified';
  subject: string;
  text: string;
};

const WALLET_SAVINGS_SUBJECT =
  'Sasify Wallet — 5% off every purchase';
const WALLET_SAVINGS_BODY = `Assalam-o-alaikum,

Save 5% on every purchase when you pay with your Sasify Wallet.

Your wallet discount is applied automatically at checkout.

How to use it:
1. Log in to your Sasify account and open Dashboard → Wallet & deposits.
2. Add funds to your Sasify Wallet. Your balance updates after the payment is verified.
3. Choose any eligible product and continue to checkout.
4. Select Sasify Wallet. The 5% discount is applied automatically.
5. Keep the order screen open. After wallet payment, delivery continues automatically where available.

Keep your credentials private and contact Sasify support if you need help.

Regards,
Sasify Solutions`;

export function AdminEmailCampaign({
  accounts,
  busy,
  onSend,
}: {
  accounts: CampaignAccount[];
  busy: boolean;
  onSend: (payload: EmailCampaignPayload) => Promise<void>;
}) {
  const [audience, setAudience] = useState<'all' | 'verified'>('all');
  const [subject, setSubject] = useState(WALLET_SAVINGS_SUBJECT);
  const [text, setText] = useState(WALLET_SAVINGS_BODY);
  const totalRecipients = accounts.filter((account) => account.email?.trim()).length;
  const verifiedRecipients = accounts.filter(
    (account) => account.email?.trim() && account.email_verified_at,
  ).length;
  const recipientCount = audience === 'verified' ? verifiedRecipients : totalRecipients;

  async function submit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!subject.trim() || !text.trim() || !recipientCount) return;
    const audienceLabel = audience === 'verified' ? 'verified accounts' : 'all registered accounts';
    if (!window.confirm(`Send this email to ${recipientCount} ${audienceLabel}?`)) return;
    await onSend({ audience, subject: subject.trim(), text: text.trim() });
  }

  return (
    <div className="admin-workspace admin-email-campaign-workspace">
      <section className="admin-panel admin-email-campaign-intro">
        <div className="admin-enhancement-heading">
          <div>
            <span className="admin-eyebrow"><Mail size={14} /> Customer communication</span>
            <h2>Email campaigns</h2>
            <p>Send a single BCC campaign to registered Sasify users without exposing their email addresses to one another.</p>
          </div>
          <span className="admin-count-badge"><Users size={14} /> {recipientCount} recipients</span>
        </div>
        <div className="admin-email-campaign-safety">
          <ShieldCheck size={18} />
          <span>Only admins can send campaigns. The server batches recipients privately and records the campaign in the audit log.</span>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-enhancement-heading">
          <div>
            <span className="admin-eyebrow">Ready to send</span>
            <h2>Wallet savings announcement</h2>
            <p>Edit the message below, preview it, then send it to the selected audience.</p>
          </div>
        </div>
        <form className="admin-email-campaign-form" onSubmit={(event) => void submit(event)}>
          <label>
            Audience
            <select value={audience} onChange={(event) => setAudience(event.target.value as 'all' | 'verified')}>
              <option value="all">All registered emails · {totalRecipients}</option>
              <option value="verified">Verified emails only · {verifiedRecipients}</option>
            </select>
          </label>
          <label>
            Subject
            <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={180} required />
          </label>
          <label className="admin-span">
            Email message
            <textarea value={text} onChange={(event) => setText(event.target.value)} rows={18} maxLength={20000} required />
          </label>
          <div className="admin-email-campaign-actions admin-span">
            <span>{recipientCount} recipient{recipientCount === 1 ? '' : 's'} will receive this email via BCC.</span>
            <button className="primary-button" type="submit" disabled={busy || !recipientCount || !subject.trim() || !text.trim()}>
              <Send size={16} /> {busy ? 'Sending campaign…' : 'Send to registered users'}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-panel admin-email-campaign-preview">
        <div className="admin-enhancement-heading">
          <div>
            <span className="admin-eyebrow">Preview</span>
            <h2>{subject || 'Email subject'}</h2>
          </div>
        </div>
        <pre>{text || 'Start typing to preview the campaign message.'}</pre>
      </section>
    </div>
  );
}
