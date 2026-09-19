import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../components/site-chrome';
import { StructuredData } from '../components/structured-data';
import { TotpGenerator } from '../components/totp-generator';
import { breadcrumbData, faqData } from '../seo';
import { siteOrigin } from '../site-config';

const title = 'Get OTP | 2FA Authenticator Code Generator | Sasify Solutions';
const description = 'Generate a six-digit 2FA authenticator code from your digital account setup key. A private, browser-only TOTP OTP generator from Sasify Solutions.';
const path = '/otp';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${siteOrigin}${path}` },
  openGraph: { title, description, url: `${siteOrigin}${path}`, images: [`${siteOrigin}/sasify-logo.png`] },
  twitter: { card: 'summary', title, description, images: [`${siteOrigin}/sasify-logo.png`] },
};

const questions = [
  {
    question: 'What is this OTP generator used for?',
    answer: 'It generates the current six-digit time-based one-time password from a Base32 2FA setup key supplied with an eligible digital account.',
  },
  {
    question: 'Is my 2FA setup key stored by Sasify Solutions?',
    answer: 'No. The setup key is processed in your browser and is not sent to, saved by or logged on the Sasify Solutions server. Do not enter bank, wallet or SMS verification secrets.',
  },
  {
    question: 'How long does an OTP code work?',
    answer: 'A standard time-based OTP code refreshes every 30 seconds. Enter the six-digit code before the countdown ends.',
  },
];

export default function OtpPage() {
  return (
    <main>
      <SiteHeader />
      <StructuredData data={breadcrumbData([{ name: 'Home', path: '/' }, { name: 'Get OTP', path }])} />
      <StructuredData data={faqData(path, questions)} />
      <article className="detail-shell otp-page">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">Get OTP</span></nav>
        <div className="otp-page-intro">
          <span className="section-kicker">Two-factor authentication</span>
          <h1>Generate your 2FA OTP</h1>
          <p>Use the setup key from your Sasify Solutions digital account delivery to generate the six-digit authenticator code needed at sign-in.</p>
        </div>
        <TotpGenerator />
        <section className="description-section otp-help-section">
          <h2>How the 2FA OTP tool works</h2>
          <p>This tool uses the standard time-based one-time password method used by common authenticator apps. The code is calculated locally in your browser from your setup key and the current time.</p>
          <p>For your security, this page does not replace an authenticator app for bank or wallet accounts. If your delivered account does not include a setup key or the code is rejected, contact Sasify Solutions support with your order reference.</p>
        </section>
      </article>
      <SiteFooter />
    </main>
  );
}
