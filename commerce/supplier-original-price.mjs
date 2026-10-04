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

export function durationMonths(name, description = '') {
  const text = `${name} ${description}`;
  const monthMatch = text.match(/\b(\d+(?:\.\d+)?)\s*[-_]?\s*(?:months?|mos?|m)\b/i);
  if (monthMatch) {
    const months = Number(monthMatch[1]);
    if (months > 0 && months <= 120) return months;
  }
  const yearMatch = text.match(/\b(\d+(?:\.\d+)?)\s*[-_]?\s*(?:years?|yrs?|y)\b/i);
  if (yearMatch) {
    const years = Number(yearMatch[1]);
    if (years > 0 && years <= 10) return years * 12;
  }
  const dayMatch = text.match(/\b(\d+)\s*(?:days?|d)\b/i);
  if (dayMatch) {
    const days = Number(dayMatch[1]);
    if (days >= 25 && days <= 35) return 1;
    if (days >= 85 && days <= 95) return 3;
    if (days >= 170 && days <= 190) return 6;
    if (days >= 350 && days <= 370) return 12;
    if (days < 25) return days / 30;
  }
  return 1;
}

export function roundToNicePrice(amount) {
  if (amount <= 50) return Math.ceil(amount / 5) * 5 - 1;
  if (amount <= 150) return Math.ceil(amount / 10) * 10 - 1;
  if (amount <= 1000) return Math.ceil(amount / 50) * 50 - 1;
  if (amount <= 5000) return Math.ceil(amount / 100) * 100 - 1;
  return Math.ceil(amount / 500) * 500;
}

