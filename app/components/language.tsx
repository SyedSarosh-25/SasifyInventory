'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Globe2 } from 'lucide-react';
import { isLanguage, isPublicPath, languages, languagePreferenceKey, translateText, type Language } from '../localization';
import { localizeContent } from '../localized-content';

const LanguageContext = createContext<{ language: Language; selectLanguage: (language: Language) => void }>({ language: 'en', selectLanguage: () => {} });
export function useLanguage() { return useContext(LanguageContext); }

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  useEffect(() => {
    const publicPage = isPublicPath(window.location.pathname);
    if (publicPage) document.body.dataset.storefront = 'true';
    const sync = () => {
      if (!publicPage) return;
      try {
        const saved = localStorage.getItem(languagePreferenceKey);
        setLanguage(isLanguage(saved) ? saved : 'en');
      } catch { /* The selector works without browser storage. */ }
    };
    sync();
    const onStorage = (event: StorageEvent) => { if (event.key === languagePreferenceKey || event.key === null) sync(); };
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('storage', onStorage); delete document.body.dataset.storefront; };
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  function selectLanguage(next: Language) {
    if (!isLanguage(next)) return;
    setLanguage(next);
    try { localStorage.setItem(languagePreferenceKey, next); } catch { /* Retain the choice in memory. */ }
  }
  return <LanguageContext.Provider value={{ language, selectLanguage }}>{children}<WelcomeLanguageModal /></LanguageContext.Provider>;
}

const welcomeSeenKey = 'sasify-welcome-language-seen';

function WelcomeLanguageModal() {
  const { selectLanguage } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [choice, setChoice] = useState<'en' | 'ur-Latn'>('en');
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!isPublicPath(window.location.pathname) || /^\/(?:checkout|dashboard|account|login|signup|forgot-password|reset-password)(?:\/|$)/.test(window.location.pathname)) return;
    let active = true;
    const localPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (localPreview) {
      try { if (localStorage.getItem(welcomeSeenKey)) return; } catch { /* Continue without storage. */ }
    }
    fetch('/api/welcome-language', { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!active) return;
        // Static local preview has no Vercel IP headers or welcome API.
        const eligible = typeof result === 'object' && result !== null && 'eligible' in result && result.eligible === true;
        if (eligible || (localPreview && Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Karachi')) setVisible(true);
      })
      .catch(() => {
        if (active && localPreview && Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Karachi') setVisible(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => { if (element?.open) element.close(); };
  }, [visible]);

  function continueToSite() {
    selectLanguage(choice);
    setVisible(false);
    if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      try { localStorage.setItem(welcomeSeenKey, '1'); } catch { /* Local preview will show it again. */ }
    } else {
      void fetch('/api/welcome-language', { method: 'POST', credentials: 'same-origin', cache: 'no-store', keepalive: true }).catch(() => {});
    }
  }

  if (!visible) return null;
  return <dialog ref={dialog} className="welcome-language-dialog" aria-labelledby="welcome-language-title" aria-describedby="welcome-language-description" onCancel={(event) => { event.preventDefault(); continueToSite(); }}>
    <div className="welcome-language-mark" aria-hidden="true"><Globe2 size={24} /></div>
    <p className="welcome-language-kicker">Aap ke liye / Made for you</p>
    <h2 id="welcome-language-title">Welcome to Sasify Solutions</h2>
    <p id="welcome-language-description">Viewing from Pakistan? Choose the language that feels most comfortable. You can change it anytime from the top menu.</p>
    <div className="welcome-language-examples" aria-label="English and Roman Urdu examples">
      <p className="welcome-language-examples-title">Here’s how the website reads</p>
      <div><span lang="en">Browse products and compare prices.</span><span lang="ur-Latn">Products dekhein aur prices compare karein.</span></div>
      <div><span lang="en">Buy online and get support if needed.</span><span lang="ur-Latn">Online khareedein aur zaroorat par support lein.</span></div>
    </div>
    <fieldset className="welcome-language-choices" aria-label="Choose your website language">
      <button type="button" className={choice === 'en' ? 'is-selected' : ''} aria-pressed={choice === 'en'} onClick={() => setChoice('en')}><strong>English</strong><span>Continue in English</span></button>
      <button type="button" className={choice === 'ur-Latn' ? 'is-selected' : ''} aria-pressed={choice === 'ur-Latn'} onClick={() => setChoice('ur-Latn')}><strong>Roman Urdu</strong><span>Roman Urdu mein dekhein</span></button>
    </fieldset>
    <button type="button" className="welcome-language-continue" onClick={continueToSite}>Continue to website</button>
    <p className="welcome-language-note">Your selection changes website text only. Prices and orders stay the same.</p>
  </dialog>;
}

export function LanguageSwitcher() {
  const { language, selectLanguage } = useLanguage();
  const label = translateText('Choose language', language);
  return <label className="language-switcher">
    <Globe2 size={16} aria-hidden="true" />
    <span className="sr-only">{label}</span>
    <select aria-label={label} value={language} onChange={event => { if (isLanguage(event.target.value)) selectLanguage(event.target.value); }}>
      {languages.map(option => <option key={option.code} value={option.code} lang={option.htmlLang}>{option.label}</option>)}
    </select>
  </label>;
}

/** React-based localization: no DOM replacement, observers or external service. */
export function LocalizedContent({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  return <>{localizeContent(children, language)}</>;
}
