'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CircleCheck,
  CircleDashed,
  Search,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import {
  supplierCatalogStatus,
  supplierStatusLabel,
  type SupplierCatalogStatusProduct,
} from './admin-catalog-status-model';

const statusConfig = {
  live: {
    title: 'Live and ready',
    description: 'Supplier has stock, a selling price is set, and the listing is enabled on the website.',
    icon: CircleCheck,
    className: 'catalog-status-live',
  },
  'available-not-live': {
    title: 'New supplier products',
    description: 'Supplier has stock, but pricing or the website-enabled setting still needs to be completed.',
    icon: Sparkles,
    className: 'catalog-status-new',
  },
  'published-unavailable': {
    title: 'Published but unavailable',
    description: 'A selling price exists, but the supplier currently reports no stock.',
    icon: TriangleAlert,
    className: 'catalog-status-unavailable',
  },
} as const;

function money(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? `PKR ${amount.toLocaleString('en-PK')}`
    : 'Price not set';
}

function StatusList({
  status,
  products,
  onManage,
  id,
}: {
  status: keyof typeof statusConfig;
  products: SupplierCatalogStatusProduct[];
  onManage: (product: SupplierCatalogStatusProduct) => void;
  id: string;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <section id={id} className={`admin-panel catalog-status-section ${config.className}`} role="tabpanel" aria-labelledby={`${id}-tab`}>
      <div className="panel-heading catalog-status-section-heading">
        <div>
          <span className="admin-eyebrow"><Icon size={15} /> {supplierStatusLabel(status)}</span>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>
        <strong className="catalog-status-count">{products.length}</strong>
      </div>
      {products.length ? (
        <div className="catalog-status-list">
          {products.map((product) => (
            <article className="catalog-status-row" key={product.id}>
              <div className="catalog-status-product">
                <strong>{product.name}</strong>
                <small>{product.provider_name || product.provider_id || 'Supplier'} · {product.external_product_id || product.id}</small>
              </div>
              <div className="catalog-status-facts">
                <span><b>Supplier stock</b>{Number(product.supplier_stock || 0).toLocaleString('en-PK')}</span>
                <span><b>Selling price</b>{money(product.selling_price)}</span>
                <span><b>Website</b>{product.enabled === true ? 'Enabled' : 'Not enabled'}</span>
              </div>
              <button type="button" className="secondary-button compact" onClick={() => onManage(product)}>
                Manage <ArrowRight size={15} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="catalog-status-empty">
          <CircleDashed size={18} />
          <span>No products in this group right now.</span>
        </div>
      )}
    </section>
  );
}

export function AdminCatalogStatus({
  products,
  onManage,
}: {
  products: SupplierCatalogStatusProduct[];
  onManage: (product: SupplierCatalogStatusProduct) => void;
}) {
  const [query, setQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<keyof typeof statusConfig>('live');
  const grouped = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matching = products.filter((product) =>
      !normalized ||
      `${product.name} ${product.provider_name || ''} ${product.external_product_id || ''}`
        .toLowerCase()
        .includes(normalized),
    );
    return {
      live: matching.filter((product) => supplierCatalogStatus(product) === 'live'),
      'available-not-live': matching.filter((product) => supplierCatalogStatus(product) === 'available-not-live'),
      'published-unavailable': matching.filter((product) => supplierCatalogStatus(product) === 'published-unavailable'),
      unconfigured: matching.filter((product) => supplierCatalogStatus(product) === 'unconfigured'),
    };
  }, [products, query]);

  return (
    <div className="admin-workspace catalog-status-workspace">
      <section className="admin-panel catalog-status-intro">
        <div>
          <span className="admin-eyebrow">Supplier versus storefront</span>
          <h2>Catalog status</h2>
          <p>See what is ready to sell, what needs your pricing decision, and what lost supplier stock after being published.</p>
        </div>
        <label className="catalog-status-search">
          <Search size={17} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search product or supplier…"
            aria-label="Search catalog status"
          />
        </label>
      </section>
      <div className="catalog-status-summary" role="tablist" aria-label="Catalog status lists">
        {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((status) => (
          <button
            type="button"
            role="tab"
            id={`catalog-status-${status}-tab`}
            aria-selected={activeStatus === status}
            aria-controls={`catalog-status-${status}`}
            className={`catalog-status-summary-card ${statusConfig[status].className}${activeStatus === status ? ' active' : ''}`}
            key={status}
            onClick={() => setActiveStatus(status)}
          >
            <span>{statusConfig[status].title}</span>
            <strong>{grouped[status].length}</strong>
          </button>
        ))}
      </div>
      <StatusList
        status={activeStatus}
        products={grouped[activeStatus]}
        onManage={onManage}
        id={`catalog-status-${activeStatus}`}
      />
      {grouped.unconfigured.length > 0 && (
        <p className="catalog-status-note">
          {grouped.unconfigured.length} supplier record(s) have no stock and no selling price, so they are kept out of the three action groups above.
        </p>
      )}
    </div>
  );
}
