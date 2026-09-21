'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, CircleCheck, CircleDashed, Layers3, Save, Search, TriangleAlert } from 'lucide-react';
import {
  supplierCatalogGroups,
  type SupplierCatalogGroup,
  type SupplierCatalogStatusProduct,
} from './admin-catalog-status-model';

const statusConfig = {
  listed: { title: 'Listed on website', description: 'A priced, enabled and in-stock offer is ready for customers.', icon: CircleCheck, className: 'catalog-status-live' },
  unlisted: { title: 'Not listed yet', description: 'These groups need a selling price, enabled offer, or available supplier stock.', icon: TriangleAlert, className: 'catalog-status-new' },
  unique: { title: 'Unique products', description: 'Only one supplier currently provides these products.', icon: CircleDashed, className: 'catalog-status-unavailable' },
  duplicates: { title: 'Duplicate supplier offers', description: 'Multiple supplier rows represent the same product and can share one customer price.', icon: Layers3, className: 'catalog-status-duplicate' },
} as const;

function money(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? `PKR ${amount.toLocaleString('en-PK')}`
    : 'Price not set';
}

function GroupRow({
  group,
  onManage,
  onSaveGroupPrice,
  busy,
}: {
  group: SupplierCatalogGroup;
  onManage?: (product: SupplierCatalogStatusProduct) => void;
  onSaveGroupPrice?: (group: SupplierCatalogGroup, price: number) => Promise<void>;
  busy?: boolean;
}) {
  const [price, setPrice] = useState(group.groupSellingPrice ? String(group.groupSellingPrice) : '');
  const [priceError, setPriceError] = useState('');
  const Icon = group.listed ? CircleCheck : TriangleAlert;
  return (
    <article className="catalog-group-row">
      <div className="catalog-group-heading">
        <div className="catalog-status-product">
          <strong>{group.name}</strong>
          <small>{group.products.length} supplier offer{group.products.length === 1 ? '' : 's'} · {group.providerNames.join(', ')}</small>
        </div>
        <span className={`catalog-group-badge ${group.listed ? 'is-listed' : 'is-unlisted'}`}><Icon size={14} /> {group.listed ? 'Listed' : 'Not listed'}</span>
      </div>
      <div className="catalog-group-facts">
        <span><b>Total stock</b>{group.totalStock.toLocaleString('en-PK')}</span>
        <span><b>Lowest supplier cost</b>{money(group.cheapestCost)}</span>
        <span><b>Storefront winner</b>{group.winner?.provider_name || 'Needs setup'}</span>
        <span><b>Customer price</b>{group.groupSellingPrice ? money(group.groupSellingPrice) : 'Mixed / not set'}</span>
      </div>
      <div className="catalog-group-price-editor">
        <label>
          Set customer price for all offers in this group
          <input
            type="number"
            min="1"
            step="1"
            value={price}
            placeholder="e.g. 2499"
            onChange={(event) => { setPrice(event.target.value); setPriceError(''); }}
          />
        </label>
        <button
          type="button"
          className="secondary-button compact"
          disabled={busy || !onSaveGroupPrice}
          onClick={() => {
            const value = Number(price);
            if (!Number.isSafeInteger(value) || value < 1) {
              setPriceError('Enter a whole PKR amount greater than zero.');
              return;
            }
            setPriceError('');
            void onSaveGroupPrice?.(group, value);
          }}
        >
          <Save size={15} /> Save group price
        </button>
        {priceError && <small className="catalog-group-error">{priceError}</small>}
      </div>
      <details className="catalog-group-offers">
        <summary><ChevronDown size={15} /> View supplier offers and fallback order</summary>
        <div className="catalog-group-offer-list">
          {group.products
            .slice()
            .sort((left, right) => Number(left.cost_pkr ?? Number.POSITIVE_INFINITY) - Number(right.cost_pkr ?? Number.POSITIVE_INFINITY))
            .map((product) => (
              <div className={`catalog-group-offer ${group.winner?.id === product.id ? 'is-winner' : ''}`} key={product.id}>
                <div>
                  <strong>{product.provider_name || product.provider_id || 'Supplier'}</strong>
                  <small>{product.name} · {product.external_product_id || product.id}</small>
                </div>
                <span>{Number(product.supplier_stock || 0).toLocaleString('en-PK')} in stock</span>
                <span>{money(product.cost_pkr)} cost</span>
                <span>{product.enabled === true ? 'Enabled' : 'Disabled'} · {money(product.selling_price)}</span>
                {onManage && <button type="button" className="secondary-button compact" onClick={() => onManage(product)}>Edit <ArrowRight size={14} /></button>}
              </div>
            ))}
        </div>
      </details>
    </article>
  );
}

export function AdminCatalogStatus({
  products,
  onManage,
  onSaveGroupPrice,
  busy,
}: {
  products: SupplierCatalogStatusProduct[];
  onManage?: (product: SupplierCatalogStatusProduct) => void;
  onSaveGroupPrice?: (group: SupplierCatalogGroup, price: number) => Promise<void>;
  busy?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<keyof typeof statusConfig>('listed');
  const grouped = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matching = products.filter((product) =>
      !normalized ||
      `${product.name} ${product.provider_name || ''} ${product.external_product_id || ''}`
        .toLowerCase()
        .includes(normalized),
    );
    const groups = supplierCatalogGroups(matching);
    return {
      listed: groups.filter((group) => group.listed),
      unlisted: groups.filter((group) => !group.listed),
      unique: groups.filter((group) => group.unique),
      duplicates: groups.filter((group) => !group.unique),
    };
  }, [products, query]);
  const activeGroups = grouped[activeStatus];
  const activeConfig = statusConfig[activeStatus];
  const ActiveIcon = activeConfig.icon;

  return (
    <div className="admin-workspace catalog-status-workspace">
      <section className="admin-panel catalog-status-intro">
        <div>
          <span className="admin-eyebrow"><Layers3 size={15} /> Supplier catalogue groups</span>
          <h2>Manage one product instead of ten duplicate rows</h2>
          <p>Equivalent supplier offers are grouped together. Set one customer price for the whole group; the cheapest available supplier remains the storefront winner and the others stay available as fallbacks.</p>
        </div>
        <label className="catalog-status-search">
          <Search size={17} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search product or supplier…"
            aria-label="Search grouped supplier catalogue"
          />
        </label>
      </section>
      <div className="catalog-status-summary catalog-group-summary" role="tablist" aria-label="Grouped supplier catalogue filters">
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
      <section className={`admin-panel catalog-status-section ${activeConfig.className}`}>
        <div className="panel-heading catalog-status-section-heading">
          <div>
            <span className="admin-eyebrow"><ActiveIcon size={15} /> {activeConfig.title}</span>
            <h2>{activeConfig.title}</h2>
            <p>{activeConfig.description}</p>
          </div>
          <strong className="catalog-status-count">{activeGroups.length}</strong>
        </div>
        {activeGroups.length ? (
          <div className="catalog-group-list">
            {activeGroups.map((group) => (
              <GroupRow key={group.key} group={group} onManage={onManage} onSaveGroupPrice={onSaveGroupPrice} busy={busy} />
            ))}
          </div>
        ) : (
          <div className="catalog-status-empty"><CircleDashed size={18} /><span>No product groups match this filter.</span></div>
        )}
      </section>
    </div>
  );
}
