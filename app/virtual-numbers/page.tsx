import type { Metadata } from 'next';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Zap,
  HelpCircle,
  Smartphone,
  CreditCard,
  Lock,
  Globe2,
} from 'lucide-react';
import { SiteFooter, SiteHeader } from '../components/site-chrome';
import { StructuredData } from '../components/structured-data';
import { VirtualNumbers } from '../components/virtual-numbers';
import { breadcrumbData, faqData } from '../seo';
import { siteOrigin } from '../site-config';
import { shareImage, shareImageUrl } from '../share-metadata';

const title = 'Virtual Phone Numbers in Pakistan · WhatsApp, Telegram & ChatGPT SMS OTP | Sasify Solutions';
const description =
  'Buy temporary virtual phone numbers in Pakistan for one-time SMS OTP verification on WhatsApp, Telegram, ChatGPT, Claude, and Google. Fixed pricing starting from Rs 100 with 1-click Sasify Wallet activation and instant auto-refund guarantee.';
const path = '/virtual-numbers';

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    'virtual phone number Pakistan',
    'buy temporary number for WhatsApp Pakistan',
    'receive SMS online Pakistan',
    'disposable number Telegram Pakistan',
    'ChatGPT phone verification Pakistan',
    'Claude AI phone number Pakistan',
    'temporary phone number for OTP Pakistan',
    'fake number for WhatsApp Pakistan',
    'online SMS receiver Pakistan',
    'Sasify wallet virtual number',
    'single-use phone number',
    'one-time OTP verification',
  ],
  alternates: { canonical: `${siteOrigin}${path}` },
  openGraph: { title, description, url: `${siteOrigin}${path}`, images: shareImage(title) },
  twitter: { card: 'summary_large_image', title, description, images: [shareImageUrl] },
};

const questions = [
  {
    question: 'How do virtual phone numbers for SMS OTP work?',
    answer:
      'When you select a platform (such as WhatsApp, Telegram, Claude, or ChatGPT) and country, Sasify automatically reserves a dedicated temporary virtual phone line. Enter this phone number into your app. When the carrier sends the verification SMS, our automated system captures and displays your one-time code on screen within seconds.',
  },
  {
    question: 'How much do virtual numbers cost in Pakistan?',
    answer:
      'Prices start from as low as Rs 100 PKR for lightweight apps and Rs 250 PKR for standard platforms like WhatsApp, Telegram, ChatGPT, and Claude. Dedicated premium lines are calculated dynamically in PKR. The exact price is always shown clearly before you activate the number.',
  },
  {
    question: 'How do I pay for virtual numbers in Pakistan?',
    answer:
      'You can pay instantly using your Sasify Wallet with 1-click activation. You can top up your prepaid wallet balance anytime via NayaPay, SadaPay, Raast, Bank Transfer, Binance Pay, or Crypto USDT, where payments are automatically verified by our automated system.',
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
      'You are completely protected by our 100% money-back guarantee. If no SMS verification code arrives within 15 minutes, or if you cancel the active number, the entire amount is automatically refunded back to your Sasify Wallet or refunded by our support team.',
  },
  {
    question: 'Which services and apps are supported?',
    answer:
      'We support over 100+ global platforms including WhatsApp, Telegram, OpenAI / ChatGPT, Claude (Anthropic), Google / Gmail, Discord, Microsoft, TikTok, Twitter / X, Netflix, and Apple ID across dozens of international countries.',
  },
];

const productStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Virtual Phone Number for SMS OTP Verification Pakistan',
  description:
    'Buy disposable virtual phone numbers in Pakistan for one-time SMS verification on WhatsApp, Telegram, ChatGPT, Claude, and Google.',
  brand: { '@type': 'Brand', name: 'Sasify Solutions' },
  sku: 'SASIFY-VN-OTP',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'PKR',
    lowPrice: '100',
    highPrice: '250',
    offerCount: '100+',
    availability: 'https://schema.org/InStock',
    seller: {
      '@type': 'Organization',
      name: 'Sasify Solutions',
      url: 'https://www.sasifysolutions.com',
    },
  },
};

const howToStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Buy and Use a Disposable Virtual Number in Pakistan',
  description:
    'Step-by-step guide to renting a private international virtual number for instant SMS verification in Pakistan.',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Choose Your App and Country',
      text: 'Select your target service (such as WhatsApp, Telegram, Claude, or ChatGPT) and preferred international country code.',
    },
    {
      '@type': 'HowToStep',
      name: 'Activate with Sasify Wallet',
      text: 'Pay instantly with your Sasify Wallet balance (1-click). Top up anytime via NayaPay, SadaPay, Raast, Bank Transfer, Binance Pay, or Crypto USDT with automated verification.',
    },
    {
      '@type': 'HowToStep',
      name: 'Enter Number in Your App',
      text: 'Copy your dedicated temporary phone number and paste it into the application signup or login screen.',
    },
    {
      '@type': 'HowToStep',
      name: 'Receive and Copy One-Time OTP',
      text: 'Your SMS verification code appears on screen automatically within seconds. Copy the OTP to complete your registration.',
    },
  ],
};

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
      <StructuredData data={productStructuredData} />
      <StructuredData data={howToStructuredData} />

      <article className="detail-shell virtual-numbers-page">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Virtual Numbers (SMS OTP)</span>
        </nav>

        <div className="otp-page-intro">
          <span className="section-kicker">Disposable Single-Use Verification in Pakistan</span>
          <h1>Virtual Phone Numbers (One-Time SMS OTP)</h1>
          <p>
            Rent private, disposable international virtual numbers strictly for one-time SMS verification on WhatsApp, Telegram, Claude, ChatGPT, Google, and other global services with automated delivery, 1-click Sasify Wallet pay, and auto-refund protection.
          </p>
        </div>

        <VirtualNumbers />

        {/* SECTION: Popular Use Cases */}
        <section className="vn-seo-section">
          <h2>
            <Smartphone className="h-6 w-6 text-emerald-600" />
            Supported Services &amp; Popular Use Cases
          </h2>
          <p>
            Whether you are testing software, safeguarding personal privacy, or setting up dedicated professional accounts, Sasify provides reliable SMS delivery for every major digital platform:
          </p>

          <div className="vn-feature-grid">
            <div className="vn-feature-card">
              <h3 className="vn-feature-title">
                <Globe2 className="h-5 w-5 text-emerald-600" />
                WhatsApp &amp; WhatsApp Business
              </h3>
              <p className="vn-feature-desc">
                Register private international WhatsApp accounts without binding your personal Pakistani SIM card. Perfect for e-commerce stores, client support lines, and privacy.
              </p>
            </div>

            <div className="vn-feature-card">
              <h3 className="vn-feature-title">
                <Zap className="h-5 w-5 text-blue-600" />
                Telegram Channels &amp; Bots
              </h3>
              <p className="vn-feature-desc">
                Set up secure Telegram accounts instantly. Ensure your personal identity and phone number remain completely concealed from public channels and groups.
              </p>
            </div>

            <div className="vn-feature-card">
              <h3 className="vn-feature-title">
                <Lock className="h-5 w-5 text-purple-600" />
                OpenAI ChatGPT &amp; Claude AI
              </h3>
              <p className="vn-feature-desc">
                Bypass phone verification hurdles when creating new Anthropic Claude, OpenAI, or Perplexity accounts. Receive single-use OTP codes reliably in seconds.
              </p>
            </div>

            <div className="vn-feature-card">
              <h3 className="vn-feature-title">
                <CheckCircle2 className="h-5 w-5 text-teal-600" />
                Google, Gmail &amp; YouTube
              </h3>
              <p className="vn-feature-desc">
                Easily complete phone verification prompts when setting up new Gmail workspaces, YouTube channels, or Google Developer accounts without hitting carrier quotas.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION: Private Numbers vs Free Public SMS */}
        <section className="vn-seo-section">
          <h2>
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            Why Private Sasify Numbers Beat Free Public SMS Sites
          </h2>
          <p>
            Many users search for "free virtual numbers" online, only to find their accounts compromised or blocked. Here is why dedicated private temporary lines are essential:
          </p>

          <div className="vn-comparison-grid">
            <div className="vn-comp-bad">
              <h4>❌ Free Public SMS Websites</h4>
              <ul className="vn-comp-list">
                <li>Shared with thousands of random internet users at the same time.</li>
                <li>Your incoming verification codes and login details are published publicly for anyone to see.</li>
                <li>Almost always blacklisted by WhatsApp, Telegram, Google, and banks.</li>
                <li>Previous users can reset your account password and take over your data.</li>
                <li>Zero support or delivery guarantees.</li>
              </ul>
            </div>

            <div className="vn-comp-good">
              <h4>✅ Sasify Private Virtual Numbers</h4>
              <ul className="vn-comp-list">
                <li>100% private and reserved exclusively for you during your 15-minute window.</li>
                <li>Your SMS verification code is confidential — displayed only on your private screen.</li>
                <li>Fresh numbers from authentic international mobile operators (clean reputation).</li>
                <li>Strictly single-use disposable: prevents account collision or subsequent takeovers.</li>
                <li>100% Money-Back Guarantee: Automatic refund if no code arrives.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION: Payment Methods */}
        <section className="vn-seo-section">
          <h2>
            <CreditCard className="h-6 w-6 text-emerald-600" />
            Fast Pakistani &amp; Crypto Payment Methods
          </h2>
          <p>
            We eliminate payment friction for Pakistani digital professionals. You can pay via any of the following convenient rails:
          </p>

          <div className="vn-feature-grid">
            <div className="vn-feature-card">
              <h3 className="vn-feature-title">🇵🇰 Pakistani Banking &amp; Raast</h3>
              <p className="vn-feature-desc">
                Pay instantly via NayaPay, SadaPay, EasyPaisa, JazzCash, or any 1Link / Raast mobile banking app.
              </p>
            </div>
            <div className="vn-feature-card">
              <h3 className="vn-feature-title">🟡 Binance Pay (0% Fee)</h3>
              <p className="vn-feature-desc">
                Pay with Binance Pay ID in USDT or PKR with zero transaction fees and instant confirmation.
              </p>
            </div>
            <div className="vn-feature-card">
              <h3 className="vn-feature-title">₮ USDT Crypto</h3>
              <p className="vn-feature-desc">
                Transfer USDT via TRC-20 or BEP-20 directly to our secure wallet address.
              </p>
            </div>
            <div className="vn-feature-card">
              <h3 className="vn-feature-title">⚡ 1-Click Sasify Wallet</h3>
              <p className="vn-feature-desc">
                Keep a prepaid balance in your Sasify Wallet to rent numbers in 1 second with a single click.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION: Disposable Guidelines */}
        <section className="description-section otp-help-section">
          <h2>Important Operational Guidelines</h2>
          <p>
            Sasify provides direct, high-deliverability virtual phone lines sourced from verified international telecom providers. Every line is private and disposable, ensuring your personal mobile number remains secure and unexposed.
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
