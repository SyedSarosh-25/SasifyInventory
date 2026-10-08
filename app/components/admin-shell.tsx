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
  ClipboardCheck,
  ShieldAlert,
  ShieldX,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Search,
  RefreshCw,
  LogOut,
  ArrowUpRight,
  MessageSquarePlus,
  LifeBuoy,
  Mail,
  ChevronDown,
  Bot,
  Star,
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
  ['whatsappBot', 'WhatsApp Bot', Bot],
  ['manualOrders', 'Manual orders', ClipboardCheck],
  ['customers', 'Registered users', Users],
  ['userDetail', 'User detail', Users],
  ['refunds', 'Refunds / replacements', RefreshCw],
  ['emailCampaign', 'Email campaigns', Mail],
  ['resellerRequests', 'Reseller requests', ClipboardCheck],
  ['payments', 'Payments', WalletCards],
  ['paymentAccounts', 'Payment accounts', WalletCards],
  ['inventory', 'Inventory', Package],
  ['supplier', 'Supplier Store', ShoppingCart],
  ['coupons', 'Coupons', TicketPercent],
  ['productReviews', 'Product reviews', Star],
  ['commissions', 'Commissions', BadgeDollarSign],
  ['profit', 'Profit', WalletCards],
  ['team', 'Team access', Users],
  ['toolRequests', 'Tool requests', MessageSquarePlus],
  ['requirements', 'Required tools', MessageSquarePlus],
  ['blockedUsers', 'Blocked users', ShieldX],
  ['scammers', 'Scam reports', ShieldAlert],
  ['support', 'Support tickets', LifeBuoy],
] as const;
export type AdminSection =
  | (typeof adminSections)[number][0]
  | 'products'
  | 'catalogStatus'
  | 'auditLogs'
  | 'settings'
  | 'transactions';

const adminSectionGroups: { label: string; items: AdminSection[] }[] = [
  {
    label: 'Workspace',
    items: ['overview', 'orders', 'whatsappBot', 'manualOrders', 'customers', 'userDetail', 'refunds', 'emailCampaign'],
  },
  {
    label: 'Payments & finance',
    items: ['payments', 'paymentAccounts', 'profit', 'commissions'],
  },
  {
    label: 'Catalog & stock',
    items: ['inventory', 'supplier', 'coupons', 'productReviews'],
  },
  {
    label: 'Resellers & team',
    items: ['resellerRequests', 'requirements', 'team', 'toolRequests'],
  },
  {
    label: 'Risk & support',
    items: ['blockedUsers', 'scammers', 'support'],
  },
];

const sectionDescriptions: Record<string, string> = {
  overview: 'Your business at a glance. Every order, every day.',
  orders: 'Track purchases, review order details and manage delivery.',
  whatsappBot: 'Control AI WhatsApp assistant, real-time message stream, escalations, and answer training.',
  manualOrders: 'Handle Claude pre-orders and manual Hostinger activations.',
  customers: 'Customer and reseller accounts, wallet balances and purchase activity.',
  userDetail: 'Complete customer history and wallet controls.',
  refunds: 'Review cloud account refund and replacement calculations.',
  emailCampaign: 'Send a controlled announcement to registered Sasify users.',
  resellerRequests: 'Review applications to join Sasify as a reseller.',
  payments: 'Review incoming receipts and their verification status.',
  paymentAccounts: 'Manage receiving accounts and your active payment destination.',
  inventory: 'Organize account stock and monitor availability.',
  supplier: 'Edit product copy, compare costs and set your selling prices.',
  coupons: 'Manage discount codes and their usage limits.',
  productReviews: 'Manage customer reviews, approve submissions, and upload WhatsApp proof screenshots.',
  commissions: 'Review commissions and partner earnings.',
  profit: 'Understand revenue, costs and business performance.',
  team: 'Manage teammate access to your workspace.',
  toolRequests: 'Review customer requests and follow up on availability.',
  requirements: 'Publish requirements and connect with resellers who can provide them.',
  blockedUsers: 'Review blocked visitors and manage access restrictions.',
  scammers: 'Review and manage reported scams.',
  support: 'Reply to customers and resolve support tickets.',
};

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
  const [mobileSearch, setMobileSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(
      adminSectionGroups.map(({ label }, index) => [label, index < 2]),
    ),
  );
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
    setMobileSearch('');
  }
  const navigation = (filter = '') => (
    <nav aria-label="Admin sections" className="ops-navigation">
      {adminSectionGroups.map((group) => {
        const sections = group.items
          .map((value) => adminSections.find((section) => section[0] === value))
          .filter((section): section is (typeof adminSections)[number] =>
            Boolean(section && section[1].toLowerCase().includes(filter.toLowerCase().trim())),
          );
        if (!sections.length) return null;
        const expanded = Boolean(filter.trim()) || expandedGroups[group.label];
        return (
          <div className="ops-navigation-group" key={group.label}>
            <button
              type="button"
              className="ops-navigation-group-toggle"
              aria-expanded={expanded}
              onClick={() =>
                setExpandedGroups((current) => ({
                  ...current,
                  [group.label]: !current[group.label],
                }))
              }
            >
              <span>{group.label}</span>
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={expanded ? undefined : 'is-collapsed'}
              />
            </button>
            {expanded &&
              sections.map(([value, label, Icon]) => (
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
          </div>
        );
      })}
      {filter.trim() && !adminSections.some(([, label]) =>
        label.toLowerCase().includes(filter.toLowerCase().trim()),
      ) && <p className="ops-navigation-empty">No matching sections.</p>}
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
        {navigation()}
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
              <label className="ops-mobile-search">
                <Search size={17} aria-hidden="true" />
                <input
                  aria-label="Search admin sections"
                  placeholder="Find a section…"
                  value={mobileSearch}
                  onChange={(event) => setMobileSearch(event.target.value)}
                />
              </label>
              {navigation(mobileSearch)}
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
            aria-label="Sign out"
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
                {sectionDescriptions[tab]}
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

