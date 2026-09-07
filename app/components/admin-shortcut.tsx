'use client';
import { useEffect } from 'react';

export function AdminShortcut() {
  useEffect(() => {
    const openAdmin = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.shiftKey || !['a','t'].includes(event.key.toLowerCase())) return;
      event.preventDefault();
      window.location.assign('/orders-admin');
    };
    window.addEventListener('keydown', openAdmin);
    return () => window.removeEventListener('keydown', openAdmin);
  }, []);
  return null;
}
