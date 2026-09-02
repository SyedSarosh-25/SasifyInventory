'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { isTheme, resolveTheme, themeStorageKey, type Theme } from '../theme-utils';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const preference = useRef<Theme | null>(null);

  function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    setDark(theme === 'dark');
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(themeStorageKey);
      preference.current = isTheme(saved) ? saved : null;
    } catch { /* Default to light mode when storage is unavailable. */ }

    function syncTheme() { applyTheme(resolveTheme(preference.current)); }
    function syncStorage(event: StorageEvent) {
      if (event.key !== themeStorageKey && event.key !== null) return;
      preference.current = isTheme(event.newValue) ? event.newValue : null;
      syncTheme();
    }

    syncTheme();
    window.addEventListener('storage', syncStorage);
    return () => {
      window.removeEventListener('storage', syncStorage);
    };
  }, []);

  function toggleTheme() {
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    preference.current = next;
    applyTheme(next);
    try { localStorage.setItem(themeStorageKey, next); } catch { /* Keep the choice for this visit. */ }
  }

  return <button type="button" className="theme-toggle" onClick={toggleTheme}
    aria-label="Dark mode" aria-pressed={dark} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
    <Moon className="theme-icon-moon h-5 w-5" aria-hidden="true" />
    <Sun className="theme-icon-sun h-5 w-5" aria-hidden="true" />
  </button>;
}
