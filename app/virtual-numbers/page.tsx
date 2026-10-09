import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';
import { SiteFooter, SiteHeader } from '../components/site-chrome';
import { StructuredData } from '../components/structured-data';
import { VirtualNumbers } from '../components/virtual-numbers';
import { breadcrumbData, faqData } from '../seo';
import { siteOrigin } from '../site-config';
import { shareImage, shareImageUrl } from '../share-metadata';

const title = 'Virtual Phone Numbers & One-Time SMS OTP Verification | Sasify Solutions';
const description =
  'Rent instant virtual phone numbers for one-time SMS OTP verification on WhatsApp, Telegram, Claude, ChatGPT, Google, and Discord in Pakistan. Disposable single-use activation with full auto-refund guarantee.';
const path = '/virtual-numbers';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${siteOrigin}${path}` },
  openGraph: { title, description, url: `${siteOrigin}${path}`, images: shareImage(title) },
  twitter: { card: 'summary_large_image', title, description, images: [shareImageUrl] },
};

const questions = [
  {
    question: 'How do virtual phone numbers for SMS OTP work?',
    answer:
      'When you select a platform (such as WhatsApp, Telegram, Claude, or ChatGPT) and country, Sasify automatically reserves a dedicated temporary virtual phone number. Enter this number into your app. When the verification SMS is sent, our automated system captures and displays your one-time code on screen within seconds.',
  },
  {
    question: 'Are these numbers permanent or reusable?',
    answer:
      'No. Sasify virtual numbers are strictly disposable, single-use phone lines for one-time OTP verification only. Once your verification code is delivered or your 15-minute session ends, the number is permanently decommissioned and cannot be reused, renewed, or accessed again.',
  },
  {
    question: 'Can I use this number for ongoing 2FA or future logins?',
    answer:
      'No. These numbers are strictly for initial one-time account activation. We strongly advise adding an authenticator app (such as Google Authenticator) or an email recovery option inside your account settings immediately after verifying so you never lose account access.',
  },
  {
    question: 'What happens if the SMS verification code does not arrive?',
    answer:
      'You are completely protected by our 100% money-back guarantee. If no SMS verification code arrives within 15 minutes, or if you cancel the active number, the entire amount is automatically refunded back to your Sasify Wallet balance immediately.',
  },
  {
    question: 'Can I use Sasify Wallet to pay for virtual numbers?',
    answer:
      'Yes! Virtual numbers are fully integrated with your Sasify Wallet for instant 1-click activation. You can top up your wallet anytime via NayaPay, Meezan Bank, Binance Pay, or Crypto USDT.',
  },
  {
    question: 'Which services and apps are supported?',
    answer:
      'We support over 100+ global platforms including WhatsApp, Telegram, OpenAI / ChatGPT, Claude (Anthropic), Google / Gmail, Discord, Microsoft, TikTok, Twitter / X, Netflix, and Apple ID across dozens of international countries.',
  },
];

export default function VirtualNumbersPage() {
  return (
    <main>
      <SiteHeader />
      <StructuredData
        data={breadcrumbData([
          { name: 'Home', path: '/' },
          { name: 'Virtual Numbers', path },
        ])}
      />
      <StructuredData data={faqData(path, questions)} />
      <article className="detail-shell virtual-numbers-page">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Virtual Numbers (SMS OTP)</span>
        </nav>
        <div className="otp-page-intro">
          <span className="section-kicker">Disposable Single-Use Verification</span>
          <h1>Virtual Phone Numbers (One-Time SMS OTP)</h1>
          <p>
            Rent private, disposable international virtual numbers strictly for one-time SMS verification on WhatsApp, Telegram, Claude, ChatGPT, Google, and other global services with automated delivery and auto-refund protection.
          </p>
        </div>

        <VirtualNumbers />

        <section className="description-section otp-help-section">
          <h2>How Sasify Virtual Numbers Work</h2>
          <p>
            Sasify provides direct, high-deliverability virtual phone lines sourced from verified international telecom providers. Every line is private and disposable, ensuring your personal mobile number remains secure and unexposed.
          </p>
          <p>
            Orders are monitored in real time. As soon as the upstream carrier receives your SMS message, the verification code is extracted and presented to you with a copy button. If no code is received before the timer expires, the line is released and your wallet is immediately credited.
          </p>

          <div className="vn-disclaimer-card">
            <div className="vn-disclaimer-header">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <h3>Strictly One-Time OTP Verification (Disposable Numbers)</h3>
            </div>
            <p className="vn-disclaimer-lead">
              Sasify virtual numbers are <strong>single-use disposable lines</strong> created specifically for initial account signups and one-time verification codes. Please note the following operational guidelines:
            </p>
            <ul className="vn-disclaimer-list">
              <li>
                <strong>One-Time Activation Only:</strong> Each rented number is dedicated to receiving a single SMS verification code during an active 15-minute window. Once the code is received or the session ends, the number is permanently decommissioned.
              </li>
              <li>
                <strong>Not for Long-Term Reuse:</strong> You cannot retain, renew, or re-request the same number in the future. It cannot be used to receive secondary verification SMS codes weeks or months down the road.
              </li>
              <li>
                <strong>Essential Security Step:</strong> If you are creating an account on services like Telegram, WhatsApp, or Google, be sure to set up an email recovery, password, or two-step verification PIN in the app settings right after signing up so you never rely on SMS for future logins.
              </li>
              <li>
                <strong>Inbound SMS Only:</strong> These numbers only receive incoming SMS verification texts from your chosen service. They do not support voice calls, outgoing texts, or personal peer-to-peer messaging.
              </li>
            </ul>
          </div>
        </section>
      </article>
      <SiteFooter />
    </main>
  );
}
