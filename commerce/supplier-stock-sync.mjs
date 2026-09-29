// Refresh stock only. Preserve prices, descriptions, mappings and credentials.
export async function refreshSupplierStock(db, provider) {
  if (!provider?.configured) return { skipped: true, reason: 'not_configured' };
  const lockKey = `supplier-stock-sync:${provider.id}`;
  const locked = (await db.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [lockKey])).rows[0]?.locked;
  if (!locked) return { skipped: true, reason: 'already_running' };
  let transaction = false;
  try {
    const catalog = await provider.catalog();
    if (!Array.isArray(catalog?.products) || !catalog.products.length) throw new Error('Supplier returned an empty or invalid stock snapshot.');
    const seen = new Set();
    const stock = catalog.products.map(product => {
      const id = String(product.id || '').trim(), quantity = Number(product.stock);
      if (!id || seen.has(id) || !Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Supplier returned invalid stock.');
      seen.add(id);
      return { id, stock: quantity };
    });
    await db.query('BEGIN');
    transaction = true;
    const updated = await db.query(`
      WITH snapshot AS (SELECT * FROM jsonb_to_recordset($2::jsonb) AS s(id text, stock integer)),
      quantities AS (
        SELECT p.id, COALESCE(s.stock,0) AS stock FROM commerce_supplier_products p
        LEFT JOIN snapshot s ON s.id=p.external_product_id WHERE p.provider_id=$1
      )
      UPDATE commerce_supplier_products p SET supplier_stock=q.stock,synced_at=now()
      FROM quantities q WHERE p.id=q.id`, [provider.id, JSON.stringify(stock)]);
    await db.query('UPDATE commerce_provider_state SET synced_at=now() WHERE provider_id=$1', [provider.id]);
    await db.query("INSERT INTO commerce_audit(action,object_id,details) VALUES('supplier_stock_sync',$1,$2::jsonb)",
      [provider.id, JSON.stringify({ updated: updated.rowCount, received: stock.length })]);
    await db.query('COMMIT');
    transaction = false;
    return { providerId: provider.id, updated: updated.rowCount, received: stock.length, syncedAt: new Date().toISOString() };
  } catch (error) {
    if (transaction) await db.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await db.query('SELECT pg_advisory_unlock(hashtext($1))', [lockKey]);
  }
}
