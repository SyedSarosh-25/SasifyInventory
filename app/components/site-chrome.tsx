'use client';
import { LocalizedContent } from './language';

import { useEffect, useState } from 'react';
import './site-header-actions.css';
import { favicon } from '../product-utils';
import { CurrencyToggle } from './currency';
import { LanguageSwitcher } from './language';
import { founderProfile, socials } from '../site-config';

export function SiteHeader({
  accountMode,
}: {
  accountMode?: 'signup' | 'login' | 'recovery';
} = {}) {
  const [accountName, setAccountName] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    fetch('/api/commerce?action=account-dashboard', { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((result: any) => { if (active && result?.account?.name) setAccountName(result.account.name); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return (
    <LocalizedContent><header
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
          <a href="/categories">Categories</a>
          <a href="/scammers">Scam reports</a>
          <a href="/#faq">FAQ</a>
          <a href="#contact">Contact Us</a>
        </div>
        <div className="nav-actions header-account-actions">
          <LanguageSwitcher />
          <CurrencyToggle />
          <span className="header-action-divider" aria-hidden="true" />
          {accountName ? (
            <a href="/dashboard" className="header-login">My dashboard</a>
          ) : (
            <>
              <a href="/login" className="header-login">Log in</a>
              <a href="/signup" className="header-signup">Sign up</a>
            </>
          )}
        </div>
      </nav>
    </header></LocalizedContent>
  );
}

export function SiteFooter() {
  return (
    <LocalizedContent><footer id="contact" className="site-footer">
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
        <nav className="footer-primary-links" aria-label="Explore Sasify">
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
        </nav>
        <a
          href="/inventory"
          className="primary-button footer-cta"
        >
          Browse products
        </a>
      </div>
      <div
        className="footer-socials"
        aria-label="Sasify Solutions social media"
      >
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
    </footer></LocalizedContent>
  );
}
