export function filterRecordPage<T>(
  rows: T[],
  searchText: (row: T) => string,
  query: string,
  page: number,
  size: number,
  reverse: boolean,
) {
  const filtered = rows.filter((row) =>
    searchText(row).toLowerCase().includes(query.trim().toLowerCase()),
  );
  const sorted = reverse ? [...filtered].reverse() : filtered;
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const current = Math.max(1, Math.min(page, pages));
  return {
    rows: sorted.slice((current - 1) * size, current * size),
    page: current,
    pages,
    count: filtered.length,
  };
}
