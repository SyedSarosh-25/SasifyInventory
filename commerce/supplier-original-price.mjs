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
  const name = String(product.name || '').toLowerCase();
  const desc = String(product.description || '').toLowerCase();
  const months = durationMonths(name, desc);

  let monthlyRate = null;

  // 1. iCloud 2TB (official rate: 2,500/mo -> 3m = 7,500, 12m = 30,000)
  if (/icloud/i.test(name)) {
    if (/2tb|2\s*tb/i.test(name)) {
      monthlyRate = 2500;
    } else if (/200gb|200\s*gb/i.test(name)) {
      monthlyRate = 1500;
    } else {
      monthlyRate = 3000;
    }
  }
  // 2. ChatGPT / OpenAI
  else if (/chatgpt|openai|\bgpt\b/i.test(name)) {
    if (/business/i.test(name)) monthlyRate = 7125;
    else if (/team/i.test(name)) monthlyRate = 7125;
    else monthlyRate = 5700;
  }
  // 3. Claude / Anthropic
  else if (/claude/i.test(name)) {
    if (/team.*premium/i.test(name)) monthlyRate = 35625;
    else if (/team/i.test(name)) monthlyRate = 7500;
    else monthlyRate = 5700;
  }
  // 4. Coursera (Official Coursera Plus: $399/yr ~114,000 PKR / $59/mo)
  else if (/coursera/i.test(name)) {
    monthlyRate = 9500;
  }
  // 5. N8N (Official Starter: €20/mo ~6,200 PKR/mo -> 12m = 74,400)
  else if (/n8n/i.test(name)) {
    monthlyRate = 6200;
  }
  // 6. CapCut Pro
  else if (/capcut/i.test(name)) {
    monthlyRate = 3700;
  }
  // 7. Canva Pro
  else if (/canva/i.test(name)) {
    monthlyRate = 4200;
  }
  // 8. Adobe Creative Cloud
  else if (/adobe/i.test(name)) {
    if (/express/i.test(name)) monthlyRate = 2850;
    else if (/photoshop|illustrator|premiere|after\s*effects|lightroom/i.test(name) && !/all\s*apps/i.test(name)) monthlyRate = 6550;
    else monthlyRate = 19950;
  }
  // 9. Microsoft 365 / Office 365
  else if (/microsoft|office\s*365|office\s*202/i.test(name)) {
    if (/2024|2021|pro\s*plus\s*key|license\s*key/i.test(name)) return 39599;
    else if (/family|premium/i.test(name)) monthlyRate = 5599;
    else monthlyRate = 2299;
  }
  // 10. YouTube Premium
  else if (/youtube/i.test(name)) {
    monthlyRate = 1500;
  }
  // 11. Spotify Premium
  else if (/spotify/i.test(name)) {
    monthlyRate = 1000;
  }
  // 12. LinkedIn
  else if (/linkedin/i.test(name)) {
    if (/sales\s*navigator/i.test(name)) monthlyRate = 34200;
    else if (/business/i.test(name)) monthlyRate = 17100;
    else monthlyRate = 11400;
  }
  // 13. VPN (Surfshark, ExpressVPN, NordVPN, etc.)
  else if (/vpn|nord|expressvpn|surfshark|ipvanish|cyberghost|hma/i.test(name)) {
    monthlyRate = 3800;
  }
  // 14. Cursor Pro
  else if (/cursor/i.test(name)) {
    monthlyRate = 5700;
  }
  // 15. Notion
  else if (/notion/i.test(name)) {
    monthlyRate = 5700;
  }
  // 16. Perplexity Pro
  else if (/perplexity/i.test(name)) {
    monthlyRate = 5700;
  }
  // 17. Grammarly / QuillBot
  else if (/grammarly/i.test(name)) {
    monthlyRate = 8550;
  } else if (/quillbot/i.test(name)) {
    monthlyRate = 5685;
  }
  // 18. Midjourney / Creative AI
  else if (/midjourney/i.test(name)) {
    if (/pro/i.test(name)) monthlyRate = 17100;
    else if (/standard/i.test(name)) monthlyRate = 8550;
    else monthlyRate = 2850;
  } else if (/suno|udio/i.test(name)) {
    monthlyRate = 2850;
  } else if (/elevenlabs/i.test(name)) {
    monthlyRate = 6270;
  } else if (/runway/i.test(name)) {
    monthlyRate = 4275;
  }
  // 19. Discord Nitro
  else if (/nitro|discord/i.test(name)) {
    if (/basic/i.test(name)) monthlyRate = 850;
    else monthlyRate = 2850;
  }
  // 20. Telegram Premium
  else if (/telegram/i.test(name)) {
    monthlyRate = 1420;
  }
  // 21. Duolingo Super
  else if (/duolingo/i.test(name)) {
    monthlyRate = 3700;
  }
  // 22. iLovePDF Premium
  else if (/ilovepdf/i.test(name)) {
    monthlyRate = 1425;
  }
  // 23. Zoom Pro
  else if (/zoom/i.test(name)) {
    monthlyRate = 4840;
  }
  // 24. Streaming (Netflix, Prime, Crunchyroll)
  else if (/netflix/i.test(name)) {
    monthlyRate = 1500;
  } else if (/prime|disney|crunchyroll/i.test(name)) {
    monthlyRate = 2850;
  }

  // Multiply monthly rate by plan duration months
  if (monthlyRate !== null) {
    const total = Math.round(monthlyRate * months);
    return Math.max(selling + 10, total);
  }

  // Fallback for generic items:
  // Base monthly rate on equivalent monthly selling price multiplied by plan months
  const monthlySelling = months > 0 ? selling / months : selling;
  const multiplier = monthlySelling < 100 ? 2.5 : monthlySelling < 1000 ? 2.0 : 1.8;
  const estimatedMonthlyOfficial = Math.max(50, Math.ceil(monthlySelling * multiplier));
  const totalFallback = Math.round(estimatedMonthlyOfficial * months);

  const rounded = roundToNicePrice(totalFallback);
  return Math.max(selling + 10, rounded);
}

export async function populateAllSupplierOriginalPrices(db) {
  const rows = (await db.query(
    'SELECT id, name, description, selling_price, cost_pkr, original_price_pkr FROM commerce_supplier_products WHERE selling_price IS NOT NULL'
  )).rows;

  const updates = [];
  for (const row of rows) {
    const orig = calculateSupplierOriginalPrice(row);
    if (!row.original_price_pkr || row.original_price_pkr !== orig) {
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