export function calculateSupplierOriginalPrice(product) {
  const selling = Number(product.price ?? product.selling_price) || 0;
  if (product.original_price_pkr && product.original_price_pkr >= selling) {
    return product.original_price_pkr;
  }

  const name = String(product.name || '').toLowerCase();
  const desc = String(product.description || '').toLowerCase();
  const months = durationMonths(name, desc);

  let orig = null;

  if (/icloud/i.test(name)) {
    if (/2tb|2\s*tb/i.test(name)) {
      orig = months === 1 ? 2850 : months === 3 ? 7500 : months === 6 ? 15000 : months >= 12 ? 30000 : Math.round(2850 * months);
    } else if (/200gb|200\s*gb/i.test(name)) {
      orig = Math.round(850 * months);
    } else {
      orig = Math.round(2850 * months);
    }
  } else if (/chatgpt|openai|\bgpt\b/i.test(name)) {
    if (/business/i.test(name)) orig = Math.round(7125 * months);
    else if (/team/i.test(name)) orig = Math.round(7125 * months);
    else orig = Math.round(5700 * months);
  } else if (/claude/i.test(name)) {
    if (/team.*premium/i.test(name)) orig = Math.round(35625 * months);
    else if (/team/i.test(name)) orig = Math.round(7500 * months);
    else orig = Math.round(5700 * months);
  } else if (/capcut/i.test(name)) {
    orig = months >= 12 ? 28000 : months === 6 ? 18000 : months === 3 ? 10500 : months < 1 ? 1200 : 3700;
  } else if (/canva/i.test(name)) {
    orig = months >= 12 ? 34000 : months === 6 ? 18000 : months === 3 ? 10000 : 4200;
  } else if (/adobe/i.test(name)) {
    if (/express/i.test(name)) orig = months >= 12 ? 28500 : Math.round(2850 * months);
    else if (/photoshop|illustrator|premiere|after\s*effects|lightroom/i.test(name) && !/all\s*apps/i.test(name)) orig = Math.round(6550 * months);
    else orig = months >= 12 ? 170000 : Math.round(19950 * months);
  } else if (/microsoft|office\s*365|office\s*202/i.test(name)) {
    if (/2024|2021|pro\s*plus\s*key|license\s*key/i.test(name)) orig = 39599;
    else if (/family|premium/i.test(name)) orig = months >= 12 ? 55999 : Math.round(5599 * months);
    else orig = months >= 12 ? 22999 : Math.round(2299 * months);
  } else if (/youtube/i.test(name)) {
    orig = months >= 12 ? 14000 : months === 6 ? 7500 : months === 3 ? 4000 : 1500;
  } else if (/spotify/i.test(name)) {
    orig = months >= 12 ? 8500 : months === 6 ? 4500 : months === 3 ? 2400 : 1000;
  } else if (/linkedin/i.test(name)) {
    if (/sales\s*navigator/i.test(name)) orig = months >= 12 ? 307765 : Math.round(34200 * months);
    else if (/business/i.test(name)) orig = Math.round(17100 * months);
    else orig = Math.round(11400 * months);
  } else if (/vpn|nord|expressvpn|surfshark|ipvanish|cyberghost|hma/i.test(name)) {
    orig = months >= 24 ? 28500 : months >= 12 ? 22800 : months === 6 ? 17000 : months === 3 ? 9500 : 3800;
  } else if (/cursor/i.test(name)) {
    orig = months >= 12 ? 57000 : Math.round(5700 * months);
  } else if (/notion/i.test(name)) {
    orig = Math.round(5700 * months);
  } else if (/perplexity/i.test(name)) {
    orig = months >= 12 ? 57000 : Math.round(5700 * months);
  } else if (/grammarly/i.test(name)) {
    orig = months >= 12 ? 41000 : Math.round(8550 * months);
  } else if (/quillbot/i.test(name)) {
    orig = months >= 12 ? 28485 : Math.round(5685 * months);
  } else if (/midjourney/i.test(name)) {
    if (/pro/i.test(name)) orig = Math.round(17100 * months);
    else if (/standard/i.test(name)) orig = Math.round(8550 * months);
    else orig = Math.round(2850 * months);
  } else if (/suno|udio/i.test(name)) {
    orig = Math.round(2850 * months);
  } else if (/elevenlabs/i.test(name)) {
    orig = Math.round(6270 * months);
  } else if (/runway/i.test(name)) {
    orig = Math.round(4275 * months);
  } else if (/nitro|discord/i.test(name)) {
    if (/basic/i.test(name)) orig = Math.round(850 * months);
    else orig = months >= 12 ? 28500 : Math.round(2850 * months);
  } else if (/telegram/i.test(name)) {
    orig = months >= 12 ? 14000 : months === 6 ? 8000 : months === 3 ? 4200 : 1420;
  } else if (/duolingo/i.test(name)) {
    orig = months >= 12 ? 24000 : Math.round(3700 * months);
  } else if (/ilovepdf/i.test(name)) {
    orig = months >= 12 ? 17100 : Math.round(1425 * months);
  } else if (/zoom/i.test(name)) {
    orig = months >= 12 ? 48400 : Math.round(4840 * months);
  } else if (/netflix/i.test(name)) {
    orig = Math.round(1500 * months);
  } else if (/prime|disney|crunchyroll/i.test(name)) {
    orig = Math.round(2850 * months);
  }

  if (!orig || orig <= selling) {
    const multiplier = selling < 100 ? 2.5 : selling < 1000 ? 1.8 : 1.6;
    orig = roundToNicePrice(Math.ceil(selling * multiplier));
  }

  if (orig <= selling) {
    orig = roundToNicePrice(Math.ceil(selling * 1.5));
  }

  return Math.max(selling + 10, orig);
}

export async function populateAllSupplierOriginalPrices(db) {
  const rows = (await db.query(
    'SELECT id, name, description, selling_price, cost_pkr, original_price_pkr FROM commerce_supplier_products WHERE selling_price IS NOT NULL'
  )).rows;

  const updates = [];
  for (const row of rows) {
    const orig = calculateSupplierOriginalPrice(row);
    if (!row.original_price_pkr || row.original_price_pkr < row.selling_price) {
      updates.push({ id: row.id, orig });
    }
  }

  if (updates.length > 0) {
    for (let i = 0; i < updates.length; i += 500) {
      const chunk = updates.slice(i, i + 500);
      const valuesClause = chunk.map((_, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2}::integer)`).join(',');
      const params = chunk.flatMap(u => [u.id, u.orig]);
      await db.query(`
        UPDATE commerce_supplier_products AS p
        SET original_price_pkr = v.orig
        FROM (VALUES ${valuesClause}) AS v(id, orig)
        WHERE p.id = v.id
      `, params);
    }
  }

  return updates.length;
}
