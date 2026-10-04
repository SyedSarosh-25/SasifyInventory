'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleDashed,
  Layers3,
  Save,
  Search,
  TriangleAlert,
  Zap,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  supplierCatalogGroups,
  type SupplierCatalogGroup,
  type SupplierCatalogStatusProduct,
} from './admin-catalog-status-model';



function GroupRow({
  group,
  onManage,
  onSaveOfferPrice,
  busy,
}: {
  group: SupplierCatalogGroup;
  onManage?: (product: SupplierCatalogStatusProduct) => void;
  onSaveOfferPrice?: (
    product: SupplierCatalogStatusProduct,
    price: number,
    enabled: boolean,
    originalPrice: number | null
  ) => Promise<void>;
  busy?: boolean;
}) {
  const lowestCost = Number(group.cheapestCost || 0);

  // Group level pricing state
  const initialGroupPrice = group.groupSellingPrice ? String(group.groupSellingPrice) : '';
  const [groupPrice, setGroupPrice] = useState<string>(initialGroupPrice);
  const [isLive, setIsLive] = useState<boolean>(group.listed);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Individual offer states for advanced override
  const [offerPrices, setOfferPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(group.products.map((p) => [p.id, p.selling_price ? String(p.selling_price) : '']))
  );
  const [offerEnabled, setOfferEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(group.products.map((p) => [p.id, p.enabled === true]))
  );

  useEffect(() => {
    setGroupPrice(group.groupSellingPrice ? String(group.groupSellingPrice) : '');
    setIsLive(group.listed);
    setOfferPrices(
      Object.fromEntries(group.products.map((p) => [p.id, p.selling_price ? String(p.selling_price) : '']))
    );
    setOfferEnabled(
      Object.fromEntries(group.products.map((p) => [p.id, p.enabled === true]))
    );
  }, [group]);

  // Live profit calculation
  const numericPrice = Number(groupPrice);
  const hasValidPrice = Number.isSafeInteger(numericPrice) && numericPrice > 0;
  const profit = hasValidPrice && lowestCost > 0 ? numericPrice - lowestCost : null;
  const marginPct =
    hasValidPrice && numericPrice > 0 && profit !== null ? Math.round((profit / numericPrice) * 100) : null;

  // Quick margin handlers
  const applyFlatMargin = (amount: number) => {
    const base = lowestCost > 0 ? lowestCost : 0;
    const target = Math.ceil(base + amount);
    setGroupPrice(String(target));
    setErrorMessage('');
  };

  const applyPercentMargin = (percent: number) => {
    const base = lowestCost > 0 ? lowestCost : 0;
    const target = Math.ceil(base * (1 + percent / 100));
    setGroupPrice(String(target));
    setErrorMessage('');
  };

  // 1-Click Save for whole group
  const handleSaveGroup = async () => {
    if (!hasValidPrice) {
      setErrorMessage('Enter a valid whole PKR price.');
      return;
    }
    setSaveStatus('saving');
    setErrorMessage('');
    try {
      if (onSaveOfferPrice) {
        // Save all offers in the group to this selling price
        await Promise.all(
          group.products.map((product) =>
            onSaveOfferPrice(product, numericPrice, isLive, null)
          )
        );
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      setErrorMessage(err.message || 'Failed to save');
    }
  };

  // Save single offer in advanced breakdown
  const handleSaveSingleOffer = async (product: SupplierCatalogStatusProduct) => {
    const price = Number(offerPrices[product.id]);
    if (!Number.isSafeInteger(price) || price < 1) {
      setErrorMessage(`Enter a valid price for ${product.name}`);
      return;
    }
    setSaveStatus('saving');
    try {
      await onSaveOfferPrice?.(product, price, offerEnabled[product.id] === true, null);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err: any) {
      setSaveStatus('error');
      setErrorMessage(err.message || 'Failed to save offer');
    }
  };

  return (
    <article className="catalog-group-card p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition hover:shadow-md space-y-4">
      {/* 1. Header: Product Title, Badges, Best Supplier */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-snug break-words">
              {group.name}
            </h3>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                group.listed
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-500/20'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-500/20'
              }`}
            >
              {group.listed ? (
                <>
                  <CircleCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Listed</span>
                </>
              ) : (
                <>
                  <TriangleAlert size={12} className="text-amber-600 dark:text-amber-400" />
                  <span>Not listed</span>
                </>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Best Supplier:{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {group.winner?.provider_name || group.providerNames[0] || 'Supplier'}
              </strong>
            </span>
            <span>•</span>
            <span>
              Stock:{' '}
              <strong
                className={
                  group.totalStock > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-500 font-medium'
                }
              >
                {group.totalStock > 0 ? `${group.totalStock} in stock` : 'Out of stock'}
              </strong>
            </span>
            {group.products.length > 1 && (
              <>
                <span>•</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {group.products.length} suppliers available
                </span>
              </>
            )}
          </div>
        </div>

        {onManage && group.winner && (
          <button
            type="button"
            onClick={() => onManage(group.winner!)}
            className="self-start sm:self-auto text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 font-medium transition"
            title="Advanced details, title & description"
          >
            <span>Full Edit</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* 2. Financial Metrics Bar (Mobile 2x2, Desktop 4x1) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-0.5">Supplier Cost</span>
          <strong className="text-slate-900 dark:text-slate-100 text-sm font-semibold font-mono">
            {lowestCost > 0 ? `PKR ${lowestCost.toLocaleString('en-PK')}` : 'Free / N/A'}
          </strong>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-0.5">Store Price</span>
          <strong className="text-slate-900 dark:text-slate-100 text-sm font-semibold font-mono">
            {group.groupSellingPrice ? `PKR ${Number(group.groupSellingPrice).toLocaleString('en-PK')}` : 'Unset'}
          </strong>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-0.5">Your Profit</span>
          <strong
            className={`text-sm font-semibold font-mono ${
              profit !== null && profit > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : profit !== null && profit < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {profit !== null ? `${profit >= 0 ? '+' : ''}PKR ${profit.toLocaleString('en-PK')}` : '—'}
          </strong>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-0.5">Profit Margin</span>
          <strong
            className={`text-sm font-semibold font-mono ${
              marginPct !== null && marginPct > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : marginPct !== null && marginPct < 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {marginPct !== null ? `${marginPct}%` : '—'}
          </strong>
        </div>
      </div>

      {/* 3. 1-Click Simplified Pricing Box (Mobile-first) */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-blue-100 dark:border-blue-950/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Selling Price Input */}
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
              Selling Price:
            </label>
            <div className="relative flex-1 max-w-[220px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                PKR
              </span>
              <input
                type="number"
                min="1"
                step="1"
                value={groupPrice}
                onChange={(e) => {
                  setGroupPrice(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="e.g. 2499"
                className="w-full pl-12 pr-3 py-2 text-sm sm:text-base font-bold font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Live Checkbox & Save Button */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-200 select-none">
              <input
                type="checkbox"
                checked={isLive}
                onChange={(e) => setIsLive(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
              />
              <span>Live on Store</span>
            </label>

            <button
              type="button"
              disabled={busy || saveStatus === 'saving'}
              onClick={handleSaveGroup}
              className={`flex-1 sm:flex-none text-xs sm:text-sm px-4 py-2 rounded-lg font-bold text-white shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95 ${
                saveStatus === 'saved'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saveStatus === 'saving' ? (
                <>Saving...</>
              ) : saveStatus === 'saved' ? (
                <>
                  <Check size={15} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Save & Publish</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Profit Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-blue-100/80 dark:border-blue-900/50">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Zap size={12} className="text-amber-500" /> Quick Margins:
          </span>
          {[
            { label: '+300', action: () => applyFlatMargin(300) },
            { label: '+500', action: () => applyFlatMargin(500) },
            { label: '+1,000', action: () => applyFlatMargin(1000) },
            { label: '+2,000', action: () => applyFlatMargin(2000) },
            { label: '+30%', action: () => applyPercentMargin(30) },
            { label: '+50%', action: () => applyPercentMargin(50) },
          ].map((btn, i) => (
            <button
              key={i}
              type="button"
              onClick={btn.action}
              className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 shadow-2xs transition active:scale-95"
            >
              {btn.label}
            </button>
          ))}
        </div>

        {errorMessage && (
          <p className="text-xs text-rose-500 font-medium">{errorMessage}</p>
        )}
      </div>

      {/* 4. Collapsible Advanced Supplier Offer Breakdown (Collapsed by default!) */}
      <div className="pt-0.5">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1 font-medium transition py-1"
        >
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>
            {showAdvanced
              ? 'Hide individual supplier breakdown'
              : `Advanced: Customize individual suppliers (${group.products.length} offers)`}
          </span>
        </button>

        {showAdvanced && (
          <div className="mt-2.5 space-y-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            {group.products.map((product) => {
              const isWinner = group.winner?.id === product.id;
              const prodCost = Number(product.cost_pkr || 0);
              return (
                <div
                  key={product.id}
                  className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isWinner
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <strong className="text-slate-900 dark:text-slate-100">
                        {product.provider_name || product.provider_id || 'Supplier'}
                      </strong>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          isWinner
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isWinner ? 'Primary (Cheapest)' : 'Backup'}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-md">
                      {product.name} • Stock: {product.supplier_stock ?? 0} • Cost: PKR{' '}
                      {prodCost.toLocaleString('en-PK')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-28">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={offerPrices[product.id] || ''}
                        onChange={(e) =>
                          setOfferPrices({ ...offerPrices, [product.id]: e.target.value })
                        }
                        placeholder="PKR"
                        className="w-full px-2.5 py-1 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={offerEnabled[product.id] === true}
                        onChange={(e) =>
                          setOfferEnabled({ ...offerEnabled, [product.id]: e.target.checked })
                        }
                      />
                      <span>Live</span>
                    </label>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleSaveSingleOffer(product)}
                      className="px-2.5 py-1 text-xs rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold transition"
                    >
                      Save
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
  onSaveOfferPrice?: (
    product: SupplierCatalogStatusProduct,
    price: number,
    enabled: boolean,
    originalPrice: number | null
  ) => Promise<void>;
  busy?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'not-listed' | 'listed' | 'in-stock' | 'all'>('not-listed');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Compute all groups
  const allGroups = useMemo(() => {
    return supplierCatalogGroups(products);
  }, [products]);

  // Tab counts
  const countNotListed = useMemo(() => allGroups.filter((g) => !g.listed).length, [allGroups]);
  const countListed = useMemo(() => allGroups.filter((g) => g.listed).length, [allGroups]);
  const countInStock = useMemo(() => allGroups.filter((g) => g.totalStock > 0).length, [allGroups]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    let list = allGroups;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.products.some((p) =>
            `${p.name} ${p.provider_name || ''} ${p.external_product_id || ''} ${p.canonical_key || ''}`
              .toLowerCase()
              .includes(q)
          )
      );
    }

    if (activeTab === 'not-listed') {
      list = list.filter((g) => !g.listed);
    } else if (activeTab === 'listed') {
      list = list.filter((g) => g.listed);
    } else if (activeTab === 'in-stock') {
      list = list.filter((g) => g.totalStock > 0);
    }

    return list;
  }, [allGroups, query, activeTab]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, activeTab]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedGroups = filteredGroups.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="admin-workspace catalog-status-workspace space-y-4">
      {/* Intro Header & Instant Search */}
      <section className="admin-panel catalog-status-intro p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="admin-eyebrow text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mb-1">
            <Sparkles size={14} /> Simplified Supplier Pricing Center
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Set One Price & Instant Profit Margins
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Enter your customer price or tap a quick profit button (+500, +1000, 50%). The cheapest supplier is auto-selected as primary.
          </p>
        </div>

        {/* Search input with clear button */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product (e.g. Canva, Netflix)..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </section>

      {/* Filter Tabs (Mobile Scrollable Pill Row) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'not-listed', label: 'Not listed yet', count: countNotListed, icon: TriangleAlert, color: 'text-amber-600' },
          { key: 'listed', label: 'Listed on website', count: countListed, icon: CircleCheck, color: 'text-emerald-600' },
          { key: 'in-stock', label: 'In stock only', count: countInStock, icon: Zap, color: 'text-blue-600' },
          { key: 'all', label: 'All products', count: allGroups.length, icon: Layers3, color: 'text-purple-600' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap select-none border ${
                isActive
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : tab.color} />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pagination Bar Top */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span>
            Showing <strong>{startIndex + 1}</strong>–<strong>{Math.min(startIndex + itemsPerPage, filteredGroups.length)}</strong> of <strong>{filteredGroups.length}</strong> products
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300 px-1">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Products List (Cards Stack) */}
      {paginatedGroups.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {paginatedGroups.map((group) => (
            <GroupRow
              key={group.key}
              group={group}
              onManage={onManage}
              onSaveOfferPrice={onSaveOfferPrice}
              busy={busy}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 space-y-2">
          <CircleDashed size={28} className="mx-auto text-slate-400" />
          <h4 className="font-bold text-slate-800 dark:text-slate-200">No products match this filter</h4>
          <p className="text-xs">Try searching with a different keyword or reset filters.</p>
        </div>
      )}

      {/* Pagination Bar Bottom */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 px-1">
          <span>
            Page <strong>{safePage}</strong> of <strong>{totalPages}</strong> ({filteredGroups.length} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 300, behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 300, behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
