'use client';
import { useEffect, useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  WalletCards,
  TicketPercent,
  BadgeDollarSign,
  Users,
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Search,
  RefreshCw,
  LogOut,
  ArrowUpRight,
  MessageSquarePlus,
} from 'lucide-react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '../../components/ui/sheet';

export const adminSections = [
  ['overview', 'Overview', LayoutDashboard],
  ['orders', 'Orders', ClipboardList],
  ['payments', 'Payments', WalletCards],
  ['inventory', 'Inventory', Package],
  ['supplier', 'Supplier Store', ShoppingCart],
  ['coupons', 'Coupons', TicketPercent],
  ['commissions', 'Commissions', BadgeDollarSign],
  ['profit', 'Profit', WalletCards],
  ['team', 'Team access', Users],
  ['toolRequests', 'Tool requests', MessageSquarePlus],
  ['scammers', 'Scam reports', ShieldAlert],
] as const;
export type AdminSection = (typeof adminSections)[number][0];

// Presentation only: all authorization, polling and mutations remain in CommerceAdmin.
export function AdminShell({
  tab,
  onNavigate,
  busy,
  onRefresh,
  onLogout,
  autoVerify,
  children,
}: {
  tab: AdminSection;
  onNavigate: (tab: AdminSection) => void;
  busy: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  autoVerify: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  useEffect(() => {
    try {
      setCollapsed(
        localStorage.getItem('sasify-admin-sidebar') === 'collapsed',
      );
    } catch {
      /* Storage may be disabled. */
    }
  }, []);
  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(
        'sasify-admin-sidebar',
        next ? 'collapsed' : 'expanded',
      );
    } catch {
      /* Keep session preference. */
    }
  }
  function navigate(value: AdminSection) {
    onNavigate(value);
    setOpen(false);
    setSearch('');
  }
  const navigation = (
    <nav aria-label="Admin sections" className="ops-navigation">
      {adminSections.map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          title={label}
          aria-label={label}
          aria-current={value === tab ? 'page' : undefined}
          onClick={() => navigate(value)}
        >
          <Icon size={19} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
  const title =
    adminSections.find(([value]) => value === tab)?.[1] || 'Overview';
  return (
    <div
      className={`commerce-shell commerce-admin ops-shell${collapsed ? ' ops-collapsed' : ''}`}
    >
      <a className="ops-skip" href="#ops-content">
        Skip to workspace
      </a>
      <aside className="ops-sidebar">
        <a href="/" className="ops-brand" aria-label="Sasify Solutions home">
          <img src="/sasify-logo.png" width="36" height="36" alt="" />
          <span>
            SASIFY<small>OPERATIONS</small>
          </span>
        </a>
        <p className="ops-nav-caption">WORKSPACE</p>
        {navigation}
        <div className="ops-sidebar-bottom">
          <a href="/" title="Open storefront">
            <ArrowUpRight size={18} />
            <span>Open storefront</span>
          </a>
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
            <span>Collapse sidebar</span>
          </button>
        </div>
      </aside>
      <div className="ops-main">
        <header className="ops-topbar">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="ops-mobile-menu icon-command"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </SheetTrigger>
            <SheetContent side="left" className="ops-mobile-drawer">
              <SheetTitle>Sasify operations</SheetTitle>
              <SheetDescription>Choose a workspace</SheetDescription>
              {navigation}
            </SheetContent>
          </Sheet>
          <div className="ops-breadcrumb">
            Workspace <span>/</span> <strong>{title}</strong>
          </div>
          <div className="ops-module-search">
            <label>
              <Search size={17} />
              <input
                aria-label="Find an admin section"
                placeholder="Find a section…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearch('');
                }}
              />
            </label>
            {search && (
              <div className="ops-search-results">
                {adminSections
                  .filter(([, label]) =>
                    label.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map(([value, label]) => (
                    <button key={value} onClick={() => navigate(value)}>
                      {label}
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
                {!adminSections.some(([, label]) =>
                  label.toLowerCase().includes(search.toLowerCase()),
                ) && <p>No matching sections.</p>}
              </div>
            )}
          </div>
          <button
            className="icon-command"
            aria-label="Refresh dashboard"
            title="Refresh dashboard"
            disabled={busy}
            onClick={onRefresh}
          >
            <RefreshCw size={18} />
          </button>
          <button
            className="ops-signout"
            disabled={busy}
            onClick={onLogout}
            title="Sign out"
          >
            <LogOut size={17} />
            <span>Sign out</span>
          </button>
        </header>
        <div id="ops-content" className="ops-content" tabIndex={-1}>
          <div className="ops-page-heading">
            <div>
              <span className="admin-eyebrow">Sasify operations</span>
              <h1>{tab === 'overview' ? 'Commerce overview' : title}</h1>
              <p>
                {tab === 'overview'
                  ? 'Your business at a glance. Every order, every day.'
                  : 'Manage your workspace with the latest available records.'}
              </p>
            </div>
            <span className={`ops-health ${autoVerify ? 'enabled' : ''}`}>
              Verification: {autoVerify ? 'Enabled' : 'Manual'}
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
