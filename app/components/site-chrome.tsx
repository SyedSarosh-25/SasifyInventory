import { MessageCircle } from 'lucide-react';
import './site-header-actions.css';
import { favicon, whatsappLink } from '../product-utils';
import { CurrencyToggle } from './currency';
import { founderProfile, socials } from '../site-config';
import { NewProductsTicker } from './new-products-ticker';

export function SiteHeader({
  accountMode,
}: {
  accountMode?: 'signup' | 'login' | 'recovery';
} = {}) {
  return (
    <header
      className={`site-header${accountMode ? ` site-header-account site-header-account-${accountMode}` : ''}`}
    >
      <nav className="nav-inner" aria-label="Main navigation">
        <a
          href="/"
          className="brand"
          title="Sasify Solutions | Digital Tools and Services Marketplace"
        >
          <img
            src="/sasify-logo.png"
            alt="Sasify Solutions logo"
            width={46}
            height={46}
            decoding="async"
          />
          <span className="brand-name">
            <strong>SASIFY</strong>
            <small>SOLUTIONS</small>
          </span>
        </a>
        <div className="nav-links">
          <a href="/inventory">Full Inventory</a>
          <a href="/scammers">Scam reports</a>
          <a href="/#faq">FAQ</a>
          <a href="#contact">Contact Us</a>
        </div>
        <div className="nav-actions header-account-actions">
          <CurrencyToggle />
          <span className="header-action-divider" aria-hidden="true" />
          <a href="/login" className="header-login">
            Log in
          </a>
          <a href="/signup" className="header-signup">
            Sign up
          </a>
        </div>
      </nav>
      <NewProductsTicker />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer id="contact" className="site-footer">
      <div className="footer-inner">
        <a
          href="/"
          className="footer-brand"
          title="Sasify Solutions | Digital Tools and Services Marketplace"
        >
          <img
            src="/sasify-logo.png"
            alt="Sasify Solutions logo"
            width={50}
            height={50}
            loading="lazy"
            decoding="async"
          />
          <div>
            <strong>Sasify Solutions</strong>
            <span>Your Satisfaction is Our Priority</span>
          </div>
        </a>
        <a
          href={founderProfile}
          target="_blank"
          rel="noreferrer"
          className="founder-link"
          title="View Syed Sarosh on LinkedIn"
        >
          <img
            src={favicon('linkedin.com')}
            alt="LinkedIn"
            className="social-logo"
            width={22}
            height={22}
            loading="lazy"
            decoding="async"
          />
          <span>
            Founder: <strong>Syed Sarosh</strong>
          </span>
        </a>
        <a href="/about" className="founder-link">
          About Sasify Solutions
        </a>
        <a href="/buying-guide" className="founder-link">
          Buying guide
        </a>
        <a href="/request-tool" className="founder-link">
          Request a tool
        </a>
        <a href="/otp" className="founder-link">
          Get OTP / 2FA code
        </a>
        <a href="/scammers" className="founder-link">
          Scam reports
        </a>
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noreferrer"
          className="primary-button"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp us
        </a>
      </div>
      <div
        className="footer-socials"
        aria-label="Sasify Solutions social media"
      >
        <a href={whatsappLink()} target="_blank" rel="noreferrer">
          <MessageCircle className="social-logo whatsapp-icon" />
          <span>
            <strong>WhatsApp</strong>
            <small>+923116185711</small>
          </span>
        </a>
        {socials.map((social) => (
          <a
            key={social.name}
            href={social.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`${social.name}: @Sasify_Solutions`}
          >
            <img
              src={favicon(social.domain)}
              alt=""
              className="social-logo"
              width={22}
              height={22}
              loading="lazy"
              decoding="async"
            />
            <span>
              <strong>{social.name}</strong>
              <small>@Sasify_Solutions</small>
            </span>
          </a>
        ))}
      </div>
      <nav className="footer-policy-links" aria-label="Policies">
        <a href="/warranty">Warranty</a>
        <a href="/refunds">Refunds</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </nav>
    </footer>
  );
}
