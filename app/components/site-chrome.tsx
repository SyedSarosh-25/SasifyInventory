import { ArrowRight, MessageCircle } from 'lucide-react';
import { favicon, whatsappLink } from '../product-utils';
import { CurrencyToggle } from './currency';
import { founderProfile, socials } from '../site-config';

export function SiteHeader() {
  return (
    <header className="site-header">
      <nav className="nav-inner" aria-label="Main navigation">
        <a href="/" className="brand" title="Sasify Solutions | Digital Tools and Services Marketplace">
          <img src="/sasify-logo.png" alt="Sasify Solutions logo" width={46} height={46} decoding="async" />
          <span className="brand-name"><strong>SASIFY</strong><small>SOLUTIONS</small></span>
        </a>
        <div className="nav-links">
          <a href="/inventory">Tools</a><a href="/#reviews">Reviews</a>
          <a href="/#faq">FAQ</a><a href="#contact">Contact</a>
        </div>
        <div className="nav-actions">
          <CurrencyToggle />
          <a href="/inventory" className="primary-button compact" aria-label="Browse tools" title="Browse tools">
            Browse tools <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer id="contact" className="site-footer">
      <div className="footer-inner">
        <a href="/" className="footer-brand" title="Sasify Solutions | Digital Tools and Services Marketplace">
          <img src="/sasify-logo.png" alt="Sasify Solutions logo" width={50} height={50} loading="lazy" decoding="async" />
          <div>
            <strong>Sasify Solutions</strong>
            <span>Your Satisfaction is Our Priority</span>
          </div>
        </a>
        <a href={founderProfile} target="_blank" rel="noreferrer"
          className="founder-link" title="View Syed Sarosh on LinkedIn">
          <img src={favicon('linkedin.com')} alt="LinkedIn" className="social-logo" width={22} height={22} loading="lazy" decoding="async" />
          <span>Founder: <strong>Syed Sarosh</strong></span>
        </a>
        <a href="/about" className="founder-link">About Sasify Solutions</a>
        <a href="/buying-guide" className="founder-link">Buying guide</a>
        <a href={whatsappLink()} target="_blank" rel="noreferrer" className="primary-button">
          <MessageCircle className="h-4 w-4" /> WhatsApp us
        </a>
      </div>
      <div className="footer-socials" aria-label="Sasify Solutions social media">
        <a href={whatsappLink()} target="_blank" rel="noreferrer">
          <MessageCircle className="social-logo whatsapp-icon" />
          <span><strong>WhatsApp</strong><small>+923116185711</small></span>
        </a>
        {socials.map((social) => (
          <a key={social.name} href={social.href} target="_blank" rel="noreferrer" aria-label={`${social.name}: @Sasify_Solutions`}>
            <img src={favicon(social.domain)} alt="" className="social-logo" width={22} height={22} loading="lazy" decoding="async" />
            <span><strong>{social.name}</strong><small>@Sasify_Solutions</small></span>
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
