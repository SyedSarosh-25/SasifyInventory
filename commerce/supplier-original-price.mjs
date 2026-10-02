export function parseSupplierOriginalPrice(value, sellingPrice) {
  if (value === undefined) return { provided: false, amount: null };
  if (value === null || value === '') return { provided: true, amount: null };
  const amount = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 2147483647 || amount < sellingPrice) {
    throw Object.assign(new Error('Original price must be a whole PKR package amount at least equal to the selling price. Leave it blank to use the automatic reference.'), { status: 400 });
  }
  return { provided: true, amount };
}

export async function updateSupplierOfferPricing(db, body) {
  const id = String(body.productId || '').trim();
  const price = Number(body.sellingPrice);
  if (!id || !Number.isSafeInteger(price) || price < 1 || price > 2147483647) {
    throw Object.assign(new Error('Enter a valid supplier selling price.'), { status: 400 });
  }
  const original = parseSupplierOriginalPrice(body.originalPrice, price);
  const result = await db.query(`UPDATE commerce_supplier_products
    SET selling_price=$1,enabled=$2,original_price_pkr=CASE WHEN $4 THEN $5::integer ELSE original_price_pkr END
    WHERE id=$3 RETURNING id,name,provider_name,selling_price,enabled,original_price_pkr`,
    [price, body.enabled === true, id, original.provided, original.amount]);
  if (!result.rowCount) throw Object.assign(new Error('Supplier product not found. Sync products first.'), { status: 404 });
  return result;
}
