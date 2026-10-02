export type ClaudeEmailOrder = {
  product_id: string;
  customer_email?: string | null;
  status: string;
  supplier_status?: string | null;
};

export function confirmedClaudeEmailLists(orders: ClaudeEmailOrder[]) {
  return (['p012', 'p013'] as const).map((productId) => {
    const confirmed = orders.filter((order) => order.product_id === productId &&
      order.supplier_status === 'preorder_confirmed' && order.status === 'delivered');
    const valid = confirmed.map((order) => (order.customer_email || '').trim().toLowerCase())
      .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    return {
      name: productId === 'p012' ? 'Premium' : 'Standard',
      emails: [...new Set(valid)],
      orderCount: confirmed.length,
      missingCount: confirmed.length - valid.length,
    };
  });
}
