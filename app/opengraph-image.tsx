import { ImageResponse } from 'next/og';
import { sasifyLogoDataUriValue } from './share-logo';

export const alt = 'Sasify Solutions — Pakistan’s fully automated digital store';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 84px',
        color: '#09102a',
        background: 'linear-gradient(135deg, #f8fbff 0%, #eef3ff 58%, #e7ddff 100%)',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, color: '#285cff', fontSize: 28, fontWeight: 800, letterSpacing: 2 }}>
        <img
          src={String(sasifyLogoDataUriValue)}
          alt="Sasify Solutions logo"
          width={58}
          height={58}
          style={{ display: 'flex', width: 58, height: 58, borderRadius: 18, backgroundColor: '#fff' }}
        />
        SASIFY SOLUTIONS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 950 }}>
        <div style={{ color: '#285cff', fontSize: 26, fontWeight: 800, letterSpacing: 3 }}>PAKISTAN&apos;S FULLY AUTOMATED DIGITAL STORE</div>
        <div style={{ fontSize: 72, lineHeight: 1.05, fontWeight: 800 }}>Digital tools &amp; subscriptions</div>
        <div style={{ color: '#50617f', fontSize: 34, lineHeight: 1.25 }}>Search, select, pay and get your credentials instantly.</div>
      </div>
      <div style={{ display: 'flex', gap: 18, color: '#fff', fontSize: 25, fontWeight: 700 }}>
        <div style={{ padding: '16px 24px', borderRadius: 16, background: '#285cff' }}>AI tools</div>
        <div style={{ padding: '16px 24px', borderRadius: 16, background: '#7541f5' }}>Subscriptions</div>
        <div style={{ padding: '16px 24px', borderRadius: 16, background: '#0d9b79' }}>Instant delivery</div>
      </div>
    </div>,
    size,
  );
}
