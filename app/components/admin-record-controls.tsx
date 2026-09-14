'use client';
import { useState } from 'react';
import { filterRecordPage } from './admin-record-model';

// Filters only the records already returned by admin-list; never fetches or mutates.
export function useRecordView<T>(rows: T[], searchText: (row: T) => string) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [reverse, setReverse] = useState(false);
  return {
    ...filterRecordPage(rows, searchText, query, page, size, reverse),
    query,
    size,
    reverse,
    setQuery: (value: string) => {
      setQuery(value);
      setPage(1);
    },
    setSize: (value: number) => {
      setSize(value);
      setPage(1);
    },
    setReverse: (value: boolean) => {
      setReverse(value);
      setPage(1);
    },
    setPage,
  };
}
type RecordControls = Omit<ReturnType<typeof useRecordView>, 'rows'>;
export function AdminRecordControls({
  view,
  label,
  hideSearch = false,
  orderLabels = ['Newest first', 'Oldest first'],
}: {
  view: RecordControls;
  label: string;
  hideSearch?: boolean;
  orderLabels?: [string, string];
}) {
  return (
    <div className="ops-record-controls">
      {!hideSearch && (
        <label>
          Search {label}
          <input
            type="search"
            value={view.query}
            placeholder="Search loaded records…"
            onChange={(e) => view.setQuery(e.target.value)}
          />
        </label>
      )}
      <label>
        Order
        <select
          value={view.reverse ? 'reverse' : 'default'}
          onChange={(e) => view.setReverse(e.target.value === 'reverse')}
        >
          <option value="default">{orderLabels[0]}</option>
          <option value="reverse">{orderLabels[1]}</option>
        </select>
      </label>
      <label>
        Per page
        <select
          value={view.size}
          onChange={(e) => view.setSize(Number(e.target.value))}
        >
          {[10, 25, 50].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <div className="ops-pagination">
        <span>
          {view.count} matching records · {view.page}/{view.pages}
        </span>
        <button
          type="button"
          className="secondary-button compact"
          aria-label={`Previous ${label} page`}
          disabled={view.page <= 1}
          onClick={() => view.setPage(view.page - 1)}
        >
          ←
        </button>
        <button
          type="button"
          className="secondary-button compact"
          aria-label={`Next ${label} page`}
          disabled={view.page >= view.pages}
          onClick={() => view.setPage(view.page + 1)}
        >
          →
        </button>
      </div>
    </div>
  );
}
