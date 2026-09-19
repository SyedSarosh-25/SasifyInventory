'use client';
import { useState } from 'react';
import { ArrowUpRight, ShoppingBag, WalletCards, Package, TrendingUp } from 'lucide-react';
import type { AdminSection } from './admin-shell';

type Day = { date: string; revenue: number; profit: number | null; missingCosts: number | null };
const money = (value: number) => `PKR ${value.toLocaleString('en-PK')}`;
const label = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Karachi' });

export function AdminDailyChart({ days, unlocked, onNavigate }: { days?: Day[]; unlocked: boolean; onNavigate: (section: AdminSection) => void }) {
  const [range, setRange] = useState(14);
  const [selected, setSelected] = useState<string | null>(null);
  const rows = (days || []).slice(-range);
  const active = rows.find((day) => day.date === selected) || rows.at(-1);
  const revenue = rows.reduce((sum, day) => sum + day.revenue, 0);
  const profit = rows.reduce((sum, day) => sum + (day.profit ?? 0), 0);
  const missing = rows.some((day) => (day.missingCosts || 0) > 0);
  const values = rows.flatMap((day) => [day.revenue, ...(unlocked && day.profit !== null ? [day.profit] : [])]);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const y = (value: number) => 220 - ((value - min) / (max - min)) * 180;
  const step = 660 / Math.max(1, rows.length);
  return <>
    <section className="ops-quick-links" aria-label="Quick navigation">
      {([
        ['orders', 'Manage orders', 'Review & deliver', ShoppingBag],
        ['payments', 'Payment inbox', 'Check incoming receipts', WalletCards],
        ['inventory', 'Your inventory', 'Manage available stock', Package],
        ['profit', 'Financial view', unlocked ? 'Explore your earnings' : 'Unlock profit figures', TrendingUp],
      ] as const).map(([section, title, detail, Icon]) => <button key={section} onClick={() => onNavigate(section)}><Icon size={22} /><span><strong>{title}</strong><small>{detail}</small></span><ArrowUpRight size={17} /></button>)}
    </section>
    <section className="admin-panel ops-daily-panel">
      <div className="panel-heading"><div><span className="admin-eyebrow">Performance · Pakistan time</span><h2>Daily revenue & profit</h2><p>Recognized sales by delivery date, including admin stock withdrawals.</p></div>
        <div className="ops-chart-ranges" aria-label="Chart date range">{[7, 14, 30].map((count) => <button key={count} aria-pressed={range === count} onClick={() => { setRange(count); setSelected(null); }}>{count} days</button>)}</div>
      </div>
      {!rows.length ? <p className="ops-data-note">Daily figures are not available yet. Refresh after the updated server is deployed.</p> : <>
        <div className="ops-chart-totals"><div><span><i className="revenue-dot" /> Revenue · {range} days</span><strong>{money(revenue)}</strong></div><div><span><i className="profit-dot" /> Profit · {range} days</span><strong>{unlocked ? money(profit) : 'Protected'}</strong></div><div className="ops-chart-day" aria-live="polite"><span>{active && label(active.date)}</span><strong>{active && money(active.revenue)}</strong><small>{unlocked && active?.profit != null ? `Profit ${money(active.profit)}` : 'Revenue'}</small></div></div>
        {!unlocked && <button className="ops-chart-unlock" onClick={() => onNavigate('profit')}>Unlock the financial view to show daily profit →</button>}
        <div className="ops-chart-scroll"><svg viewBox="0 0 760 260" className="ops-daily-svg" role="img" aria-label={`Daily revenue${unlocked ? ' and profit' : ''} for the last ${range} days. Exact figures available in the table below.`}>
          {[0, .25, .5, .75, 1].map((fraction) => { const value = min + fraction * (max - min); return <g key={fraction}><line x1="72" x2="742" y1={y(value)} y2={y(value)} stroke="#e7edf5" /><text x="62" y={y(value) + 4} textAnchor="end" fill="#64748b" fontSize="11">{new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}</text></g>; })}
          <line x1="72" x2="742" y1={y(0)} y2={y(0)} stroke="#9aaec7" />
          {rows.map((day, index) => { const x = 78 + index * step; const width = Math.max(3, step * .3); return <g key={day.date}>
            <rect x={x} y={Math.min(y(0), y(day.revenue))} width={width} height={Math.max(1, Math.abs(y(day.revenue) - y(0)))} rx="3" fill="#5262ed"><title>{label(day.date)}: Revenue {money(day.revenue)}</title></rect>
            {unlocked && day.profit !== null && <rect x={x + width + 2} y={Math.min(y(0), y(day.profit))} width={width} height={Math.max(1, Math.abs(y(day.profit) - y(0)))} rx="3" fill="#0d9488"><title>Profit {money(day.profit)}</title></rect>}
            {(index % Math.ceil(rows.length / 7) === 0 || index === rows.length - 1) && <text x={x + width} y="248" textAnchor="middle" fill="#64748b" fontSize="10">{label(day.date)}</text>}
            <rect x={x - 2} y="30" width={step - 2} height="195" fill="transparent" onMouseEnter={() => setSelected(day.date)} onFocus={() => setSelected(day.date)} onClick={() => setSelected(day.date)} tabIndex={0} role="button" aria-label={`${label(day.date)}: revenue ${money(day.revenue)}${unlocked && day.profit !== null ? `, profit ${money(day.profit)}` : ''}`} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(day.date); } }} />
          </g>; })}
        </svg></div>
        <p className="ops-data-note">Pending and cancelled orders are excluded. Profit follows the existing coupon and cost rules.{missing ? ' Some costs are missing; profit figures may be overstated.' : ''}</p>
        <details className="ops-chart-details"><summary>View daily figures</summary><div className="commerce-table"><table><thead><tr><th>Date (PKT)</th><th>Revenue</th><th>Profit</th></tr></thead><tbody>{rows.map((day) => <tr key={day.date}><td>{label(day.date)}</td><td>{money(day.revenue)}</td><td>{unlocked && day.profit !== null ? `${money(day.profit)}${day.missingCosts ? ' · Missing costs' : ''}` : 'Protected'}</td></tr>)}</tbody></table></div></details>
      </>}
    </section>
  </>;
}
