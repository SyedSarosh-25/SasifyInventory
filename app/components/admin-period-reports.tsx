'use client';
import { useState } from 'react';

type Period = {
  date: string; revenue: number; profit: number | null; missingCosts: number | null;
  sold: number; gptShared: number; gptPrivate: number; withdrawals: number;
  products: Record<string, number>; closed?: boolean;
};
type Props = {
  days?: Period[]; months?: Period[]; unlocked: boolean;
  periods?: { today: string; currentMonth: string; previousMonth: string };
  products?: { id: string; name: string }[];
};
const money = (value: number) => `PKR ${Number(value || 0).toLocaleString('en-PK')}`;
const dateLabel = (date: string) => new Date(`${date.length === 7 ? `${date}-01` : date}T12:00:00Z`).toLocaleDateString('en-GB', {
  ...(date.length === 10 ? { day: 'numeric' as const } : {}), month: 'long', year: 'numeric', timeZone: 'Asia/Karachi',
});

export function AdminPeriodReports({ days = [], months = [], unlocked, periods, products = [] }: Props) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  if (!periods) return null;
  const date = selectedDate || periods.today;
  const month = selectedMonth || periods.currentMonth;
  const day = days.find((row) => row.date === date);
  const monthDays = days.filter((row) => row.date.startsWith(`${month}-`));
  const names = new Map(products.map((product) => [product.id, product.name]));
  for (const [id, name] of Object.entries({ p093: 'GPT Plus · Private', 'p093-ultra': 'GPT Plus · Private (Ultra)', 'p093-shared': 'GPT Plus · Shared seat', 'p093-momo': 'GPT Plus · Private (legacy)' })) names.set(id, name);
  const profit = (row?: Period) => !unlocked ? 'Protected' : row?.missingCosts ? `${money(row.profit ?? 0)} · Missing costs` : money(row?.profit ?? 0);
  return <section className="admin-panel" aria-label="Daily and monthly reports">
    <div className="panel-heading"><div><span className="admin-eyebrow">Pakistan time · Delivered sales</span><h2>Earnings & stock sold</h2><p>Revenue and profit are separate. Shared sales count seats, not complete accounts. Withdrawals are reported separately.</p></div></div>
    <div className="ops-chart-totals">
      {([
        ['Today', periods.today, days.find((row) => row.date === periods.today)],
        ['This month · To date', periods.currentMonth, months.find((row) => row.date === periods.currentMonth)],
        ['Last month · Closing', periods.previousMonth, months.find((row) => row.date === periods.previousMonth)],
      ] as const).map(([title, key, row]) => <div key={title}><span>{title} · {dateLabel(key)}</span><strong>{money(row?.revenue ?? 0)}</strong><small>Profit: {profit(row)} · Sold: {row?.sold ?? 0}</small></div>)}
    </div>
    <p className="ops-data-note">Closing means the calendar month&apos;s recognized sales and profit, not wallet balance or cash on hand. Historical totals update if costs or delivered records are corrected. Profit remains protected by the financial password.</p>
    <div className="panel-heading"><h3>Daily figures & stock sold</h3><label>Day (PKT)<input type="date" value={date} max={periods.today} onChange={(event) => setSelectedDate(event.target.value)} /></label></div>
    <div className="snapshot-grid">
      <div><span>Revenue</span><strong>{money(day?.revenue ?? 0)}</strong></div>
      <div><span>Profit</span><strong>{profit(day)}</strong></div>
      <div><span>Customer sales</span><strong>{day?.sold ?? 0}</strong></div>
      <div><span>GPT Plus · Private accounts</span><strong>{day?.gptPrivate ?? 0}</strong></div>
      <div><span>GPT Plus · Shared seats</span><strong>{day?.gptShared ?? 0}</strong></div>
      <div><span>Admin stock withdrawals</span><strong>{day?.withdrawals ?? 0}</strong></div>
    </div>
    <div className="commerce-table"><table><thead><tr><th>Product</th><th>Sold on {dateLabel(date)}</th></tr></thead><tbody>{Object.entries(day?.products || {}).map(([id, count]) => <tr key={id}><td>{names.get(id) || id}</td><td>{count}</td></tr>)}{!day?.sold && <tr><td colSpan={2}>No delivered customer sales on this day.</td></tr>}</tbody></table></div>
    <div className="panel-heading"><h3>Daily breakdown by month</h3><label>Month (PKT)<select value={month} onChange={(event) => setSelectedMonth(event.target.value)}>{[...months].reverse().map((row) => <option key={row.date} value={row.date}>{dateLabel(row.date)}</option>)}</select></label></div>
    <div className="commerce-table"><table><thead><tr><th>Day (PKT)</th><th>Revenue</th><th>Profit</th><th>Sold</th><th>GPT private</th><th>GPT shared seats</th><th>Withdrawals</th></tr></thead><tbody>{[...monthDays].reverse().map((row) => <tr key={row.date}><td><button type="button" onClick={() => setSelectedDate(row.date)}>{dateLabel(row.date)}</button></td><td>{money(row.revenue)}</td><td>{profit(row)}</td><td>{row.sold}</td><td>{row.gptPrivate}</td><td>{row.gptShared}</td><td>{row.withdrawals}</td></tr>)}{!monthDays.length && <tr><td colSpan={7}>No sales recorded for this month.</td></tr>}</tbody></table></div>
    <h3>Monthly figures & closings</h3>
    <div className="commerce-table"><table><thead><tr><th>Month (PKT)</th><th>Status</th><th>Revenue</th><th>Profit</th><th>Sold</th><th>GPT private</th><th>GPT shared seats</th><th>Withdrawals</th></tr></thead><tbody>{[...months].reverse().map((row) => <tr key={row.date}><td>{dateLabel(row.date)}</td><td>{row.closed ? 'Closed month' : 'Month to date'}</td><td>{money(row.revenue)}</td><td>{profit(row)}</td><td>{row.sold}</td><td>{row.gptPrivate}</td><td>{row.gptShared}</td><td>{row.withdrawals}</td></tr>)}</tbody></table></div>
  </section>;
}
