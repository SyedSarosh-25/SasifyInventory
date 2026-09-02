import { ArrowRight, MessageCircle } from 'lucide-react';
import { favicon, whatsappLink } from '../product-utils';
import { CurrencyToggle } from './currency';

const socials = [
  { name: 'Instagram', domain: 'instagram.com', href: 'https://www.instagram.com/sasify_solutions/' },
  { name: 'Facebook', domain: 'facebook.com', href: 'https://www.facebook.com/Sasify_Solutions/' },
  { name: 'TikTok', domain: 'tiktok.com', href: 'https://www.tiktok.com/@sasify_solutions' },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <nav className="nav-inner" aria-label="Main navigation">
        <a href="/" className="brand">
          <img src="/sasify-logo.png" alt="Sasify Solutions logo" />
          <span className="brand-name"><strong>SASIFY</strong><small>SOLUTIONS</small></span>
        </a>
        <div className="nav-links">
          <a href="/#catalog">Tools</a><a href="/#reviews">Reviews</a>
          <a href="/#faq">FAQ</a><a href="#contact">Contact</a>
        </div>
        <div className="nav-actions">
          <CurrencyToggle />
          <a href="/#catalog" className="primary-button compact" aria-label="Browse tools">
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
        <a href="/" className="footer-brand">
          <img src="/sasify-logo.png" alt="Sasify Solutions logo" />
          <strong>Sasify Solutions</strong>
        </a>
        <a href="https://pk.linkedin.com/in/syedsarosh2" target="_blank" rel="noreferrer"
          className="founder-link" title="View Syed Sarosh on LinkedIn">
          <img src={favicon('linkedin.com')} alt="LinkedIn" className="social-logo" />
          <span>Founder: <strong>Syed Sarosh</strong></span>
        </a>
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
          <a key={social.name} href={social.href} target="_blank" rel="noreferrer">
            <img src={favicon(social.domain)} alt="" className="social-logo" />
            <span><strong>{social.name}</strong><small>@Sasify_Solutions</small></span>
          </a>
        ))}
      </div>
    </footer>
  );
}
