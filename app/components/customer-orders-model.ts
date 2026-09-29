export function groupOrdersByDate<T extends { created_at: string }>(orders: T[], timeZone?: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', ...(timeZone ? { timeZone } : {}),
  });
  const groups = new Map<string, { label: string; orders: T[] }>();
  for (const order of orders) {
    const date = new Date(order.created_at);
    const label = Number.isNaN(date.getTime()) ? 'Date unavailable' : formatter.format(date);
    if (!groups.has(label)) groups.set(label, { label, orders: [] });
    groups.get(label)!.orders.push(order);
  }
  return [...groups.values()];
}
