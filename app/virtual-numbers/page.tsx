import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../components/site-chrome';
import { StructuredData } from '../components/structured-data';
import { VirtualNumbers } from '../components/virtual-numbers';
import { breadcrumbData, faqData } from '../seo';
import { siteOrigin } from '../site-config';
import { shareImage, shareImageUrl } from '../share-metadata';

const title = 'Virtual Phone Numbers & SMS OTP Verification | Sasify Solutions';
const description =
  'Rent instant virtual phone numbers for automated SMS OTP verification on WhatsApp, Telegram, Claude, ChatGPT, Google, and Discord in Pakistan. Instant 1-click activation from your Sasify Wallet with full auto-refund guarantee.';
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
          <span className="section-kicker">Instant Verification Tools</span>
          <h1>Virtual Phone Numbers (SMS OTP)</h1>
          <p>
            Rent private, temporary international virtual numbers to verify WhatsApp, Telegram, Claude, ChatGPT, Google, and other global services with automated delivery and auto-refund protection.
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
        </section>
      </article>
      <SiteFooter />
    </main>
  );
}
