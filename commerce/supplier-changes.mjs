export const supplierChangeSchema = `
CREATE TABLE IF NOT EXISTS commerce_supplier_snapshots (
 provider_id text NOT NULL, external_id text NOT NULL, data jsonb NOT NULL,
 active boolean NOT NULL DEFAULT true, PRIMARY KEY(provider_id,external_id)
);
CREATE TABLE IF NOT EXISTS commerce_supplier_changes (
 id bigserial PRIMARY KEY, provider_id text NOT NULL, product_name text NOT NULL,
 changes jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commerce_supplier_sync_status (
 provider_id text PRIMARY KEY, succeeded boolean NOT NULL, checked_at timestamptz NOT NULL DEFAULT now()
);`;

export function supplierSnapshot(product) {
 return { name: String(product.name || ''), wholesale_price: Number(product.wholesale_price),
 currency: String(product.currency || '').toUpperCase(), stock: Number(product.stock),
 description: String(product.description || ''), delivery_instruction: String(product.delivery_instruction || '') };
}
export function supplierDifferences(previous, next) {
 return Object.keys(next).filter(key => previous[key] !== next[key]).map(field => ({field, before: previous[field], after: next[field]}));
}
export async function recordSupplierChanges(db, provider, products) {
 const old = (await db.query('SELECT external_id,data,active FROM commerce_supplier_snapshots WHERE provider_id=$1',[provider.id])).rows;
 const previous = new Map(old.map(row => [row.external_id,row]));
 const seen = new Set();
 const snapshots = [], events = [];
 const baseline = old.length === 0;
 for (const product of products) {
  if (!product.id) continue;
  const id = String(product.id), next = supplierSnapshot(product), prior = previous.get(id);
  seen.add(id);
  const changes = prior ? [...supplierDifferences(prior.data,next), ...(!prior.active ? [{field:'availability',before:'removed',after:'restored'}] : [])] : baseline ? [] : [{field:'product',before:null,after:'added'}];
  if(changes.length) events.push({product_name:next.name,changes});
  snapshots.push({external_id:id,data:next});
 }
 for (const row of old.filter(row => row.active && !seen.has(row.external_id))) {
  events.push({product_name:row.data.name,changes:[{field:'product',before:'available',after:'removed'}]});
 }
 if(events.length) await db.query('INSERT INTO commerce_supplier_changes(provider_id,product_name,changes) SELECT $1,product_name,changes FROM jsonb_to_recordset($2::jsonb) AS x(product_name text,changes jsonb)',[provider.id,JSON.stringify(events)]);
 if(snapshots.length) await db.query('INSERT INTO commerce_supplier_snapshots(provider_id,external_id,data,active) SELECT $1,external_id,data,true FROM jsonb_to_recordset($2::jsonb) AS x(external_id text,data jsonb) ON CONFLICT(provider_id,external_id) DO UPDATE SET data=excluded.data,active=true',[provider.id,JSON.stringify(snapshots)]);
 await db.query('UPDATE commerce_supplier_snapshots SET active=false WHERE provider_id=$1 AND NOT (external_id=ANY($2::text[]))',[provider.id,[...seen]]);
 // An authoritative successful catalog, not a failed request, can retire stock.
 await db.query('UPDATE commerce_supplier_products SET supplier_stock=0 WHERE provider_id=$1 AND NOT (external_product_id=ANY($2::text[]))',[provider.id,[...seen]]);
 await db.query('INSERT INTO commerce_supplier_sync_status(provider_id,succeeded) VALUES($1,true) ON CONFLICT(provider_id) DO UPDATE SET succeeded=true,checked_at=now()',[provider.id]);
}
