export type ClaudeEmailOrder = {
  product_id: string;
  customer_email?: string | null;
  status: string;
  supplier_status?: string | null;
  created_at?: string | Date | null;
};

export type ClaudeEmailList = {
  name: 'Premium' | 'Standard';
  emails: string[];
  orderCount: number;
  missingCount: number;
};

export function confirmedClaudeEmailLists(
  orders: ClaudeEmailOrder[],
  sortOrder: 'desc' | 'asc' = 'desc',
): ClaudeEmailList[] {
  return (['p012', 'p013'] as const).map((productId) => {
    const confirmed = orders.filter((order) =>
      order.product_id === productId &&
      order.supplier_status === 'preorder_confirmed' &&
      order.status === 'delivered',
    );

    const validWithTime = confirmed
      .map((order) => {
        const email = (order.customer_email || '').trim().toLowerCase();
        const time = order.created_at ? new Date(order.created_at).getTime() : 0;
        const dateStr = order.created_at ? new Date(order.created_at).toISOString() : null;
        return { email, time, dateStr };
      })
      .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email));

    // Deduplicate by email while maintaining latest or earliest timestamp based on sortOrder
    const emailMap = new Map<string, { email: string; time: number; dateStr: string | null }>();
    for (const item of validWithTime) {
      const existing = emailMap.get(item.email);
      if (!existing) {
        emailMap.set(item.email, item);
      } else {
        if (sortOrder === 'desc') {
          if (item.time > existing.time) {
            emailMap.set(item.email, item);
          }
        } else {
          if (existing.time === 0 || (item.time > 0 && item.time < existing.time)) {
            emailMap.set(item.email, item);
          }
        }
      }
    }

    const uniqueItems = Array.from(emailMap.values());
    const hasDates = uniqueItems.some((item) => item.time > 0);
    if (hasDates) {
      uniqueItems.sort((a, b) => {
        if (sortOrder === 'desc') {
          return b.time - a.time;
        }
        return a.time - b.time;
      });
    }

    const result: ClaudeEmailList = {
      name: productId === 'p012' ? 'Premium' : 'Standard',
      emails: uniqueItems.map((item) => item.email),
      orderCount: confirmed.length,
      missingCount: confirmed.length - validWithTime.length,
    };

    // Attach non-enumerable orderDates map so deepEqual in tests ignores it, but UI can read it
    const orderDatesMap: Record<string, string> = {};
    for (const item of uniqueItems) {
      if (item.dateStr) {
        orderDatesMap[item.email] = item.dateStr;
      }
    }
    Object.defineProperty(result, 'orderDates', {
      value: orderDatesMap,
      enumerable: false,
      writable: true,
      configurable: true,
    });

    return result;
  });
}
