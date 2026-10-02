'use client';

import { useEffect, useMemo, useState } from 'react';
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
  onSaveOfferPrice,
  busy,
}: {
  group: SupplierCatalogGroup;
  onManage?: (product: SupplierCatalogStatusProduct) => void;
  onSaveOfferPrice?: (product: SupplierCatalogStatusProduct, price: number, enabled: boolean, originalPrice: number | null) => Promise<void>;
  busy?: boolean;
}) {
  const [offerPrices, setOfferPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(group.products.map((product) => [product.id, product.selling_price ? String(product.selling_price) : ''])),
  );
  const [offerEnabled, setOfferEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(group.products.map((product) => [product.id, product.enabled === true])),
  );
  const [originalPrices, setOriginalPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(group.products.map((product) => [product.id, product.original_price_pkr == null ? '' : String(product.original_price_pkr)])),
  );
  useEffect(() => {
    setOriginalPrices(Object.fromEntries(group.products.map((product) => [product.id, product.original_price_pkr == null ? '' : String(product.original_price_pkr)])));
    setOfferPrices(Object.fromEntries(group.products.map((product) => [product.id, product.selling_price ? String(product.selling_price) : ''])));
    setOfferEnabled(Object.fromEntries(group.products.map((product) => [product.id, product.enabled === true])));
  }, [group.products]);
  const [priceErrors, setPriceErrors] = useState<Record<string, string>>({});
  const Icon = group.listed ? CircleCheck : TriangleAlert;
  async function saveOffer(product: SupplierCatalogStatusProduct) {
    const price = Number(offerPrices[product.id]);
    const originalPrice = (originalPrices[product.id] || '').trim() === '' ? null : Number(originalPrices[product.id]);
    if (!Number.isSafeInteger(price) || price < 1 || price > 2147483647) {
      setPriceErrors((current) => ({ ...current, [product.id]: 'Enter a whole PKR selling price.' })); return;
    }
    if (originalPrice !== null && (!Number.isSafeInteger(originalPrice) || originalPrice < price || originalPrice > 2147483647)) {
      setPriceErrors((current) => ({ ...current, [product.id]: 'Original price must be a whole PKR amount at least equal to the selling price.' })); return;
    }
    setPriceErrors((current) => ({ ...current, [product.id]: '' }));
    await onSaveOfferPrice?.(product, price, offerEnabled[product.id] === true, originalPrice);
  }
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
      <div className="catalog-group-offer-intro">
        <strong>Individual supplier pricing</strong>
        <span>Set each supplier’s customer price separately. The lowest-cost eligible offer becomes Primary automatically.</span>
      </div>
      <details className="catalog-group-offers" open>
        <summary><ChevronDown size={15} /> Supplier offers and fallback order</summary>
        <div className="catalog-group-offer-list mobile-records"><table><thead><tr><th>Priority</th><th>Supplier offer</th><th>Stock</th><th>Supplier cost</th><th>Individual customer price</th><th>Original price (PKR)</th><th>Live</th><th>Action</th></tr></thead><tbody>
          {group.products
            .slice()
            .sort((left, right) => Number(left.cost_pkr ?? Number.POSITIVE_INFINITY) - Number(right.cost_pkr ?? Number.POSITIVE_INFINITY))
            .map((product) => (
              <tr className={group.winner?.id === product.id ? 'is-winner' : ''} key={product.id}>
                <td data-label="Priority"><strong>{group.winner?.id === product.id ? 'Primary' : 'Backup'}</strong></td>
                <td data-label="Supplier offer"><strong>{product.provider_name || product.provider_id || 'Supplier'}</strong><small>{product.name} · {product.external_product_id || product.id}</small></td>
                <td data-label="Stock">{Number(product.supplier_stock || 0).toLocaleString('en-PK')}</td>
                <td data-label="Supplier cost">{money(product.cost_pkr)}</td>
                <td data-label="Customer price"><input className="catalog-offer-price-input" type="number" min="1" step="1" aria-label={`Customer price for ${product.name} from ${product.provider_name || product.provider_id || 'supplier'}`} value={offerPrices[product.id] || ''} placeholder="e.g. 2499" onChange={(event) => { setOfferPrices((current) => ({ ...current, [product.id]: event.target.value })); setPriceErrors((current) => ({ ...current, [product.id]: '' })); }} /></td>
                <td data-label="Original price"><input className="catalog-offer-price-input" type="number" min="1" step="1" aria-label={`Original price for ${product.name} from ${product.provider_name || product.provider_id || 'supplier'}`} value={originalPrices[product.id] || ''} placeholder="Full package PKR" onChange={(event) => { setOriginalPrices((current) => ({ ...current, [product.id]: event.target.value })); setPriceErrors((current) => ({ ...current, [product.id]: '' })); }} /><small>{originalPrices[product.id] && offerPrices[product.id] ? `Savings: PKR ${Math.max(0, Number(originalPrices[product.id]) - Number(offerPrices[product.id])).toLocaleString('en-PK')}` : 'Optional · blank uses automatic reference'}</small></td>
                <td data-label="Live"><label className="catalog-offer-live"><input type="checkbox" checked={offerEnabled[product.id] === true} onChange={(event) => setOfferEnabled((current) => ({ ...current, [product.id]: event.target.checked }))} /> Live</label></td>
                <td data-label="Action"><button type="button" className="secondary-button compact" disabled={busy || !onSaveOfferPrice} onClick={() => void saveOffer(product)}> <Save size={14} /> Save</button>{onManage && <button type="button" className="icon-command" onClick={() => onManage(product)} aria-label={`Advanced edit ${product.name}`}><ArrowRight size={14} /></button>}{priceErrors[product.id] && <small className="catalog-group-error">{priceErrors[product.id]}</small>}</td>
              </tr>
            ))}
        </tbody></table></div>
      </details>
    </article>
  );
}

export function AdminCatalogStatus({
  products,
  onManage,
  onSaveOfferPrice,
  busy,
}: {
  products: SupplierCatalogStatusProduct[];
  onManage?: (product: SupplierCatalogStatusProduct) => void;
  onSaveOfferPrice?: (product: SupplierCatalogStatusProduct, price: number, enabled: boolean, originalPrice: number | null) => Promise<void>;
  busy?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<keyof typeof statusConfig>('listed');
  const grouped = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const groups = supplierCatalogGroups(products).filter((group) =>
      !normalized || group.products.some((product) =>
        `${product.name} ${product.provider_name || ''} ${product.external_product_id || ''} ${product.canonical_key || ''}`
          .toLowerCase()
          .includes(normalized)),
    );
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
              <GroupRow key={group.key} group={group} onManage={onManage} onSaveOfferPrice={onSaveOfferPrice} busy={busy} />
            ))}
          </div>
        ) : (
          <div className="catalog-status-empty"><CircleDashed size={18} /><span>No product groups match this filter.</span></div>
        )}
      </section>
    </div>
  );
}
