export type Theme = 'light' | 'dark';

export const themeStorageKey = 'sasify-theme';

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

export function resolveTheme(preference: unknown): Theme {
  return isTheme(preference) ? preference : 'light';
}

// Runs in the document head before paint; it only reads our theme preference.
export const themeInitScript = `(() => {
  let preference;
  try { preference = localStorage.getItem('${themeStorageKey}'); } catch {}
  const dark = preference === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();`;
